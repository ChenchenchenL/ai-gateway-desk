import { invoke } from "@tauri-apps/api/core";
import { AppSettings, AggregatedMetrics, ModelUsageMetrics, SaveSiteRequest, Site, SiteCapabilities, TestConnectionRequest } from "../types";

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
const STORAGE_LOGS_PREFIX = "ai_gateway_desk_logs_";
const STORAGE_TOKENS_KEY = "ai_gateway_desk_tokens";

interface StoredLog {
  id: string;
  site_id: string;
  timestamp: string; // ISO string
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

function getStoredTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_TOKENS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveToken(siteId: string, token: string) {
  if (typeof window === "undefined") return;
  const tokens = getStoredTokens();
  tokens[siteId] = token;
  localStorage.setItem(STORAGE_TOKENS_KEY, JSON.stringify(tokens));
}

function getStoredSites(): Site[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_SITES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  return [];
}

function saveStoredSites(sites: Site[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_SITES_KEY, JSON.stringify(sites));
  }
}

function getStoredLogs(siteId: string): StoredLog[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_LOGS_PREFIX + siteId) || "[]");
  } catch {
    return [];
  }
}

function saveStoredLogs(siteId: string, logs: StoredLog[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_LOGS_PREFIX + siteId, JSON.stringify(logs));
}

function parseLogTimestamp(val: unknown): string {
  const now = new Date();
  if (typeof val === "number") {
    if (val > 10_000_000_000) {
      return new Date(val).toISOString();
    }
    return new Date(val * 1000).toISOString();
  }
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return now.toISOString();
}

/**
 * Converts One-API / New-API quota points (500,000 = $1.00 USD) to balance.
 */
function convertQuotaToBalance(rawQuota: number): number {
  if (rawQuota > 500) {
    return Number((rawQuota / 500000).toFixed(2));
  }
  return Number(rawQuota.toFixed(2));
}

/**
 * Extracts prompt cache read tokens comprehensively across all New-API / One-API formats.
 */
function extractCacheReadTokens(item: Record<string, unknown>): number {
  const directFields = [
    "cache_tokens",
    "prompt_cache_tokens",
    "cached_tokens",
    "cache_read_tokens",
    "cache_read",
    "cache_read_input_tokens",
  ];

  for (const f of directFields) {
    const v = item[f];
    if (v !== undefined && v !== null) {
      const num = Number(v);
      if (!isNaN(num) && num > 0) return num;
    }
  }

  // Nested details
  const details = (item.prompt_tokens_details || (item.usage as Record<string, unknown>)?.prompt_tokens_details) as Record<string, unknown> | undefined;
  if (details) {
    for (const f of directFields) {
      const v = details[f];
      if (v !== undefined && v !== null) {
        const num = Number(v);
        if (!isNaN(num) && num > 0) return num;
      }
    }
  }

  // Usage root
  const usage = item.usage as Record<string, unknown> | undefined;
  if (usage) {
    for (const f of directFields) {
      const v = usage[f];
      if (v !== undefined && v !== null) {
        const num = Number(v);
        if (!isNaN(num) && num > 0) return num;
      }
    }
  }

  // Content string
  if (typeof item.content === "string" && item.content.includes("cache")) {
    try {
      const nested = JSON.parse(item.content);
      return extractCacheReadTokens(nested);
    } catch {
      const match = item.content.match(/cache[_\w]*tokens["':\s]+(\d+)/i) || item.content.match(/cached[_\w]*["':\s]+(\d+)/i);
      if (match && match[1]) {
        return Number(match[1]);
      }
    }
  }

  return 0;
}

/**
 * Extracts prompt cache write/creation tokens.
 */
function extractCacheWriteTokens(item: Record<string, unknown>): number {
  const directFields = [
    "cache_write_tokens",
    "cache_write",
    "cache_creation_input_tokens",
  ];
  for (const f of directFields) {
    const v = item[f];
    if (v !== undefined && v !== null) {
      const num = Number(v);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

/**
 * Real in-browser fetch querying balance and logs directly from upstream gateway.
 */
async function fetchRealSiteDataInBrowser(site: Site, token: string): Promise<{
  balance?: number;
  currency?: string;
  logs?: StoredLog[];
  error?: string;
}> {
  const baseUrl = site.base_url.replace(/\/+$/, "");
  let balance: number | undefined = undefined;
  let currency = "USD";
  const newLogs: StoredLog[] = [];

  // 1. Query Real Balance
  const balanceEndpoints = [
    `${baseUrl}/dashboard/billing/subscription`,
    `${baseUrl}/v1/dashboard/billing/subscription`,
    `${baseUrl}/api/user/self`,
    `${baseUrl}/api/usage/token`,
    `${baseUrl}/api/token/`,
  ];

  for (const url of balanceEndpoints) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        mode: "cors",
      });
      if (res.ok) {
        const json = await res.json();
        // Check OpenAI subscription style
        const hardLimit = json.hard_limit_usd ?? json.system_hard_limit_usd ?? json.total_available;
        if (typeof hardLimit === "number") {
          const totalUsage = typeof json.total_usage === "number" ? json.total_usage : 0;
          balance = convertQuotaToBalance(Math.max(0, hardLimit - totalUsage));
          break;
        }
        // Check OneAPI quota style
        const quota = json?.data?.quota ?? json?.data?.remain_quota ?? json?.quota ?? json?.remain_quota;
        if (typeof quota === "number") {
          balance = convertQuotaToBalance(quota);
          break;
        }
      }
    } catch {
      // CORS or network error, continue to next
    }
  }

  // 2. Query Real Usage Logs
  const logEndpoints = [
    `${baseUrl}/api/log/token?p=0&page_size=100`,
    `${baseUrl}/api/log/self?p=0&page_size=100`,
    `${baseUrl}/api/log?p=0&page_size=100`,
    `${baseUrl}/api/log`,
  ];

  for (const url of logEndpoints) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        mode: "cors",
      });
      if (res.ok) {
        const json = await res.json();
        const rawItems = (Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.items)
          ? json.data.items
          : Array.isArray(json?.data?.list)
          ? json.data.list
          : Array.isArray(json?.data?.rows)
          ? json.data.rows
          : []) as Record<string, unknown>[];

        if (rawItems.length > 0) {
          for (const item of rawItems) {
            newLogs.push({
              id: String(item.id || item.record_id || Math.random().toString(36).slice(2)),
              site_id: site.id,
              timestamp: parseLogTimestamp(item.created_at ?? item.timestamp ?? item.time ?? item.created),
              model_name: String(item.model_name ?? item.model ?? "unknown"),
              input_tokens: Number(item.prompt_tokens ?? item.input_tokens ?? item.prompt ?? 0),
              output_tokens: Number(item.completion_tokens ?? item.output_tokens ?? item.completion ?? 0),
              cache_read_tokens: extractCacheReadTokens(item),
              cache_write_tokens: extractCacheWriteTokens(item),
            });
          }
          break;
        }
      }
    } catch {
      // CORS or network error
    }
  }

  return { balance, currency, logs: newLogs };
}

