//! Site application service
//!
//! Manages site lifecycle, connection testing, capability discovery, and secure credentials.

use std::sync::Arc;
use uuid::Uuid;

use crate::domain::capability::SiteCapabilities;
use crate::domain::error::{AppError, ErrorCategory};
use crate::domain::site::Site;
use crate::dto::{SaveSiteRequest, SiteResponse, TestConnectionRequest};
use crate::infra::adapters::create_adapter;
use crate::infra::storage::{secure_store::SecureStore, site_repo::SiteRepository, Database};

/// Service managing site configurations and credentials.
pub struct SiteService {
    db: Arc<Database>,
}

impl SiteService {
    /// Creates a new SiteService instance.
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Tests connection and probes capabilities for a candidate site configuration.
    pub async fn test_connection(&self, req: &TestConnectionRequest) -> Result<SiteCapabilities, AppError> {
        let temp_id = Uuid::new_v4();
        let adapter = create_adapter(temp_id, req.provider, req.base_url.clone(), req.auth_token.clone());
        adapter.probe_capabilities().await
    }

    /// Lists all registered sites formatted as UI responses.
    pub fn list_sites(&self) -> Result<Vec<SiteResponse>, AppError> {
        let repo = SiteRepository::new(&self.db);
        let sites = repo.list_all()?;
        let responses = sites
            .iter()
            .map(|site| {
                let has_token = SecureStore::get_auth_token(&site.id).ok().flatten().is_some();
                let mut resp = SiteResponse::from(site);
                resp.has_auth_token = has_token;
                resp
            })
            .collect();
        Ok(responses)
    }

    /// Saves (creates or updates) a site configuration and securely stores its tokens.
    pub async fn save_site(&self, req: SaveSiteRequest) -> Result<SiteResponse, AppError> {
        if req.name.trim().is_empty() {
            return Err(AppError::new(ErrorCategory::Parse, "Site name cannot be empty"));
        }
        if req.base_url.trim().is_empty() {
            return Err(AppError::new(ErrorCategory::Parse, "Base URL cannot be empty"));
        }

        let mut clean_url = req.base_url.trim().trim_end_matches('/').to_string();
        if !clean_url.starts_with("http://") && !clean_url.starts_with("https://") {
            clean_url = format!("https://{}", clean_url);
        }

        let id = req.id.unwrap_or_else(Uuid::new_v4);
        let repo = SiteRepository::new(&self.db);
        let existing = repo.get_by_id(&id)?;

        // Probe capabilities with provided token
        let adapter = create_adapter(id, req.provider, clean_url.clone(), req.auth_token.clone());
        let capabilities = adapter.probe_capabilities().await.unwrap_or_else(|_| {
            existing.as_ref().map(|s| s.capabilities).unwrap_or_default()
        });

        let mut site = match existing {
            Some(mut s) => {
                s.name = req.name;
                s.provider = req.provider;
                s.base_url = clean_url;
                s.enabled = req.enabled;
                s.capabilities = capabilities;
                s.updated_at = chrono::Utc::now();
                s
            }
            None => Site::new(req.name, req.provider, clean_url, capabilities),
        };
        site.id = id;

        repo.save(&site)?;
        SecureStore::set_auth_token(&id, &req.auth_token)?;
        if let Some(ref admin) = req.admin_token {
            SecureStore::set_admin_token(&id, admin)?;
        }

        let mut resp = SiteResponse::from(&site);
        resp.has_auth_token = true;
        Ok(resp)
    }

    /// Deletes a site and clears its associated tokens.
    pub fn delete_site(&self, id: &Uuid) -> Result<(), AppError> {
        let repo = SiteRepository::new(&self.db);
        repo.delete(id)?;
        SecureStore::delete_tokens(id)?;
        Ok(())
    }
}
