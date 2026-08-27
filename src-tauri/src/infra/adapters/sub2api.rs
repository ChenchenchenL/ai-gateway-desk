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
        let mut clean_url = base_url.trim().trim_end_matches('/').to_string();
        if !clean_url.starts_with("http://") && !clean_url.starts_with("https://") {
            clean_url = format!("https://{}", clean_url);
        }
        Self {
            site_id,
            base_url: clean_url,
            token,
            http: HttpClient::new(),
        }
    }

    fn build_url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    fn extract_balance_info(json: &Value) -> Option<(Option<f64>, String)> {
        let target = json.get("data").unwrap_or(json);

        // 1. Direct balance field
        if let Some(b) = target.get("balance").and_then(|v| v.as_f64()) {
            let curr = target.get("currency").and_then(|v| v.as_str()).unwrap_or("USD").to_string();
            return Some((Some(b), curr));
        }

        // 2. User info format { user: { balance: 0.0 } }
        if let Some(user_obj) = target.get("user").or_else(|| target.get("account")) {
            if let Some(b) = user_obj.get("balance").and_then(|v| v.as_f64()) {
                let curr = user_obj.get("currency").and_then(|v| v.as_str()).unwrap_or("USD").to_string();
                return Some((Some(b), curr));
            }
        }

        // 3. Sub2API billing format { remaining_quota: ..., currency: "USD" }
        if let Some(q) = target.get("remaining_quota").or_else(|| target.get("quota")).and_then(|v| v.as_f64()) {
            let curr = target.get("currency").and_then(|v| v.as_str()).unwrap_or("USD").to_string();
            return Some((Some(q), curr));
        }

        None
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
            "/api/v1/user/profile",
            "/v1/sub2api/billing",
            "/api/v1/subscriptions",
            "/api/v1/keys",
            "/api/user/profile",
        ];

        for path in &endpoints {
            let url = self.build_url(path);
            if let Ok(resp) = self.http.execute_with_retry(|c| c.get(&url).bearer_auth(&token)).await {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        if let Some((bal, curr)) = Self::extract_balance_info(&json) {
                            return Ok(BalanceInfo {
                                balance: bal,
                                currency: curr,
                                total_quota: None,
                                expires_at: None,
                            });
                        }
                    }
                }
            }
        }

        Ok(BalanceInfo {
            balance: Some(0.0),
            currency: "USD".to_string(),
            total_quota: None,
            expires_at: None,
        })
    }

    async fn fetch_window_quota(&self) -> Result<WindowQuotaInfo, AppError> {
        let token = self.token.clone();
        let endpoints = [
            "/v1/sub2api/billing",
            "/api/v1/subscriptions",
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
                            .or_else(|| target.get("remaining"))
                            .and_then(|v| v.as_u64());

                        let window_limit = target.get("window_limit")
                            .or_else(|| target.get("total_quota"))
                            .or_else(|| target.get("limit"))
                            .and_then(|v| v.as_u64());

                        let reset_at = target.get("reset_at")
                            .and_then(|v| v.as_i64())
                            .and_then(|ts| Utc.timestamp_opt(ts, 0).single());

                        if remaining_quota.is_some() || window_limit.is_some() {
                            return Ok(WindowQuotaInfo {
                                window_limit,
                                remaining_quota,
                                reset_at,
                            });
                        }
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
            "/api/v1/usage?page_size=100&p=0",
            "/api/v1/logs",
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
                        if let Some(arr) = json.as_array() {
                            items = arr.clone();
                            break;
                        } else if let Some(arr) = json.get("data").and_then(|d| d.as_array()) {
                            items = arr.clone();
                            break;
                        } else if let Some(arr) = json.get("data").and_then(|d| d.get("items").or_else(|| d.get("list"))).and_then(|i| i.as_array()) {
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
                .or_else(|| item.get("time"))
                .and_then(|v| {
                    if let Some(n) = v.as_i64() {
                        if n > 10_000_000_000 {
                            Utc.timestamp_millis_opt(n).single()
                        } else {
                            Utc.timestamp_opt(n, 0).single()
                        }
                    } else if let Some(s) = v.as_str() {
                        DateTime::parse_from_rfc3339(s).ok().map(|dt| dt.with_timezone(&Utc))
                    } else {
                        None
                    }
                })
                .unwrap_or(now);

            let input_tokens = item.get("prompt_tokens")
                .or_else(|| item.get("input_tokens"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            let output_tokens = item.get("completion_tokens")
                .or_else(|| item.get("output_tokens"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            let cache_read_tokens = item.get("cache_read_tokens")
                .or_else(|| item.get("cached_tokens"))
                .or_else(|| item.get("cache_tokens"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            UsageRecord {
                id: Uuid::new_v4(),
                site_id: self.site_id,
                server_record_id: item.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(|| Uuid::new_v4().to_string()),
                timestamp,
                model_raw,
                model_normalized,
                input_tokens,
                output_tokens,
                cache_read_tokens,
                cache_write_tokens: 0,
                request_count: 1,
                source: UsageSource::GatewayServer,
                synced_at: now,
            }
        }).collect();

        Ok(records)
    }
}
