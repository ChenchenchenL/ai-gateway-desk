//! Usage record and metric domain entities
//!
//! Represents token consumption, cache hit metrics, and server usage logs.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Source identifier for usage data.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UsageSource {
    /// Retrieved directly from gateway server logs.
    GatewayServer,
}

/// Domain entity representing a cached server usage record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageRecord {
    /// Internal local record ID.
    pub id: Uuid,
    /// Associated site ID.
    pub site_id: Uuid,
    /// Upstream server record or log ID for deduplication.
    pub server_record_id: String,
    /// Request timestamp.
    pub timestamp: DateTime<Utc>,
    /// Raw model name returned by server.
    pub model_raw: String,
    /// Normalized model name for unified grouping.
    pub model_normalized: String,
    /// Standard input tokens consumed.
    pub input_tokens: u64,
    /// Standard output / completion tokens consumed.
    pub output_tokens: u64,
    /// Tokens read from prompt cache.
    pub cache_read_tokens: u64,
    /// Tokens written to prompt cache.
    pub cache_write_tokens: u64,
    /// Number of requests aggregated in this record.
    pub request_count: u32,
    /// Data source tag.
    pub source: UsageSource,
    /// Local sync timestamp.
    pub synced_at: DateTime<Utc>,
}

/// Aggregated usage metrics for a site or time period.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AggregatedMetrics {
    /// Total request count.
    pub total_requests: u64,
    /// Total prompt input tokens.
    pub total_input_tokens: u64,
    /// Total completion output tokens.
    pub total_output_tokens: u64,
    /// Total cache read tokens.
    pub total_cache_read_tokens: u64,
    /// Total cache write tokens.
    pub total_cache_write_tokens: u64,
    /// Calculated cache hit rate percentage (0.0 - 100.0).
    pub cache_hit_rate_pct: Option<f64>,
}

impl AggregatedMetrics {
    /// Computes cache hit rate based on spec formula:
    /// cache_read_tokens / total_input_tokens * 100.0
    pub fn calculate_cache_hit_rate(&mut self) {
        if self.total_input_tokens > 0 && self.total_cache_read_tokens > 0 {
            let rate = (self.total_cache_read_tokens as f64 / self.total_input_tokens as f64) * 100.0;
            self.cache_hit_rate_pct = Some(rate.min(100.0));
        } else {
            self.cache_hit_rate_pct = None;
        }
    }
}

/// Model-specific aggregated metrics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelUsageMetrics {
    pub model_name: String,
    pub request_count: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub cache_write_tokens: u64,
    pub cache_hit_rate_pct: Option<f64>,
}

impl ModelUsageMetrics {
    /// Calculates cache hit rate for this specific model.
    pub fn calculate_cache_hit_rate(&mut self) {
        if self.input_tokens > 0 && self.cache_read_tokens > 0 {
            let rate = (self.cache_read_tokens as f64 / self.input_tokens as f64) * 100.0;
            self.cache_hit_rate_pct = Some(rate.min(100.0));
        } else {
            self.cache_hit_rate_pct = None;
        }
    }
}
