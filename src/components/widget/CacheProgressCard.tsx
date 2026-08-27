import React from "react";
import { Sparkles } from "lucide-react";

interface CacheProgressCardProps {
  hitRatePct?: number;
}

/**
 * Windows 11 Light Frosted Acrylic Prompt Cache Efficiency Card (Compact).
 */
export const CacheProgressCard: React.FC<CacheProgressCardProps> = ({
  hitRatePct = 0,
}) => {
  const safeRate = Math.min(100, Math.max(0, hitRatePct || 0));
  const estimatedCostSavingsPct = Math.round(safeRate * 0.9);

  return (
    <div className="fluent-card px-2.5 py-1.5 rounded-xl flex flex-col justify-between shadow-xs select-none shrink-0">
      {/* Top: Title & Rate & Savings Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-0.5 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
            <Sparkles className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[11px] font-bold text-slate-800 truncate">
              Prompt 缓存效率
            </span>
            {safeRate > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9.5px] font-bold shrink-0">
                节省 {estimatedCostSavingsPct}% 成本
              </span>
            )}
          </div>
        </div>

        <span className="text-sm font-extrabold text-indigo-600 tabular-digits tracking-tight shrink-0 ml-1">
          {safeRate.toFixed(1)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden my-1 relative shadow-inner">
        <div
          style={{ width: `${safeRate}%` }}
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 transition-all duration-500 ease-out"
        />
      </div>

      {/* Bottom Subtitle */}
      <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-medium">
        <span>公式：缓存请求 / 总输入 × 100%</span>
        <span>节省约 {estimatedCostSavingsPct}% 输入成本</span>
      </div>
    </div>
  );
};
