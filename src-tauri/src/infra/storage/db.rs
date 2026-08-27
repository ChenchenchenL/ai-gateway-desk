//! SQLite database management and migration runner

use std::path::Path;
use parking_lot::Mutex;
use rusqlite::Connection;

use crate::domain::error::{AppError, ErrorCategory};

/// Thread-safe wrapper around SQLite connection.
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Opens or creates SQLite database file and runs idempotent migrations.
    pub fn open(path: impl AsRef<Path>) -> Result<Self, AppError> {
        let conn = Connection::open(path)
            .map_err(|e| AppError::new(ErrorCategory::Storage, format!("Failed to open database: {}", e)))?;
        
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    /// Initializes in-memory database for testing.
    pub fn in_memory() -> Result<Self, AppError> {
        let conn = Connection::open_in_memory()
            .map_err(|e| AppError::new(ErrorCategory::Storage, format!("Failed to create in-memory database: {}", e)))?;
        
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    /// Executes idempotent database schema migrations.
    pub fn run_migrations(&self) -> Result<(), AppError> {
        let conn = self.conn.lock();
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS sites (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                provider TEXT NOT NULL,
                base_url TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                capabilities TEXT NOT NULL,
                current_balance REAL,
                currency TEXT NOT NULL DEFAULT 'USD',
                window_remaining_quota INTEGER,
                window_reset_at TEXT,
                last_success_at TEXT,
                last_error TEXT,
                failure_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS usage_records (
                id TEXT PRIMARY KEY,
                site_id TEXT NOT NULL,
                server_record_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                model_raw TEXT NOT NULL,
                model_normalized TEXT NOT NULL,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                cache_read_tokens INTEGER NOT NULL DEFAULT 0,
                cache_write_tokens INTEGER NOT NULL DEFAULT 0,
                request_count INTEGER NOT NULL DEFAULT 1,
                source TEXT NOT NULL,
                synced_at TEXT NOT NULL,
                FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
                UNIQUE(site_id, server_record_id)
            );

            CREATE INDEX IF NOT EXISTS idx_usage_site_time ON usage_records(site_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_usage_model ON usage_records(site_id, model_normalized);

            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS site_credentials (
                site_id TEXT PRIMARY KEY,
                auth_token TEXT NOT NULL,
                admin_token TEXT,
                updated_at TEXT NOT NULL
            );
            "#
        ).map_err(|e| AppError::new(ErrorCategory::Storage, format!("Database migration failed: {}", e)))?;
        Ok(())
    }

    /// Provides access to the underlying locked connection for repositories.
    pub fn with_conn<F, R>(&self, f: F) -> Result<R, AppError>
    where
        F: FnOnce(&Connection) -> Result<R, AppError>,
    {
        let conn = self.conn.lock();
        f(&conn)
    }
}
