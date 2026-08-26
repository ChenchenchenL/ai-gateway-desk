import { invoke } from "@tauri-apps/api/core";
import { AppSettings } from "../types";

/**
 * Service encapsulating application settings IPC.
 */
export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    return await invoke<AppSettings>("get_settings");
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await invoke<void>("save_settings", { settings });
  },

  async clearCache(): Promise<void> {
    await invoke<void>("clear_cache");
  },
};
