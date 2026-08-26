//! Sub2API Subscription Pooling Gateway Adapter
//!
//! Direct balance querying, rolling window quota status, and reset countdown for Sub2API.

use async_trait::async_trait;
use chrono::{DateTime, TimeZone, Utc};
use serde::Deserialize;
use uuid::Uuid;

use super::trait_def::{BalanceInfo, GatewayAdapter, WindowQuotaInfo};
use crate::domain::capability::SiteCapabilities;
use crate::domain::error::{AppError, ErrorCategory};
use crate::domain::usage::{UsageRecord, UsageSource};
use crate::infra::http::HttpClient;

/// Adapter instance for Sub2API subscription gateways.
pub struct Sub2ApiAdapter {
    pub site_id: Uuid,
    pub base_url: String,
    pub token: String,
    http: HttpClient,
}

impl Sub2ApiAdapter {
    /// Creates a new Sub2ApiAdapter instance.
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
struct Sub2ApiUserResponse {
    balance: Option<f64>,
    currency: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Sub2ApiWindowResponse {
    window_limit: Option<u64>,
    remaining_quota: Option<u64>,
    reset_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct Sub2ApiLogItem {
    id: Option<String>,
    timestamp: Option<i64>,
    model: Option<String>,
    prompt_tokens: Option<u64>,
    completion_tokens: Option<u64>,
    cache_read_tokens: Option<u64>,
}

#[async_trait]
impl GatewayAdapter for Sub2ApiAdapter {
    async fn probe_capabilities(&self) -> Result<SiteCapabilities, AppError> {
        let url = self.build_url("/api/user/info");
        let token = self.token.clone();
        let resp = self.http
            .execute_with_retry(|client| {
                client.get(&url).bearer_auth(&token)
            })
            .await?;

        if !resp.status().is_success() {
            return Err(HttpClient::map_status_code(resp.status()));
        }
        Ok(SiteCapabilities::sub2api_default())
    }

    async fn fetch_balance(&self) -> Result<BalanceInfo, AppError> {
        let url = self.build_url("/api/user/info");
        let token = self.token.clone();
        let resp = self.http
            .execute_with_retry(|client| {
                client.get(&url).bearer_auth(&token)
            })
            .await?;

        let body: Sub2ApiUserResponse = resp.json().await
            .map_err(|e| AppError::new(ErrorCategory::Parse, format!("Failed to parse balance: {}", e)))?;

        Ok(BalanceInfo {
            balance: body.balance,
            currency: body.currency.unwrap_or_else(|| "USD".to_string()),
            total_quota: None,
            expires_at: None,
        })
    }

    async fn fetch_window_quota(&self) -> Result<WindowQuotaInfo, AppError> {
        let url = self.build_url("/api/window");
        let token = self.token.clone();
        let resp = self.http
            .execute_with_retry(|client| {
                client.get(&url).bearer_auth(&token)
            })
            .await?;

        if !resp.status().is_success() {
            return Err(HttpClient::map_status_code(resp.status()));
        }

        let body: Sub2ApiWindowResponse = resp.json().await
            .map_err(|e| AppError::new(ErrorCategory::Parse, format!("Failed to parse window quota: {}", e)))?;

        let reset_at = body.reset_at.and_then(|ts| Utc.timestamp_opt(ts, 0).single());

        Ok(WindowQuotaInfo {
            window_limit: body.window_limit,
            remaining_quota: body.remaining_quota,
            reset_at,
        })
    }

    async fn fetch_usage(
        &self,
        _start_time: DateTime<Utc>,
        _end_time: DateTime<Utc>,
    ) -> Result<Vec<UsageRecord>, AppError> {
        let url = self.build_url("/api/log");
        let token = self.token.clone();
        let resp = self.http
            .execute_with_retry(|client| {
                client.get(&url).bearer_auth(&token)
            })
            .await?;

        let items: Vec<Sub2ApiLogItem> = resp.json().await.unwrap_or_default();
        let now = Utc::now();
        let records = items.into_iter().map(|item| {
            let model_raw = item.model.unwrap_or_else(|| "unknown".to_string());
            let model_normalized = model_raw.trim().to_lowercase();
            let timestamp = item.timestamp
                .and_then(|ts| Utc.timestamp_opt(ts, 0).single())
                .unwrap_or(now);

            UsageRecord {
                id: Uuid::new_v4(),
                site_id: self.site_id,
                server_record_id: item.id.unwrap_or_else(|| Uuid::new_v4().to_string()),
                timestamp,
                model_raw,
                model_normalized,
                input_tokens: item.prompt_tokens.unwrap_or(0),
                output_tokens: item.completion_tokens.unwrap_or(0),
                cache_read_tokens: item.cache_read_tokens.unwrap_or(0),
                cache_write_tokens: 0,
                request_count: 1,
                source: UsageSource::GatewayServer,
                synced_at: now,
            }
        }).collect();

        Ok(records)
    }
}
