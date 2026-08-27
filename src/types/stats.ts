/**
 * Aggregated metric data for charts and cards.
 */
export interface AggregatedMetrics {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_cache_write_tokens: number;
  cache_hit_rate_pct?: number;
}

/**
 * Model-specific usage metrics.
 */
export interface ModelUsageMetrics {
  model_name: string;
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cache_hit_rate_pct?: number;
}

/**
 * Time range filter preset.
 */
export type TimeRangePreset = "today" | "24h" | "7d" | "30d" | "custom";
export type TimePreset = "today" | "24h" | "7d" | "30d";
