import { useCallback, useSyncExternalStore } from "react";

interface UseVirtualRowsOptions {
  /** The element that scrolls vertically, null until it mounts. */
  scroll_element: HTMLElement | null;
  row_count: number;
  /** Height of one row in px, rows must all share it. */
  row_height: number;
  /** Rows rendered at least above and below the visible ones, so short scrolls never show a gap. */
  overscan?: number;
  /**
   * The window moves in blocks of this many rows instead of row by row, so a scroll
   * only re-renders the table every few rows.
   */
  step?: number;
  /** Viewport height used while the scroll element has no size yet (first paint, tests). */
  fallback_viewport_height?: number;
}

export interface VirtualRowsWindow {
  /** First row index to render. */
  start_index: number;
  /** One past the last row index to render. */
  end_index: number;
  /** Height of the space standing in for the rows above the rendered ones. */
  padding_top: number;
  /** Height of the space standing in for the rows below the rendered ones. */
  padding_bottom: number;
  /** Scrolls the least needed to bring a row into view, the window follows on the scroll event. */
  scrollRowIntoView: (row_index: number) => void;
}

/** Marks each rendered row with its index in the whole list. */
export const VIRTUAL_ROW_ATTRIBUTE = "data-virtual-row";

/**
 * Row windowing for a long table with rows of a fixed height: only the rows in
 * (and around) the viewport are rendered, the rest are replaced by two spacers of
 * the same total height, so the scrollbar and the scroll position behave exactly
 * as if every row were in the DOM. Tens of thousands of rows then cost no more to
 * render than a few dozen.
 *
 * The scroll position is read as an external store, so the window is recomputed
 * synchronously on scroll and resize, and whenever the row count changes.
 */
export function useVirtualRows({
  scroll_element,
  row_count,
  row_height,
  overscan = 15,
  step = 10,
  fallback_viewport_height = 1000,
}: UseVirtualRowsOptions): VirtualRowsWindow {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!scroll_element) return () => {};
      scroll_element.addEventListener("scroll", onChange, { passive: true });
      const resize_observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onChange);
      resize_observer?.observe(scroll_element);
      return () => {
        scroll_element.removeEventListener("scroll", onChange);
        resize_observer?.disconnect();
      };
    },
    [scroll_element]
  );

  const computeWindowKey = useCallback(
    (scroll_top: number, viewport_height: number) => {
      // The rows start below the table header, the overscan covers that offset.
      const first_visible = Math.floor(scroll_top / row_height);
      const last_visible = Math.ceil((scroll_top + viewport_height) / row_height);
      const start = Math.max(0, Math.floor((first_visible - overscan) / step) * step);
      const end = Math.min(row_count, Math.ceil((last_visible + overscan) / step) * step);
      // A string snapshot keeps the same identity while the window does not move.
      return `${Math.min(start, row_count)}:${Math.max(Math.min(start, row_count), end)}`;
    },
    [row_count, row_height, overscan, step]
  );

  const getSnapshot = useCallback(
    () =>
      computeWindowKey(scroll_element?.scrollTop ?? 0, scroll_element?.clientHeight || fallback_viewport_height),
    [scroll_element, fallback_viewport_height, computeWindowKey]
  );
  const getServerSnapshot = useCallback(
    () => computeWindowKey(0, fallback_viewport_height),
    [fallback_viewport_height, computeWindowKey]
  );

  const window_key = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [start_index, end_index] = window_key.split(":").map(Number);

  const scrollRowIntoView = useCallback(
    (row_index: number) => {
      if (!scroll_element) return;
      const row_top = row_index * row_height;
      const viewport_height = scroll_element.clientHeight || fallback_viewport_height;
      // Leaves room for the sticky header above and the totals row below.
      const margin = row_height * 3;
      if (row_top < scroll_element.scrollTop) {
        scroll_element.scrollTo({ top: Math.max(0, row_top - margin) });
      } else if (row_top + row_height > scroll_element.scrollTop + viewport_height - margin) {
        scroll_element.scrollTo({ top: row_top + row_height - viewport_height + margin });
      }
    },
    [scroll_element, row_height, fallback_viewport_height]
  );

  return {
    start_index,
    end_index,
    padding_top: start_index * row_height,
    padding_bottom: (row_count - end_index) * row_height,
    scrollRowIntoView,
  };
}
