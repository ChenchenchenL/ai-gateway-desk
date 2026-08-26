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
 * Formats currency amounts with precision (supporting 4 decimals for small balances like ¥0.1491).
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  const isCny =
    currency.toUpperCase() === "CNY" ||
    currency === "¥" ||
    currency.toUpperCase() === "RMB";
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
 * Formats cache hit rate percentage.
 */
export function formatCacheHitRate(rate?: number): string {
  if (rate === undefined || isNaN(rate)) {
    return "--";
  }
  return `${rate.toFixed(1)}%`;
}
