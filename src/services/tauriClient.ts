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

const STORAGE_SITES_KEY = "ai_gateway_desk_sites";
const STORAGE_SETTINGS_KEY = "ai_gateway_desk_settings";

function getInitialSites(): Site[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_SITES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  return [
    {
      id: "mock-site-1",
      name: "主号 One-API / New-API 聚合",
      provider: "new_api",
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
      name: "Claude Team 订阅池网关",
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
}

function getInitialSettings(): AppSettings {
  if (typeof window === "undefined") {
    return {
      auto_refresh: true,
      refresh_interval_secs: 60,
      always_on_top: false,
      opacity_pct: 100,
      low_balance_threshold: 5.0,
      notify_on_failure: true,
    };
  }
  const stored = localStorage.getItem(STORAGE_SETTINGS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  return {
    auto_refresh: true,
    refresh_interval_secs: 60,
    always_on_top: false,
    opacity_pct: 100,
    low_balance_threshold: 5.0,
    notify_on_failure: true,
  };
}

let mockSites: Site[] = getInitialSites();
let mockSettings: AppSettings = getInitialSettings();

function saveLocalSites() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_SITES_KEY, JSON.stringify(mockSites));
  }
}

function saveLocalSettings() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(mockSettings));
  }
}

/**
 * Safe IPC invoke wrapper that falls back to full interactive localStorage persistence in pure web browser environments.
 */
export async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    try {
      return await invoke<T>(cmd, args);
    } catch (err) {
      throw err;
    }
  }

  // Browser Mock & LocalStorage Interactive Mode
  switch (cmd) {
    case "list_sites":
      return [...mockSites] as T;

    case "test_connection": {
      const req = (args?.req || {}) as {
        provider?: string;
        base_url?: string;
        auth_token?: string;
      };
      
      // Attempt browser direct fetch if URL provided
      if (req.base_url && req.auth_token) {
        try {
          const res = await fetch(`${req.base_url.replace(/\/+$/, "")}/api/user/self`, {
            headers: { Authorization: `Bearer ${req.auth_token}` },
            mode: "cors",
          });
          if (res.ok) {
            return {
              balance: true,
              usage: true,
              model_usage: true,
              cache_usage: req.provider === "new_api",
              window_quota: req.provider === "sub2_api",
            } as T;
          }
        } catch {
          // CORS or offline, fallback to simulation
        }
      }

      const caps: SiteCapabilities = {
        balance: true,
        usage: true,
        model_usage: true,
        cache_usage: req.provider === "new_api",
        window_quota: req.provider === "sub2_api",
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
          cache_usage: req.provider === "new_api",
          window_quota: req.provider === "sub2_api",
        },
        current_balance: 28.50,
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
      saveLocalSites();
      return savedSite as T;
    }

    case "delete_site": {
      const id = args?.id as string;
      mockSites = mockSites.filter((s) => s.id !== id);
      saveLocalSites();
      return undefined as T;
    }

    case "refresh_site": {
      const siteId = args?.siteId as string;
      const target = mockSites.find((s) => s.id === siteId);
      if (target) {
        target.last_success_at = new Date().toISOString();
        target.failure_count = 0;
        target.last_error = undefined;
        saveLocalSites();
      }
      return undefined as T;
    }

    case "refresh_all_sites": {
      for (const s of mockSites) {
        s.last_success_at = new Date().toISOString();
        s.failure_count = 0;
        s.last_error = undefined;
      }
      saveLocalSites();
      return undefined as T;
    }

    case "get_site_stats":
      return {
        total_requests: 168,
        total_input_tokens: 1250000,
        total_output_tokens: 180000,
        total_cache_read_tokens: 950000,
        total_cache_write_tokens: 120000,
        cache_hit_rate_pct: 76.0,
      } as T;

    case "get_models_breakdown":
      return [
        {
          model_name: "claude-3-5-sonnet-20241022",
          request_count: 124,
          input_tokens: 980000,
          output_tokens: 140000,
          cache_read_tokens: 810000,
          cache_write_tokens: 95000,
          cache_hit_rate_pct: 82.65,
        },
        {
          model_name: "gpt-4o",
          request_count: 44,
          input_tokens: 270000,
          output_tokens: 40000,
          cache_read_tokens: 140000,
          cache_write_tokens: 25000,
          cache_hit_rate_pct: 51.85,
        },
      ] as T;

    case "get_settings":
      return { ...mockSettings } as T;

    case "save_settings":
      mockSettings = { ...(args?.settings as AppSettings) };
      saveLocalSettings();
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
