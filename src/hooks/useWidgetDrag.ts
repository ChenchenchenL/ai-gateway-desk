import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Universal Drag Handler supporting both native Tauri 2.0 OS window dragging and web browser preview dragging.
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

  const handleStartDrag = useCallback(async (e: React.MouseEvent) => {
    // Only handle primary (left) mouse click
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

    // 1. If in Tauri desktop native environment, trigger OS-level native window drag
    if (typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)) {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        await appWindow.startDragging();
        return;
      } catch (err) {
        console.warn("Tauri startDragging fallback:", err);
      }
    }

    // 2. In Web Browser preview mode, drag the widget freely across the screen
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
