//! Refresh Tauri commands

use tauri::{command, State};
use uuid::Uuid;

use crate::AppState;

/// Triggers manual refresh for a single site.
#[command]
pub async fn refresh_site(site_id: Uuid, state: State<'_, AppState>) -> Result<(), String> {
    state.refresh_service.refresh_site(site_id).await.map_err(|e| e.message)
}

/// Triggers manual parallel refresh for all enabled sites.
#[command]
pub async fn refresh_all_sites(state: State<'_, AppState>) -> Result<(), String> {
    state.refresh_service.refresh_all().await.map_err(|e| e.message)
}
