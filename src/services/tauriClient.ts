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
const STORAGE_ADMIN_TOKENS_KEY = "ai_gateway_desk_admin_tokens";

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
  tokens[siteId] = cleanToken(token);
  localStorage.setItem(STORAGE_TOKENS_KEY, JSON.stringify(tokens));
}

function getStoredAdminTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ADMIN_TOKENS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAdminToken(siteId: string, token: string) {
  if (typeof window === "undefined") return;
  const tokens = getStoredAdminTokens();
  tokens[siteId] = cleanToken(token);
  localStorage.setItem(STORAGE_ADMIN_TOKENS_KEY, JSON.stringify(tokens));
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

function saveStoredLogs(siteId: string, incomingLogs: StoredLog[]) {
  if (typeof window === "undefined") return;
  const existing = getStoredLogs(siteId);
  const map = new Map<string, StoredLog>();

  for (const log of existing) {
    map.set(log.id, log);
  }
  for (const log of incomingLogs) {
    map.set(log.id, log);
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const trimmed = merged.slice(0, 2000);
  localStorage.setItem(STORAGE_LOGS_PREFIX + siteId, JSON.stringify(trimmed));
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
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      return parseLogTimestamp(num);
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return now.toISOString();
}

/**
 * Converts One-API / New-API quota points (500,000 = ¥1.00 / $1.00) to balance.
 */
function convertQuotaToBalance(rawQuota: number): number {
  if (rawQuota > 500) {
    return Number((rawQuota / 500000).toFixed(4));
  }
  return Number(rawQuota.toFixed(4));
}

/**
 * Extracts balance and currency from all common OneAPI / NewAPI / Sub2API responses.
 * @param skipQuotaConversion - set true for Sub2API where balance is already a USD float
 */
function extractBalanceFromJson(
  json: unknown,
  defaultCurrency = "USD",
  skipQuotaConversion = false
): { balance?: number; currency?: string; isUnlimited?: boolean } {
  if (!json || typeof json !== "object") return {};
  const obj = json as Record<string, unknown>;
  const convert = skipQuotaConversion
    ? (v: number) => Number(v.toFixed(4))
    : convertQuotaToBalance;

  const list = (Array.isArray(json)
    ? json
    : Array.isArray(obj.data)
    ? obj.data
    : Array.isArray((obj.data as Record<string, unknown>)?.items)
    ? (obj.data as Record<string, unknown>).items
    : Array.isArray((obj.data as Record<string, unknown>)?.list)
    ? (obj.data as Record<string, unknown>).list
    : []) as Record<string, unknown>[];

  if (list.length > 0) {
    for (const item of list) {
      if (item?.unlimited_quota === true) {
        return { isUnlimited: true, currency: defaultCurrency };
      }
      const itemQuota = item?.remain_quota ?? item?.quota ?? item?.balance;
      if (typeof itemQuota === "number") {
        return {
          balance: convert(itemQuota),
          currency: String(item?.currency || defaultCurrency),
        };
      }
    }
  }

  const target = (obj.data && typeof obj.data === "object" ? obj.data : obj) as Record<string, unknown>;

  if (target.unlimited_quota === true || obj.unlimited_quota === true) {
    return { isUnlimited: true, currency: defaultCurrency };
  }

  const detectedCurrency = String(
    target.currency || obj.currency || (target.symbol === "¥" || obj.symbol === "¥" ? "CNY" : (target.symbol === "$" || obj.symbol === "$" ? "USD" : defaultCurrency))
  );

  // Sub2API user profile object { data: { balance: 0.00, ... } } — balance is direct USD
  const userObj = (target.user || target.account) as Record<string, unknown> | undefined;
  if (userObj && typeof userObj.balance === "number") {
    return { balance: convert(userObj.balance), currency: detectedCurrency };
  }

  if (typeof target.balance === "number") {
    return { balance: convert(target.balance), currency: detectedCurrency };
  }

  const candidates = [
    target.remain_quota,
    target.quota,
    target.current_balance,
    target.remaining_quota,
    target.total_quota,
    obj.remain_quota,
    obj.quota,
    obj.balance,
  ];

  for (const val of candidates) {
    if (typeof val === "number") {
      return { balance: convert(val), currency: detectedCurrency };
    }
  }

  const hardLimit = (obj.hard_limit_usd ?? obj.system_hard_limit_usd ?? obj.total_available) as number | undefined;
  if (typeof hardLimit === "number" && hardLimit > 0) {
    const totalUsage = typeof obj.total_usage === "number" ? obj.total_usage : 0;
    return { balance: convert(Math.max(0, hardLimit - totalUsage)), currency: detectedCurrency };
  }

  return {};
}

/**
 * Extracts prompt cache read tokens comprehensively.
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

  if (item.other) {
    if (typeof item.other === "object") {
      const read = extractCacheReadTokens(item.other as Record<string, unknown>);
      if (read > 0) return read;
    } else if (typeof item.other === "string") {
      try {
        const parsed = JSON.parse(item.other);
        const read = extractCacheReadTokens(parsed);
        if (read > 0) return read;
      } catch {
        const match = item.other.match(/cache[_\w]*tokens["':\s]+(\d+)/i) ||
                      item.other.match(/cached[_\w]*["':\s]+(\d+)/i);
        if (match && match[1]) return Number(match[1]);
      }
    }
  }

  if (typeof item.content === "string" && item.content.includes("cache")) {
    try {
      const nested = JSON.parse(item.content);
      const read = extractCacheReadTokens(nested);
      if (read > 0) return read;
    } catch {
      const match = item.content.match(/cache[_\w]*tokens["':\s]+(\d+)/i) ||
                    item.content.match(/cached[_\w]*["':\s]+(\d+)/i);
      if (match && match[1]) return Number(match[1]);
    }
  }

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

  if (item.other) {
    if (typeof item.other === "object") {
      const write = extractCacheWriteTokens(item.other as Record<string, unknown>);
      if (write > 0) return write;
    } else if (typeof item.other === "string") {
      try {
        const parsed = JSON.parse(item.other);
        const write = extractCacheWriteTokens(parsed);
        if (write > 0) return write;
      } catch {
        // ignore
      }
    }
  }

  return 0;
}

/**
 * Cleans token strings by stripping 'Bearer ' prefixes, outer quotation marks, and whitespace.
 */
export function cleanToken(token?: string | null): string {
  if (!token) return "";
  let t = token.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith("`") && t.endsWith("`"))
  ) {
    t = t.slice(1, -1).trim();
  }
  if (t.toLowerCase().startsWith("bearer ")) {
    t = t.slice(7).trim();
  }
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith("`") && t.endsWith("`"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/**
 * Bypasses CORS in browser development via local Vite proxy.
 */
async function proxyFetch(targetUrl: string, token: string): Promise<Response> {
  const pureToken = cleanToken(token);
  const authHeader = pureToken ? `Bearer ${pureToken}` : "";
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const proxyUrl = `/__api_proxy?url=${encodeURIComponent(targetUrl)}`;
  try {
    const res = await fetch(proxyUrl, { headers });
    if (res.status !== 404 && res.status !== 502) {
      return res;
    }
  } catch {
    // fallback
  }
  return await fetch(targetUrl, {
    headers,
    mode: "cors",
  });
}

/**
 * Real in-browser fetch querying balance, window quota and multi-page logs from upstream gateway.
 */
async function fetchRealSiteDataInBrowser(site: Site, authToken: string, adminToken?: string): Promise<{
  balance?: number;
  currency?: string;
  window_remaining_quota?: number;
  window_reset_at?: string;
  logs?: StoredLog[];
  error?: string;
}> {
  const baseUrl = site.base_url.replace(/\/+$/, "");
  let balance: number | undefined = undefined;
  let currency = site.currency || (site.provider === "sub2_api" ? "USD" : "CNY");
  let windowRemainingQuota: number | undefined = undefined;
  let windowResetAt: string | undefined = undefined;
  const newLogs: StoredLog[] = [];

  // Token classification: detect JWT session token vs sk- API Key
  const rawTokens = [authToken, adminToken].map(cleanToken).filter(Boolean);
  const sub2ApiJwt = rawTokens.find(
    (t) => t.startsWith("eyJ") || (!t.startsWith("sk-") && t.length > 50)
  );
  const sub2ApiKey = rawTokens.find(
    (t) => t.startsWith("sk-")
  ) || (!sub2ApiJwt ? rawTokens[0] : undefined);

  // 1. Balance & Profile Endpoint Candidates
  const balanceEndpoints: { url: string; token: string }[] = [];

  if (site.provider === "sub2_api") {
    // Only query /api/v1/user/profile if we have a real JWT token
    if (sub2ApiJwt) {
      balanceEndpoints.push(
        { url: `${baseUrl}/api/v1/user/profile`, token: sub2ApiJwt }
      );
    }
    // sk- API Key queries /v1/sub2api/billing for billing/rate info
    if (sub2ApiKey) {
      balanceEndpoints.push({ url: `${baseUrl}/v1/sub2api/billing`, token: sub2ApiKey });
    }
  } else {
    if (adminToken) {
      balanceEndpoints.push(
        { url: `${baseUrl}/api/user/self`, token: adminToken },
        { url: `${baseUrl}/api/user/dashboard`, token: adminToken }
      );
    }

    if (authToken) {
      balanceEndpoints.push(
        { url: `${baseUrl}/v1/sub2api/billing`, token: authToken },
        { url: `${baseUrl}/dashboard/billing/subscription`, token: authToken },
        { url: `${baseUrl}/v1/dashboard/billing/subscription`, token: authToken },
        { url: `${baseUrl}/api/token/?p=0&size=10`, token: authToken },
        { url: `${baseUrl}/api/usage/token/`, token: authToken },
        { url: `${baseUrl}/api/token/`, token: authToken }
      );
    }
  }

  for (const item of balanceEndpoints) {
    try {
      const res = await proxyFetch(item.url, item.token);
      if (res.ok) {
        const json = await res.json();
        console.log(`[AI Gateway Desk] Balance success from ${item.url}:`, json);

        const extracted = extractBalanceFromJson(
          json,
          site.provider === "sub2_api" ? "USD" : "CNY",
          site.provider === "sub2_api" // Sub2API balance is direct USD, not quota points
        );
        if (extracted.isUnlimited) {
          balance = 999999;
          currency = extracted.currency || currency;
          break;
        }
        if (extracted.balance !== undefined) {
          balance = extracted.balance;
          if (extracted.currency) currency = extracted.currency;
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Sub2API Window Quota
  if (site.provider === "sub2_api" && sub2ApiJwt) {
    try {
      const res = await proxyFetch(`${baseUrl}/api/v1/subscriptions`, sub2ApiJwt);
      if (res.ok) {
        const json = await res.json();
        console.log(`[AI Gateway Desk] Sub2API subscriptions:`, json);
        const items = (Array.isArray(json?.data) ? json.data : []) as Record<string, unknown>[];
        for (const sub of items) {
          const remaining = sub?.remaining_quota ?? sub?.quota_remaining;
          if (typeof remaining === "number") {
            windowRemainingQuota = remaining;
          }
          if (sub?.reset_at || sub?.expires_at) {
            windowResetAt = parseLogTimestamp(sub.reset_at ?? sub.expires_at);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Log Endpoint Candidates
  const logCandidates: { path: string; token: string }[] = [];

  if (site.provider === "sub2_api") {
    if (sub2ApiJwt) {
      // JWT token: full usage history
      logCandidates.push({ path: "/api/v1/usage", token: sub2ApiJwt });
    }
  } else {

    if (adminToken) {
      logCandidates.push({ path: "/api/log/self", token: adminToken });
    }
    if (authToken) {
      logCandidates.push({ path: "/api/log/token", token: authToken });
      logCandidates.push({ path: "/api/log/self", token: authToken });
    }
  }

  for (const candidate of logCandidates) {
    let candidateSuccessful = false;
    const isSub2Api = site.provider === "sub2_api";
    const pageParamName = isSub2Api ? "page" : "p";
    const pageStart = isSub2Api ? 1 : 0;

    for (let pageIdx = 0; pageIdx < 10; pageIdx++) {
      const pageNum = pageStart + pageIdx;
      const sep = candidate.path.includes("?") ? "&" : "?";
      const pageUrl = `${baseUrl}${candidate.path}${sep}page_size=100&${pageParamName}=${pageNum}`;
      try {
        const res = await proxyFetch(pageUrl, candidate.token);
        if (!res.ok) {
          break;
        }

        const json = await res.json();
        const rawItems = (Array.isArray(json)
          ? json
          : Array.isArray(json?.data?.items)
          ? json.data.items
          : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.list)
          ? json.data.list
          : Array.isArray(json?.data?.rows)
          ? json.data.rows
          : []) as Record<string, unknown>[];

        if (rawItems.length === 0) break;
        candidateSuccessful = true;

        for (const rawItem of rawItems) {
          // Sub2API uses "model" field; New-API uses "model_name"
          const modelName = String(rawItem.model_name ?? rawItem.model ?? "unknown");
          // Sub2API has cache_creation_tokens as a direct field;
          // New-API stores cache write in item.other JSON, so use recursive extractor
          const cacheWriteTokens = isSub2Api
            ? Number(rawItem.cache_write_tokens ?? rawItem.cache_creation_tokens ?? rawItem.cache_creation_input_tokens ?? 0)
            : extractCacheWriteTokens(rawItem);
          newLogs.push({
            id: String(rawItem.id || rawItem.record_id || `${rawItem.created_at || rawItem.timestamp}_${Math.random().toString(36).slice(2)}`),
            site_id: site.id,
            timestamp: parseLogTimestamp(rawItem.created_at ?? rawItem.timestamp ?? rawItem.time ?? rawItem.created),
            model_name: modelName,
            input_tokens: Number(rawItem.input_tokens ?? rawItem.prompt_tokens ?? rawItem.prompt ?? 0),
            output_tokens: Number(rawItem.output_tokens ?? rawItem.completion_tokens ?? rawItem.completion ?? 0),
            cache_read_tokens: isSub2Api
              ? Number(rawItem.cache_read_tokens ?? 0)
              : extractCacheReadTokens(rawItem),
            cache_write_tokens: cacheWriteTokens,
          });
        }

        const totalPages = isSub2Api
          ? (json?.data as Record<string, unknown>)?.pages
          : undefined;
        if (rawItems.length < 100 || (typeof totalPages === "number" && pageNum >= totalPages)) break;
      } catch {
        break;
      }
    }

    if (candidateSuccessful && newLogs.length > 0) {
      console.log(`[AI Gateway Desk] Successfully fetched ${newLogs.length} logs via ${candidate.path}`);
      break;
    }
  }

  return {
    balance,
    currency,
    window_remaining_quota: windowRemainingQuota,
    window_reset_at: windowResetAt,
    logs: newLogs,
  };
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
  const adminTokens = getStoredAdminTokens();

  switch (cmd) {
    case "list_sites":
      return [...sites] as T;

    case "test_connection": {
      const req = (args?.req || {}) as TestConnectionRequest;
      const baseUrl = req.base_url?.replace(/\/+$/, "");
      const token = req.admin_token || req.auth_token;

      let balanceSupported = false;
      let logsSupported = false;
      let cacheSupported = req.provider === "new_api";

      if (baseUrl) {
        if (req.provider === "sub2_api") {
          const jwtToken = req.auth_token || (token?.startsWith("eyJ") ? token : undefined);
          const apiKey = req.admin_token || (token?.startsWith("sk-") ? token : undefined);

          if (jwtToken) {
            try {
              const res = await proxyFetch(`${baseUrl}/api/v1/user/profile`, jwtToken);
              if (res.ok) balanceSupported = true;
            } catch {
              // ignore
            }
            try {
              const res = await proxyFetch(`${baseUrl}/api/v1/usage?page=1&page_size=1`, jwtToken);
              if (res.ok) logsSupported = true;
            } catch {
              // ignore
            }
          } else if (apiKey) {
            try {
              const res = await proxyFetch(`${baseUrl}/v1/sub2api/billing`, apiKey);
              if (res.ok) balanceSupported = true;
            } catch {
              // ignore
            }
          }
        } else if (token) {
          try {
            const res = await proxyFetch(`${baseUrl}/api/user/self`, token);
            if (res.ok) balanceSupported = true;
          } catch {
            // ignore
          }
          try {
            const res = await proxyFetch(`${baseUrl}/api/log/self?page_size=1&p=0`, token);
            if (res.ok) logsSupported = true;
          } catch {
            // ignore
          }
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
      if (req.admin_token) {
        saveAdminToken(id, req.admin_token);
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
        currency: existing?.currency || (req.provider === "sub2_api" ? "USD" : "CNY"),
        window_remaining_quota: existing?.window_remaining_quota,
        window_reset_at: existing?.window_reset_at,
        last_success_at: existing?.last_success_at,
        failure_count: 0,
        has_auth_token: Boolean(req.auth_token || tokens[id]),
      };

      const tokenToUse = req.auth_token || tokens[id];
      const adminTokenToUse = req.admin_token || adminTokens[id];

      if (tokenToUse || adminTokenToUse) {
        const fetched = await fetchRealSiteDataInBrowser(newSite, tokenToUse, adminTokenToUse);
        if (fetched.balance !== undefined) {
          newSite.current_balance = fetched.balance;
          newSite.currency = fetched.currency || newSite.currency;
        }
        if (fetched.window_remaining_quota !== undefined) {
          newSite.window_remaining_quota = fetched.window_remaining_quota;
        }
        if (fetched.window_reset_at !== undefined) {
          newSite.window_reset_at = fetched.window_reset_at;
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

      const curTokens = getStoredTokens();
      delete curTokens[id];
      localStorage.setItem(STORAGE_TOKENS_KEY, JSON.stringify(curTokens));

      const curAdminTokens = getStoredAdminTokens();
      delete curAdminTokens[id];
      localStorage.setItem(STORAGE_ADMIN_TOKENS_KEY, JSON.stringify(curAdminTokens));

      return undefined as T;
    }

    case "refresh_site": {
      const siteId = args?.siteId as string;
      const target = sites.find((s) => s.id === siteId);
      if (target) {
        const token = tokens[siteId];
        const adminToken = adminTokens[siteId];
        if (token || adminToken) {
          const fetched = await fetchRealSiteDataInBrowser(target, token, adminToken);
          if (fetched.balance !== undefined) {
            target.current_balance = fetched.balance;
            target.currency = fetched.currency || target.currency;
          }
          if (fetched.window_remaining_quota !== undefined) {
            target.window_remaining_quota = fetched.window_remaining_quota;
          }
          if (fetched.window_reset_at !== undefined) {
            target.window_reset_at = fetched.window_reset_at;
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
        const adminToken = adminTokens[target.id];
        if (token || adminToken) {
          const fetched = await fetchRealSiteDataInBrowser(target, token, adminToken);
          if (fetched.balance !== undefined) {
            target.current_balance = fetched.balance;
            target.currency = fetched.currency || target.currency;
          }
          if (fetched.window_remaining_quota !== undefined) {
            target.window_remaining_quota = fetched.window_remaining_quota;
          }
          if (fetched.window_reset_at !== undefined) {
            target.window_reset_at = fetched.window_reset_at;
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
