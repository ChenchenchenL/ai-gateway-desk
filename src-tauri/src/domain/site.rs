//! Site domain entity
//!
//! Represents a configured AI gateway or relay endpoint.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::capability::SiteCapabilities;

/// Supported upstream provider types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderType {
    /// One-API relay server.
    OneApi,
    /// New-API relay server.
    NewApi,
    /// Sub2API subscription pooling gateway.
    Sub2Api,
    /// Standard OpenAI-compatible API endpoint.
    OpenAiCompatible,
    /// Standard Anthropic-compatible API endpoint.
    AnthropicCompatible,
}

/// Domain entity representing a monitored site.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Site {
    /// Unique local identifier.
    pub id: Uuid,
    /// Display name configured by user.
    pub name: String,
    /// Provider protocol type.
    pub provider: ProviderType,
    /// Base URL for the gateway API.
    pub base_url: String,
    /// Whether this site is currently enabled for monitoring.
    pub enabled: bool,
    /// Supported capabilities for this site.
    pub capabilities: SiteCapabilities,
    /// Current account balance, directly stored without point conversions.
    pub current_balance: Option<f64>,
    /// Currency unit representation (e.g. "USD", "CNY").
    pub currency: String,
    /// Remaining quota in rolling window (Sub2API).
    pub window_remaining_quota: Option<u64>,
    /// Reset time of rolling window (Sub2API).
    pub window_reset_at: Option<DateTime<Utc>>,
    /// Timestamp of last successful data refresh.
    pub last_success_at: Option<DateTime<Utc>>,
    /// Last error encountered during refresh, if any.
    pub last_error: Option<String>,
    /// Consecutive failure count for threshold alerting.
    pub failure_count: u32,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

impl Site {
    /// Creates a new site instance with default timestamps and zero failure count.
    pub fn new(name: String, provider: ProviderType, base_url: String, capabilities: SiteCapabilities) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name,
            provider,
            base_url,
            enabled: true,
            capabilities,
            current_balance: None,
            currency: "USD".to_string(),
            window_remaining_quota: None,
            window_reset_at: None,
            last_success_at: None,
            last_error: None,
            failure_count: 0,
            created_at: now,
            updated_at: now,
        }
    }

    /// Records a successful refresh event with updated balance and window information.
    pub fn record_success(
        &mut self,
        balance: Option<f64>,
        currency: Option<String>,
        window_remaining: Option<u64>,
        window_reset_at: Option<DateTime<Utc>>,
    ) {
        self.current_balance = balance;
        if let Some(c) = currency {
            self.currency = c;
        }
        self.window_remaining_quota = window_remaining;
        self.window_reset_at = window_reset_at;
        self.last_success_at = Some(Utc::now());
        self.last_error = None;
        self.failure_count = 0;
        self.updated_at = Utc::now();
    }

    /// Records a failed refresh attempt.
    pub fn record_failure(&mut self, err_msg: String) {
        self.last_error = Some(err_msg);
        self.failure_count = self.failure_count.saturating_add(1);
        self.updated_at = Utc::now();
    }
}
