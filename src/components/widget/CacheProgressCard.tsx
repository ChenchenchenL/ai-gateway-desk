import React from "react";
import { Sparkles } from "lucide-react";

interface CacheProgressCardProps {
  hitRatePct?: number;
}

/**
 * Windows 11 Fluent Prompt Cache Efficiency Progress Glass Card.
 * Displays hit rate percentage, smooth dynamic gradient bar, formula note, and cost savings estimate.
 */
export const CacheProgressCard: React.FC<CacheProgressCardProps> = ({
  hitRatePct = 0,
}) => {
  const safeRate = Math.min(100, Math.max(0, hitRatePct || 0));
  // Prompt caching typically yields 80-90% discount on cache read tokens
  const estimatedCostSavingsPct = Math.round(safeRate * 0.9);

  return (
    <div className="fluent-card p-3 rounded-xl flex flex-col gap-2 relative overflow-hidden">
      {/* Top Header: Title & Big Percentage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Prompt 缓存效率 (Cache Hit Rate)</span>
        </div>
        <span className="text-base font-bold text-amber-300 tabular-digits">
          {safeRate.toFixed(1)}%
        </span>
      </div>

      {/* Dynamic Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-950/70 border border-white/[0.06] overflow-hidden p-0.5 relative">
        <div
          style={{ width: `${safeRate}%` }}
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(245,158,11,0.4)]"
        />
      </div>

      {/* Bottom Metadata: Formula & Cost Savings */}
      <div className="flex items-center justify-between text-[10px] pt-0.5">
        <span className="text-slate-400">
          公式：缓存请求 / 总输入 × 100%
        </span>
        {safeRate > 0 ? (
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
            节省 {estimatedCostSavingsPct}% 输入成本
          </span>
        ) : (
          <span className="text-slate-500">
            暂无缓存节省
          </span>
        )}
      </div>
    </div>
  );
};
