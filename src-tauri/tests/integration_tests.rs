use std::sync::Arc;
use chrono::{Duration, Utc};
use uuid::Uuid;

use ai_gateway_desk_lib::app::{ConfigService, RefreshService, SiteService, StatsService};
use ai_gateway_desk_lib::domain::capability::SiteCapabilities;
use ai_gateway_desk_lib::domain::site::{ProviderType, Site};
use ai_gateway_desk_lib::domain::usage::{UsageRecord, UsageSource};
use ai_gateway_desk_lib::dto::SaveSiteRequest;
use ai_gateway_desk_lib::infra::storage::db::Database;
use ai_gateway_desk_lib::infra::storage::site_repo::SiteRepository;
use ai_gateway_desk_lib::infra::storage::usage_repo::UsageRepository;

#[tokio::test]
async fn test_full_mvp_workflow() {
    let db = Arc::new(Database::in_memory().expect("in-memory db init failed"));
    let site_service = Arc::new(SiteService::new(db.clone()));
    let refresh_service = Arc::new(RefreshService::new(db.clone()));
    let stats_service = Arc::new(StatsService::new(db.clone()));
    let config_service = Arc::new(ConfigService::new(db.clone()));

    // 1. User configures a new One-API site
    let save_req = SaveSiteRequest {
        id: None,
        name: "Primary Hub".to_string(),
        provider: ProviderType::OneApi,
        base_url: "https://api.oneapi.hub".to_string(),
        auth_token: "sk-primary-test-key".to_string(),
        admin_token: None,
        enabled: true,
    };
    let site_resp = site_service.save_site(save_req).await.expect("save site failed");
    assert_eq!(site_resp.name, "Primary Hub");
    assert!(site_resp.has_auth_token);

    // 2. Direct balance & window quota updates
    let site_repo = SiteRepository::new(&db);
    let mut site = site_repo.get_by_id(&site_resp.id).expect("get site failed").expect("site exists");
    
    // Simulate direct balance sync (e.g. $42.50) without Quota conversions
    site.record_success(Some(42.50), Some("USD".to_string()), None, None);
    site_repo.save(&site).expect("save balance failed");

    let updated_site = site_repo.get_by_id(&site_resp.id).expect("get site").expect("found");
    assert_eq!(updated_site.current_balance, Some(42.50));

    // 3. Usage records synchronization & Prompt Cache calculation
    let usage_repo = UsageRepository::new(&db);
    let now = Utc::now();
    let sample_logs = vec![
        UsageRecord {
            id: Uuid::new_v4(),
            site_id: site.id,
            server_record_id: "log_001".to_string(),
            timestamp: now - Duration::minutes(30),
            model_raw: "claude-3-5-sonnet-20241022".to_string(),
            model_normalized: "claude-3-5-sonnet".to_string(),
            input_tokens: 5000,
            output_tokens: 1000,
            cache_read_tokens: 4000,
            cache_write_tokens: 500,
            request_count: 1,
            source: UsageSource::GatewayServer,
            synced_at: now,
        },
        UsageRecord {
            id: Uuid::new_v4(),
            site_id: site.id,
            server_record_id: "log_002".to_string(),
            timestamp: now - Duration::minutes(15),
            model_raw: "gpt-4o".to_string(),
            model_normalized: "gpt-4o".to_string(),
            input_tokens: 2000,
            output_tokens: 500,
            cache_read_tokens: 1000,
            cache_write_tokens: 0,
            request_count: 1,
            source: UsageSource::GatewayServer,
            synced_at: now,
        },
    ];

    let inserted = usage_repo.insert_batch(&sample_logs).expect("insert usage failed");
    assert_eq!(inserted, 2);

    // 4. Query Stats Service metrics
    let metrics = stats_service.get_site_metrics(&site.id, now - Duration::hours(1), now + Duration::hours(1))
        .expect("query metrics failed");

    assert_eq!(metrics.total_requests, 2);
    assert_eq!(metrics.total_input_tokens, 7000);
    assert_eq!(metrics.total_output_tokens, 1500);
    assert_eq!(metrics.total_cache_read_tokens, 5000);
    // Cache Hit Rate = 5000 / 7000 * 100% ≈ 71.428%
    let hit_rate = metrics.cache_hit_rate_pct.expect("has hit rate");
    assert!((hit_rate - 71.428).abs() < 0.01);

    // 5. Query Model Breakdown
    let breakdown = stats_service.get_models_breakdown(&site.id, now - Duration::hours(1), now + Duration::hours(1))
        .expect("query models breakdown failed");
    assert_eq!(breakdown.len(), 2);
    assert_eq!(breakdown[0].model_name, "claude-3-5-sonnet");
    assert_eq!(breakdown[0].cache_hit_rate_pct, Some(80.0)); // 4000 / 5000 * 100%

    // 6. Test settings update & clear cache
    let settings = config_service.get_settings().expect("get settings");
    assert_eq!(settings.refresh_interval_secs, 60);

    config_service.clear_local_cache().expect("clear cache");
    let after_clear = stats_service.get_site_metrics(&site.id, now - Duration::hours(1), now + Duration::hours(1))
        .expect("query metrics after clear");
    assert_eq!(after_clear.total_requests, 0);
}
