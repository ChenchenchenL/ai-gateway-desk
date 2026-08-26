import { safeInvoke } from "./tauriClient";
import { AppSettings } from "../types";

/**
 * Service encapsulating application settings IPC.
 */
export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    return await safeInvoke<AppSettings>("get_settings");
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await safeInvoke<void>("save_settings", { settings });
  },

  async clearCache(): Promise<void> {
    await safeInvoke<void>("clear_cache");
  },
};
