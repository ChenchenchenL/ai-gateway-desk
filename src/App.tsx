import { useState, useEffect } from "react";
import { FluentWidget } from "./components/widget/FluentWidget";
import { SiteFormModal } from "./components/site/SiteFormModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import { useSites } from "./hooks/useSites";
import { useRefresh } from "./hooks/useRefresh";
import { useSettings } from "./hooks/useSettings";
import { Site } from "./types";
import { siteService } from "./services/siteService";
import { Plus, Server } from "lucide-react";
import { useWidgetDrag } from "./hooks/useWidgetDrag";
import { isTauri } from "./services/tauriClient";

const ACTIVE_SITE_KEY = "ai_gateway_desk_active_site_id";

/**
 * Windows 11 Light Frosted Acrylic Desktop Floating Widget App.
 */
export function App() {
  const { sites, refreshList } = useSites();
  const { refreshing, refreshAll } = useRefresh(refreshList);
  const { settings, updateSettings, clearCache } = useSettings();
  const { position, handleStartDrag } = useWidgetDrag();

  const [activeSiteId, setActiveSiteId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ACTIVE_SITE_KEY) || "";
    }
    return "";
  });

  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Global delete confirmation state
  const [siteIdToDelete, setSiteIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const siteToDelete = sites.find((s) => s.id === siteIdToDelete) || null;

  // Auto-select first site if current selection is invalid or empty
  useEffect(() => {
    if (sites.length > 0) {
      const exists = sites.some((s) => s.id === activeSiteId);
      if (!exists) {
        setActiveSiteId(sites[0].id);
        if (typeof window !== "undefined") {
          localStorage.setItem(ACTIVE_SITE_KEY, sites[0].id);
        }
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

  const handleEditSite = (site: Site) => {
    setEditingSite(site);
    setIsFormOpen(true);
  };

  const handleDeleteSite = (siteId: string) => {
    setSiteIdToDelete(siteId);
  };

  const handleConfirmDeleteSite = async () => {
    if (!siteIdToDelete) return;
    setIsDeleting(true);
    try {
      await siteService.deleteSite(siteIdToDelete);
      await refreshList();
      const remaining = sites.filter((s) => s.id !== siteIdToDelete);
      if (remaining.length > 0) {
        setActiveSiteId(remaining[0].id);
        if (typeof window !== "undefined") {
          localStorage.setItem(ACTIVE_SITE_KEY, remaining[0].id);
        }
      } else {
        setActiveSiteId("");
        if (typeof window !== "undefined") {
          localStorage.removeItem(ACTIVE_SITE_KEY);
        }
      }
      setSiteIdToDelete(null);
    } catch (err) {
      console.error("Delete site error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const inTauri = isTauri();

  return (
    <div
      style={{ opacity: (settings.opacity_pct ?? 100) / 100 }}
      className={`w-screen h-screen overflow-hidden bg-transparent select-none flex items-center justify-center relative ${
        inTauri ? "p-0" : "p-3"
      }`}
    >
      {/* Widget Container (Fills native Tauri window, centered mockup in web preview) */}
      <div
        style={{
          transform: !inTauri && position ? `translate(${position.x}px, ${position.y}px)` : undefined,
        }}
        onMouseDown={handleStartDrag}
        className={`w-full h-full flex flex-col relative ${
          !inTauri ? "max-w-[350px] max-h-[560px]" : ""
        }`}
      >
        {sites.length === 0 ? (
          /* Empty State Welcome Card */
          <div
            data-tauri-drag-region
            className="acrylic-widget flex flex-col items-center justify-center w-full h-full rounded-2xl p-6 text-center shadow-2xl"
          >
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 mb-3 shadow-[0_0_24px_rgba(99,102,241,0.15)]">
              <Server className="w-8 h-8" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-800 mb-1">
              Windows 11 API Gateway Monitor
            </h2>
            <p className="text-xs text-slate-500 mb-4 max-w-xs leading-relaxed">
              轻量级桌面端实时监控，管理您的 New-API 余额、Token 消耗与 Prompt 缓存效率。
            </p>
            <button
              type="button"
              data-tauri-drag-region="false"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>添加监控站点 (New-API)</span>
            </button>
          </div>
        ) : (
          /* Master Desktop Monitor */
          <FluentWidget
            currentSite={activeSite}
            sites={sites}
            onSelectSite={handleSelectSite}
            onAddSite={handleOpenAdd}
            onEditSite={handleEditSite}
            onDeleteSite={handleDeleteSite}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onRefresh={refreshAll}
            refreshing={refreshing}
            alwaysOnTop={Boolean(settings.always_on_top)}
            onTogglePin={handleTogglePin}
          />
        )}
      </div>

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

      {/* Global Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(siteIdToDelete)}
        title="删除站点确认"
        message={`确定要删除站点 "${siteToDelete?.name || ""}" 吗？该站点的本地监控与密钥将被清除。`}
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteSite}
        onCancel={() => setSiteIdToDelete(null)}
      />
    </div>
  );
}

export default App;
