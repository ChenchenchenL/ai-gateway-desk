import React from "react";
import { ModelUsageMetrics } from "../../types";
import { formatCacheHitRate, formatTokens } from "../../utils/formatters";
import { Trophy } from "lucide-react";

interface ModelRankSectionProps {
  models: ModelUsageMetrics[];
}

/**
 * Windows 11 Light Frosted Acrylic Model Usage Ranking Section (Fits Top 3 with zero scrollbar).
 */
export const ModelRankSection: React.FC<ModelRankSectionProps> = ({ models }) => {
  // Sort models by total tokens descending
  const sortedModels = [...models].sort((a, b) => {
    const totalA = a.input_tokens + a.output_tokens;
    const totalB = b.input_tokens + b.output_tokens;
    return totalB - totalA || b.request_count - a.request_count;
  });

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <span className="w-3.5 h-3.5 rounded-md bg-amber-500/20 text-amber-700 border border-amber-500/35 font-extrabold text-[9.5px] flex items-center justify-center shrink-0">
            1
          </span>
        );
      case 1:
        return (
          <span className="w-3.5 h-3.5 rounded-md bg-slate-300/60 text-slate-700 border border-slate-400/40 font-extrabold text-[9.5px] flex items-center justify-center shrink-0">
            2
          </span>
        );
      case 2:
        return (
          <span className="w-3.5 h-3.5 rounded-md bg-orange-500/20 text-orange-700 border border-orange-500/35 font-extrabold text-[9.5px] flex items-center justify-center shrink-0">
            3
          </span>
        );
      default:
        return (
          <span className="w-3.5 h-3.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 font-bold text-[9.5px] flex items-center justify-center shrink-0">
            {index + 1}
          </span>
        );
    }
  };

  return (
    <div className="fluent-card px-2.5 py-2 rounded-xl flex flex-col select-none shadow-xs flex-1 min-h-0 overflow-hidden">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-1 border-b border-indigo-100/60 text-[11px] font-bold text-slate-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="p-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Trophy className="w-3 h-3" />
          </div>
          <span>模型调用排行 (Top 3)</span>
        </div>
        <span className="text-[9.5px] text-slate-400 font-normal">
          消耗 (In / Out / Hit)
        </span>
      </div>

      {/* Body: Empty State or Top 3 Visible List */}
      {sortedModels.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-2 text-center flex-1 min-h-[50px]">
          <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mb-1">
            <Trophy className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-bold text-slate-700">暂无调用数据</span>
          <span className="text-[9.5px] text-slate-400 mt-0.5">产生 API 请求后将实时展示排行</span>
        </div>
      ) : (
        <div className="overflow-y-auto pr-0.5 pt-1 flex flex-col gap-1 flex-1 min-h-0">
          {sortedModels.map((m, idx) => (
            <div
              key={m.model_name}
              className={`px-1.5 py-1 rounded-lg border transition flex items-center justify-between text-xs shadow-xs ${
                idx === 0
                  ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-200/60"
                  : idx === 1
                  ? "bg-slate-100/60 hover:bg-slate-100 border-slate-200/80"
                  : idx === 2
                  ? "bg-orange-500/5 hover:bg-orange-500/10 border-orange-200/60"
                  : "bg-white/70 hover:bg-white border-white/80"
              }`}
            >
              {/* Left: Rank Badge + Model Name & Requests */}
              <div className="flex items-center gap-1.5 max-w-[55%] min-w-0">
                {getRankBadge(idx)}
                <div className="flex flex-col truncate">
                  <span className="font-bold text-slate-800 truncate text-[10.5px] leading-tight">
                    {m.model_name}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">
                    {m.request_count.toLocaleString()} 次调用
                  </span>
                </div>
              </div>

              {/* Right: Tokens & Cache Hit */}
              <div className="flex flex-col items-end shrink-0 text-right">
                <span className="font-bold text-slate-800 tabular-digits text-[10px] leading-tight">
                  {formatTokens(m.input_tokens)} <span className="text-slate-400 font-normal">/</span> {formatTokens(m.output_tokens)}
                </span>
                <span className="text-[9px] text-indigo-600 font-bold tabular-digits leading-none mt-0.5">
                  Hit: {formatTokens(m.cache_read_tokens)} ({formatCacheHitRate(m.cache_hit_rate_pct)})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
