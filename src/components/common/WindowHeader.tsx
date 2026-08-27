import React from "react";
import { Minus, Square, X, RefreshCw } from "lucide-react";
import { IconButton } from "./IconButton";

export interface WindowHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  isMaximized?: boolean;
  extraActions?: React.ReactNode;
  draggable?: boolean;
}

/**
 * Windows 11 Light Frosted Acrylic Window Header.
 */
export const WindowHeader: React.FC<WindowHeaderProps> = ({
  icon,
  title,
  subtitle,
  onMinimize,
  onMaximize,
  onClose,
  onRefresh,
  refreshing = false,
  isMaximized = false,
  extraActions,
  draggable = true,
}) => {
  return (
    <div
      data-tauri-drag-region={draggable ? true : undefined}
      className={`flex items-center justify-between px-3 py-2 border-b border-indigo-100/70 select-none shrink-0 ${
        draggable ? "cursor-move" : ""
      }`}
    >
      {/* Left: Icon & Title */}
      <div className="flex items-center gap-2 min-w-0" data-tauri-drag-region={draggable ? true : undefined}>
        {icon && (
          <div className="p-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 shrink-0">
            {icon}
          </div>
        )}
        <div className="flex items-baseline gap-2 truncate">
          <span className="text-xs font-bold text-slate-800 tracking-tight truncate">
            {title}
          </span>
          {subtitle && (
            <span className="text-[10px] text-slate-400 font-medium truncate hidden sm:inline">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Right: Extra Actions & Controls */}
      <div className="flex items-center gap-0.5 shrink-0" data-tauri-drag-region="false">
        {extraActions}

        {onRefresh && (
          <IconButton
            icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />}
            title="刷新数据"
            onClick={onRefresh}
            disabled={refreshing}
            size="sm"
          />
        )}

        {onMinimize && (
          <IconButton
            icon={<Minus className="w-3.5 h-3.5" />}
            title="最小化"
            onClick={onMinimize}
            size="sm"
          />
        )}

        {onMaximize && (
          <IconButton
            icon={<Square className="w-3.5 h-3.5" />}
            title={isMaximized ? "还原窗口" : "最大化"}
            onClick={onMaximize}
            size="sm"
          />
        )}

        {onClose && (
          <IconButton
            icon={<X className="w-3.5 h-3.5" />}
            title="关闭窗口"
            variant="danger"
            onClick={onClose}
            size="sm"
          />
        )}
      </div>
    </div>
  );
};
