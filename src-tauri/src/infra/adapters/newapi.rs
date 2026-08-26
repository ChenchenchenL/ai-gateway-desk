//! New-API Relay Platform Adapter
//!
//! Direct balance querying, comprehensive prompt cache metrics extraction, and capability probing.

use async_trait::async_trait;
use chrono::{DateTime, TimeZone, Utc};
use serde_json::Value;
use uuid::Uuid;

use super::trait_def::{BalanceInfo, GatewayAdapter, WindowQuotaInfo};
use crate::domain::capability::SiteCapabilities;
use crate::domain::error::{AppError, ErrorCategory};
use crate::domain::usage::{UsageRecord, UsageSource};
use crate::infra::http::HttpClient;

/// Adapter instance for New-API relays.
pub struct NewApiAdapter {
    pub site_id: Uuid,
    pub base_url: String,
    pub token: String,
    http: HttpClient,
}

impl NewApiAdapter {
    /// Creates a new NewApiAdapter instance.
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

    /// Converts New-API / One-API Quota points (500,000 = ¥1.00 / $1.00) to balance.
    fn convert_quota_to_balance(raw_quota: f64) -> f64 {
        if raw_quota > 500.0 {
            (raw_quota / 500_000.0 * 10000.0).round() / 10000.0
        } else {
            (raw_quota * 10000.0).round() / 10000.0
        }
    }

    /// Extracts balance and currency from various JSON responses.
    fn extract_balance(json: &Value) -> Option<(f64, String)> {
        // 1. Array of tokens
        let list = if let Some(arr) = json.as_array() {
            Some(arr)
        } else if let Some(arr) = json.get("data").and_then(|d| d.as_array()) {
            Some(arr)
        } else if let Some(arr) = json.get("data").and_then(|d| d.get("items")).and_then(|i| i.as_array()) {
            Some(arr)
        } else if let Some(arr) = json.get("data").and_then(|d| d.get("list")).and_then(|l| l.as_array()) {
            Some(arr)
        } else {
            None
        };

        if let Some(items) = list {
            for item in items {
                if let Some(true) = item.get("unlimited_quota").and_then(|v| v.as_bool()) {
                    return Some((999999.0, "CNY".to_string()));
                }
                let item_quota = item.get("remain_quota")
                    .or_else(|| item.get("quota"))
                    .or_else(|| item.get("balance"))
                    .and_then(|v| v.as_f64());
                if let Some(q) = item_quota {
                    let curr = item.get("currency").and_then(|c| c.as_str()).unwrap_or("CNY").to_string();
                    return Some((Self::convert_quota_to_balance(q), curr));
                }
            }
        }

        // 2. Target object (Wallet / User profile)
        let target = json.get("data").unwrap_or(json);
        if let Some(true) = target.get("unlimited_quota").or_else(|| json.get("unlimited_quota")).and_then(|v| v.as_bool()) {
            return Some((999999.0, "CNY".to_string()));
        }

        let curr = target.get("currency")
            .or_else(|| json.get("currency"))
            .and_then(|c| c.as_str())
            .unwrap_or("CNY")
            .to_string();

        let candidates = [
            target.get("remain_quota"),
            target.get("quota"),
            target.get("balance"),
            target.get("current_balance"),
            target.get("total_quota"),
            json.get("remain_quota"),
            json.get("quota"),
            json.get("balance"),
        ];

        for val in candidates {
            if let Some(q) = val.and_then(|v| v.as_f64()) {
                return Some((Self::convert_quota_to_balance(q), curr));
            }
        }

        // 3. OpenAI billing subscription style
        let hard_limit = json.get("hard_limit_usd")
            .or_else(|| json.get("system_hard_limit_usd"))
            .or_else(|| json.get("total_available"))
            .and_then(|v| v.as_f64());

        if let Some(limit) = hard_limit {
            let total_usage = json.get("total_usage").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let raw_balance = (limit - total_usage).max(0.0);
            return Some((Self::convert_quota_to_balance(raw_balance), "USD".to_string()));
        }

        None
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

    /// Recursively extracts cache read tokens from various New-API log field conventions.
    fn extract_cache_read_tokens(item: &Value) -> u64 {
        let direct_fields = [
            "cache_tokens",
            "prompt_cache_tokens",
            "cached_tokens",
            "cache_read_tokens",
            "cache_read",
            "cache_read_input_tokens",
        ];

        for key in direct_fields {
            if let Some(v) = item.get(key) {
                if let Some(n) = v.as_u64() {
                    if n > 0 { return n; }
                }
                if let Some(s) = v.as_str() {
                    if let Ok(n) = s.parse::<u64>() {
                        if n > 0 { return n; }
                    }
                }
            }
        }

        if let Some(details) = item.get("prompt_tokens_details").or_else(|| item.get("usage").and_then(|u| u.get("prompt_tokens_details"))) {
            for key in direct_fields {
                if let Some(v) = details.get(key) {
                    if let Some(n) = v.as_u64() {
                        if n > 0 { return n; }
                    }
                }
            }
        }

        if let Some(usage) = item.get("usage") {
            for key in direct_fields {
                if let Some(v) = usage.get(key) {
                    if let Some(n) = v.as_u64() {
                        if n > 0 { return n; }
                    }
                }
            }
        }

        if let Some(content_str) = item.get("content").and_then(|c| c.as_str()) {
            if content_str.contains("cache") {
                if let Ok(nested_json) = serde_json::from_str::<Value>(content_str) {
                    let nested_read = Self::extract_cache_read_tokens(&nested_json);
                    if nested_read > 0 { return nested_read; }
                }
            }
        }

        0
    }

    /// Extracts cache creation / write tokens.
    fn extract_cache_write_tokens(item: &Value) -> u64 {
        let direct_fields = [
            "cache_write_tokens",
            "cache_write",
            "cache_creation_input_tokens",
        ];

        for key in direct_fields {
            if let Some(v) = item.get(key) {
                if let Some(n) = v.as_u64() {
                    if n > 0 { return n; }
                }
            }
        }

        if let Some(details) = item.get("prompt_tokens_details").or_else(|| item.get("usage")) {
            for key in direct_fields {
                if let Some(v) = details.get(key) {
                    if let Some(n) = v.as_u64() {
                        if n > 0 { return n; }
                    }
                }
            }
        }

        0
    }
}

#[async_trait]
impl GatewayAdapter for NewApiAdapter {
    async fn probe_capabilities(&self) -> Result<SiteCapabilities, AppError> {
        let _ = self.fetch_balance().await;
        Ok(SiteCapabilities::new_api_default())
    }

