//! Secure credential storage using OS keyring / Windows DPAPI with persistent database fallback

use std::collections::HashMap;
use std::sync::OnceLock;
use parking_lot::RwLock;
use keyring::Entry;
use rusqlite::params;
use uuid::Uuid;

use crate::domain::error::AppError;

const SERVICE_NAME: &str = "ai_gateway_desk";

static MEMORY_FALLBACK: OnceLock<RwLock<HashMap<String, String>>> = OnceLock::new();
static DB_FALLBACK: OnceLock<std::sync::Arc<crate::infra::storage::Database>> = OnceLock::new();

fn fallback_store() -> &'static RwLock<HashMap<String, String>> {
    MEMORY_FALLBACK.get_or_init(|| RwLock::new(HashMap::new()))
}

/// Initializes database handle for secure store fallback.
pub fn init_secure_store_db(db: std::sync::Arc<crate::infra::storage::Database>) {
    let _ = DB_FALLBACK.set(db);
}

/// Secure store managing sensitive tokens via Windows DPAPI, persistent SQLite, and memory fallback.
pub struct SecureStore;

impl SecureStore {
    /// Saves an authentication token for a given site ID.
    pub fn set_auth_token(site_id: &Uuid, token: &str) -> Result<(), AppError> {
        let key = format!("site_auth_{}", site_id);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            let _ = entry.set_password(token);
        }
        fallback_store().write().insert(key, token.to_string());

        // Persistent SQLite fallback
        if let Some(db) = DB_FALLBACK.get() {
            let now = chrono::Utc::now().to_rfc3339();
            let _ = db.with_conn(|conn| {
                conn.execute(
                    r#"
                    INSERT INTO site_credentials (site_id, auth_token, updated_at)
                    VALUES (?1, ?2, ?3)
                    ON CONFLICT(site_id) DO UPDATE SET
                        auth_token = excluded.auth_token,
                        updated_at = excluded.updated_at
                    "#,
                    params![site_id.to_string(), token, now],
                )?;
                Ok(())
            });
        }

        Ok(())
    }

    /// Retrieves the authentication token for a given site ID.
    pub fn get_auth_token(site_id: &Uuid) -> Result<Option<String>, AppError> {
        let key = format!("site_auth_{}", site_id);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            if let Ok(pwd) = entry.get_password() {
                if !pwd.trim().is_empty() {
                    return Ok(Some(pwd));
                }
            }
        }
        {
            let store = fallback_store().read();
            if let Some(val) = store.get(&key) {
                if !val.trim().is_empty() {
                    return Ok(Some(val.clone()));
                }
            }
        }

        // Persistent SQLite fallback
        if let Some(db) = DB_FALLBACK.get() {
            let res = db.with_conn(|conn| {
                let mut stmt = conn.prepare("SELECT auth_token FROM site_credentials WHERE site_id = ?1")?;
                let mut rows = stmt.query([site_id.to_string()])?;
                if let Some(row) = rows.next()? {
                    let tok: String = row.get(0)?;
                    Ok(Some(tok))
                } else {
                    Ok(None)
                }
            });
            if let Ok(Some(token)) = res {
                fallback_store().write().insert(key, token.clone());
                return Ok(Some(token));
            }
        }

        Ok(None)
    }

    /// Saves optional admin query token for a site ID.
    pub fn set_admin_token(site_id: &Uuid, token: &str) -> Result<(), AppError> {
        let key = format!("site_admin_{}", site_id);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            let _ = entry.set_password(token);
        }
        fallback_store().write().insert(key, token.to_string());

        if let Some(db) = DB_FALLBACK.get() {
            let now = chrono::Utc::now().to_rfc3339();
            let _ = db.with_conn(|conn| {
                conn.execute(
                    r#"
                    INSERT INTO site_credentials (site_id, auth_token, admin_token, updated_at)
                    VALUES (?1, '', ?2, ?3)
                    ON CONFLICT(site_id) DO UPDATE SET
                        admin_token = excluded.admin_token,
                        updated_at = excluded.updated_at
                    "#,
                    params![site_id.to_string(), token, now],
                )?;
                Ok(())
            });
        }

        Ok(())
    }

    /// Retrieves optional admin query token for a site ID.
    pub fn get_admin_token(site_id: &Uuid) -> Result<Option<String>, AppError> {
        let key = format!("site_admin_{}", site_id);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            if let Ok(pwd) = entry.get_password() {
                if !pwd.trim().is_empty() {
                    return Ok(Some(pwd));
                }
            }
        }
        {
            let store = fallback_store().read();
            if let Some(val) = store.get(&key) {
                if !val.trim().is_empty() {
                    return Ok(Some(val.clone()));
                }
            }
        }

        if let Some(db) = DB_FALLBACK.get() {
            let res = db.with_conn(|conn| {
                let mut stmt = conn.prepare("SELECT admin_token FROM site_credentials WHERE site_id = ?1")?;
                let mut rows = stmt.query([site_id.to_string()])?;
                if let Some(row) = rows.next()? {
                    let tok: Option<String> = row.get(0)?;
                    Ok(tok)
                } else {
                    Ok(None)
                }
            });
            if let Ok(Some(token)) = res {
                fallback_store().write().insert(key, token.clone());
                return Ok(Some(token));
            }
        }

        Ok(None)
    }

    /// Deletes both auth and admin credentials for a site.
    pub fn delete_tokens(site_id: &Uuid) -> Result<(), AppError> {
        let auth_key = format!("site_auth_{}", site_id);
        let admin_key = format!("site_admin_{}", site_id);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &auth_key) {
            let _ = entry.delete_credential();
        }
        if let Ok(entry) = Entry::new(SERVICE_NAME, &admin_key) {
            let _ = entry.delete_credential();
        }
        let mut store = fallback_store().write();
        store.remove(&auth_key);
        store.remove(&admin_key);

        if let Some(db) = DB_FALLBACK.get() {
            let _ = db.with_conn(|conn| {
                conn.execute("DELETE FROM site_credentials WHERE site_id = ?1", [site_id.to_string()])?;
                Ok(())
            });
        }

        Ok(())
    }
}
