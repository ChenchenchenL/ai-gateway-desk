import { safeInvoke } from "./tauriClient";

/**
 * Service controlling desktop window positioning and system tray actions.
 */
export const windowService = {
  async setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
    await safeInvoke<void>("set_always_on_top", { alwaysOnTop });
  },

  async hideToTray(): Promise<void> {
    await safeInvoke<void>("hide_to_tray");
  },

  async showWindow(): Promise<void> {
    await safeInvoke<void>("show_window");
  },

  async minimizeWindow(): Promise<void> {
    await safeInvoke<void>("minimize_window");
  },

  async closeWindow(): Promise<void> {
    await safeInvoke<void>("close_window");
  },
};
