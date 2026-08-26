//! Settings DTOs

use serde::{Deserialize, Serialize};

/// Application preferences DTO.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettingsDto {
    pub auto_refresh: bool,
    pub refresh_interval_secs: u64,
    pub always_on_top: bool,
    pub opacity_pct: u8,
    pub low_balance_threshold: f64,
    pub notify_on_failure: bool,
}

impl Default for AppSettingsDto {
    fn default() -> Self {
        Self {
            auto_refresh: true,
            refresh_interval_secs: 60,
            always_on_top: false,
            opacity_pct: 100,
            low_balance_threshold: 5.0,
            notify_on_failure: true,
        }
    }
}
