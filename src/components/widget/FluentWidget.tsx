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
  onOpenSettings: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  alwaysOnTop: boolean;
  onTogglePin: () => void;
}

/**
 * Windows 11 Fluent Design + Acrylic Glassmorphism Desktop Monitor Widget.
 */
export const FluentWidget: React.FC<FluentWidgetProps> = ({
  currentSite,
  sites,
  onSelectSite,
  onAddSite,
  onOpenSettings,
  onRefresh,
  refreshing,
  alwaysOnTop,
  onTogglePin,
}) => {
  // Preset defaults to '24h' as requested
  const [preset, setPreset] = useState<TimePreset>("24h");
  const [manualCompact, setManualCompact] = useState(false);
  const [isSmallContainer, setIsSmallContainer] = useState(false);

  const { metrics, models } = useSiteStats(currentSite?.id, preset);
  const containerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver for Responsive Desktop Widget Layout (No CSS scale distortion)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height } = entry.contentRect;
        // Auto compact when window height is strictly constrained (< 340px)
        setIsSmallContainer(height < 340);
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
      {/* 1. Windows 11 Frameless Drag Bar / Header */}
      <WidgetHeader
        currentSite={currentSite}
        sites={sites}
        onSelectSite={onSelectSite}
        onAddSite={onAddSite}
        onOpenSettings={onOpenSettings}
        onRefresh={onRefresh}
        refreshing={refreshing}
        alwaysOnTop={alwaysOnTop}
        onTogglePin={onTogglePin}
        compactMode={isCompact}
        onToggleCompact={() => setManualCompact(!manualCompact)}
      />

      {/* 2. Body: Standard Expanded View vs Compact Strip */}
      {isCompact ? (
        <CompactMiniWidget
          site={currentSite}
          metrics={metrics}
          onExpand={() => setManualCompact(false)}
        />
      ) : (
        <div className="p-3.5 flex flex-col gap-3 flex-1 overflow-hidden min-h-0">
          {/* Hero: Balance & Window Quota */}
          <HeroBalanceCard site={currentSite} />

          {/* Time Preset Bar (今日 | 24小时 | 7天 | 30天) */}
          <TimePresetBar preset={preset} onSelectPreset={setPreset} />

          {/* 4-Metric Grid (Input, Output, Cache Hit, Requests) */}
          {metrics && <MetricsGridCard metrics={metrics} />}

          {/* Prompt Cache Hit Rate Progress & Cost Savings */}
          <CacheProgressCard hitRatePct={metrics?.cache_hit_rate_pct} />

          {/* Model Usage Ranking (Scrollable) */}
          <ModelRankSection models={models} />

          {/* Subtle Glass Footer */}
          <div
            data-tauri-drag-region
            className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[10px] text-slate-400 select-none cursor-move shrink-0"
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
            <span className="truncate max-w-[140px] text-slate-400">
              {currentSite?.base_url?.replace(/^https?:\/\//, "")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
