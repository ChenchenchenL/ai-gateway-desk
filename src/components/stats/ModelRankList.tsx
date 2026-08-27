import React from "react";
import { ModelUsageMetrics } from "../../types";
import { formatCacheHitRate, formatTokens } from "../../utils/formatters";
import { Cpu } from "lucide-react";
import { EmptyState } from "../common/EmptyState";

interface ModelRankListProps {
  models: ModelUsageMetrics[];
}

/**
 * Windows 11 Light Frosted Acrylic Model Rank List.
 */
export const ModelRankList: React.FC<ModelRankListProps> = ({ models }) => {
  if (models.length === 0) {
    return (
      <EmptyState
        icon={<Cpu className="w-4 h-4" />}
        title="暂无模型调用记录"
        description="该时间段内暂无模型请求"
        className="py-3"
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5 select-none">
      <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
        <span>模型明细排行</span>
        <span className="text-[10px] text-slate-400 font-normal">消耗 (in / out / hit)</span>
      </div>

      <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-0.5">
        {models.map((m) => (
          <div
            key={m.model_name}
            className="px-2 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-white/80 transition flex items-center justify-between text-xs shadow-xs"
          >
            <div className="flex items-center gap-2 max-w-[150px]">
              <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shrink-0">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col truncate">
                <span className="font-bold text-slate-800 truncate text-xs">
                  {m.model_name}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {m.request_count.toLocaleString()} 次调用
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end text-[11px]">
              <span className="text-slate-800 tabular-digits font-bold">
                {formatTokens(m.input_tokens)} <span className="text-slate-400 font-normal">/</span> {formatTokens(m.output_tokens)}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] tabular-digits mt-0.5">
                <span className="text-indigo-600 font-bold">
                  Hit: {formatTokens(m.cache_read_tokens)} ({formatCacheHitRate(m.cache_hit_rate_pct)})
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
