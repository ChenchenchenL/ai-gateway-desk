//! AI Gateway Desk Library Root
//!
//! Exposes Tauri application builder, state management, and plugin setup.

pub mod app;
pub mod commands;
pub mod domain;
pub mod dto;
pub mod infra;

use std::sync::Arc;
use std::time::Duration;
use tauri::Manager;

use app::{ConfigService, RefreshService, SiteService, StatsService};
use infra::storage::Database;

/// App runtime state holding references to application services.
pub struct AppState {
    pub db: Arc<Database>,
    pub site_service: Arc<SiteService>,
    pub refresh_service: Arc<RefreshService>,
    pub stats_service: Arc<StatsService>,
    pub config_service: Arc<ConfigService>,
}

/// Runs the Tauri desktop application.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    infra::logging::init_logging();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::list_sites,
            commands::test_connection,
            commands::save_site,
            commands::delete_site,
            commands::refresh_site,
            commands::refresh_all_sites,
            commands::get_site_stats,
            commands::get_models_breakdown,
            commands::get_settings,
            commands::save_settings,
            commands::clear_cache,
            commands::set_always_on_top,
            commands::hide_to_tray,
            commands::show_window,
        ])
        .setup(|app| {
            let data_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let _ = std::fs::create_dir_all(&data_dir);
            let db_path = data_dir.join("ai_gateway_desk.db");

            let db = Arc::new(Database::open(db_path)?);
            infra::storage::secure_store::init_secure_store_db(db.clone());
            let site_service = Arc::new(SiteService::new(db.clone()));
            let refresh_service = Arc::new(RefreshService::new(db.clone()));
            let stats_service = Arc::new(StatsService::new(db.clone()));
            let config_service = Arc::new(ConfigService::new(db.clone()));

            let app_state = AppState {
                db,
                site_service,
                refresh_service: refresh_service.clone(),
                stats_service,
                config_service: config_service.clone(),
            };
            app.manage(app_state);

            // Spawn auto-refresh background ticker
            spawn_auto_refresh_loop(refresh_service, config_service);

            // Enable native Mica / Acrylic glass effect on Windows or Vibrancy on macOS
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                {
                    let _ = window_vibrancy::apply_acrylic(&window, Some((18, 22, 34, 120)))
                        .or_else(|_| window_vibrancy::apply_mica(&window, Some(true)));
                }

                #[cfg(target_os = "macos")]
                {
                    let _ = window_vibrancy::apply_vibrancy(
                        &window,
                        window_vibrancy::NSVisualEffectMaterial::UnderWindowBackground,
                        None,
                        None,
                    );
                }
            }

            // Configure tray
            infra::tray::setup_tray(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AI Gateway Desk application");
}

/// Spawns periodic background runner checking auto-refresh preference.
fn spawn_auto_refresh_loop(refresh_service: Arc<RefreshService>, config_service: Arc<ConfigService>) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            if let Ok(settings) = config_service.get_settings() {
                if settings.auto_refresh {
                    let _ = refresh_service.refresh_all().await;
                }
            }
        }
    });
}
