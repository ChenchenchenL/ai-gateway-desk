//! One-API Relay Platform Adapter
//!
//! Direct balance querying, server usage log extraction, and capability probing for One-API.

use async_trait::async_trait;
use chrono::{DateTime, TimeZone, Utc};
use serde_json::Value;
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

    /// Helper to parse Unix timestamp safely handling both seconds and milliseconds.
    fn parse_timestamp(val: Option<&Value>) -> DateTime<Utc> {
        let now = Utc::now();
        match val {
            Some(Value::Number(n)) => {
                if let Some(ts) = n.as_i64() {
                    if ts > 10_000_000_000 {
                        Utc.timestamp_millis_opt(ts).single().unwrap_or(now)
                    } else {
                        Utc.timestamp_opt(ts, 0).single().unwrap_or(now)
                    }
                } else {
                    now
                }
            }
            Some(Value::String(s)) => {
                DateTime::parse_from_rfc3339(s)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or(now)
            }
            _ => now,
        }
    }

    /// Extracts log item array from various common gateway JSON responses.
    fn extract_log_array(val: Value) -> Vec<Value> {
        if let Value::Array(arr) = val {
            return arr;
        }
        if let Some(Value::Array(arr)) = val.get("data") {
            return arr.clone();
        }
        if let Some(data_obj) = val.get("data") {
            if let Some(Value::Array(arr)) = data_obj.get("items") {
                return arr.clone();
            }
            if let Some(Value::Array(arr)) = data_obj.get("list") {
                return arr.clone();
            }
            if let Some(Value::Array(arr)) = data_obj.get("rows") {
                return arr.clone();
            }
            if let Some(Value::Array(arr)) = data_obj.get("data") {
                return arr.clone();
            }
        }
        Vec::new()
    }
}

#[async_trait]
impl GatewayAdapter for OneApiAdapter {
    async fn probe_capabilities(&self) -> Result<SiteCapabilities, AppError> {
        // Probe balance and token capabilities
        let _ = self.fetch_balance().await;
        Ok(SiteCapabilities::one_api_default())
    }

    async fn fetch_balance(&self) -> Result<BalanceInfo, AppError> {
        let token = self.token.clone();

        // 1. Try standard /api/user/self
        let url_user = self.build_url("/api/user/self");
        if let Ok(resp) = self.http.execute_with_retry(|c| c.get(&url_user).bearer_auth(&token)).await {
            if resp.status().is_success() {
                if let Ok(json) = resp.json::<Value>().await {
                    let quota_val = json.get("data").and_then(|d| d.get("quota")).or_else(|| json.get("quota"));
                    if let Some(q) = quota_val.and_then(|v| v.as_f64()) {
                        return Ok(BalanceInfo {
                            balance: Some(q),
                            currency: "USD".to_string(),
                            total_quota: None,
                            expires_at: None,
                        });
                    }
                }
            }
        }

        // 2. Try OpenAI-compatible /dashboard/billing/subscription & /v1/dashboard/billing/subscription
        for path in &["/dashboard/billing/subscription", "/v1/dashboard/billing/subscription"] {
            let url_sub = self.build_url(path);
            if let Ok(resp) = self.http.execute_with_retry(|c| c.get(&url_sub).bearer_auth(&token)).await {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        let hard_limit = json.get("hard_limit_usd")
                            .or_else(|| json.get("system_hard_limit_usd"))
                            .or_else(|| json.get("total_available"))
                            .and_then(|v| v.as_f64());

                        if let Some(limit) = hard_limit {
                            let total_usage = json.get("total_usage").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let balance = (limit - total_usage).max(0.0);
                            return Ok(BalanceInfo {
                                balance: Some(balance),
                                currency: "USD".to_string(),
                                total_quota: Some(limit),
                                expires_at: None,
                            });
                        }
                    }
                }
            }
        }

        // 3. Try /api/usage/token or /api/token/
        for path in &["/api/usage/token", "/api/token/"] {
            let url_tok = self.build_url(path);
            if let Ok(resp) = self.http.execute_with_retry(|c| c.get(&url_tok).bearer_auth(&token)).await {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        let rem_val = json.get("data").and_then(|d| d.get("remain_quota").or_else(|| d.get("quota")))
                            .or_else(|| json.get("remain_quota"))
                            .or_else(|| json.get("quota"));

                        if let Some(q) = rem_val.and_then(|v| v.as_f64()) {
                            return Ok(BalanceInfo {
                                balance: Some(q),
                                currency: "USD".to_string(),
                                total_quota: None,
                                expires_at: None,
                            });
                        }
                    }
                }
            }
        }

        Err(AppError::new(ErrorCategory::Unsupported, "Endpoint did not return balance".to_string()))
    }

    async fn fetch_usage(
        &self,
        _start_time: DateTime<Utc>,
        _end_time: DateTime<Utc>,
    ) -> Result<Vec<UsageRecord>, AppError> {
        let token = self.token.clone();
        let endpoints = [
            "/api/log/token?p=0&page_size=100",
            "/api/log/self?p=0&page_size=100",
            "/api/log?p=0&page_size=100",
            "/api/log",
        ];

        let mut items = Vec::new();
        for endpoint in &endpoints {
            let url = self.build_url(endpoint);
            if let Ok(resp) = self.http.execute_with_retry(|c| c.get(&url).bearer_auth(&token)).await {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        let extracted = Self::extract_log_array(json);
                        if !extracted.is_empty() {
                            items = extracted;
                            break;
                        }
                    }
                }
            }
        }

        let now = Utc::now();
        let records = items.into_iter().map(|item| {
            let model_raw = item.get("model_name")
                .or_else(|| item.get("model"))
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();
            let model_normalized = model_raw.trim().to_lowercase();

            let timestamp = Self::parse_timestamp(item.get("created_at").or_else(|| item.get("timestamp")).or_else(|| item.get("time")));

            let input_tokens = item.get("prompt_tokens")
                .or_else(|| item.get("input_tokens"))
                .or_else(|| item.get("prompt"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            let output_tokens = item.get("completion_tokens")
                .or_else(|| item.get("output_tokens"))
                .or_else(|| item.get("completion"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            let server_record_id = item.get("id")
                .and_then(|v| {
                    if let Some(s) = v.as_str() {
                        Some(s.to_string())
                    } else {
                        v.as_i64().map(|n| n.to_string())
                    }
                })
                .unwrap_or_else(|| Uuid::new_v4().to_string());

            UsageRecord {
                id: Uuid::new_v4(),
                site_id: self.site_id,
                server_record_id,
                timestamp,
                model_raw,
                model_normalized,
                input_tokens,
                output_tokens,
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
