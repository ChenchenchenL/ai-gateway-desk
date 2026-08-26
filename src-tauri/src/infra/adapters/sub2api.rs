//! Sub2API Subscription Pooling Gateway Adapter
//!
//! Direct balance querying, rolling window quota status, and reset countdown for Sub2API.

use async_trait::async_trait;
use chrono::{DateTime, TimeZone, Utc};
use serde_json::Value;
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

#[async_trait]
impl GatewayAdapter for Sub2ApiAdapter {
    async fn probe_capabilities(&self) -> Result<SiteCapabilities, AppError> {
        let _ = self.fetch_balance().await;
        Ok(SiteCapabilities::sub2api_default())
    }

    async fn fetch_balance(&self) -> Result<BalanceInfo, AppError> {
        let token = self.token.clone();
        let endpoints = [
            "/v1/sub2api/billing",
            "/api/v1/auth/me",
            "/api/user/info",
            "/api/user/profile",
            "/api/user",
        ];

        for path in &endpoints {
            let url = self.build_url(path);
            if let Ok(resp) = self.http.execute_with_retry(|c| c.get(&url).bearer_auth(&token)).await {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        let target = json.get("data").unwrap_or(&json);
                        let balance = target.get("balance")
                            .or_else(|| target.get("remaining_quota"))
                            .or_else(|| target.get("quota"))
                            .and_then(|v| v.as_f64());

                        let currency = target.get("currency")
                            .and_then(|v| v.as_str())
                            .unwrap_or("CNY")
                            .to_string();

                        return Ok(BalanceInfo {
                            balance,
                            currency,
                            total_quota: None,
                            expires_at: None,
                        });
                    }
                }
            }
        }

        Ok(BalanceInfo {
            balance: None,
            currency: "CNY".to_string(),
            total_quota: None,
            expires_at: None,
        })
    }

    async fn fetch_window_quota(&self) -> Result<WindowQuotaInfo, AppError> {
        let token = self.token.clone();
        let endpoints = [
            "/v1/sub2api/billing",
            "/api/window",
            "/api/v1/window",
            "/api/user/window",
            "/api/limits",
        ];

        for path in &endpoints {
            let url = self.build_url(path);
            if let Ok(resp) = self.http.execute_with_retry(|c| c.get(&url).bearer_auth(&token)).await {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        let target = json.get("data").unwrap_or(&json);
                        let remaining_quota = target.get("remaining_quota")
                            .or_else(|| target.get("quota_remaining"))
                            .or_else(|| target.get("window_remaining"))
                            .and_then(|v| v.as_u64());

                        let window_limit = target.get("window_limit")
                            .or_else(|| target.get("total_quota"))
                            .and_then(|v| v.as_u64());

                        let reset_at = target.get("reset_at")
                            .and_then(|v| v.as_i64())
                            .and_then(|ts| Utc.timestamp_opt(ts, 0).single());

                        return Ok(WindowQuotaInfo {
                            window_limit,
                            remaining_quota,
                            reset_at,
                        });
                    }
                }
            }
        }

        Ok(WindowQuotaInfo {
            window_limit: None,
            remaining_quota: None,
            reset_at: None,
        })
    }

    async fn fetch_usage(
        &self,
        _start_time: DateTime<Utc>,
        _end_time: DateTime<Utc>,
    ) -> Result<Vec<UsageRecord>, AppError> {
        let token = self.token.clone();
        let endpoints = [
            "/api/v1/usage",
            "/api/log",
            "/api/v1/log",
            "/api/usage",
        ];

        let mut items = Vec::new();
        for path in &endpoints {
            let url = self.build_url(path);
            if let Ok(resp) = self.http.execute_with_retry(|c| c.get(&url).bearer_auth(&token)).await {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        if let Some(arr) = json.as_array().or_else(|| json.get("data").and_then(|d| d.as_array())) {
                            items = arr.clone();
                            break;
                        }
                    }
                }
            }
        }

        let now = Utc::now();
        let records = items.into_iter().map(|item| {
            let model_raw = item.get("model")
                .or_else(|| item.get("model_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();
            let model_normalized = model_raw.trim().to_lowercase();

            let timestamp = item.get("timestamp")
                .or_else(|| item.get("created_at"))
                .and_then(|v| v.as_i64())
                .and_then(|ts| Utc.timestamp_opt(ts, 0).single())
                .unwrap_or(now);

            UsageRecord {
                id: Uuid::new_v4(),
                site_id: self.site_id,
                server_record_id: item.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(|| Uuid::new_v4().to_string()),
                timestamp,
                model_raw,
                model_normalized,
                input_tokens: item.get("prompt_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
                output_tokens: item.get("completion_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
                cache_read_tokens: item.get("cache_read_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
                cache_write_tokens: 0,
                request_count: 1,
                source: UsageSource::GatewayServer,
                synced_at: now,
            }
        }).collect();

        Ok(records)
    }
}
