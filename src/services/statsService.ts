import { invoke } from "@tauri-apps/api/core";
import { AggregatedMetrics, ModelUsageMetrics } from "../types";

/**
 * Service encapsulating statistics and usage queries.
 */
export const statsService = {
  async getSiteStats(
    siteId: string,
    startIso: string,
    endIso: string
  ): Promise<AggregatedMetrics> {
    return await invoke<AggregatedMetrics>("get_site_stats", {
      siteId,
      startIso,
      endIso,
    });
  },

  async getModelsBreakdown(
    siteId: string,
    startIso: string,
    endIso: string
  ): Promise<ModelUsageMetrics[]> {
    return await invoke<ModelUsageMetrics[]>("get_models_breakdown", {
      siteId,
      startIso,
      endIso,
    });
  },
};