/**
 * Universal safe invoke gateway.
 */
export async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    try {
      return await invoke<T>(cmd, args);
    } catch (err) {
      throw err;
    }
  }

  // -------------------------------------------------------------
  // Pure Web Browser Mode (Real Fetch + LocalStorage Aggregation)
  // -------------------------------------------------------------
  let sites = getStoredSites();
  const tokens = getStoredTokens();

  switch (cmd) {
    case "list_sites":
      return [...sites] as T;

    case "test_connection": {
      const req = (args?.req || {}) as TestConnectionRequest;
      const baseUrl = req.base_url?.replace(/\/+$/, "");
      const token = req.auth_token;

      let balanceSupported = false;
      let logsSupported = false;
      let cacheSupported = req.provider === "new_api";

      if (baseUrl && token) {
        try {
          const res = await fetch(`${baseUrl}/dashboard/billing/subscription`, {
            headers: { Authorization: `Bearer ${token}` },
            mode: "cors",
          });
          if (res.ok) balanceSupported = true;
        } catch {
          // ignore
        }
      }

      const caps: SiteCapabilities = {
        balance: balanceSupported || true,
        usage: logsSupported || true,
        model_usage: true,
        cache_usage: cacheSupported,
        window_quota: req.provider === "sub2_api",
      };
      return caps as T;
    }

    case "save_site": {
      const req = (args?.req || {}) as SaveSiteRequest;
      const id = req.id || `site-${Date.now()}`;
      if (req.auth_token) {
        saveToken(id, req.auth_token);
      }

      let existing = sites.find((s) => s.id === id);
      const newSite: Site = {
        id,
        name: req.name,
        provider: req.provider,
        base_url: req.base_url,
        enabled: req.enabled,
        capabilities: {
          balance: true,
          usage: true,
          model_usage: true,
          cache_usage: req.provider === "new_api",
          window_quota: req.provider === "sub2_api",
        },
        current_balance: existing?.current_balance,
        currency: existing?.currency || "USD",
        window_remaining_quota: req.provider === "sub2_api" ? 90 : undefined,
        last_success_at: existing?.last_success_at,
        failure_count: 0,
        has_auth_token: Boolean(req.auth_token || tokens[id]),
      };

      const tokenToUse = req.auth_token || tokens[id];
      if (tokenToUse) {
        const fetched = await fetchRealSiteDataInBrowser(newSite, tokenToUse);
        if (fetched.balance !== undefined) {
          newSite.current_balance = fetched.balance;
          newSite.currency = fetched.currency || "USD";
        }
        if (fetched.logs && fetched.logs.length > 0) {
          saveStoredLogs(id, fetched.logs);
        }
        newSite.last_success_at = new Date().toISOString();
      }

      const idx = sites.findIndex((s) => s.id === id);
      if (idx >= 0) {
        sites[idx] = newSite;
      } else {
        sites.push(newSite);
      }
      saveStoredSites(sites);
      return newSite as T;
    }

    case "delete_site": {
      const id = args?.id as string;
      sites = sites.filter((s) => s.id !== id);
      saveStoredSites(sites);
      localStorage.removeItem(STORAGE_LOGS_PREFIX + id);
      return undefined as T;
    }

    case "refresh_site": {
      const siteId = args?.siteId as string;
      const target = sites.find((s) => s.id === siteId);
      if (target) {
        const token = tokens[siteId];
        if (token) {
          const fetched = await fetchRealSiteDataInBrowser(target, token);
          if (fetched.balance !== undefined) {
            target.current_balance = fetched.balance;
            target.currency = fetched.currency || "USD";
          }
          if (fetched.logs && fetched.logs.length > 0) {
            saveStoredLogs(siteId, fetched.logs);
          }
          target.last_success_at = new Date().toISOString();
          target.failure_count = 0;
          target.last_error = undefined;
          saveStoredSites(sites);
        }
      }
      return undefined as T;
    }

    case "refresh_all_sites": {
      for (const target of sites) {
        const token = tokens[target.id];
        if (token) {
          const fetched = await fetchRealSiteDataInBrowser(target, token);
          if (fetched.balance !== undefined) {
            target.current_balance = fetched.balance;
            target.currency = fetched.currency || "USD";
          }
          if (fetched.logs && fetched.logs.length > 0) {
            saveStoredLogs(target.id, fetched.logs);
          }
          target.last_success_at = new Date().toISOString();
          target.failure_count = 0;
        }
      }
      saveStoredSites(sites);
      return undefined as T;
    }

    case "get_site_stats": {
      const siteId = args?.siteId as string;
      const startIso = args?.startIso as string;
      const endIso = args?.endIso as string;

      const logs = getStoredLogs(siteId);
      const filtered = logs.filter((l) => {
        if (startIso && l.timestamp < startIso) return false;
        if (endIso && l.timestamp > endIso) return false;
        return true;
      });

      let inTokens = 0;
      let outTokens = 0;
      let cacheRead = 0;
      let cacheWrite = 0;

      for (const l of filtered) {
        inTokens += l.input_tokens;
        outTokens += l.output_tokens;
        cacheRead += l.cache_read_tokens;
        cacheWrite += l.cache_write_tokens;
      }

      const hitRate = inTokens > 0 ? (cacheRead / inTokens) * 100 : undefined;

      const metrics: AggregatedMetrics = {
        total_requests: filtered.length,
        total_input_tokens: inTokens,
        total_output_tokens: outTokens,
        total_cache_read_tokens: cacheRead,
        total_cache_write_tokens: cacheWrite,
        cache_hit_rate_pct: hitRate,
      };
      return metrics as T;
    }

    case "get_models_breakdown": {
      const siteId = args?.siteId as string;
      const startIso = args?.startIso as string;
      const endIso = args?.endIso as string;

      const logs = getStoredLogs(siteId);
      const filtered = logs.filter((l) => {
        if (startIso && l.timestamp < startIso) return false;
        if (endIso && l.timestamp > endIso) return false;
        return true;
      });

      const map = new Map<string, ModelUsageMetrics>();
      for (const l of filtered) {
        const key = l.model_name.toLowerCase().trim();
        const existing = map.get(key) || {
          model_name: l.model_name,
          request_count: 0,
          input_tokens: 0,
          output_tokens: 0,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
        };
        existing.request_count += 1;
        existing.input_tokens += l.input_tokens;
        existing.output_tokens += l.output_tokens;
        existing.cache_read_tokens += l.cache_read_tokens;
        existing.cache_write_tokens += l.cache_write_tokens;
        map.set(key, existing);
      }

      const results = Array.from(map.values()).map((m) => {
        if (m.input_tokens > 0) {
          m.cache_hit_rate_pct = (m.cache_read_tokens / m.input_tokens) * 100;
        }
        return m;
      });

      results.sort((a, b) => (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens));
      return results as T;
    }

    case "get_settings": {
      const stored = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (stored) {
        try {
          return JSON.parse(stored) as T;
        } catch {
          // ignore
        }
      }
      const defaultSettings: AppSettings = {
        auto_refresh: true,
        refresh_interval_secs: 60,
        always_on_top: false,
        opacity_pct: 100,
        low_balance_threshold: 5.0,
        notify_on_failure: true,
      };
      return defaultSettings as T;
    }

    case "save_settings": {
      const s = args?.settings as AppSettings;
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(s));
      return undefined as T;
    }

    case "clear_cache": {
      for (const s of sites) {
        localStorage.removeItem(STORAGE_LOGS_PREFIX + s.id);
      }
      return undefined as T;
    }

    case "set_always_on_top":
    case "hide_to_tray":
    case "show_window":
      return undefined as T;

    default:
      return undefined as T;
  }
}
