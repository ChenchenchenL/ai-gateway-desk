//! Anthropic-compatible API Adapter
//!
//! Handles capability probing and handles unsupported balance endpoints gracefully.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use super::trait_def::{BalanceInfo, GatewayAdapter, WindowQuotaInfo};
use crate::domain::capability::SiteCapabilities;
use crate::domain::error::AppError;
use crate::domain::usage::UsageRecord;
use crate::infra::http::HttpClient;

/// Adapter instance for Anthropic-compatible endpoints.
pub struct AnthropicCompatibleAdapter {
    pub site_id: Uuid,
    pub base_url: String,
    pub token: String,
    http: HttpClient,
}

impl AnthropicCompatibleAdapter {
    /// Creates a new AnthropicCompatibleAdapter instance.
    pub fn new(site_id: Uuid, base_url: String, token: String) -> Self {
        Self {
            site_id,
            base_url: base_url.trim_end_matches('/').to_string(),
            token,
            http: HttpClient::new(),
        }
    }

    fn build_url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }
}

#[async_trait]
impl GatewayAdapter for AnthropicCompatibleAdapter {
    async fn probe_capabilities(&self) -> Result<SiteCapabilities, AppError> {
        let url = self.build_url("/v1/models");
        let token = self.token.clone();
        let resp = self.http
            .execute_with_retry(|client| {
                client.get(&url).header("x-api-key", &token).header("anthropic-version", "2023-06-01")
            })
            .await?;

        if !resp.status().is_success() {
            return Err(HttpClient::map_status_code(resp.status()));
        }
        Ok(SiteCapabilities {
            balance: false,
            usage: false,
            model_usage: false,
            cache_usage: true,
            window_quota: false,
        })
    }

    async fn fetch_balance(&self) -> Result<BalanceInfo, AppError> {
        Err(AppError::unsupported("Anthropic direct API does not provide a balance endpoint"))
    }

    async fn fetch_usage(
        &self,
        _start_time: DateTime<Utc>,
        _end_time: DateTime<Utc>,
    ) -> Result<Vec<UsageRecord>, AppError> {
        Ok(Vec::new())
    }

    async fn fetch_window_quota(&self) -> Result<WindowQuotaInfo, AppError> {
        Err(AppError::unsupported("Anthropic direct API does not expose window quotas"))
    }
}
