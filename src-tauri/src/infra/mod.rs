//! Infrastructure layer
//!
//! Houses external dependencies: HTTP clients, storage (SQLite & Secure Keyring),
//! platform-specific adapters, system tray, and structured logging.

pub mod adapters;
pub mod http;
pub mod logging;
pub mod storage;
pub mod tray;
