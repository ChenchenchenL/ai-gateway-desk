/**
 * Formats raw token counts into readable string representations (e.g. 1.2K, 3.4M).
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toLocaleString();
}

/**
 * Formats currency amounts with precision.
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  const symbol = currency === "CNY" ? "¥" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Formats cache hit rate percentage.
 */
export function formatCacheHitRate(rate?: number): string {
  if (rate === undefined || isNaN(rate)) {
    return "--";
  }
  return `${rate.toFixed(1)}%`;
}
