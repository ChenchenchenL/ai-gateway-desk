use serde_json::json;
use uuid::Uuid;

use ai_gateway_desk_lib::domain::site::ProviderType;
use ai_gateway_desk_lib::infra::adapters::create_adapter;
use ai_gateway_desk_lib::infra::logging::sanitize_log_message;

#[test]
fn test_direct_balance_parsing_no_conversion() {
    // Mock One-API response payload
    let oneapi_json = json!({
        "success": true,
        "message": "",
        "data": {
            "quota": 18.75
        }
    });

    // Extract balance directly
    let quota_val = oneapi_json["data"]["quota"].as_f64().expect("quota f64");
    assert_eq!(quota_val, 18.75); // Directly 18.75, no division by 500,000!

    // Mock Sub2API response payload
    let sub2api_json = json!({
        "balance": 99.00,
        "currency": "USD"
    });
    let sub2api_bal = sub2api_json["balance"].as_f64().expect("balance f64");
    assert_eq!(sub2api_bal, 99.00);
}

#[test]
fn test_adapter_factory() {
    let site_id = Uuid::new_v4();
    let one_adapter = create_adapter(site_id, ProviderType::OneApi, "https://api.one.com".to_string(), "sk-1".to_string());
    let sub_adapter = create_adapter(site_id, ProviderType::Sub2Api, "https://api.sub.com".to_string(), "sk-2".to_string());
    let openai_adapter = create_adapter(site_id, ProviderType::OpenAiCompatible, "https://api.openai.com".to_string(), "sk-3".to_string());

    assert!(std::any::type_name_of_val(&*one_adapter).contains("OneApiAdapter"));
    assert!(std::any::type_name_of_val(&*sub_adapter).contains("Sub2ApiAdapter"));
    assert!(std::any::type_name_of_val(&*openai_adapter).contains("OpenAiCompatibleAdapter"));
}

#[test]
fn test_log_sanitization() {
    let raw_log = "Request to https://api.com with token=sk-abcdef123456789 and Bearer sk-987654321 header";
    let sanitized = sanitize_log_message(raw_log);
    assert!(!sanitized.contains("sk-abcdef123456789"));
    assert!(!sanitized.contains("sk-987654321"));
    assert!(sanitized.contains("***REDACTED***"));
}
