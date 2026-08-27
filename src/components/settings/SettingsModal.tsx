import React, { useState } from "react";
import { AppSettings } from "../../types";
import { X, Bell, RefreshCw, Trash2, Check, Eye } from "lucide-react";

interface SettingsModalProps {
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => Promise<void>;
  onClearCache: () => Promise<void>;
}

/**
 * Windows 11 Light Frosted Acrylic Settings Modal.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onClose,
  onSave,
  onClearCache,
}) => {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearCache = async () => {
    if (!window.confirm("确定清空本地缓存的调用日志数据吗？站点配置将被保留。")) return;
    await onClearCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/25 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="acrylic-widget rounded-2xl w-full max-w-[340px] max-h-[94vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-indigo-100/70 shrink-0">
          <span className="text-xs font-bold text-slate-800">应用偏好设置</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <form onSubmit={handleSubmit} className="p-3 flex flex-col gap-2 text-xs overflow-y-auto">
          {/* 1. Auto Refresh Setting */}
          <div className="fluent-card p-2.5 rounded-xl flex flex-col gap-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>后台定时自动刷新</span>
              </div>
              <input
                type="checkbox"
                checked={form.auto_refresh}
                onChange={(e) => setForm({ ...form, auto_refresh: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 accent-indigo-600 cursor-pointer"
              />
            </div>
            {form.auto_refresh && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 border-t border-indigo-50">
                <span>刷新间隔 (秒)</span>
                <select
                  value={form.refresh_interval_secs}
                  onChange={(e) => setForm({ ...form, refresh_interval_secs: Number(e.target.value) })}
                  className="glass-input rounded-lg px-2 py-0.5 text-slate-800 font-semibold cursor-pointer text-xs"
                >
                  <option value={30}>30 秒</option>
                  <option value={60}>60 秒 (默认)</option>
                  <option value={120}>2 分钟</option>
                  <option value={300}>5 分钟</option>
                  <option value={600}>10 分钟</option>
                </select>
              </div>
            )}
          </div>

          {/* 2. Opacity Setting */}
          <div className="fluent-card p-2.5 rounded-xl flex flex-col gap-1.5 shadow-xs">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-sky-600" />
                <span>窗口整体透明度</span>
              </div>
              <span className="text-indigo-600 font-mono font-bold">{form.opacity_pct ?? 100}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              step="5"
              value={form.opacity_pct ?? 100}
              onChange={(e) => setForm({ ...form, opacity_pct: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-1"
            />
          </div>

          {/* 3. Alert Setting */}
          <div className="fluent-card p-2.5 rounded-xl flex flex-col gap-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>故障与低余额桌面通知</span>
              </div>
              <input
                type="checkbox"
                checked={form.notify_on_failure}
                onChange={(e) => setForm({ ...form, notify_on_failure: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 accent-indigo-600 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 border-t border-indigo-50">
              <span>低余额告警阈值 (¥)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.low_balance_threshold}
                onChange={(e) => setForm({ ...form, low_balance_threshold: Number(e.target.value) })}
                className="glass-input w-16 rounded-lg px-1.5 py-0.5 text-right text-slate-800 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* 4. Cache Clear */}
          <div className="fluent-card p-2.5 rounded-xl flex items-center justify-between shadow-xs">
            <span className="text-[11px] text-slate-600 font-bold">本地调用日志缓存</span>
            <button
              type="button"
              onClick={handleClearCache}
              className="px-2.5 py-1 rounded-xl bg-white/80 hover:bg-rose-50 border border-white/90 hover:border-rose-200 text-slate-700 hover:text-rose-700 transition text-[11px] font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{cacheCleared ? "已清空" : "清空缓存"}</span>
            </button>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-indigo-100/60 mt-1 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-white/60 transition font-bold text-xs cursor-pointer"
            >
              关闭
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl transition shadow-md shadow-indigo-500/25 flex items-center gap-1 text-xs cursor-pointer"
            >
              {saved && <Check className="w-3.5 h-3.5" />}
              <span>{saved ? "已保存" : "保存设置"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
