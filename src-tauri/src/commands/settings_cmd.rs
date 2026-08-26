//! Settings Tauri commands

use tauri::{command, State};

use crate::dto::AppSettingsDto;
use crate::AppState;

/// Loads application settings.
#[command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettingsDto, String> {
    state.config_service.get_settings().map_err(|e| e.message)
}

/// Saves application settings.
#[command]
pub async fn save_settings(
    settings: AppSettingsDto,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.config_service.save_settings(&settings).map_err(|e| e.message)
}

/// Clears local cached usage records.
#[command]
pub async fn clear_cache(state: State<'_, AppState>) -> Result<(), String> {
    state.config_service.clear_local_cache().map_err(|e| e.message)
}
