import { useState } from "react";
import { TitleBar } from "./components/layout/TitleBar";
import { SiteList } from "./components/site/SiteList";
import { SiteDetailModal } from "./components/site/SiteDetailModal";
import { SiteFormModal } from "./components/site/SiteFormModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { useSites } from "./hooks/useSites";
import { useRefresh } from "./hooks/useRefresh";
import { useSettings } from "./hooks/useSettings";
import { Site } from "./types";
import { formatCurrency } from "./utils/formatters";
import { Coins, Layers } from "lucide-react";

/**
 * Main application window root component.
 */
export function App() {
  const { sites, refreshList } = useSites();
  const { refreshing, refreshAll } = useRefresh(refreshList);
  const { settings, updateSettings, clearCache } = useSettings();

  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  const handleOpenEdit = (site: Site) => {
    setSelectedSite(null);
    setEditingSite(site);
    setIsFormOpen(true);
  };

  // Calculate sum of known balances for mini widget
  const totalBalance = sites.reduce((sum, s) => sum + (s.current_balance ?? 0), 0);

  return (
    <div
      style={{ opacity: (settings.opacity_pct ?? 100) / 100 }}
      className={`flex flex-col w-screen bg-slate-950/90 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "h-auto pb-1" : "h-screen"
      }`}
    >
      <TitleBar
        alwaysOnTop={settings.always_on_top}
        collapsed={collapsed}
        onTogglePin={handleTogglePin}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onRefreshAll={refreshAll}
        onOpenSettings={() => setIsSettingsOpen(true)}
        refreshing={refreshing}
      />

      {collapsed ? (
        /* Compact Mini Widget Strip */
        <div
          data-tauri-drag-region
          className="px-3 py-2 flex items-center justify-between text-xs bg-slate-900/50 cursor-move"
        >
          <div className="flex items-center gap-1.5 text-slate-400">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>总计余额:</span>
            <span className="font-bold text-slate-100">{formatCurrency(totalBalance)}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>{sites.length} 个站点</span>
          </div>
        </div>
      ) : (
        /* Standard Expanded Card List */
        <main className="flex-1 overflow-y-auto">
          <SiteList
            sites={sites}
            onSelectSite={(site) => setSelectedSite(site)}
            onAddSite={handleOpenAdd}
          />
        </main>
      )}

      {/* Detail Modal */}
      {selectedSite && (
        <SiteDetailModal
          site={selectedSite}
          onClose={() => setSelectedSite(null)}
          onEdit={handleOpenEdit}
          onDeleted={refreshList}
          onRefreshed={refreshList}
        />
      )}

      {/* Form Modal */}
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
