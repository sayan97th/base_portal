import { useLayoutEffect } from "react";
import type { RefObject } from "react";

const VIEWPORT_MARGIN = 16;

/**
 * Keeps an absolutely positioned popover (anchored with `right: 0`) fully on
 * screen while it is open:
 * - Horizontally, it slides the popover left or right when its anchor sits away
 *   from the screen edge, e.g. when the toolbar wraps on small screens. It moves
 *   through `right` instead of a transform, because a transform would become the
 *   containing block of the fixed position submenus inside it.
 * - Vertically, it scrolls the page just enough to show the whole popover, e.g.
 *   when the table under it is short. Pair it with a max height of the viewport
 *   so the popover always fits once it is in view.
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

    clampHorizontally();

    const rect = element.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      const prefers_reduced_motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ block: "nearest", behavior: prefers_reduced_motion ? "auto" : "smooth" });
    }

    window.addEventListener("resize", clampHorizontally);
    return () => window.removeEventListener("resize", clampHorizontally);
  }, [ref, is_open]);
}
