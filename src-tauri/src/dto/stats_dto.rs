//! Usage and stats DTOs

use serde::{Deserialize, Serialize};

/// Response containing aggregated metrics for UI charts and cards.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregatedMetricsResponse {
    pub total_requests: u64,
    pub total_input_tokens: u64,
    pub total_output_tokens: u64,
    pub total_cache_read_tokens: u64,
    pub total_cache_write_tokens: u64,
    pub cache_hit_rate_pct: Option<f64>,
}
