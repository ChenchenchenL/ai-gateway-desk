//! Site Data Transfer Objects

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::capability::SiteCapabilities;
use crate::domain::site::{ProviderType, Site};

/// Request payload for creating or editing a site.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveSiteRequest {
    pub id: Option<Uuid>,
    pub name: String,
    pub provider: ProviderType,
    pub base_url: String,
    pub auth_token: String,
    pub admin_token: Option<String>,
    pub enabled: bool,
}

/// Request payload for testing connection before saving.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestConnectionRequest {
    pub provider: ProviderType,
    pub base_url: String,
    pub auth_token: String,
    pub admin_token: Option<String>,
}

/// Safe site response returned to UI (excluding plain tokens).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteResponse {
    pub id: Uuid,
    pub name: String,
    pub provider: ProviderType,
    pub base_url: String,
    pub enabled: bool,
    pub capabilities: SiteCapabilities,
    pub current_balance: Option<f64>,
    pub currency: String,
    pub window_remaining_quota: Option<u64>,
    pub window_reset_at: Option<String>,
    pub last_success_at: Option<String>,
    pub last_error: Option<String>,
    pub failure_count: u32,
    pub has_auth_token: bool,
}

impl From<&Site> for SiteResponse {
    fn from(site: &Site) -> Self {
        Self {
            id: site.id,
            name: site.name.clone(),
            provider: site.provider,
            base_url: site.base_url.clone(),
            enabled: site.enabled,
            capabilities: site.capabilities,
            current_balance: site.current_balance,
            currency: site.currency.clone(),
            window_remaining_quota: site.window_remaining_quota,
            window_reset_at: site.window_reset_at.map(|t| t.to_rfc3339()),
            last_success_at: site.last_success_at.map(|t| t.to_rfc3339()),
            last_error: site.last_error.clone(),
            failure_count: site.failure_count,
            has_auth_token: true,
        }
    }
}
