import type React from "react";

interface AnchoredMenuOptions {
  /** Width of the menu in pixels. */
  width: number;
  /** Height the menu would like to have, it shrinks when the viewport has less room. */
  preferred_height: number;
  /** Space between the field and the menu. */
  gap?: number;
  /** Space kept free between the menu and the viewport edges. */
  viewport_margin?: number;
}

/**
 * Fixed position style for a dropdown anchored to a field. The menu opens below
 * the field, or above it when there is more room there, and its max height is
 * capped to the space left in the viewport, so every option stays reachable
 * (the list scrolls) instead of being cut off by the screen edge.
 */
export function getAnchoredMenuStyle(
  rect: DOMRect,
  { width, preferred_height, gap = 4, viewport_margin = 8 }: AnchoredMenuOptions
): React.CSSProperties {
  const left = Math.max(viewport_margin, Math.min(rect.left, window.innerWidth - width - viewport_margin));
  const space_below = window.innerHeight - rect.bottom - gap - viewport_margin;
  const space_above = rect.top - gap - viewport_margin;
  const opens_above = space_below < preferred_height && space_above > space_below;
  const max_height = Math.max(0, Math.min(preferred_height, opens_above ? space_above : space_below));

  return opens_above
    ? { position: "fixed", left, width, maxHeight: max_height, bottom: window.innerHeight - rect.top + gap }
    : { position: "fixed", left, width, maxHeight: max_height, top: rect.bottom + gap };
}
