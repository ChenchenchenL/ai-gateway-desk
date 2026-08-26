import { useCallback, useEffect, useState } from "react";
import { settingsService } from "../services/settingsService";
import { windowService } from "../services/windowService";
import { AppSettings } from "../types";
import { formatErrorMessage } from "../utils/error";

const DEFAULT_SETTINGS: AppSettings = {
  auto_refresh: true,
  refresh_interval_secs: 60,
  always_on_top: false,
  opacity_pct: 100,
  low_balance_threshold: 5.0,
  notify_on_failure: true,
};

/**
 * Hook for managing application settings state and updates.
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    setError(null);
    try {
      await settingsService.saveSettings(newSettings);
      setSettings(newSettings);
      await windowService.setAlwaysOnTop(newSettings.always_on_top);
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await settingsService.clearCache();
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, loading, error, updateSettings, clearCache, reload: loadSettings };
}
