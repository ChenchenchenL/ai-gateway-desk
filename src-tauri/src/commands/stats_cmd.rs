//! Statistics query Tauri commands

use chrono::{DateTime, Utc};
use tauri::{command, State};
use uuid::Uuid;

use crate::domain::usage::ModelUsageMetrics;
use crate::dto::AggregatedMetricsResponse;
use crate::AppState;

/// Retrieves aggregated usage metrics for a site within an ISO timestamp range.
#[command]
pub async fn get_site_stats(
    site_id: Uuid,
    start_iso: String,
    end_iso: String,
    state: State<'_, AppState>,
) -> Result<AggregatedMetricsResponse, String> {
    let start_time = start_iso.parse::<DateTime<Utc>>()
        .unwrap_or_else(|_| Utc::now() - chrono::Duration::hours(24));
    let end_time = end_iso.parse::<DateTime<Utc>>()
        .unwrap_or_else(|_| Utc::now());

    let metrics = state
        .stats_service
        .get_site_metrics(&site_id, start_time, end_time)
        .map_err(|e| e.message)?;

    Ok(AggregatedMetricsResponse {
        total_requests: metrics.total_requests,
        total_input_tokens: metrics.total_input_tokens,
        total_output_tokens: metrics.total_output_tokens,
        total_cache_read_tokens: metrics.total_cache_read_tokens,
        total_cache_write_tokens: metrics.total_cache_write_tokens,
        cache_hit_rate_pct: metrics.cache_hit_rate_pct,
    })
}

/// Retrieves per-model breakdown metrics for a site.
#[command]
pub async fn get_models_breakdown(
    site_id: Uuid,
    start_iso: String,
    end_iso: String,
    state: State<'_, AppState>,
) -> Result<Vec<ModelUsageMetrics>, String> {
    let start_time = start_iso.parse::<DateTime<Utc>>()
        .unwrap_or_else(|_| Utc::now() - chrono::Duration::hours(24));
    let end_time = end_iso.parse::<DateTime<Utc>>()
        .unwrap_or_else(|_| Utc::now());

    state
        .stats_service
        .get_models_breakdown(&site_id, start_time, end_time)
        .map_err(|e| e.message)
}
