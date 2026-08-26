//! Alerting and notification service
//!
//! Monitors threshold triggers: consecutive failures, low balance, and quota exhaustion.

use crate::domain::error::AppError;

/// Service dispatching desktop alerts when warning conditions are met.
pub struct AlertService;

impl AlertService {
    /// Checks failure count and emits notification on 3rd consecutive failure.
    pub fn check_consecutive_failures(site_name: &str, failure_count: u32) -> Result<(), AppError> {
        if failure_count == 3 {
            // Emit desktop notification once on 3rd failure
            tracing::warn!("Site {} failed 3 consecutive refreshes", site_name);
        }
        Ok(())
    }

    /// Emits recovery notification when site succeeds after failures.
    pub fn notify_recovery(site_name: &str) -> Result<(), AppError> {
        tracing::info!("Site {} recovered successfully", site_name);
        Ok(())
    }
}
