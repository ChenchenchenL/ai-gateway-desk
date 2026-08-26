//! One-API Relay Platform Adapter
//!
//! Direct balance querying, server usage log extraction, and capability probing for One-API.

use async_trait::async_trait;
use chrono::{DateTime, TimeZone, Utc};
use serde::Deserialize;
use uuid::Uuid;

use super::trait_def::{BalanceInfo, GatewayAdapter, WindowQuotaInfo};
use crate::domain::capability::SiteCapabilities;
use crate::domain::error::{AppError, ErrorCategory};
use crate::domain::usage::{UsageRecord, UsageSource};
use crate::infra::http::HttpClient;

/// Adapter instance for One-API relays.
pub struct OneApiAdapter {
    pub site_id: Uuid,
    pub base_url: String,
    pub token: String,
    http: HttpClient,
}

impl OneApiAdapter {
    /// Creates a new OneApiAdapter instance.
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

#[derive(Debug, Deserialize)]
struct ApiResponse<T> {
    success: Option<bool>,
    data: Option<T>,
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UserSelfData {
    quota: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct LogItem {
    id: Option<i64>,
    created_at: Option<i64>,
    model_name: Option<String>,
    prompt_tokens: Option<u64>,
    completion_tokens: Option<u64>,
}

#[async_trait]
impl GatewayAdapter for OneApiAdapter {
    async fn probe_capabilities(&self) -> Result<SiteCapabilities, AppError> {
        let url = self.build_url("/api/user/self");
        let token = self.token.clone();
        let resp = self.http
            .execute_with_retry(|client| {
                client.get(&url).bearer_auth(&token)
            })
            .await?;

        if !resp.status().is_success() {
            return Err(HttpClient::map_status_code(resp.status()));
        }
        Ok(SiteCapabilities::one_api_default())
    }

    async fn fetch_balance(&self) -> Result<BalanceInfo, AppError> {
        let url = self.build_url("/api/user/self");
        let token = self.token.clone();
        let resp = self.http
            .execute_with_retry(|client| {
                client.get(&url).bearer_auth(&token)
            })
            .await?;

        let body: ApiResponse<UserSelfData> = resp.json().await
            .map_err(|e| AppError::new(ErrorCategory::Parse, format!("Failed to parse balance: {}", e)))?;

        let balance = body.data.and_then(|d| d.quota);
        Ok(BalanceInfo {
            balance,
            currency: "USD".to_string(),
            total_quota: None,
            expires_at: None,
        })
    }

    async fn fetch_usage(
        &self,
        _start_time: DateTime<Utc>,
        _end_time: DateTime<Utc>,
    ) -> Result<Vec<UsageRecord>, AppError> {
        let url = self.build_url("/api/log?p=0&page_size=100");
        let token = self.token.clone();
        let resp = self.http
            .execute_with_retry(|client| {
                client.get(&url).bearer_auth(&token)
            })
            .await?;

        let body: ApiResponse<Vec<LogItem>> = resp.json().await
            .map_err(|e| AppError::new(ErrorCategory::Parse, format!("Failed to parse logs: {}", e)))?;

        let items = body.data.unwrap_or_default();
        let now = Utc::now();
        let records = items.into_iter().map(|item| {
            let model_raw = item.model_name.unwrap_or_else(|| "unknown".to_string());
            let model_normalized = model_raw.trim().to_lowercase();
            let timestamp = item.created_at
                .and_then(|ts| Utc.timestamp_opt(ts, 0).single())
                .unwrap_or(now);

            UsageRecord {
                id: Uuid::new_v4(),
                site_id: self.site_id,
                server_record_id: item.id.map(|id| id.to_string()).unwrap_or_else(|| Uuid::new_v4().to_string()),
                timestamp,
                model_raw,
                model_normalized,
                input_tokens: item.prompt_tokens.unwrap_or(0),
                output_tokens: item.completion_tokens.unwrap_or(0),
                cache_read_tokens: 0,
                cache_write_tokens: 0,
                request_count: 1,
                source: UsageSource::GatewayServer,
                synced_at: now,
            }
        }).collect();

        Ok(records)
    }

    async fn fetch_window_quota(&self) -> Result<WindowQuotaInfo, AppError> {
        Err(AppError::unsupported("One-API does not have rolling window quotas"))
    }
}
