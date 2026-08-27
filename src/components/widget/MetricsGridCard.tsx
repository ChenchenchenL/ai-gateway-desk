import React from "react";
import { AggregatedMetrics } from "../../types";
import { formatTokens } from "../../utils/formatters";
import { ArrowDownLeft, ArrowUpRight, Zap, Activity } from "lucide-react";

interface MetricsGridCardProps {
  metrics: AggregatedMetrics;
}

/**
 * Windows 11 Fluent 4-Metric Glass Grid Card.
 * Displays Input Tokens, Output Tokens, Cache Hit Tokens, and Total Requests.
 */
export const MetricsGridCard: React.FC<MetricsGridCardProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {/* 1. Input Tokens */}
      <div className="fluent-card p-2.5 rounded-xl flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ArrowDownLeft className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">输入 Tokens</span>
        </div>
        <div className="mt-1">
          <span className="text-base font-bold text-slate-100 tabular-digits">
            {formatTokens(metrics.total_input_tokens)}
          </span>
        </div>
      </div>

      {/* 2. Output Tokens */}
      <div className="fluent-card p-2.5 rounded-xl flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">输出 Tokens</span>
        </div>
        <div className="mt-1">
          <span className="text-base font-bold text-slate-100 tabular-digits">
            {formatTokens(metrics.total_output_tokens)}
          </span>
        </div>
      </div>

      {/* 3. Cache Hit Tokens */}
      <div className="fluent-card p-2.5 rounded-xl flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">缓存命中</span>
        </div>
        <div className="mt-1">
          <span className="text-base font-bold text-amber-300 tabular-digits">
            {formatTokens(metrics.total_cache_read_tokens)}
          </span>
        </div>
      </div>

      {/* 4. Request Count */}
      <div className="fluent-card p-2.5 rounded-xl flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">请求次数</span>
        </div>
        <div className="mt-1">
          <span className="text-base font-bold text-indigo-300 tabular-digits">
            {metrics.total_requests.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
