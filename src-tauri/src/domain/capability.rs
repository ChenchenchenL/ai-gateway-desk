//! Gateway and provider capability flags
//!
//! Describes capabilities supported by specific AI relay or gateway sites.

use serde::{Deserialize, Serialize};

/// Bitflags or boolean representation of supported site features.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct SiteCapabilities {
    /// Can query account balance or remaining quota points.
    pub balance: bool,
    /// Can query usage logs/records from the server.
    pub usage: bool,
    /// Can aggregate usage records per model.
    pub model_usage: bool,
    /// Server returns prompt cache tokens (read/creation).
    pub cache_usage: bool,
    /// Supports rolling window quota and reset time querying (Sub2API).
    pub window_quota: bool,
}

impl SiteCapabilities {
    /// Standard capabilities for New-API relay platforms.
    pub fn new_api_default() -> Self {
        Self {
            balance: true,
            usage: true,
            model_usage: true,
            cache_usage: true,
            window_quota: false,
        }
    }

    /// Standard capabilities for One-API relay platforms.
    pub fn one_api_default() -> Self {
        Self {
            balance: true,
            usage: true,
            model_usage: true,
            cache_usage: true,
            window_quota: false,
        }
    }

    /// Standard capabilities for Sub2API pooled subscription gateways.
    pub fn sub2api_default() -> Self {
        Self {
            balance: true,
            usage: true,
            model_usage: true,
            cache_usage: true,
            window_quota: true,
        }
    }
}
