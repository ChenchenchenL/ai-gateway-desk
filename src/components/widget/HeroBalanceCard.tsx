import React from "react";
import { Coins, Hourglass } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { Site } from "../../types";

interface HeroBalanceCardProps {
  site: Site | null;
}

/**
 * Windows 11 Fluent Hero Balance & Window Quota Glass Card.
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
      ? "未限制"
      : "无限窗口限制";

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* 1. Account Balance Glass Card */}
      <div className="fluent-card p-3 rounded-xl flex flex-col justify-between relative overflow-hidden group">
        {/* Subtle Ambient Backlight */}
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none transition group-hover:bg-amber-500/15" />

        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium z-10">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>账户余额</span>
        </div>

        <div className="mt-1 z-10">
          <span className="text-xl font-bold tracking-tight text-slate-100 tabular-digits">
            {balanceText}
          </span>
        </div>
      </div>

      {/* 2. Window Quota Glass Card */}
      <div className="fluent-card p-3 rounded-xl flex flex-col justify-between relative overflow-hidden group">
        {/* Subtle Ambient Backlight */}
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none transition group-hover:bg-blue-500/15" />

        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium z-10">
          <Hourglass className="w-3.5 h-3.5 text-blue-400" />
          <span>窗口配额</span>
        </div>

        <div className="mt-1 z-10">
          <span className="text-base font-semibold tracking-tight text-slate-200 tabular-digits">
            {quotaText}
          </span>
        </div>
      </div>
    </div>
  );
};
