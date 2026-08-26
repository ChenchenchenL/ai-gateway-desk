//! Site repository for SQLite CRUD operations

use rusqlite::params;
use uuid::Uuid;

use super::db::Database;
use crate::domain::error::{AppError, ErrorCategory};
use crate::domain::site::Site;

/// Repository for site metadata persistence.
pub struct SiteRepository<'a> {
    db: &'a Database,
}

impl<'a> SiteRepository<'a> {
    /// Creates a repository instance tied to the given database.
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Fetches all configured sites.
    pub fn list_all(&self) -> Result<Vec<Site>, AppError> {
        self.db.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    r#"
                    SELECT id, name, provider, base_url, enabled, capabilities,
                           current_balance, currency, window_remaining_quota, window_reset_at,
                           last_success_at, last_error, failure_count, created_at, updated_at
                    FROM sites ORDER BY created_at ASC
                    "#,
                )
                .map_err(|e| AppError::new(ErrorCategory::Storage, e.to_string()))?;

            let rows = stmt.query_map([], |row| {
                let id_str: String = row.get(0)?;
                let name: String = row.get(1)?;
                let provider_str: String = row.get(2)?;
                let base_url: String = row.get(3)?;
                let enabled: bool = row.get(4)?;
                let cap_str: String = row.get(5)?;
                let current_balance: Option<f64> = row.get(6)?;
                let currency: String = row.get(7)?;
                let window_remaining: Option<u64> = row.get(8)?;
                let window_reset_str: Option<String> = row.get(9)?;
                let last_success_str: Option<String> = row.get(10)?;
                let last_error: Option<String> = row.get(11)?;
                let failure_count: u32 = row.get(12)?;
                let created_str: String = row.get(13)?;
                let updated_str: String = row.get(14)?;

                Ok(Site {
                    id: Uuid::parse_str(&id_str).unwrap_or_default(),
                    name,
                    provider: serde_json::from_str(&format!("\"{}\"", provider_str)).unwrap_or(crate::domain::site::ProviderType::OneApi),
                    base_url,
                    enabled,
                    capabilities: serde_json::from_str(&cap_str).unwrap_or_default(),
                    current_balance,
                    currency,
                    window_remaining_quota: window_remaining,
                    window_reset_at: window_reset_str.and_then(|s| s.parse().ok()),
                    last_success_at: last_success_str.and_then(|s| s.parse().ok()),
                    last_error,
                    failure_count,
                    created_at: created_str.parse().unwrap_or_else(|_| chrono::Utc::now()),
                    updated_at: updated_str.parse().unwrap_or_else(|_| chrono::Utc::now()),
                })
            }).map_err(|e| AppError::new(ErrorCategory::Storage, e.to_string()))?;

            let mut sites = Vec::new();
            for r in rows {
                if let Ok(site) = r {
                    sites.push(site);
                }
            }
            Ok(sites)
        })
    }

    /// Fetches a single site by ID.
    pub fn get_by_id(&self, id: &Uuid) -> Result<Option<Site>, AppError> {
        let all = self.list_all()?;
        Ok(all.into_iter().find(|s| s.id == *id))
    }

    /// Saves or updates a site record.
    pub fn save(&self, site: &Site) -> Result<(), AppError> {
        let cap_json = serde_json::to_string(&site.capabilities).unwrap_or_default();
        let prov_json = serde_json::to_string(&site.provider).unwrap_or_default().trim_matches('"').to_string();

        self.db.with_conn(|conn| {
            conn.execute(
                r#"
                INSERT INTO sites (
                    id, name, provider, base_url, enabled, capabilities,
                    current_balance, currency, window_remaining_quota, window_reset_at,
                    last_success_at, last_error, failure_count, created_at, updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    provider = excluded.provider,
                    base_url = excluded.base_url,
                    enabled = excluded.enabled,
                    capabilities = excluded.capabilities,
                    current_balance = excluded.current_balance,
                    currency = excluded.currency,
                    window_remaining_quota = excluded.window_remaining_quota,
                    window_reset_at = excluded.window_reset_at,
                    last_success_at = excluded.last_success_at,
                    last_error = excluded.last_error,
                    failure_count = excluded.failure_count,
                    updated_at = excluded.updated_at
                "#,
                params![
                    site.id.to_string(),
                    site.name,
                    prov_json,
                    site.base_url,
                    site.enabled,
                    cap_json,
                    site.current_balance,
                    site.currency,
                    site.window_remaining_quota,
                    site.window_reset_at.map(|t| t.to_rfc3339()),
                    site.last_success_at.map(|t| t.to_rfc3339()),
                    site.last_error,
                    site.failure_count,
                    site.created_at.to_rfc3339(),
                    site.updated_at.to_rfc3339(),
                ],
            ).map_err(|e| AppError::new(ErrorCategory::Storage, e.to_string()))?;
            Ok(())
        })
    }

    /// Deletes a site by ID.
    pub fn delete(&self, id: &Uuid) -> Result<(), AppError> {
        self.db.with_conn(|conn| {
            conn.execute("DELETE FROM sites WHERE id = ?1", params![id.to_string()])
                .map_err(|e| AppError::new(ErrorCategory::Storage, e.to_string()))?;
            Ok(())
        })
    }
}
