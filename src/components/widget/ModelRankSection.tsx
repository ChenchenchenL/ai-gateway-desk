import React from "react";
import { ModelUsageMetrics } from "../../types";
import { formatCacheHitRate, formatTokens } from "../../utils/formatters";
import { Cpu } from "lucide-react";

interface ModelRankSectionProps {
  models: ModelUsageMetrics[];
}

/**
 * Windows 11 Fluent Scrollable Model Usage Rank List.
 */
export const ModelRankSection: React.FC<ModelRankSectionProps> = ({ models }) => {
  if (models.length === 0) {
    return (
      <div className="fluent-card p-4 rounded-xl text-center text-xs text-slate-500">
        该时间段内暂无模型调用记录
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-h-0">
      {/* Header Row */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 px-1">
        <span>模型调用排行</span>
        <span className="text-[10px] text-slate-500 font-medium">消耗 (In / Out / Cache)</span>
      </div>

      {/* Scrollable Model Items */}
      <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1 max-h-56">
        {models.map((m) => (
          <div
            key={m.model_name}
            className="fluent-card px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition"
          >
            {/* Left: Model Name & Call count */}
            <div className="flex items-center gap-2 max-w-[50%] min-w-0">
              <div className="p-1 rounded-md bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 shrink-0">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col truncate">
                <span className="font-semibold text-slate-200 truncate">
                  {m.model_name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {m.request_count.toLocaleString()} 次调用
                </span>
              </div>
            </div>

            {/* Right: In / Out Tokens & Hit details */}
            <div className="flex flex-col items-end text-[11px] shrink-0">
              <span className="font-medium text-slate-300 tabular-digits">
                {formatTokens(m.input_tokens)} / {formatTokens(m.output_tokens)}
              </span>
              <div className="flex items-center gap-1 text-[10px] tabular-digits">
                <span className="text-amber-400 font-medium">
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
