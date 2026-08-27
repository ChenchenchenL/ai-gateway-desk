import React from "react";
import { AggregatedMetrics } from "../../types";
import { formatTokens } from "../../utils/formatters";
import { ArrowDownLeft, ArrowUpRight, Zap, Activity } from "lucide-react";

interface MetricsGridCardProps {
  metrics: AggregatedMetrics;
}

/**
 * Windows 11 Light Frosted Acrylic 4-Metric Grid (Compact Height).
 */
export const MetricsGridCard: React.FC<MetricsGridCardProps> = ({ metrics }) => {
  const items = [
    {
      label: "输入 Tokens",
      value: formatTokens(metrics.total_input_tokens),
      icon: <ArrowDownLeft className="w-3 h-3" />,
      colorClass: "text-sky-700",
      iconBg: "bg-sky-500/10 text-sky-600 border border-sky-500/20",
    },
    {
      label: "输出 Tokens",
      value: formatTokens(metrics.total_output_tokens),
      icon: <ArrowUpRight className="w-3 h-3" />,
      colorClass: "text-emerald-700",
      iconBg: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
    },
    {
      label: "缓存命中",
      value: formatTokens(metrics.total_cache_read_tokens),
      icon: <Zap className="w-3 h-3" />,
      colorClass: "text-amber-700",
      iconBg: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    },
    {
      label: "请求次数",
      value: metrics.total_requests.toLocaleString(),
      icon: <Activity className="w-3 h-3" />,
      colorClass: "text-indigo-700",
      iconBg: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-1.5 select-none shrink-0">
      {items.map((item) => (
        <div
          key={item.label}
          className="fluent-card px-2 py-1.5 rounded-xl flex flex-col justify-between shadow-xs transition"
        >
          <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold">
            <div className={`p-0.5 rounded-md ${item.iconBg}`}>
              {item.icon}
            </div>
            <span className="truncate">{item.label}</span>
          </div>
          <div className="mt-0.5">
            <span className={`text-sm font-extrabold tabular-digits tracking-tight leading-tight ${item.colorClass}`}>
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
