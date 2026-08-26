import { useCallback, useEffect, useState } from "react";
import { statsService } from "../services/statsService";
import { AggregatedMetrics, ModelUsageMetrics, TimeRangePreset } from "../types";
import { getTimeRangeBounds } from "../utils/date";
import { formatErrorMessage } from "../utils/error";

/**
 * Hook for fetching and caching site statistics by time preset.
 */
export function useSiteStats(siteId?: string, preset: TimeRangePreset = "24h") {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [models, setModels] = useState<ModelUsageMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const validPreset = preset === "custom" ? "24h" : preset;
      const { startIso, endIso } = getTimeRangeBounds(validPreset);

      const [metricsData, modelsData] = await Promise.all([
        statsService.getSiteStats(siteId, startIso, endIso),
        statsService.getModelsBreakdown(siteId, startIso, endIso),
      ]);

      setMetrics(metricsData);
      setModels(Array.isArray(modelsData) ? modelsData : []);
    } catch (err) {
      setError(formatErrorMessage(err));
      setMetrics(null);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [siteId, preset]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { metrics, models, loading, error, refetch: fetchStats };
}
