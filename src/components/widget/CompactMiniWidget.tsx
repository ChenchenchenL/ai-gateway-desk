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
 * Windows 11 Light Frosted Acrylic Compact Floating HUD Strip.
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
      className="p-2.5 flex items-center justify-between gap-2.5 text-xs select-none cursor-move"
    >
      {/* 1. Balance */}
      <div className="flex items-center gap-1.5" data-tauri-drag-region>
        <div className="p-1 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <Coins className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-slate-500">余额</span>
          <span className="font-extrabold text-amber-600 tabular-digits tracking-tight">
            {balanceText}
          </span>
        </div>
      </div>

      <div className="h-5 w-px bg-slate-200" />

      {/* 2. Cache Hit Rate */}
      <div className="flex items-center gap-1.5" data-tauri-drag-region>
        <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-slate-500">Cache</span>
          <span className="font-extrabold text-emerald-700 tabular-digits tracking-tight">
            {hitRate.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="h-5 w-px bg-slate-200" />

      {/* 3. Total Requests */}
      <div className="flex items-center gap-1.5" data-tauri-drag-region>
        <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
          <Activity className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-slate-500">请求数</span>
          <span className="font-extrabold text-indigo-700 tabular-digits tracking-tight">
            {requests}
          </span>
        </div>
      </div>

      {/* Expand Button */}
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={onExpand}
        title="展开完整监控视图"
        className="p-1.5 rounded-xl bg-white/80 hover:bg-white border border-white/90 text-slate-600 hover:text-indigo-600 shadow-xs transition cursor-pointer"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
