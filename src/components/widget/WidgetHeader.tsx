import React, { useState, useRef, useEffect } from "react";
import { Site } from "../../types";
import {
  Pin,
  PinOff,
  RefreshCw,
  Settings,
  ChevronDown,
  Plus,
  Minimize2,
  Maximize2,
  Radio,
  Edit2,
  Trash2,
} from "lucide-react";

interface WidgetHeaderProps {
  currentSite: Site | null;
  sites: Site[];
  onSelectSite: (site: Site) => void;
  onAddSite: () => void;
  onEditSite: (site: Site) => void;
  onDeleteSite: (siteId: string) => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  alwaysOnTop: boolean;
  onTogglePin: () => void;
  compactMode: boolean;
  onToggleCompact: () => void;
  onClose?: () => void;
}

/**
 * Windows 11 Fluent Draggable Acrylic Titlebar with integrated site switcher, edit, and delete management.
 */
export const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  currentSite,
  sites,
  onSelectSite,
  onAddSite,
  onEditSite,
  onDeleteSite,
  onOpenSettings,
  onRefresh,
  refreshing,
  alwaysOnTop,
  onTogglePin,
  compactMode,
  onToggleCompact,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="relative flex items-center justify-between px-3 py-2.5 border-b border-black/[0.08] select-none cursor-move"
    >
      {/* Left: Site Switcher Pill */}
      <div className="flex items-center gap-1.5" ref={dropdownRef}>
        <button
          type="button"
          data-tauri-drag-region="false"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-white/15 text-slate-100 text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="max-w-[130px] truncate">
            {currentSite ? currentSite.name : "选择网关站点"}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-300 shrink-0 opacity-80" />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            data-tauri-drag-region="false"
            className="absolute left-3 top-10 z-50 w-64 py-1.5 rounded-xl bg-slate-900/95 border border-white/15 shadow-2xl backdrop-blur-2xl flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>监控站点列表 ({sites.length})</span>
            </div>
            <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
              {sites.map((s) => (
                <div
                  key={s.id}
                  className={`px-2 py-1.5 text-xs flex items-center justify-between transition rounded-lg mx-1 group ${
                    currentSite?.id === s.id
                      ? "bg-indigo-600/30 text-indigo-200 font-semibold"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSite(s);
                      setDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 truncate flex-1 text-left cursor-pointer"
                  >
                    <Radio className={`w-3 h-3 shrink-0 ${currentSite?.id === s.id ? "text-indigo-400" : "text-slate-500"}`} />
                    <span className="truncate">{s.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-auto mr-1">
                      {s.current_balance !== undefined ? `¥${s.current_balance.toFixed(2)}` : ""}
                    </span>
                  </button>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      title="编辑站点"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen(false);
                        onEditSite(s);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.1] transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      title="删除站点"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen(false);
                        onDeleteSite(s.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="my-1 border-t border-white/[0.08]" />
            <button
              type="button"
              onClick={() => {
                onAddSite();
                setDropdownOpen(false);
              }}
              className="w-full px-2.5 py-1.5 text-left text-xs text-indigo-400 hover:bg-indigo-600/20 hover:text-indigo-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加新中转站点...</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Window Controls & Actions */}
      <div className="flex items-center gap-0.5 text-slate-700" data-tauri-drag-region="false">
        {/* Quick Edit Current Site */}
        {currentSite && (
          <button
            type="button"
            onClick={() => onEditSite(currentSite)}
            title={`编辑当前站点 (${currentSite.name})`}
            className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-black/[0.06] transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick Delete Current Site */}
        {currentSite && (
          <button
            type="button"
            onClick={() => onDeleteSite(currentSite.id)}
            title={`删除当前站点 (${currentSite.name})`}
            className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Pin On Top */}
        <button
          type="button"
          onClick={onTogglePin}
          title={alwaysOnTop ? "取消窗口置顶" : "固定在桌面最前端"}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            alwaysOnTop
              ? "text-indigo-600 bg-indigo-500/20 border border-indigo-500/30 shadow-sm"
              : "hover:text-slate-900 hover:bg-black/[0.06]"
          }`}
        >
          {alwaysOnTop ? <Pin className="w-3.5 h-3.5 text-indigo-700" /> : <PinOff className="w-3.5 h-3.5" />}
        </button>

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          title="立即同步最新数据"
          className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-black/[0.06] transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
        </button>

        {/* Compact Mode Toggle */}
        <button
          type="button"
          onClick={onToggleCompact}
          title={compactMode ? "展开完整视图" : "紧凑悬浮模式"}
          className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-black/[0.06] transition cursor-pointer"
        >
          {compactMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="系统设置"
          className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-black/[0.06] transition cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
