use std::sync::Arc;
use uuid::Uuid;

use ai_gateway_desk_lib::app::{ConfigService, SiteService, StatsService};
use ai_gateway_desk_lib::domain::site::ProviderType;
use ai_gateway_desk_lib::dto::{AppSettingsDto, SaveSiteRequest};
use ai_gateway_desk_lib::infra::storage::db::Database;

#[tokio::test]
async fn test_site_service_lifecycle() {
    let db = Arc::new(Database::in_memory().expect("in-memory db failed"));
    let site_service = SiteService::new(db.clone());

    // 1. Create a site
    let save_req = SaveSiteRequest {
        id: None,
        name: "My OneAPI Hub".to_string(),
        provider: ProviderType::OneApi,
        base_url: "https://hub.example.com".to_string(),
        auth_token: "sk-12345678".to_string(),
        admin_token: None,
        enabled: true,
    };

    let created = site_service.save_site(save_req).await.expect("save site failed");
    assert_eq!(created.name, "My OneAPI Hub");
    assert!(created.has_auth_token);

    // 2. List sites
    let list = site_service.list_sites().expect("list failed");
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].id, created.id);

    // 3. Delete site
    site_service.delete_site(&created.id).expect("delete failed");
    let after_delete = site_service.list_sites().expect("list failed");
    assert_eq!(after_delete.len(), 0);
}

#[test]
fn test_config_service_settings_and_cache() {
    let db = Arc::new(Database::in_memory().expect("in-memory db failed"));
    let config_service = ConfigService::new(db);

    let default_settings = config_service.get_settings().expect("get settings failed");
    assert_eq!(default_settings.refresh_interval_secs, 60);
    assert!(default_settings.auto_refresh);

    let custom_settings = AppSettingsDto {
        auto_refresh: false,
        refresh_interval_secs: 120,
        always_on_top: true,
        opacity_pct: 90,
        low_balance_threshold: 10.0,
        notify_on_failure: true,
    };
    config_service.save_settings(&custom_settings).expect("save settings failed");

    let loaded = config_service.get_settings().expect("get settings failed");
    assert_eq!(loaded.refresh_interval_secs, 120);
    assert!(!loaded.auto_refresh);
    assert!(loaded.always_on_top);

    // Clear cache
    config_service.clear_local_cache().expect("clear cache failed");
}

#[test]
fn test_stats_service_empty_metrics() {
    let db = Arc::new(Database::in_memory().expect("in-memory db failed"));
    let stats_service = StatsService::new(db);

    let site_id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let metrics = stats_service.get_site_metrics(&site_id, now - chrono::Duration::hours(1), now).expect("metrics failed");

    assert_eq!(metrics.total_requests, 0);
    assert_eq!(metrics.cache_hit_rate_pct, None);
}
