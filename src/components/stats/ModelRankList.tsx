import React from "react";
import { ModelUsageMetrics } from "../../types";
import { formatCacheHitRate, formatTokens } from "../../utils/formatters";
import { Cpu } from "lucide-react";

interface ModelRankListProps {
  models: ModelUsageMetrics[];
}

/**
 * Lists top used models with token breakdowns and cache performance.
 */
export const ModelRankList: React.FC<ModelRankListProps> = ({ models }) => {
  if (models.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-500">
        该时间段内暂无模型调用记录
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
        <span>模型明细排行</span>
        <span>消耗 (In / Out / Cache)</span>
      </div>

      <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
        {models.map((m) => (
          <div
            key={m.model_name}
            className="p-2 bg-slate-900/60 border border-slate-800 rounded-md flex items-center justify-between text-xs hover:border-slate-700 transition"
          >
            <div className="flex items-center gap-2 max-w-[150px]">
              <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="font-medium text-slate-200 truncate">
                  {m.model_name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {m.request_count} 次调用
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end text-[11px]">
              <span className="text-slate-300">
                {formatTokens(m.input_tokens)} / {formatTokens(m.output_tokens)}
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-amber-400">
                  Hit: {formatTokens(m.cache_read_tokens)}
                </span>
                <span className="text-indigo-400 font-semibold">
                  ({formatCacheHitRate(m.cache_hit_rate_pct)})
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
