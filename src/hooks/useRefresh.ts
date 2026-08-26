import { useCallback, useState } from "react";
import { siteService } from "../services/siteService";
import { formatErrorMessage } from "../utils/error";

/**
 * Hook for executing manual and batch refreshes with loading states.
 */
export function useRefresh(onRefreshCompleted?: () => void) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      await siteService.refreshAllSites();
      onRefreshCompleted?.();
    } catch (err) {
      setRefreshError(formatErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, onRefreshCompleted]);

  return { refreshing, refreshError, refreshAll };
}
