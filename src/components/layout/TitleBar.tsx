import React from "react";
import { Pin, Minus, X, RefreshCw, Settings as SettingsIcon, ChevronUp, ChevronDown } from "lucide-react";
import { windowService } from "../../services/windowService";

interface TitleBarProps {
  alwaysOnTop: boolean;
  collapsed: boolean;
  onTogglePin: () => void;
  onToggleCollapse: () => void;
  onRefreshAll: () => void;
  onOpenSettings: () => void;
  refreshing: boolean;
}

/**
 * Custom draggable titlebar component for the floating widget.
 */
export const TitleBar: React.FC<TitleBarProps> = ({
  alwaysOnTop,
  collapsed,
  onTogglePin,
  onToggleCollapse,
  onRefreshAll,
  onOpenSettings,
  refreshing,
}) => {
  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-9 px-3 bg-slate-900/90 backdrop-blur border-b border-slate-800 rounded-t-xl select-none"
    >
      <div className="flex items-center gap-2 pointer-events-none">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <span className="text-xs font-semibold tracking-wide text-slate-200">
          AI Gateway Desk
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "展开小窗" : "收起为极简挂件"}
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={onRefreshAll}
          disabled={refreshing}
          title="刷新所有站点"
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
        </button>

        <button
          onClick={onTogglePin}
          title={alwaysOnTop ? "取消置顶" : "置顶小窗"}
          className={`p-1 rounded transition ${
            alwaysOnTop
              ? "text-blue-400 bg-blue-500/10"
              : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenSettings}
          title="偏好设置"
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => windowService.hideToTray()}
          title="最小化到托盘"
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => windowService.hideToTray()}
          title="关闭"
          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
