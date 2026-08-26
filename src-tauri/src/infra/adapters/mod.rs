//! Gateway and Relay Adapters
//!
//! Provides isolated adapters for One-API, New-API, Sub2API, OpenAI, and Anthropic
//! compatible relay endpoints.

pub mod anthropic_compatible;
pub mod newapi;
pub mod oneapi;
pub mod openai_compatible;
pub mod sub2api;
pub mod trait_def;

pub use anthropic_compatible::AnthropicCompatibleAdapter;
pub use newapi::NewApiAdapter;
pub use oneapi::OneApiAdapter;
pub use openai_compatible::OpenAiCompatibleAdapter;
pub use sub2api::Sub2ApiAdapter;
pub use trait_def::{BalanceInfo, GatewayAdapter, WindowQuotaInfo};

use uuid::Uuid;
use crate::domain::site::ProviderType;

/// Factory function to instantiate the correct GatewayAdapter implementation.
pub fn create_adapter(
    site_id: Uuid,
    provider: ProviderType,
    base_url: String,
    token: String,
) -> Box<dyn GatewayAdapter> {
    match provider {
        ProviderType::OneApi => Box::new(OneApiAdapter::new(site_id, base_url, token)),
        ProviderType::NewApi => Box::new(NewApiAdapter::new(site_id, base_url, token)),
        ProviderType::Sub2Api => Box::new(Sub2ApiAdapter::new(site_id, base_url, token)),
        ProviderType::OpenAiCompatible => Box::new(OpenAiCompatibleAdapter::new(site_id, base_url, token)),
        ProviderType::AnthropicCompatible => Box::new(AnthropicCompatibleAdapter::new(site_id, base_url, token)),
    }
}
