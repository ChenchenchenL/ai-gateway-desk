/**
 * Formats raw token counts safely into readable string representations (e.g. 1.2K, 3.4M).
 */
export function formatTokens(tokens?: number | null): string {
  if (typeof tokens !== "number" || isNaN(tokens)) {
    return "0";
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toLocaleString();
}

/**
 * Formats currency amounts with precision (supporting 4 decimals for small balances like ¥0.1491).
 */
export function formatCurrency(amount?: number | null, currency = "USD"): string {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "--";
  }
  if (amount < 0 || amount >= 999999) {
    return "无限额度";
  }
  const currStr = String(currency || "USD").toUpperCase();
  const isCny = currStr === "CNY" || currStr === "¥" || currStr === "RMB";
  const symbol = isCny ? "¥" : "$";

  if (amount < 1 && amount > 0) {
    const str = amount.toString();
    if (str.includes(".") && str.split(".")[1].length > 2) {
      return `${symbol}${amount.toFixed(4)}`;
    }
  }
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Formats cache hit rate percentage safely.
 */
export function formatCacheHitRate(rate?: number | null): string {
  if (typeof rate !== "number" || isNaN(rate)) {
    return "--";
  }
  return `${rate.toFixed(1)}%`;
}
