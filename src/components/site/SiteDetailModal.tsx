import React, { useState } from "react";
import { Site, TimePreset } from "../../types";
import { useSiteStats } from "../../hooks/useSiteStats";
import { siteService } from "../../services/siteService";
import { TokenBreakdownCard } from "../stats/TokenBreakdownCard";
import { CacheInsightCard } from "../stats/CacheInsightCard";
import { ModelRankList } from "../stats/ModelRankList";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { formatCurrency } from "../../utils/formatters";
import { AppWindow } from "../common/AppWindow";
import { SegmentControl } from "../common/SegmentControl";
import { StatCard } from "../common/StatCard";
import { StatusBadge } from "../common/StatusBadge";
import { IconButton } from "../common/IconButton";
import {
  Server,
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

const PRESET_OPTIONS: { label: string; value: TimePreset }[] = [
  { label: "今日", value: "today" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

/**
 * Compact Modern SaaS Site Detail Window.
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
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

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

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await siteService.deleteSite(site.id);
      setIsConfirmDeleteOpen(false);
      onDeleted();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AppWindow
        id={`site_detail_${site.id}`}
        icon={<Server className="w-3.5 h-3.5" />}
        title={
          <div className="flex items-center gap-2">
            <span>{site.name}</span>
            <StatusBadge variant="neutral" size="sm">
              {site.provider}
            </StatusBadge>
          </div>
        }
        isModal={true}
        defaultWidth={480}
        defaultHeight={540}
        minWidth={360}
        minHeight={380}
        onClose={onClose}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        extraActions={
          <div className="flex items-center gap-0.5 mr-1">
            <IconButton
              icon={<Edit2 className="w-3.5 h-3.5" />}
              title="编辑配置"
              onClick={() => onEdit(site)}
              size="sm"
            />
            <IconButton
              icon={<Trash2 className="w-3.5 h-3.5" />}
              title="删除站点"
              variant="danger"
              onClick={() => setIsConfirmDeleteOpen(true)}
              disabled={deleting}
              size="sm"
            />
          </div>
        }
      >
        <div className="p-3.5 overflow-y-auto flex flex-col gap-3 text-xs flex-1">
          {/* Balance & Window Quota section */}
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard
              icon={<Coins className="w-3.5 h-3.5" />}
              label="账户余额"
              value={
                site.current_balance !== undefined && site.current_balance !== null
                  ? formatCurrency(site.current_balance, site.currency)
                  : site.capabilities?.balance
                  ? "未同步"
                  : "不支持"
              }
              accent="primary"
            />

            <StatCard
              icon={<Hourglass className="w-3.5 h-3.5" />}
              label="滚动窗口配额"
              value={
                site.window_remaining_quota !== undefined && site.window_remaining_quota !== null
                  ? `${site.window_remaining_quota} 剩余`
                  : site.capabilities?.window_quota
                  ? "未提供"
                  : "无窗口限制"
              }
              accent="cyan"
            />
          </div>

          {/* Time Preset Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 px-0.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <div className="p-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                <Layers className="w-3 h-3" />
              </div>
              <span>统计周期</span>
            </div>
            <SegmentControl
              options={PRESET_OPTIONS}
              value={preset}
              onChange={setPreset}
              size="sm"
            />
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
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10.5px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>
                最后同步：{site.last_success_at ? new Date(site.last_success_at).toLocaleTimeString() : "暂无"}
              </span>
            </div>
            <span className="font-mono text-slate-500 text-[10px]">中转服务器实时记录</span>
          </div>
        </div>
      </AppWindow>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="删除站点确认"
        message={`确定要删除站点 "${site.name}" 吗？该站点的本地配置和密钥将被清除。`}
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </>
  );
};
