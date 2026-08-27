import React from "react";
import { formatCacheHitRate } from "../../utils/formatters";
import { Sparkles } from "lucide-react";

interface CacheInsightCardProps {
  hitRate?: number;
  hasCacheData: boolean;
}

/**
 * Windows 11 Light Frosted Acrylic Cache Insight Card.
 */
export const CacheInsightCard: React.FC<CacheInsightCardProps> = ({
  hitRate,
  hasCacheData,
}) => {
  const percentage = hitRate ?? 0;
  const safeRate = Math.min(100, Math.max(0, percentage));
  const estimatedSavings = Math.round(safeRate * 0.9);

  return (
    <div className="fluent-card p-2.5 rounded-2xl flex flex-col justify-between shadow-xs select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs font-bold text-slate-800 truncate">
              Prompt 缓存效率
            </span>
            {hasCacheData && safeRate > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold shrink-0">
                节省 {estimatedSavings}% 成本
              </span>
            )}
          </div>
        </div>

        <span className="text-base font-extrabold text-indigo-600 tabular-digits tracking-tight shrink-0 ml-1">
          {hasCacheData ? formatCacheHitRate(hitRate) : "无缓存记录"}
        </span>
      </div>

      <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden my-1.5 relative shadow-inner">
        <div
          className="bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${safeRate}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span>公式：缓存读取 / 总输入 × 100%</span>
        <span>动态日志统计</span>
      </div>
    </div>
  );
};