    async fn fetch_balance(&self) -> Result<BalanceInfo, AppError> {
        let token = self.token.clone();
        let endpoints = [
            "/api/user/wallet",
            "/api/wallet",
            "/api/user/dashboard",
            "/api/dashboard",
            "/api/user/self",
            "/api/usage/token",
            "/api/token/?p=0&size=10",
            "/api/token/",
            "/dashboard/billing/subscription",
            "/v1/dashboard/billing/subscription",
            "/api/user/info",
        ];

        for path in &endpoints {
            let url = self.build_url(path);
            if let Ok(resp) = self.http.execute_with_retry(|c| c.get(&url).bearer_auth(&token)).await {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        if let Some((bal, curr)) = Self::extract_balance(&json) {
                            return Ok(BalanceInfo {
                                balance: Some(bal),
                                currency: curr,
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

            let cache_read_tokens = Self::extract_cache_read_tokens(&item);
            let cache_write_tokens = Self::extract_cache_write_tokens(&item);

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
                cache_read_tokens,
                cache_write_tokens,
                request_count: 1,
                source: UsageSource::GatewayServer,
                synced_at: now,
            }
        }).collect();

        Ok(records)
    }

    async fn fetch_window_quota(&self) -> Result<WindowQuotaInfo, AppError> {
        Err(AppError::unsupported("New-API does not have rolling window quotas"))
    }
}
