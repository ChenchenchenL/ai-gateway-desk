//! Structured logging configuration and event recording

pub mod sanitizer;

pub use sanitizer::sanitize_log_message;

/// Initializes tracing subscriber with rotation and sanitization.
pub fn init_logging() {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(false)
        .with_level(true)
        .init();
}
