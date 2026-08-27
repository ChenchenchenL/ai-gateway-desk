import React from "react";
import { Site } from "../../types";
import { formatCurrency } from "../../utils/formatters";
import { AlertCircle, CheckCircle2, Clock, Hourglass, ShieldAlert } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge";

interface SiteCardProps {
  site: Site;
  onSelect: (site: Site) => void;
}

/**
 * Windows 11 Light Frosted Acrylic Summary Card for a monitored gateway site.
 */
export const SiteCard: React.FC<SiteCardProps> = ({ site, onSelect }) => {
  const isHealthy = !site.last_error && site.failure_count === 0;
  const isOutdated = site.last_error && site.last_success_at;

  return (
    <div
      onClick={() => onSelect(site)}
      className="fluent-card p-3 rounded-2xl cursor-pointer transition flex flex-col gap-2 relative overflow-hidden group select-none shadow-xs"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isHealthy ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          )}
          <span className="text-xs font-bold text-slate-800 truncate">
            {site.name}
          </span>
        </div>
        <StatusBadge variant="purple" size="sm">
          {site.provider}
        </StatusBadge>
      </div>

      {/* Balance and Quota Row */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium">账户余额</span>
          <span className="text-base font-extrabold text-amber-600 tabular-digits">
            {site.current_balance !== undefined && site.current_balance !== null
              ? formatCurrency(site.current_balance, site.currency)
              : site.capabilities?.balance
              ? "--"
              : "不支持"}
          </span>
        </div>

        {site.capabilities?.window_quota && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5 font-medium">
              <Hourglass className="w-2.5 h-2.5 text-indigo-500" />
              <span>5h 窗口</span>
            </span>
            <span className="text-xs font-bold text-indigo-900 tabular-digits">
              {site.window_remaining_quota !== undefined && site.window_remaining_quota !== null
                ? `${site.window_remaining_quota} 剩余`
                : "--"}
            </span>
          </div>
        )}
      </div>

      {/* Status footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-indigo-100/60">
        <div className="flex items-center gap-1 truncate max-w-[190px]">
          {isOutdated ? (
            <span className="text-amber-600 flex items-center gap-1 font-medium">
              <ShieldAlert className="w-3 h-3" />
              <span>数据可能已过期</span>
            </span>
          ) : site.last_error ? (
            <span className="text-rose-600 truncate font-medium">{site.last_error}</span>
          ) : (
            <span className="text-emerald-700 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>正常运行</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0 text-slate-400">
          <Clock className="w-2.5 h-2.5" />
          <span>{site.last_success_at ? "已同步" : "未同步"}</span>
        </div>
      </div>
    </div>
  );
};
