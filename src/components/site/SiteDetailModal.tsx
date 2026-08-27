import React, { useState } from "react";
import { Site, TimePreset } from "../../types";
import { useSiteStats } from "../../hooks/useSiteStats";
import { siteService } from "../../services/siteService";
import { TokenBreakdownCard } from "../stats/TokenBreakdownCard";
import { CacheInsightCard } from "../stats/CacheInsightCard";
import { ModelRankList } from "../stats/ModelRankList";
import { formatCurrency } from "../../utils/formatters";
import {
  X,
  RefreshCw,
  Edit2,
  Trash2,
  Coins,
  Hourglass,
  Clock,
  Layers,
} from "lucide-react";

interface SiteDetailModalProps {
  site: Site;
  onClose: () => void;
  onEdit: (site: Site) => void;
  onDeleted: () => void;
  onRefreshed: () => void;
}

const PRESETS: { label: string; value: TimePreset }[] = [
  { label: "今日", value: "today" },
  { label: "24小时", value: "24h" },
  { label: "7天", value: "7d" },
  { label: "30天", value: "30d" },
];

/**
 * Windows 11 Fluent Acrylic Site Detail Modal.
 */
export const SiteDetailModal: React.FC<SiteDetailModalProps> = ({
  site,
  onClose,
  onEdit,
  onDeleted,
  onRefreshed,
}) => {
  const [preset, setPreset] = useState<TimePreset>("24h");
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { metrics, models } = useSiteStats(site.id, preset);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await siteService.refreshSite(site.id);
      onRefreshed();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`确定要删除站点 "${site.name}" 吗？`)) return;
    setDeleting(true);
    try {
      await siteService.deleteSite(site.id);
      onDeleted();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="acrylic-widget rounded-2xl w-full max-w-md max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 truncate max-w-[180px]">
              {site.name}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-900/80 border border-white/10 text-slate-200 uppercase font-mono font-semibold">
              {site.provider}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-700">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="刷新本站点"
              className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-black/[0.06] transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(site)}
              title="编辑配置"
              className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-black/[0.06] transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              title="删除站点"
              className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-black/[0.06] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-3.5 text-xs">
          {/* Balance & Window Quota section */}
          <div className="grid grid-cols-2 gap-2">
            <div className="fluent-card p-3 rounded-xl flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>账户余额</span>
              </div>
              <span className="text-lg font-bold text-slate-100 tabular-digits">
                {site.current_balance !== undefined && site.current_balance !== null
                  ? formatCurrency(site.current_balance, site.currency)
                  : site.capabilities?.balance
                  ? "未同步"
                  : "不支持"}
              </span>
            </div>

            <div className="fluent-card p-3 rounded-xl flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                <Hourglass className="w-3.5 h-3.5 text-blue-400" />
                <span>滚动窗口配额</span>
              </div>
              <span className="text-lg font-bold text-slate-100 tabular-digits">
                {site.window_remaining_quota !== undefined && site.window_remaining_quota !== null
                  ? `${site.window_remaining_quota} 剩余`
                  : site.capabilities?.window_quota
                  ? "未提供"
                  : "无窗口限制"}
              </span>
            </div>
          </div>

          {/* Time Preset Bar */}
          <div className="flex items-center justify-between border-b border-black/[0.08] pb-2">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>统计周期</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-white/10 backdrop-blur-md">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPreset(p.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    preset === p.value ? "fluent-pill-active" : "fluent-pill-inactive"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Token Breakdown Cards */}
          {metrics && <TokenBreakdownCard metrics={metrics} />}

          {/* Prompt Cache Insight */}
          <CacheInsightCard
            hitRate={metrics?.cache_hit_rate_pct}
            hasCacheData={(metrics?.total_cache_read_tokens ?? 0) > 0}
          />

          {/* Model Ranking */}
          <ModelRankList models={models} />

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-2 border-t border-black/[0.08] text-[10px] text-slate-600 font-medium">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>
                最后同步：{site.last_success_at ? new Date(site.last_success_at).toLocaleTimeString() : "暂无"}
              </span>
            </div>
            <span>中转服务器实时记录</span>
          </div>
        </div>
      </div>
    </div>
  );
};
