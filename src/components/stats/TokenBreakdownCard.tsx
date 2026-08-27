import React from "react";
import { AggregatedMetrics } from "../../types";
import { formatTokens } from "../../utils/formatters";
import { ArrowDownLeft, ArrowUpRight, Zap, Activity } from "lucide-react";

interface TokenBreakdownCardProps {
  metrics: AggregatedMetrics;
}

/**
 * Visual breakdown of token consumption and prompt cache volumes.
 */
export const TokenBreakdownCard: React.FC<TokenBreakdownCardProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />
          <span>输入 Tokens</span>
        </div>
        <span className="text-base font-semibold text-slate-100">
          {formatTokens(metrics.total_input_tokens)}
        </span>
      </div>

      <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          <span>输出 Tokens</span>
        </div>
        <span className="text-base font-semibold text-slate-100">
          {formatTokens(metrics.total_output_tokens)}
        </span>
      </div>

      <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>缓存命中 (Cache)</span>
        </div>
        <span className="text-base font-semibold text-amber-300">
          {formatTokens(metrics.total_cache_read_tokens)}
        </span>
      </div>

      <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>请求次数</span>
        </div>
        <span className="text-base font-semibold text-indigo-300">
          {metrics.total_requests.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
