import { invoke } from "@tauri-apps/api/core";
import { AppSettings, Site, SiteCapabilities } from "../types";

/**
 * Checks if the frontend is currently running inside the Tauri native runtime.
 */
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
        (window as unknown as { __TAURI__?: unknown }).__TAURI__
    )
  );
}

// In-memory mock state for web browser preview mode
let mockSites: Site[] = [
  {
    id: "mock-site-1",
    name: "主号 One-API 聚合",
    provider: "one_api",
    base_url: "https://api.one-api.com",
    enabled: true,
    capabilities: {
      balance: true,
      usage: true,
      model_usage: true,
      cache_usage: true,
      window_quota: false,
    },
    current_balance: 18.5,
    currency: "USD",
    last_success_at: new Date().toISOString(),
    failure_count: 0,
    has_auth_token: true,
  },
  {
    id: "mock-site-2",
    name: "Claude Team 订阅网关",
    provider: "sub2_api",
    base_url: "https://sub.sub2api.com",
    enabled: true,
    capabilities: {
      balance: true,
      usage: true,
      model_usage: true,
      cache_usage: true,
      window_quota: true,
    },
    current_balance: 99.0,
    currency: "USD",
    window_remaining_quota: 85,
    window_reset_at: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
    last_success_at: new Date().toISOString(),
    failure_count: 0,
    has_auth_token: true,
  },
];

let mockSettings: AppSettings = {
  auto_refresh: true,
  refresh_interval_secs: 60,
  always_on_top: false,
  opacity_pct: 100,
  low_balance_threshold: 5.0,
  notify_on_failure: true,
};

/**
 * Safe IPC invoke wrapper that seamlessly falls back to mock responses in pure browser environments.
 */
export async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    try {
      return await invoke<T>(cmd, args);
    } catch (err) {
      throw err;
    }
  }

  // Browser Mock Handlers
  switch (cmd) {
    case "list_sites":
      return [...mockSites] as T;

    case "test_connection": {
      const caps: SiteCapabilities = {
        balance: true,
        usage: true,
        model_usage: true,
        cache_usage: true,
        window_quota: (args?.req as { provider?: string })?.provider === "sub2_api",
      };
      return caps as T;
    }

    case "save_site": {
      const req = (args?.req || {}) as {
        id?: string;
        name: string;
        provider: string;
        base_url: string;
        enabled: boolean;
      };
      const id = req.id || `site-${Date.now()}`;
      const savedSite: Site = {
        id,
        name: req.name || "新站点",
        provider: (req.provider || "one_api") as Site["provider"],
        base_url: req.base_url || "https://api.example.com",
        enabled: req.enabled ?? true,
        capabilities: {
          balance: true,
          usage: true,
          model_usage: true,
          cache_usage: true,
          window_quota: req.provider === "sub2_api",
        },
        current_balance: 20.0,
        currency: "USD",
        window_remaining_quota: req.provider === "sub2_api" ? 90 : undefined,
        last_success_at: new Date().toISOString(),
        failure_count: 0,
        has_auth_token: true,
      };

      const idx = mockSites.findIndex((s) => s.id === id);
      if (idx >= 0) {
        mockSites[idx] = savedSite;
      } else {
        mockSites.push(savedSite);
      }
      return savedSite as T;
    }

    case "delete_site": {
      const id = args?.id as string;
      mockSites = mockSites.filter((s) => s.id !== id);
      return undefined as T;
    }

    case "refresh_site":
    case "refresh_all_sites":
      return undefined as T;

    case "get_site_stats":
      return {
        total_requests: 128,
        total_input_tokens: 850000,
        total_output_tokens: 120000,
        total_cache_read_tokens: 610000,
        total_cache_write_tokens: 95000,
        cache_hit_rate_pct: 71.76,
      } as T;

    case "get_models_breakdown":
      return [
        {
          model_name: "claude-3-5-sonnet-20241022",
          request_count: 94,
          input_tokens: 650000,
          output_tokens: 90000,
          cache_read_tokens: 520000,
          cache_write_tokens: 75000,
          cache_hit_rate_pct: 80.0,
        },
        {
          model_name: "gpt-4o",
          request_count: 34,
          input_tokens: 200000,
          output_tokens: 30000,
          cache_read_tokens: 90000,
          cache_write_tokens: 20000,
          cache_hit_rate_pct: 45.0,
        },
      ] as T;

    case "get_settings":
      return { ...mockSettings } as T;

    case "save_settings":
      mockSettings = { ...(args?.settings as AppSettings) };
      return undefined as T;

    case "clear_cache":
    case "set_always_on_top":
    case "hide_to_tray":
    case "show_window":
      return undefined as T;

    default:
      return undefined as T;
  }
}
