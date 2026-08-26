import { safeInvoke } from "./tauriClient";
import { SaveSiteRequest, Site, SiteCapabilities, TestConnectionRequest } from "../types";

/**
 * Service encapsulating site-related Tauri commands.
 */
export const siteService = {
  async listSites(): Promise<Site[]> {
    return await safeInvoke<Site[]>("list_sites");
  },

  async testConnection(req: TestConnectionRequest): Promise<SiteCapabilities> {
    return await safeInvoke<SiteCapabilities>("test_connection", { req });
  },

  async saveSite(payload: SaveSiteRequest): Promise<Site> {
    return await safeInvoke<Site>("save_site", { req: payload });
  },

  async deleteSite(id: string): Promise<void> {
    await safeInvoke<void>("delete_site", { id });
  },

  async refreshSite(siteId: string): Promise<void> {
    await safeInvoke<void>("refresh_site", { siteId });
  },

  async refreshAllSites(): Promise<void> {
    await safeInvoke<void>("refresh_all_sites");
  },
};
