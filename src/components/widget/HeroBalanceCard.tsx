import React from "react";
import { Coins, Hourglass } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { Site } from "../../types";

interface HeroBalanceCardProps {
  site: Site | null;
}

/**
 * Windows 11 Light Frosted Acrylic Balance & Quota Cards (Compact Height).
 */
export const HeroBalanceCard: React.FC<HeroBalanceCardProps> = ({ site }) => {
  const balanceText =
    site?.current_balance !== undefined && site.current_balance !== null
      ? formatCurrency(site.current_balance, site.currency)
      : site?.capabilities?.balance
      ? "--"
      : "不支持";

  const quotaText =
    site?.window_remaining_quota !== undefined && site.window_remaining_quota !== null
      ? `${site.window_remaining_quota.toLocaleString()} 剩余`
      : site?.capabilities?.window_quota
      ? "动态循环"
      : "无限窗口限制";

  return (
    <div className="grid grid-cols-2 gap-1.5 shrink-0">
      {/* 1. Account Balance KPI Card */}
      <div className="fluent-card px-2.5 py-1.5 rounded-xl flex flex-col justify-between select-none shadow-xs">
        <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px] font-bold">
          <div className="p-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Coins className="w-3 h-3" />
          </div>
          <span>账户余额</span>
        </div>
        <div className="mt-0.5 flex flex-col">
          <span className="text-base font-extrabold text-amber-600 tabular-digits tracking-tight leading-tight">
            {balanceText}
          </span>
          <span className="text-[9.5px] text-slate-400 font-medium leading-none mt-0.5">
            {site?.currency || "CNY"} 实时可用
          </span>
        </div>
      </div>

      {/* 2. Window Quota KPI Card */}
      <div className="fluent-card px-2.5 py-1.5 rounded-xl flex flex-col justify-between select-none shadow-xs">
        <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px] font-bold">
          <div className="p-0.5 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
            <Hourglass className="w-3 h-3" />
          </div>
          <span>窗口配额</span>
        </div>
        <div className="mt-0.5 flex flex-col">
          <span className="text-xs font-bold text-indigo-900 tabular-digits tracking-tight leading-tight">
            {quotaText}
          </span>
          <span className="text-[9.5px] text-slate-400 font-medium leading-none mt-0.5">
            {site?.capabilities?.window_quota ? "动态重置配额" : "无窗口上限限制"}
          </span>
        </div>
      </div>
    </div>
  );
};
