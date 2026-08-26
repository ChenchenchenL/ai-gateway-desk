//! Configuration and settings service
//!
//! Manages application preferences, auto-refresh interval, and local data cleanup.

use std::sync::Arc;
use rusqlite::params;

use crate::domain::error::AppError;
use crate::dto::AppSettingsDto;
use crate::infra::storage::Database;

const SETTINGS_KEY: &str = "app_preferences";

/// Service managing user settings and configuration persistence.
pub struct ConfigService {
    db: Arc<Database>,
}

impl ConfigService {
    /// Creates a new ConfigService instance.
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Loads application settings or returns defaults if not yet configured.
    pub fn get_settings(&self) -> Result<AppSettingsDto, AppError> {
        self.db.with_conn(|conn| {
            let mut stmt = conn
                .prepare("SELECT value FROM app_settings WHERE key = ?1")
                .map_err(|e| AppError::storage(e.to_string()))?;
            let mut rows = stmt
                .query([SETTINGS_KEY])
                .map_err(|e| AppError::storage(e.to_string()))?;

            if let Some(row) = rows.next().map_err(|e| AppError::storage(e.to_string()))? {
                let json_str: String = row.get(0).map_err(|e| AppError::storage(e.to_string()))?;
                let settings = serde_json::from_str(&json_str).unwrap_or_default();
                Ok(settings)
            } else {
                Ok(AppSettingsDto::default())
            }
        })
    }

    /// Persists application settings to database.
    pub fn save_settings(&self, settings: &AppSettingsDto) -> Result<(), AppError> {
        let json_str = serde_json::to_string(settings).unwrap_or_default();
        let now = chrono::Utc::now().to_rfc3339();

        self.db.with_conn(|conn| {
            conn.execute(
                r#"
                INSERT INTO app_settings (key, value, updated_at)
                VALUES (?1, ?2, ?3)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
                "#,
                params![SETTINGS_KEY, json_str, now],
            )
            .map_err(|e| AppError::storage(e.to_string()))?;
            Ok(())
        })
    }

    /// Clears cached usage records while preserving site configurations.
    pub fn clear_local_cache(&self) -> Result<(), AppError> {
        self.db.with_conn(|conn| {
            conn.execute("DELETE FROM usage_records", [])
                .map_err(|e| AppError::storage(e.to_string()))?;
            Ok(())
        })
    }
}
