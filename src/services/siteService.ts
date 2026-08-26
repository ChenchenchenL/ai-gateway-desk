import { invoke } from "@tauri-apps/api/core";
import { SaveSiteRequest, Site, SiteCapabilities, TestConnectionRequest } from "../types";

/**
 * Service encapsulating site-related Tauri commands.
 */
export const siteService = {
  async listSites(): Promise<Site[]> {
    return await invoke<Site[]>("list_sites");
  },

  async testConnection(req: TestConnectionRequest): Promise<SiteCapabilities> {
    return await invoke<SiteCapabilities>("test_connection", { req });
  },

  async saveSite(payload: SaveSiteRequest): Promise<Site> {
    return await invoke<Site>("save_site", { req: payload });
  },

  async deleteSite(id: string): Promise<void> {
    await invoke<void>("delete_site", { id });
  },

  async refreshSite(siteId: string): Promise<void> {
    await invoke<void>("refresh_site", { siteId });
  },

  async refreshAllSites(): Promise<void> {
    await invoke<void>("refresh_all_sites");
  },
};
