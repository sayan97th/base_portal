import { useCallback, useEffect, useRef, useState } from "react";

export const MIN_COLUMN_WIDTH = 56;
export const MAX_COLUMN_WIDTH = 800;

function clampWidth(width: number): number {
  return Math.round(Math.min(Math.max(width, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH));
}

/** Reads the widths an admin saved earlier, ignoring anything malformed. */
function loadSavedWidths(storage_key: string): Record<string, number> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(storage_key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const widths: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) widths[key] = clampWidth(value);
    }
    return widths;
  } catch {
    return {};
  }
}

function persistWidths(storage_key: string, widths: Record<string, number>): void {
  try {
    if (typeof window === "undefined") return;
    if (Object.keys(widths).length === 0) {
      localStorage.removeItem(storage_key);
      return;
    }
    localStorage.setItem(storage_key, JSON.stringify(widths));
  } catch {
    // Storage quota exceeded or unavailable, widths just won't survive a reload.
  }
}

interface ResizeDragState {
  col_key: string;
  start_x: number;
  start_width: number;
}

/**
 * Google Sheets style column resizing: drag a column's edge to change its width,
 * double click the edge to reset it. Only widths the admin changed are stored (per
 * browser, in localStorage), everything else falls back to `default_widths`.
 */
export function useResizableColumnWidths(storage_key: string, default_widths: Record<string, number>) {
  const [custom_widths, setCustomWidths] = useState<Record<string, number>>(() => loadSavedWidths(storage_key));
  const [resizing_col_key, setResizingColKey] = useState<string | null>(null);
  const drag_ref = useRef<ResizeDragState | null>(null);

  const getColumnWidth = useCallback(
    (col_key: string): number => custom_widths[col_key] ?? default_widths[col_key] ?? MIN_COLUMN_WIDTH,
    [custom_widths, default_widths]
  );

  const startColumnResize = useCallback(
    (col_key: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      drag_ref.current = { col_key, start_x: event.clientX, start_width: getColumnWidth(col_key) };
      setResizingColKey(col_key);
    },
    [getColumnWidth]
  );

  // Window listeners only exist while a drag is in progress, so the pointer can
  // leave the header (or the table) without the resize getting stuck.
  useEffect(() => {
    if (!resizing_col_key) return;

    const handleMouseMove = (e: MouseEvent) => {
      const drag = drag_ref.current;
      if (!drag) return;
      const next_width = clampWidth(drag.start_width + (e.clientX - drag.start_x));
      setCustomWidths((prev) => (prev[drag.col_key] === next_width ? prev : { ...prev, [drag.col_key]: next_width }));
    };

    const handleMouseUp = () => {
      drag_ref.current = null;
      setResizingColKey(null);
      // Read the latest widths through the updater, without changing them.
      setCustomWidths((prev) => {
        persistWidths(storage_key, prev);
        return prev;
      });
    };

    const previous_cursor = document.body.style.cursor;
    const previous_user_select = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = previous_cursor;
      document.body.style.userSelect = previous_user_select;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing_col_key, storage_key]);

  const resetColumnWidth = useCallback(
    (col_key: string) => {
      setCustomWidths((prev) => {
        if (!(col_key in prev)) return prev;
        const next = { ...prev };
        delete next[col_key];
        persistWidths(storage_key, next);
        return next;
      });
    },
    [storage_key]
  );

  const resetAllColumnWidths = useCallback(() => {
    setCustomWidths({});
    persistWidths(storage_key, {});
  }, [storage_key]);

  return {
    getColumnWidth,
    startColumnResize,
    resetColumnWidth,
    resetAllColumnWidths,
    resizing_col_key,
    has_custom_widths: Object.keys(custom_widths).length > 0,
  };
}
