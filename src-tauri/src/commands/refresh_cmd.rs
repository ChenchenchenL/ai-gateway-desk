use std::collections::HashMap;
use tauri::{command, State};
use uuid::Uuid;

use crate::AppState;

/// Performs direct HTTP GET request on behalf of frontend.
#[command]
pub async fn proxy_http_get(url: String, headers: Option<HashMap<String, String>>) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.get(&url);
    if let Some(hdrs) = headers {
        for (k, v) in hdrs {
            req = req.header(k, v);
        }
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let text = resp.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

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
