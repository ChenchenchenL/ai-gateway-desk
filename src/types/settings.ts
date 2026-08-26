/**
 * Application configuration and preferences.
 */
export interface AppSettings {
  auto_refresh: boolean;
  refresh_interval_secs: number;
  always_on_top: boolean;
  opacity_pct: number;
  low_balance_threshold: number;
  notify_on_failure: boolean;
}
