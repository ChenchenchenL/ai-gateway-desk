//! Adapter interface trait definition
//!
//! Defines the standard contract that all AI relay/gateway adapters must implement.

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::domain::capability::SiteCapabilities;
use crate::domain::error::AppError;
use crate::domain::usage::UsageRecord;

/// Balance and quota information returned by a gateway.
#[derive(Debug, Clone, Default)]
pub struct BalanceInfo {
    /// Available balance or quota value.
    pub balance: Option<f64>,
    /// Currency or unit representation (e.g. "USD", "CNY", "Tokens").
    pub currency: String,
    /// Total granted quota, if applicable.
    pub total_quota: Option<f64>,
    /// Expiration or reset timestamp, if applicable.
    pub expires_at: Option<DateTime<Utc>>,
}

/// Rolling window quota information (specific to Sub2API gateways).
#[derive(Debug, Clone, Default)]
pub struct WindowQuotaInfo {
    /// Total window allowance.
    pub window_limit: Option<u64>,
    /// Remaining tokens or requests in the current window.
    pub remaining_quota: Option<u64>,
    /// Time when the window resets.
    pub reset_at: Option<DateTime<Utc>>,
}

/// Unified trait for upstream gateway adapters.
#[async_trait]
pub trait GatewayAdapter: Send + Sync {
    /// Detects and declares the capabilities supported by this endpoint.
    async fn probe_capabilities(&self) -> Result<SiteCapabilities, AppError>;

    /// Fetches the current balance or quota points.
    async fn fetch_balance(&self) -> Result<BalanceInfo, AppError>;

    /// Fetches server usage records within a time range.
    async fn fetch_usage(
        &self,
        start_time: DateTime<Utc>,
        end_time: DateTime<Utc>,
    ) -> Result<Vec<UsageRecord>, AppError>;

    /// Fetches rolling window quota for Sub2API gateways.
    async fn fetch_window_quota(&self) -> Result<WindowQuotaInfo, AppError>;
}
