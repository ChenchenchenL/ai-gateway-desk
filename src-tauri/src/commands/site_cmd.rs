//! Site management Tauri commands

use tauri::{command, State};
use uuid::Uuid;

use crate::domain::capability::SiteCapabilities;
use crate::dto::{SaveSiteRequest, SiteResponse, TestConnectionRequest};
use crate::AppState;

/// Lists all configured sites.
#[command]
pub async fn list_sites(state: State<'_, AppState>) -> Result<Vec<SiteResponse>, String> {
    state.site_service.list_sites().map_err(|e| e.message)
}

/// Tests connection and probes capabilities for a candidate site configuration.
#[command]
pub async fn test_connection(
    req: TestConnectionRequest,
    state: State<'_, AppState>,
) -> Result<SiteCapabilities, String> {
    state.site_service.test_connection(&req).await.map_err(|e| e.message)
}

/// Saves (creates or updates) a site configuration and stores tokens.
#[command]
pub async fn save_site(
    req: SaveSiteRequest,
    state: State<'_, AppState>,
) -> Result<SiteResponse, String> {
    state.site_service.save_site(req).await.map_err(|e| e.message)
}

/// Deletes a site by ID.
#[command]
pub async fn delete_site(id: Uuid, state: State<'_, AppState>) -> Result<(), String> {
    state.site_service.delete_site(&id).map_err(|e| e.message)
}
