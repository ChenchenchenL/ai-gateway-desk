import { useState, useEffect } from "react";
import { FluentWidget } from "./components/widget/FluentWidget";
import { SiteFormModal } from "./components/site/SiteFormModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { useSites } from "./hooks/useSites";
import { useRefresh } from "./hooks/useRefresh";
import { useSettings } from "./hooks/useSettings";
import { Site } from "./types";
import { Plus, Server } from "lucide-react";

const ACTIVE_SITE_KEY = "ai_gateway_desk_active_site_id";

/**
 * Windows 11 Fluent Acrylic Desktop Floating Widget App.
 */
export function App() {
  const { sites, refreshList } = useSites();
  const { refreshing, refreshAll } = useRefresh(refreshList);
  const { settings, updateSettings, clearCache } = useSettings();

  const [activeSiteId, setActiveSiteId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ACTIVE_SITE_KEY) || "";
    }
    return "";
  });

  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auto-select first site if current selection is invalid or empty
  useEffect(() => {
    if (sites.length > 0) {
      const exists = sites.some((s) => s.id === activeSiteId);
      if (!exists) {
        setActiveSiteId(sites[0].id);
        localStorage.setItem(ACTIVE_SITE_KEY, sites[0].id);
      }
    }
  }, [sites, activeSiteId]);

  const activeSite = sites.find((s) => s.id === activeSiteId) || sites[0] || null;

  const handleSelectSite = (site: Site) => {
    setActiveSiteId(site.id);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_SITE_KEY, site.id);
    }
  };

  const handleTogglePin = async () => {
    await updateSettings({
      ...settings,
      always_on_top: !settings.always_on_top,
    });
  };

  const handleOpenAdd = () => {
    setEditingSite(null);
    setIsFormOpen(true);
  };

  return (
    <div
      style={{ opacity: (settings.opacity_pct ?? 100) / 100 }}
      className="w-screen h-screen overflow-hidden bg-transparent select-none p-1"
    >
      {sites.length === 0 ? (
        /* Empty State Welcome Card */
        <div
          data-tauri-drag-region
          className="acrylic-widget flex flex-col items-center justify-center w-full h-full rounded-2xl p-6 text-center shadow-2xl"
        >
          <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 mb-3 shadow-[0_0_24px_rgba(99,102,241,0.25)]">
            <Server className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-slate-100 mb-1">
            Windows 11 API Gateway Widget
          </h2>
          <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
            桌面端实时 Token 消耗、账户余额与 Prompt 缓存监控悬浮小工具。
          </p>
          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>添加监控站点 (New-API)</span>
          </button>
        </div>
      ) : (
        /* Windows 11 Master Fluent Acrylic Widget */
        <FluentWidget
          currentSite={activeSite}
          sites={sites}
          onSelectSite={handleSelectSite}
          onAddSite={handleOpenAdd}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRefresh={refreshAll}
          refreshing={refreshing}
          alwaysOnTop={Boolean(settings.always_on_top)}
          onTogglePin={handleTogglePin}
        />
      )}

      {/* Form Modal (Add / Edit Site) */}
      {isFormOpen && (
        <SiteFormModal
          site={editingSite}
          onClose={() => setIsFormOpen(false)}
          onSaved={refreshList}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={updateSettings}
          onClearCache={clearCache}
        />
      )}
    </div>
  );
}

export default App;
