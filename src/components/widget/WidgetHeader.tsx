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
 * Windows 11 Light Frosted Acrylic Draggable Titlebar with integrated site switcher and window actions.
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
      className="relative flex items-center justify-between px-3 py-2 border-b border-indigo-100/70 select-none cursor-move shrink-0"
    >
      {/* Left: Site Switcher Pill */}
      <div className="flex items-center gap-1.5" ref={dropdownRef}>
        <button
          type="button"
          data-tauri-drag-region="false"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/75 hover:bg-white border border-white/90 text-slate-800 text-xs font-bold shadow-sm transition cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="max-w-[125px] truncate">
            {currentSite ? currentSite.name : "选择监控站点"}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            data-tauri-drag-region="false"
            className="absolute left-3 top-9 z-50 w-64 py-1.5 rounded-2xl bg-white/90 border border-white/95 shadow-2xl backdrop-blur-2xl flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              监控站点列表 ({sites.length})
            </div>
            <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto px-1">
              {sites.map((s) => (
                <div
                  key={s.id}
                  className={`px-2 py-1.5 text-xs flex items-center justify-between transition rounded-xl group ${
                    currentSite?.id === s.id
                      ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/60"
                      : "text-slate-700 hover:bg-slate-100/70"
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
                    <Radio className={`w-3 h-3 shrink-0 ${currentSite?.id === s.id ? "text-indigo-600" : "text-slate-400"}`} />
                    <span className="truncate">{s.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-auto mr-1">
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
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition cursor-pointer"
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
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              onClick={() => {
                onAddSite();
                setDropdownOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-indigo-600 font-semibold hover:bg-indigo-50 flex items-center gap-1.5 transition cursor-pointer rounded-xl mx-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加新中转站点...</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Window Controls & Actions */}
      <div className="flex items-center gap-0.5 text-slate-600" data-tauri-drag-region="false">
        {/* Quick Edit Current Site */}
        {currentSite && (
          <button
            type="button"
            onClick={() => onEditSite(currentSite)}
            title={`编辑当前站点 (${currentSite.name})`}
            className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-white/60 transition cursor-pointer"
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
            className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
              ? "text-indigo-600 bg-indigo-100/70 border border-indigo-200/80 shadow-xs"
              : "hover:text-indigo-600 hover:bg-white/60"
          }`}
        >
          {alwaysOnTop ? <Pin className="w-3.5 h-3.5 text-indigo-600" /> : <PinOff className="w-3.5 h-3.5" />}
        </button>

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          title="立即同步最新数据"
          className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-white/60 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
        </button>

        {/* Compact Mode Toggle */}
        <button
          type="button"
          onClick={onToggleCompact}
          title={compactMode ? "展开完整视图" : "紧凑悬浮模式"}
          className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-white/60 transition cursor-pointer"
        >
          {compactMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="系统设置"
          className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-white/60 transition cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
