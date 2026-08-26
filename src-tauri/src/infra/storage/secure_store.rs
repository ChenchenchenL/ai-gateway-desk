//! Secure credential storage using OS keyring / Windows DPAPI with memory fallback

use std::collections::HashMap;
use std::sync::OnceLock;
use parking_lot::RwLock;
use keyring::Entry;
use uuid::Uuid;

use crate::domain::error::{AppError, ErrorCategory};

const SERVICE_NAME: &str = "ai_gateway_desk";

static MEMORY_FALLBACK: OnceLock<RwLock<HashMap<String, String>>> = OnceLock::new();

fn fallback_store() -> &'static RwLock<HashMap<String, String>> {
    MEMORY_FALLBACK.get_or_init(|| RwLock::new(HashMap::new()))
}

/// Secure store managing sensitive tokens.
pub struct SecureStore;

impl SecureStore {
    /// Saves an authentication token for a given site ID.
    pub fn set_auth_token(site_id: &Uuid, token: &str) -> Result<(), AppError> {
        let key = format!("site_auth_{}", site_id);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            if entry.set_password(token).is_ok() {
                return Ok(());
            }
        }
        // Fallback store
        fallback_store().write().insert(key, token.to_string());
        Ok(())
    }

    /// Retrieves the authentication token for a given site ID.
    pub fn get_auth_token(site_id: &Uuid) -> Result<Option<String>, AppError> {
        let key = format!("site_auth_{}", site_id);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            if let Ok(pwd) = entry.get_password() {
                return Ok(Some(pwd));
            }
        }
        // Fallback store
        let store = fallback_store().read();
        Ok(store.get(&key).cloned())
    }

    /// Saves optional admin query token for a site ID.
    pub fn set_admin_token(site_id: &Uuid, token: &str) -> Result<(), AppError> {
        let key = format!("site_admin_{}", site_id);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            if entry.set_password(token).is_ok() {
                return Ok(());
            }
        }
        fallback_store().write().insert(key, token.to_string());
        Ok(())
    }

    /// Retrieves optional admin query token for a site ID.
    pub fn get_admin_token(site_id: &Uuid) -> Result<Option<String>, AppError> {
        let key = format!("site_admin_{}", site_id);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &key) {
            if let Ok(pwd) = entry.get_password() {
                return Ok(Some(pwd));
            }
        }
        let store = fallback_store().read();
        Ok(store.get(&key).cloned())
    }

    /// Deletes credentials associated with a site.
    pub fn delete_tokens(site_id: &Uuid) -> Result<(), AppError> {
        let auth_key = format!("site_auth_{}", site_id);
        let admin_key = format!("site_admin_{}", site_id);
        if let Ok(entry) = Entry::new(SERVICE_NAME, &auth_key) {
            let _ = entry.delete_password();
        }
        if let Ok(entry) = Entry::new(SERVICE_NAME, &admin_key) {
            let _ = entry.delete_password();
        }
        let mut store = fallback_store().write();
        store.remove(&auth_key);
        store.remove(&admin_key);
        Ok(())
    }
}
