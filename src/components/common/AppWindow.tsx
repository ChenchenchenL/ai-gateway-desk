import React, { useState, useEffect, useRef } from "react";
import { WindowHeader } from "./WindowHeader";

export interface AppWindowProps {
  id?: string;
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  isOpen?: boolean;
  onClose?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  extraActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  isModal?: boolean;
  draggable?: boolean;
}

/**
 * Windows 11 Light Frosted Acrylic Window Container.
 */
export const AppWindow: React.FC<AppWindowProps> = ({
  id,
  icon,
  title,
  subtitle,
  defaultWidth = 360,
  defaultHeight = 520,
  minWidth = 280,
  minHeight = 200,
  isOpen = true,
  onClose,
  onRefresh,
  refreshing = false,
  extraActions,
  children,
  className = "",
  isModal = false,
  draggable = true,
}) => {
  const storageKey = id ? `ai_gateway_win_${id}` : null;

  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [zIndex, setZIndex] = useState(isModal ? 500 : 20);

  const [size] = useState(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
        if (saved.width && saved.height) {
          return { width: saved.width, height: saved.height };
        }
      } catch {
        // ignore
      }
    }
    return { width: defaultWidth, height: defaultHeight };
  });

  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (storageKey && size.width && size.height) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(size));
      } catch {
        // ignore
      }
    }
  }, [size, storageKey]);

  if (!isOpen) return null;

  const handleToggleMaximize = () => {
    setIsMaximized(!isMaximized);
    setIsMinimized(false);
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleFocus = () => {
    setZIndex((prev) => (prev < 100 ? 100 : prev));
  };

  // If in modal mode, center overlay with soft backdrop blur
  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center p-3 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-150 select-none"
        onClick={onClose}
      >
        <div
          ref={windowRef}
          onClick={(e) => {
            e.stopPropagation();
            handleFocus();
          }}
          style={{
            width: isMaximized ? "96vw" : `min(94vw, ${size.width}px)`,
            height: isMaximized ? "94vh" : isMinimized ? "auto" : `min(90vh, ${size.height}px)`,
            minWidth: isMaximized ? "auto" : `${minWidth}px`,
            minHeight: isMinimized ? "auto" : `${minHeight}px`,
            zIndex,
          }}
          className={`acrylic-widget rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 ${className}`}
        >
          <WindowHeader
            icon={icon}
            title={title}
            subtitle={subtitle}
            onMinimize={handleToggleMinimize}
            onMaximize={handleToggleMaximize}
            onClose={onClose}
            onRefresh={onRefresh}
            refreshing={refreshing}
            isMaximized={isMaximized}
            extraActions={extraActions}
            draggable={draggable}
          />
          {!isMinimized && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard non-modal AppWindow
  return (
    <div
      ref={windowRef}
      onMouseDown={handleFocus}
      style={{ zIndex }}
      className={`acrylic-widget rounded-2xl flex flex-col w-full h-full overflow-hidden shadow-2xl relative select-none ${className}`}
    >
      <WindowHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        onMinimize={onClose ? handleToggleMinimize : undefined}
        onMaximize={onClose ? handleToggleMaximize : undefined}
        onClose={onClose}
        onRefresh={onRefresh}
        refreshing={refreshing}
        isMaximized={isMaximized}
        extraActions={extraActions}
        draggable={draggable}
      />
      {!isMinimized && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {children}
        </div>
      )}
    </div>
  );
};
