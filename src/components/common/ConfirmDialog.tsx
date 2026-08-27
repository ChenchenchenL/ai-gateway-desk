import React from "react";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Windows 11 Light Frosted Acrylic Confirmation Dialog.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  variant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <Trash2 className="w-4 h-4 text-rose-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case "danger":
        return "bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md shadow-rose-500/25";
      case "warning":
        return "bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md shadow-amber-500/25";
      default:
        return "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-md shadow-indigo-500/25";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="acrylic-widget rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-indigo-100/70">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-white/80 border border-white/90 shadow-xs">
              {getIcon()}
            </div>
            <span className="text-xs font-bold text-slate-800">{title}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 text-xs text-slate-600 leading-relaxed font-medium">
          {message}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-1.5 px-3 py-2.5 border-t border-indigo-100/60 bg-white/40">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-white/60 transition font-bold text-xs cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-1.5 text-xs transition cursor-pointer disabled:opacity-50 ${getConfirmButtonClass()}`}
          >
            {loading ? "处理中..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
