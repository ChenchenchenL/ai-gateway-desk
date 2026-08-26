import React from "react";
import { formatCacheHitRate } from "../../utils/formatters";
import { Sparkles } from "lucide-react";

interface CacheInsightCardProps {
  hitRate?: number;
  hasCacheData: boolean;
}

/**
 * Display card visualizing Prompt Cache efficiency and percentage.
 */
export const CacheInsightCard: React.FC<CacheInsightCardProps> = ({
  hitRate,
  hasCacheData,
}) => {
  const percentage = hitRate ?? 0;

  return (
    <div className="p-3 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-900/80 border border-indigo-900/40 rounded-lg flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Prompt 缓存效率 (Cache Hit Rate)</span>
        </div>
        <span className="text-sm font-bold text-indigo-300">
          {hasCacheData ? formatCacheHitRate(hitRate) : "无缓存记录"}
        </span>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>公式：缓存读取 / 总输入 × 100%</span>
        {percentage > 0 && (
          <span className="text-emerald-400 font-medium">
            节省约 {(percentage * 0.9).toFixed(0)}% 输入成本
          </span>
        )}
      </div>
    </div>
  );
};
