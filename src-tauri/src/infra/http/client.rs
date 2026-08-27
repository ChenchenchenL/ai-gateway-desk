//! HTTP client with timeout, retry, and sanitized error mapping

use std::time::Duration;
use reqwest::header::HeaderMap;
use reqwest::{Client, RequestBuilder, Response, StatusCode};

use crate::domain::error::{AppError, ErrorCategory};

/// Standard HTTP client wrapper for gateway communications.
#[derive(Clone)]
pub struct HttpClient {
    inner: Client,
}

impl HttpClient {
    /// Creates a client configured with default 15s timeout and standard headers.
    pub fn new() -> Self {
        let inner = Client::builder()
            .timeout(Duration::from_secs(15))
            .connect_timeout(Duration::from_secs(5))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
            .build()
            .unwrap_or_else(|_| Client::new());
        Self { inner }
    }

    /// Executes a request with automatic retry for transient network errors (max 2 retries).
    pub async fn execute_with_retry<F>(&self, build_req: F) -> Result<Response, AppError>
    where
        F: Fn(&Client) -> RequestBuilder,
    {
        let backoffs = [Duration::from_secs(1), Duration::from_secs(3)];
        let mut attempts = 0;

        loop {
            let req = build_req(&self.inner);
            match req.send().await {
                Ok(resp) => {
                    let status = resp.status();
                    if status == StatusCode::TOO_MANY_REQUESTS {
                        let retry_after = parse_retry_after(resp.headers());
                        return Err(AppError::rate_limit("Rate limited by gateway server", retry_after));
                    }
                    if status.is_server_error() && attempts < backoffs.len() {
                        tokio::time::sleep(backoffs[attempts]).await;
                        attempts += 1;
                        continue;
                    }
                    return Ok(resp);
                }
                Err(err) => {
                    if attempts < backoffs.len() && (err.is_connect() || err.is_timeout()) {
                        tokio::time::sleep(backoffs[attempts]).await;
                        attempts += 1;
                        continue;
                    }
                    return Err(Self::map_reqwest_error(err));
                }
            }
        }
    }

    /// Converts a reqwest error into a classified domain AppError.
    pub fn map_reqwest_error(err: reqwest::Error) -> AppError {
        if err.is_timeout() {
            AppError::new(ErrorCategory::Network, "Request timed out after 15 seconds")
        } else if err.is_connect() {
            AppError::new(ErrorCategory::Network, "Failed to connect to gateway server")
        } else if let Some(status) = err.status() {
            Self::map_status_code(status)
        } else {
            AppError::new(ErrorCategory::Network, "Network communication error")
        }
    }

    /// Maps HTTP status code to domain AppError.
    pub fn map_status_code(status: StatusCode) -> AppError {
        match status {
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => {
                AppError::new(ErrorCategory::Auth, "Invalid API token or unauthorized")
            }
            StatusCode::TOO_MANY_REQUESTS => {
                AppError::rate_limit("Rate limit exceeded by gateway server", None)
            }
            StatusCode::NOT_FOUND => {
                AppError::new(ErrorCategory::Unsupported, "Endpoint not found on gateway")
            }
            s if s.is_server_error() => {
                AppError::new(ErrorCategory::Network, format!("Gateway server error ({})", s))
            }
            _ => AppError::new(ErrorCategory::Network, format!("HTTP error ({})", status)),
        }
    }

    /// Access inner reqwest client.
    pub fn inner(&self) -> &Client {
        &self.inner
    }
}

/// Helper function to parse Retry-After header.
fn parse_retry_after(headers: &HeaderMap) -> Option<u64> {
    headers
        .get("retry-after")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<u64>().ok())
}

impl Default for HttpClient {
    fn default() -> Self {
        Self::new()
    }
}
