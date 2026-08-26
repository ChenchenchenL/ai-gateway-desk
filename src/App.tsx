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

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950/95 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
      <TitleBar
        alwaysOnTop={settings.always_on_top}
        onTogglePin={handleTogglePin}
        onRefreshAll={refreshAll}
        onOpenSettings={() => setIsSettingsOpen(true)}
        refreshing={refreshing}
      />

      <main className="flex-1 overflow-y-auto">
        <SiteList
          sites={sites}
          onSelectSite={(site) => setSelectedSite(site)}
          onAddSite={handleOpenAdd}
        />
      </main>

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
