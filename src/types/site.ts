/**
 * Provider protocol types supported by the desktop client.
 */
export type ProviderType =
  | "one_api"
  | "new_api"
  | "sub2_api"
  | "openai_compatible"
  | "anthropic_compatible";

/**
 * Site feature capabilities reported by backend.
 */
export interface SiteCapabilities {
  balance: boolean;
  usage: boolean;
  model_usage: boolean;
  cache_usage: boolean;
  window_quota: boolean;
}

/**
 * Monitored site DTO returned from backend.
 */
export interface Site {
  id: string;
  name: string;
  provider: ProviderType;
  base_url: string;
  enabled: boolean;
  capabilities: SiteCapabilities;
  current_balance?: number;
  currency: string;
  window_remaining_quota?: number;
  window_reset_at?: string;
  last_success_at?: string;
  last_error?: string;
  failure_count: number;
  has_auth_token: boolean;
}

/**
 * Payload to create or update a site.
 */
export interface SaveSiteRequest {
  id?: string;
  name: string;
  provider: ProviderType;
  base_url: string;
  auth_token: string;
  admin_token?: string;
  enabled: boolean;
}

/**
 * Payload to test connection before saving.
 */
export interface TestConnectionRequest {
  provider: ProviderType;
  base_url: string;
  auth_token: string;
  admin_token?: string;
}
