use chrono::{Duration, Utc};
use uuid::Uuid;

use ai_gateway_desk_lib::domain::capability::SiteCapabilities;
use ai_gateway_desk_lib::domain::site::{ProviderType, Site};
use ai_gateway_desk_lib::domain::usage::{AggregatedMetrics, UsageRecord, UsageSource};
use ai_gateway_desk_lib::infra::storage::{
    db::Database,
    secure_store::SecureStore,
    site_repo::SiteRepository,
    usage_repo::UsageRepository,
};

#[test]
fn test_cache_hit_rate_calculation() {
    let mut metrics = AggregatedMetrics {
        total_requests: 10,
        total_input_tokens: 1000,
        total_output_tokens: 200,
        total_cache_read_tokens: 450,
        total_cache_write_tokens: 100,
        cache_hit_rate_pct: None,
    };
    metrics.calculate_cache_hit_rate();

    assert_eq!(metrics.cache_hit_rate_pct, Some(45.0));

    let mut zero_input = AggregatedMetrics::default();
    zero_input.calculate_cache_hit_rate();
    assert_eq!(zero_input.cache_hit_rate_pct, None);
}

#[test]
fn test_site_repository_crud() {
    let db = Database::in_memory().expect("in-memory db failed");
    let repo = SiteRepository::new(&db);

    let mut site = Site::new(
        "Test Gateway".to_string(),
        ProviderType::OneApi,
        "https://api.example.com".to_string(),
        SiteCapabilities::one_api_default(),
    );

    // Save initial site
    repo.save(&site).expect("save site failed");

    let all = repo.list_all().expect("list failed");
    assert_eq!(all.len(), 1);
    assert_eq!(all[0].name, "Test Gateway");
    assert_eq!(all[0].current_balance, None);

    // Update with direct balance
    site.record_success(Some(25.50), Some("USD".to_string()), None, None);
    repo.save(&site).expect("update site failed");

    let updated = repo.get_by_id(&site.id).expect("get failed").expect("not found");
    assert_eq!(updated.current_balance, Some(25.50));
    assert_eq!(updated.currency, "USD");

    // Delete
    repo.delete(&site.id).expect("delete failed");
    let after_delete = repo.list_all().expect("list failed");
    assert_eq!(after_delete.len(), 0);
}

#[test]
fn test_usage_repository_deduplication_and_aggregation() {
    let db = Database::in_memory().expect("in-memory db failed");
    let site_repo = SiteRepository::new(&db);
    let usage_repo = UsageRepository::new(&db);

    let site = Site::new(
        "OneAPI Site".to_string(),
        ProviderType::OneApi,
        "https://api.oneapi.com".to_string(),
        SiteCapabilities::one_api_default(),
    );
    site_repo.save(&site).expect("save site failed");

    let now = Utc::now();
    let records = vec![
        UsageRecord {
            id: Uuid::new_v4(),
            site_id: site.id,
            server_record_id: "srv_log_101".to_string(),
            timestamp: now - Duration::minutes(10),
            model_raw: "gpt-4o".to_string(),
            model_normalized: "gpt-4o".to_string(),
            input_tokens: 1000,
            output_tokens: 200,
            cache_read_tokens: 500,
            cache_write_tokens: 0,
            request_count: 1,
            source: UsageSource::GatewayServer,
            synced_at: now,
        },
        UsageRecord {
            id: Uuid::new_v4(),
            site_id: site.id,
            server_record_id: "srv_log_102".to_string(),
            timestamp: now - Duration::minutes(5),
            model_raw: "claude-3-5-sonnet".to_string(),
            model_normalized: "claude-3-5-sonnet".to_string(),
            input_tokens: 2000,
            output_tokens: 400,
            cache_read_tokens: 1000,
            cache_write_tokens: 200,
            request_count: 1,
            source: UsageSource::GatewayServer,
            synced_at: now,
        },
    ];

    // Insert batch
    let inserted = usage_repo.insert_batch(&records).expect("insert failed");
    assert_eq!(inserted, 2);

    // Re-insert same batch (deduplication test)
    let re_inserted = usage_repo.insert_batch(&records).expect("re-insert failed");
    assert_eq!(re_inserted, 0);

    // Aggregate site usage
    let start_time = now - Duration::hours(1);
    let end_time = now + Duration::hours(1);
    let aggregated = usage_repo.aggregate_site_usage(&site.id, start_time, end_time).expect("aggregate failed");

    assert_eq!(aggregated.total_requests, 2);
    assert_eq!(aggregated.total_input_tokens, 3000);
    assert_eq!(aggregated.total_output_tokens, 600);
    assert_eq!(aggregated.total_cache_read_tokens, 1500);
    assert_eq!(aggregated.cache_hit_rate_pct, Some(50.0)); // 1500 / 3000 * 100%

    // Aggregate models usage
    let models = usage_repo.aggregate_models_usage(&site.id, start_time, end_time).expect("models agg failed");
    assert_eq!(models.len(), 2);
    assert_eq!(models[0].model_name, "claude-3-5-sonnet"); // largest tokens first
    assert_eq!(models[0].cache_hit_rate_pct, Some(50.0));
}

#[test]
fn test_secure_store() {
    let site_id = Uuid::new_v4();
    SecureStore::set_auth_token(&site_id, "sk-test-token-12345").expect("set failed");
    let token = SecureStore::get_auth_token(&site_id).expect("get failed");
    assert_eq!(token, Some("sk-test-token-12345".to_string()));

    SecureStore::delete_tokens(&site_id).expect("delete failed");
    let after = SecureStore::get_auth_token(&site_id).expect("get after delete failed");
    assert_eq!(after, None);
}
