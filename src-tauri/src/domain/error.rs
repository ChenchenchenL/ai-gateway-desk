//! Domain error types
//!
//! Provides structured, classified error categories for user-facing messaging
//! and telemetry without leaking sensitive credentials.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// High-level categorization of application errors.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCategory {
    /// Authentication or authorization failure (401/403).
    Auth,
    /// Network connection failure, timeout, or DNS resolution error.
    Network,
    /// Server rate limited the request (429).
    RateLimit,
    /// Target endpoint or capability is unsupported.
    Unsupported,
    /// Data deserialization or structure parsing failure.
    Parse,
    /// Database, file system, or keyring persistence failure.
    Storage,
    /// General or unknown internal error.
    Internal,
}

/// Unified domain error type across the application.
#[derive(Debug, Error, Clone, Serialize, Deserialize)]
#[error("[{category:?}] {message}")]
pub struct AppError {
    /// Error category for UI classification.
    pub category: ErrorCategory,
    /// User-friendly, sanitized error message.
    pub message: String,
    /// Optional HTTP status code if originated from network call.
    pub status_code: Option<u16>,
    /// Optional retry interval in seconds when rate limited.
    pub retry_after_secs: Option<u64>,
}

impl AppError {
    /// Constructs a new categorized domain error.
    pub fn new(category: ErrorCategory, message: impl Into<String>) -> Self {
        Self {
            category,
            message: message.into(),
            status_code: None,
            retry_after_secs: None,
        }
    }

    /// Constructs an authentication error.
    pub fn auth(message: impl Into<String>) -> Self {
        Self::new(ErrorCategory::Auth, message)
    }

    /// Constructs a network timeout or connectivity error.
    pub fn network(message: impl Into<String>) -> Self {
        Self::new(ErrorCategory::Network, message)
    }

    /// Constructs a rate limit error with optional retry-after.
    pub fn rate_limit(message: impl Into<String>, retry_after: Option<u64>) -> Self {
        Self {
            category: ErrorCategory::RateLimit,
            message: message.into(),
            status_code: Some(429),
            retry_after_secs: retry_after,
        }
    }

    /// Constructs an unsupported feature or endpoint error.
    pub fn unsupported(message: impl Into<String>) -> Self {
        Self::new(ErrorCategory::Unsupported, message)
    }

    /// Constructs a parsing failure error.
    pub fn parse(message: impl Into<String>) -> Self {
        Self::new(ErrorCategory::Parse, message)
    }

    /// Constructs a local storage or secure keyring error.
    pub fn storage(message: impl Into<String>) -> Self {
        Self::new(ErrorCategory::Storage, message)
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        Self::storage(err.to_string())
    }
}
