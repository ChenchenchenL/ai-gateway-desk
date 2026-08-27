//! Refresh application service
//!
//! Coordinates concurrent site querying, deduplication, and caching.

use std::collections::HashSet;
use std::sync::Arc;
use chrono::{Duration, Utc};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::domain::error::AppError;
use crate::infra::adapters::create_adapter;
use crate::infra::storage::{
    db::Database, secure_store::SecureStore, site_repo::SiteRepository, usage_repo::UsageRepository,
};
use super::alert_service::AlertService;

/// Service coordinating manual and background site data refresh.
pub struct RefreshService {
    db: Arc<Database>,
    in_flight_refreshes: Mutex<HashSet<Uuid>>,
}

impl RefreshService {
    /// Creates a new RefreshService instance.
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            db,
            in_flight_refreshes: Mutex::new(HashSet::new()),
        }
    }

    /// Triggers immediate refresh for a single site, reusing ongoing request if already in-flight.
    pub async fn refresh_site(&self, site_id: Uuid) -> Result<(), AppError> {
        {
            let mut in_flight = self.in_flight_refreshes.lock().await;
            if in_flight.contains(&site_id) {
                return Ok(());
            }
            in_flight.insert(site_id);
        }

        let result = self.execute_site_refresh(site_id).await;

        {
            let mut in_flight = self.in_flight_refreshes.lock().await;
            in_flight.remove(&site_id);
        }

        result
    }

    /// Executes the actual adapter queries and database updates for a site.
    async fn execute_site_refresh(&self, site_id: Uuid) -> Result<(), AppError> {
        let repo = SiteRepository::new(&self.db);
        let mut site = match repo.get_by_id(&site_id)? {
            Some(s) => s,
            None => return Ok(()),
        };

        let token = match SecureStore::get_auth_token(&site_id)? {
            Some(t) => t,
            None => {
                site.record_failure("Missing authentication token".to_string());
                repo.save(&site)?;
                return Ok(());
            }
        };

        let adapter = create_adapter(site.id, site.provider, site.base_url.clone(), token);
        let prev_failures = site.failure_count;

        let balance_res = adapter.fetch_balance().await;
        let window_res = adapter.fetch_window_quota().await;
        let now = Utc::now();
        let usage_res = adapter.fetch_usage(now - Duration::hours(72), now).await;

        let has_balance = balance_res.is_ok();
        let has_usage = usage_res.as_ref().map(|r| !r.is_empty()).unwrap_or(false);

        if has_balance || has_usage || usage_res.is_ok() {
            let bal_info = balance_res.ok();
            let window_info = window_res.ok();
            let window_rem = window_info.as_ref().and_then(|w| w.remaining_quota);
            let window_rst = window_info.as_ref().and_then(|w| w.reset_at);

            let new_balance = bal_info.as_ref().and_then(|b| b.balance).or(site.current_balance);
            let new_currency = bal_info.map(|b| b.currency).unwrap_or_else(|| site.currency.clone());

            site.record_success(new_balance, Some(new_currency), window_rem, window_rst);
            repo.save(&site)?;

            if let Ok(records) = usage_res {
                if !records.is_empty() {
                    let usage_repo = UsageRepository::new(&self.db);
                    let _ = usage_repo.insert_batch(&records);
                }
            }

            if prev_failures >= 3 {
                let _ = AlertService::notify_recovery(&site.name);
            }
        } else {
            let err_msg = balance_res.err().map(|e| e.message)
                .or_else(|| usage_res.err().map(|e| e.message))
                .unwrap_or_else(|| "Unknown sync failure".to_string());

            site.record_failure(err_msg);
            repo.save(&site)?;
            let _ = AlertService::check_consecutive_failures(&site.name, site.failure_count);
        }

        Ok(())
    }

    /// Sequentially refreshes all enabled sites.
    pub async fn refresh_all(&self) -> Result<(), AppError> {
        let repo = SiteRepository::new(&self.db);
        let sites = repo.list_all()?;
        let enabled_ids: Vec<Uuid> = sites
            .into_iter()
            .filter(|s| s.enabled)
            .map(|s| s.id)
            .collect();

        for site_id in enabled_ids {
            let _ = self.refresh_site(site_id).await;
        }
        Ok(())
    }
}
