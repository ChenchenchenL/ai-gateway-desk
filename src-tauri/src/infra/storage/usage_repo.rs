//! Usage repository for SQLite persistence and time-range queries

use chrono::{DateTime, Utc};
use rusqlite::params;
use uuid::Uuid;

use super::db::Database;
use crate::domain::error::{AppError, ErrorCategory};
use crate::domain::usage::{AggregatedMetrics, ModelUsageMetrics, UsageRecord};

/// Repository for usage records caching and query aggregation.
pub struct UsageRepository<'a> {
    db: &'a Database,
}

impl<'a> UsageRepository<'a> {
    /// Creates a repository instance tied to the given database.
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Inserts a batch of usage records idempotently (deduplicating by site_id + server_record_id).
    pub fn insert_batch(&self, records: &[UsageRecord]) -> Result<usize, AppError> {
        self.db.with_conn(|conn| {
            let mut inserted = 0;
            let tx = conn.unchecked_transaction()
                .map_err(|e| AppError::new(ErrorCategory::Storage, e.to_string()))?;

            for record in records {
                let res = tx.execute(
                    r#"
                    INSERT OR IGNORE INTO usage_records (
                        id, site_id, server_record_id, timestamp, model_raw, model_normalized,
                        input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
                        request_count, source, synced_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
                    "#,
                    params![
                        record.id.to_string(),
                        record.site_id.to_string(),
                        record.server_record_id,
                        record.timestamp.to_rfc3339(),
                        record.model_raw,
                        record.model_normalized,
                        record.input_tokens,
                        record.output_tokens,
                        record.cache_read_tokens,
                        record.cache_write_tokens,
                        record.request_count,
                        "gateway_server",
                        record.synced_at.to_rfc3339(),
                    ],
                );
                if let Ok(count) = res {
                    inserted += count;
                }
            }
            tx.commit()
                .map_err(|e| AppError::new(ErrorCategory::Storage, e.to_string()))?;
            Ok(inserted)
        })
    }

    /// Aggregates token usage and cache metrics for a site within a time window.
    pub fn aggregate_site_usage(
        &self,
        site_id: &Uuid,
        start_time: DateTime<Utc>,
        end_time: DateTime<Utc>,
    ) -> Result<AggregatedMetrics, AppError> {
        self.db.with_conn(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT 
                    COALESCE(SUM(request_count), 0),
                    COALESCE(SUM(input_tokens), 0),
                    COALESCE(SUM(output_tokens), 0),
                    COALESCE(SUM(cache_read_tokens), 0),
                    COALESCE(SUM(cache_write_tokens), 0)
                FROM usage_records
                WHERE site_id = ?1 AND timestamp >= ?2 AND timestamp <= ?3
                "#,
            ).map_err(|e| AppError::new(ErrorCategory::Storage, e.to_string()))?;

            let mut metrics = stmt.query_row(
                params![site_id.to_string(), start_time.to_rfc3339(), end_time.to_rfc3339()],
                |row| {
                    let req_count: i64 = row.get(0)?;
                    let in_tok: i64 = row.get(1)?;
                    let out_tok: i64 = row.get(2)?;
                    let cache_r: i64 = row.get(3)?;
                    let cache_w: i64 = row.get(4)?;

                    Ok(AggregatedMetrics {
                        total_requests: req_count as u64,
                        total_input_tokens: in_tok as u64,
                        total_output_tokens: out_tok as u64,
                        total_cache_read_tokens: cache_r as u64,
                        total_cache_write_tokens: cache_w as u64,
                        cache_hit_rate_pct: None,
                    })
                },
            ).map_err(|e| AppError::new(ErrorCategory::Storage, e.to_string()))?;

            metrics.calculate_cache_hit_rate();
            Ok(metrics)
        })
    }

    /// Aggregates usage grouped by normalized model name within a time window.
    pub fn aggregate_models_usage(
        &self,
        site_id: &Uuid,
        start_time: DateTime<Utc>,
        end_time: DateTime<Utc>,
    ) -> Result<Vec<ModelUsageMetrics>, AppError> {
        self.db.with_conn(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT 
                    model_normalized,
                    COALESCE(SUM(request_count), 0),
                    COALESCE(SUM(input_tokens), 0),
                    COALESCE(SUM(output_tokens), 0),
                    COALESCE(SUM(cache_read_tokens), 0),
                    COALESCE(SUM(cache_write_tokens), 0)
                FROM usage_records
                WHERE site_id = ?1 AND timestamp >= ?2 AND timestamp <= ?3
                GROUP BY model_normalized
                ORDER BY SUM(input_tokens + output_tokens) DESC
                "#,
            ).map_err(|e| AppError::new(ErrorCategory::Storage, e.to_string()))?;

            let rows = stmt.query_map(
                params![site_id.to_string(), start_time.to_rfc3339(), end_time.to_rfc3339()],
                |row| {
                    let model_name: String = row.get(0)?;
                    let req_count: i64 = row.get(1)?;
                    let in_tok: i64 = row.get(2)?;
                    let out_tok: i64 = row.get(3)?;
                    let cache_r: i64 = row.get(4)?;
                    let cache_w: i64 = row.get(5)?;

                    let mut m = ModelUsageMetrics {
                        model_name,
                        request_count: req_count as u64,
                        input_tokens: in_tok as u64,
                        output_tokens: out_tok as u64,
                        cache_read_tokens: cache_r as u64,
                        cache_write_tokens: cache_w as u64,
                        cache_hit_rate_pct: None,
                    };
                    m.calculate_cache_hit_rate();
                    Ok(m)
                },
            ).map_err(|e| AppError::new(ErrorCategory::Storage, e.to_string()))?;

            let mut results = Vec::new();
            for r in rows {
                if let Ok(item) = r {
                    results.push(item);
                }
            }
            Ok(results)
        })
    }
}
