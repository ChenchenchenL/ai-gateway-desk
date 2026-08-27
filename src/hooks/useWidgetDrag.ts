import { useState, useCallback, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri, safeInvoke } from "../services/tauriClient";

/**
 * Universal Drag Handler:
 * - In Tauri 2.0 .exe desktop app: Triggers synchronous native OS window dragging.
 * - In Web Browser preview: Smoothly translates the widget across the browser screen.
 */
export function useWidgetDrag() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0,
  });

  const handleStartDrag = useCallback((e: React.MouseEvent) => {
    // Only handle left mouse click
    if (e.button !== 0) return;

    // Ignore interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea") ||
      target.closest("a") ||
      target.closest("[data-no-drag]")
    ) {
      return;
    }

    // 1. In native Tauri desktop app: Trigger synchronous native OS window dragging
    if (isTauri()) {
      try {
        const appWindow = getCurrentWindow();
        appWindow.startDragging().catch(() => {
          safeInvoke("drag_window").catch(() => {});
        });
      } catch {
        safeInvoke("drag_window").catch(() => {});
      }
      return;
    }

    // 2. In Web Browser preview mode: Smooth CSS transform dragging
    isDraggingRef.current = true;
    const initialX = position?.x ?? 0;
    const initialY = position?.y ?? 0;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: initialX,
      posY: initialY,
    };
  }, [position]);

  useEffect(() => {
    // Only attach browser drag listeners when NOT in Tauri
    if (isTauri()) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return { position, handleStartDrag };
}
