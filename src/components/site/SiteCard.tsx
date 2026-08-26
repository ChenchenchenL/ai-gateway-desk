import React from "react";
import { Site } from "../../types";
import { formatCurrency } from "../../utils/formatters";
import { AlertCircle, CheckCircle2, Clock, Hourglass, ShieldAlert } from "lucide-react";

interface SiteCardProps {
  site: Site;
  onSelect: (site: Site) => void;
}

/**
 * Summary card for an individual monitored gateway site.
 */
export const SiteCard: React.FC<SiteCardProps> = ({ site, onSelect }) => {
  const isHealthy = !site.last_error && site.failure_count === 0;
  const isOutdated = site.last_error && site.last_success_at;

  return (
    <div
      onClick={() => onSelect(site)}
      className="p-3 bg-slate-900/70 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition flex flex-col gap-2 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {isHealthy ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span className="text-xs font-semibold text-slate-100 truncate">
            {site.name}
          </span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
          {site.provider}
        </span>
      </div>

      {/* Balance and Quota Row */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">账户余额</span>
          <span className="text-sm font-bold text-slate-100">
            {site.current_balance !== undefined && site.current_balance !== null
              ? formatCurrency(site.current_balance, site.currency)
              : site.capabilities?.balance
              ? "--"
              : "不支持"}
          </span>
        </div>

        {site.capabilities?.window_quota && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Hourglass className="w-2.5 h-2.5 text-blue-400" />
              <span>5h 窗口</span>
            </span>
            <span className="text-xs font-semibold text-blue-300">
              {site.window_remaining_quota !== undefined && site.window_remaining_quota !== null
                ? `${site.window_remaining_quota} 剩余`
                : "--"}
            </span>
          </div>
        )}
      </div>

      {/* Status footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/60">
        <div className="flex items-center gap-1 truncate max-w-[190px]">
          {isOutdated ? (
            <span className="text-amber-400/90 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span>数据可能已过期</span>
            </span>
          ) : site.last_error ? (
            <span className="text-rose-400/90 truncate">{site.last_error}</span>
          ) : (
            <span>正常运行</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Clock className="w-2.5 h-2.5" />
          <span>{site.last_success_at ? "已更新" : "未同步"}</span>
        </div>
      </div>
    </div>
  );
};
