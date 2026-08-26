import { invoke } from "@tauri-apps/api/core";

/**
 * Service controlling desktop window positioning and system tray actions.
 */
export const windowService = {
  async setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
    await invoke<void>("set_always_on_top", { alwaysOnTop });
  },

  async hideToTray(): Promise<void> {
    await invoke<void>("hide_to_tray");
  },
};
