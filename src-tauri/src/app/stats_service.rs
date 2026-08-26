//! Statistics aggregation service
//!
//! Computes token metrics, cache efficiency, and time-range aggregations.

use std::sync::Arc;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::error::AppError;
use crate::domain::usage::{AggregatedMetrics, ModelUsageMetrics};
use crate::infra::storage::{usage_repo::UsageRepository, Database};

/// Service computing usage statistics and cache insights.
pub struct StatsService {
    db: Arc<Database>,
}

impl StatsService {
    /// Creates a new StatsService instance.
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Retrieves aggregated usage metrics for a site within the specified time range.
    pub fn get_site_metrics(
        &self,
        site_id: &Uuid,
        start_time: DateTime<Utc>,
        end_time: DateTime<Utc>,
    ) -> Result<AggregatedMetrics, AppError> {
        let repo = UsageRepository::new(&self.db);
        repo.aggregate_site_usage(site_id, start_time, end_time)
    }

    /// Retrieves per-model usage metrics and cache hit rates for a site.
    pub fn get_models_breakdown(
        &self,
        site_id: &Uuid,
        start_time: DateTime<Utc>,
        end_time: DateTime<Utc>,
    ) -> Result<Vec<ModelUsageMetrics>, AppError> {
        let repo = UsageRepository::new(&self.db);
        repo.aggregate_models_usage(site_id, start_time, end_time)
    }
}
