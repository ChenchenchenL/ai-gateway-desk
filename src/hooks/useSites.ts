import { useCallback, useEffect, useState } from "react";
import { siteService } from "../services/siteService";
import { Site } from "../types";
import { formatErrorMessage } from "../utils/error";

/**
 * Hook for managing site list state and actions.
 */
export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await siteService.listSites();
      setSites(data);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  return { sites, loading, error, refreshList: fetchSites };
}
