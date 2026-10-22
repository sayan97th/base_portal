import { useLayoutEffect } from "react";
import type { RefObject } from "react";

const VIEWPORT_MARGIN = 16;

/**
 * Height covered by sticky or fixed headers pinned to the top of the viewport
 * (the admin AppHeader), so a popover is never scrolled in under them.
 */
function getStickyTopInset(): number {
  let inset = 0;
  document.querySelectorAll("header").forEach((header) => {
    const style = window.getComputedStyle(header);
    if (style.position !== "sticky" && style.position !== "fixed") return;
    const height = header.getBoundingClientRect().height;
    if (height === 0) return;
    inset = Math.max(inset, (parseFloat(style.top) || 0) + height);
  });
  return inset;
}

/**
 * Keeps an absolutely positioned popover (anchored with `right: 0`) fully on
 * screen while it is open:
 * - Horizontally, it slides the popover left or right when its anchor sits away
 *   from the screen edge, e.g. when the toolbar wraps on small screens. It moves
 *   through `right` instead of a transform, because a transform would become the
 *   containing block of the fixed position submenus inside it.
 * - Vertically, it caps the popover to the room left under the sticky header and
 *   scrolls the page just enough to show all of it, e.g. when the table under it
 *   is short or the page is not scrolled down far enough. It checks again every
 *   time the popover grows (values finish loading, a filter is added), so its
 *   footer and buttons never end up below the fold.
 */
export function useKeepInViewport(ref: RefObject<HTMLElement | null>, is_open: boolean): void {
  useLayoutEffect(() => {
    if (!is_open) return;
    const element = ref.current;
    if (!element) return;

    const clampHorizontally = () => {
      // clientWidth leaves out the scrollbar, unlike the 100vw used in CSS.
      const viewport_width = document.documentElement.clientWidth;
      element.style.maxWidth = `${viewport_width - VIEWPORT_MARGIN * 2}px`;
      element.style.right = "";
      const rect = element.getBoundingClientRect();
      const max_right = viewport_width - VIEWPORT_MARGIN;
      let shift_x = 0;
      if (rect.right > max_right) shift_x = max_right - rect.right;
      if (rect.left + shift_x < VIEWPORT_MARGIN) shift_x = VIEWPORT_MARGIN - rect.left;
      if (shift_x !== 0) element.style.right = `${-shift_x}px`;
    };

    const fitVertically = () => {
      const top_inset = getStickyTopInset() + VIEWPORT_MARGIN;
      // Keeps the stylesheet's own cap (e.g. 36rem) when it is the smaller one.
      element.style.maxHeight = "";
      const css_max_height = parseFloat(window.getComputedStyle(element).maxHeight);
      const room = Math.max(0, window.innerHeight - top_inset - VIEWPORT_MARGIN);
      element.style.maxHeight = `${Number.isNaN(css_max_height) ? room : Math.min(css_max_height, room)}px`;
      element.style.scrollMarginTop = `${top_inset}px`;
      element.style.scrollMarginBottom = `${VIEWPORT_MARGIN}px`;
    };

    const scrollIntoViewIfNeeded = () => {
      const rect = element.getBoundingClientRect();
      const top_inset = getStickyTopInset() + VIEWPORT_MARGIN;
      if (rect.top >= top_inset && rect.bottom <= window.innerHeight - VIEWPORT_MARGIN) return;
      const prefers_reduced_motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ block: "nearest", behavior: prefers_reduced_motion ? "auto" : "smooth" });
    };

    clampHorizontally();
    fitVertically();
    scrollIntoViewIfNeeded();

    // Content that loads or is added after opening makes the popover taller. Only
    // growth brings it back into view, so scrolling away while it is open sticks.
    let last_height = element.offsetHeight;
    const resize_observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            const height = element.offsetHeight;
            const has_grown = height > last_height;
            last_height = height;
            if (has_grown) scrollIntoViewIfNeeded();
          });
    resize_observer?.observe(element);

    const handleResize = () => {
      clampHorizontally();
      fitVertically();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      resize_observer?.disconnect();
    };
  }, [ref, is_open]);
}
