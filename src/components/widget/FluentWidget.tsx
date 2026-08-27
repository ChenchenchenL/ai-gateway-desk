import React, { useState, useRef, useEffect } from "react";
import { Site, TimePreset } from "../../types";
import { useSiteStats } from "../../hooks/useSiteStats";
import { WidgetHeader } from "./WidgetHeader";
import { HeroBalanceCard } from "./HeroBalanceCard";
import { TimePresetBar } from "./TimePresetBar";
import { MetricsGridCard } from "./MetricsGridCard";
import { CacheProgressCard } from "./CacheProgressCard";
import { ModelRankSection } from "./ModelRankSection";
import { CompactMiniWidget } from "./CompactMiniWidget";
import { Clock } from "lucide-react";

interface FluentWidgetProps {
  currentSite: Site | null;
  sites: Site[];
  onSelectSite: (site: Site) => void;
  onAddSite: () => void;
  onEditSite: (site: Site) => void;
  onDeleteSite: (siteId: string) => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  alwaysOnTop: boolean;
  onTogglePin: () => void;
}

/**
 * Windows 11 Light Frosted Acrylic Desktop Monitor Widget.
 */
export const FluentWidget: React.FC<FluentWidgetProps> = ({
  currentSite,
  sites,
  onSelectSite,
  onAddSite,
  onEditSite,
  onDeleteSite,
  onOpenSettings,
  onRefresh,
  refreshing,
  alwaysOnTop,
  onTogglePin,
}) => {
  const [preset, setPreset] = useState<TimePreset>("24h");
  const [manualCompact, setManualCompact] = useState(false);
  const [isSmallContainer, setIsSmallContainer] = useState(false);

  const { metrics, models } = useSiteStats(currentSite?.id, preset, currentSite?.last_success_at);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height } = entry.contentRect;
        setIsSmallContainer(height < 300);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isCompact = manualCompact || isSmallContainer;

  return (
    <div
      ref={containerRef}
      className="acrylic-widget flex flex-col w-full h-full rounded-2xl overflow-hidden shadow-2xl relative select-none"
    >
      {/* 1. Header Bar */}
      <WidgetHeader
        currentSite={currentSite}
        sites={sites}
        onSelectSite={onSelectSite}
        onAddSite={onAddSite}
        onEditSite={onEditSite}
        onDeleteSite={onDeleteSite}
        onOpenSettings={onOpenSettings}
        onRefresh={onRefresh}
        refreshing={refreshing}
        alwaysOnTop={alwaysOnTop}
        onTogglePin={onTogglePin}
        compactMode={isCompact}
        onToggleCompact={() => setManualCompact(!manualCompact)}
      />

      {/* 2. Main Content Body */}
      {isCompact ? (
        <CompactMiniWidget
          site={currentSite}
          metrics={metrics}
          onExpand={() => setManualCompact(false)}
        />
      ) : (
        <div className="p-2 flex flex-col gap-1.5 flex-1 overflow-hidden min-h-0">
          {/* A. Balance & Quota Hero Card */}
          <HeroBalanceCard site={currentSite} />

          {/* B. Time Preset Bar */}
          <TimePresetBar preset={preset} onSelectPreset={setPreset} />

          {/* C. 4-Metrics Grid */}
          {metrics && <MetricsGridCard metrics={metrics} />}

          {/* D. Prompt Cache Efficiency */}
          <CacheProgressCard hitRatePct={metrics?.cache_hit_rate_pct} />

          {/* E. Model Rank List */}
          <ModelRankSection models={models} />

          {/* F. Footer Status */}
          <div
            data-tauri-drag-region
            className="flex items-center justify-between pt-1 border-t border-indigo-100/60 text-[10px] text-slate-500 font-medium select-none cursor-move shrink-0"
          >
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>
                最后同步：
                {currentSite?.last_success_at
                  ? new Date(currentSite.last_success_at).toLocaleTimeString()
                  : "待同步"}
              </span>
            </div>
            <span className="truncate max-w-[130px] font-mono text-[9.5px] text-slate-400">
              {currentSite?.base_url?.replace(/^https?:\/\//, "")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
