import React from "react";
import { Site, AggregatedMetrics } from "../../types";
import { formatCurrency } from "../../utils/formatters";
import { Coins, Sparkles, Activity, Maximize2 } from "lucide-react";

interface CompactMiniWidgetProps {
  site: Site | null;
  metrics: AggregatedMetrics | null;
  onExpand: () => void;
}

/**
 * Windows 11 Ultra-Compact Floating Strip for minimal desktop footprint.
 */
export const CompactMiniWidget: React.FC<CompactMiniWidgetProps> = ({
  site,
  metrics,
  onExpand,
}) => {
  const balanceText =
    site?.current_balance !== undefined && site.current_balance !== null
      ? formatCurrency(site.current_balance, site.currency)
      : "--";

  const hitRate = metrics?.cache_hit_rate_pct ?? 0;
  const requests = metrics?.total_requests ?? 0;

  return (
    <div
      data-tauri-drag-region
      className="p-2.5 flex items-center justify-between gap-3 text-xs select-none cursor-move"
    >
      {/* 1. Balance */}
      <div className="flex items-center gap-1.5" data-tauri-drag-region>
        <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">账户余额</span>
          <span className="font-bold text-slate-100 tabular-digits">{balanceText}</span>
        </div>
      </div>

      <div className="h-6 w-px bg-white/[0.08]" />

      {/* 2. Cache Hit Rate */}
      <div className="flex items-center gap-1.5" data-tauri-drag-region>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">Cache Rate</span>
          <span className="font-bold text-amber-300 tabular-digits">{hitRate.toFixed(1)}%</span>
        </div>
      </div>

      <div className="h-6 w-px bg-white/[0.08]" />

      {/* 3. Requests */}
      <div className="flex items-center gap-1.5" data-tauri-drag-region>
        <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">请求数</span>
          <span className="font-bold text-indigo-300 tabular-digits">{requests.toLocaleString()}</span>
        </div>
      </div>

      {/* Expand Action */}
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={onExpand}
        title="展开完整监控视图"
        className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 transition shrink-0 cursor-pointer"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
