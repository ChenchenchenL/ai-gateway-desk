import React, { useState } from "react";
import { Site, TimeRangePreset } from "../../types";
import { useSiteStats } from "../../hooks/useSiteStats";
import { formatCurrency } from "../../utils/formatters";
import { siteService } from "../../services/siteService";
import { TokenBreakdownCard } from "../stats/TokenBreakdownCard";
import { CacheInsightCard } from "../stats/CacheInsightCard";
import { ModelRankList } from "../stats/ModelRankList";
import {
  X,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  Coins,
  Hourglass,
  Layers,
} from "lucide-react";

interface SiteDetailModalProps {
  site: Site;
  onClose: () => void;
  onEdit: (site: Site) => void;
  onDeleted: () => void;
  onRefreshed: () => void;
}

const PRESETS: { label: string; value: TimeRangePreset }[] = [
  { label: "今日", value: "today" },
  { label: "24小时", value: "24h" },
  { label: "7天", value: "7d" },
  { label: "30天", value: "30d" },
];

/**
 * Detailed drawer modal showing metrics, prompt cache analytics, and model rank.
 */
export const SiteDetailModal: React.FC<SiteDetailModalProps> = ({
  site,
  onClose,
  onEdit,
  onDeleted,
  onRefreshed,
}) => {
  const [preset, setPreset] = useState<TimeRangePreset>("24h");
  const { metrics, models, refetch } = useSiteStats(site.id, preset);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await siteService.refreshSite(site.id);
      await refetch();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100 truncate max-w-[180px]">
              {site.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
              {site.provider}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="刷新本站点"
              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            </button>
            <button
              onClick={() => onEdit(site)}
              title="编辑配置"
              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="删除站点"
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-3.5 text-xs">
          {/* Balance & Window Quota section */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>账户余额</span>
              </div>
              <span className="text-lg font-bold text-slate-100">
                {site.current_balance !== undefined && site.current_balance !== null
                  ? formatCurrency(site.current_balance, site.currency)
                  : site.capabilities.balance
                  ? "未同步"
                  : "不支持"}
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Hourglass className="w-3.5 h-3.5 text-blue-400" />
                <span>滚动窗口配额</span>
              </div>
              <span className="text-lg font-bold text-slate-100">
                {site.window_remaining_quota !== undefined && site.window_remaining_quota !== null
                  ? `${site.window_remaining_quota} 剩余`
                  : site.capabilities.window_quota
                  ? "未提供"
                  : "无窗口限制"}
              </span>
            </div>
          </div>

          {/* Time Preset Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>统计周期</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPreset(p.value)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    preset === p.value
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
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
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                最后同步：{site.last_success_at ? new Date(site.last_success_at).toLocaleTimeString() : "暂无"}
              </span>
            </div>
            <span>数据来源：中转服务器记录</span>
          </div>
        </div>
      </div>
    </div>
  );
};
