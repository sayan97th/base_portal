"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Wait before a hover opens the card, so moving the mouse across the table does not flash it. */
const HOVER_OPEN_DELAY_MS = 350;
/** Grace period to move the mouse from the cell into the card without it closing. */
const HOVER_CLOSE_DELAY_MS = 150;
const VIEWPORT_MARGIN = 8;

interface UseCellHoverCardOptions {
  /** The cell, hovering it opens the card and the card is placed under it. */
  anchor_el: HTMLElement | null;
  /** False when the cell has nothing to show, the card then never opens. */
  enabled: boolean;
  /** True while the cell is selected, the card then stays open, like a link chip in Google Sheets. */
  is_active: boolean;
  /** Card width in pixels, used to keep it inside the viewport. */
  width: number;
}

/**
 * Open state and placement of a card shown over a table cell, such as the Article
 * doc preview or the recent domain usage warning. The card opens after a short
 * hover over the cell (or while the cell is selected), stays open while the mouse
 * moves into it, and follows the cell while the table or the page scrolls.
 *
 * The card element takes card_ref, a fixed position and
 * onMouseEnter={keepOpen} onMouseLeave={scheduleClose}. When the card's content
 * changes its height while open (a title that loads), call updatePosition().
 */
export function useCellHoverCard({ anchor_el, enabled, is_active, width }: UseCellHoverCardOptions) {
  const [is_hover_open, setIsHoverOpen] = useState(false);
  const is_open = enabled && (is_hover_open || is_active);

  const card_ref = useRef<HTMLDivElement>(null);
  const open_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keepOpen = useCallback(() => {
    if (open_timer_ref.current) clearTimeout(open_timer_ref.current);
    if (close_timer_ref.current) clearTimeout(close_timer_ref.current);
    open_timer_ref.current = null;
    close_timer_ref.current = null;
  }, []);

  const scheduleOpen = useCallback(() => {
    keepOpen();
    open_timer_ref.current = setTimeout(() => setIsHoverOpen(true), HOVER_OPEN_DELAY_MS);
  }, [keepOpen]);

  const scheduleClose = useCallback(() => {
    keepOpen();
    close_timer_ref.current = setTimeout(() => setIsHoverOpen(false), HOVER_CLOSE_DELAY_MS);
  }, [keepOpen]);

  // Listens on the cell itself, so the whole cell opens the card, not only its text.
  useEffect(() => {
    if (!anchor_el || !enabled) return;
    anchor_el.addEventListener("mouseenter", scheduleOpen);
    anchor_el.addEventListener("mouseleave", scheduleClose);
    return () => {
      anchor_el.removeEventListener("mouseenter", scheduleOpen);
      anchor_el.removeEventListener("mouseleave", scheduleClose);
    };
  }, [anchor_el, enabled, scheduleOpen, scheduleClose]);

  useEffect(() => keepOpen, [keepOpen]);

  // Places the card under the cell, or above it when there is no room below.
  // Written straight to the card's style, so scrolling does not re-render the cell.
  const updatePosition = useCallback(() => {
    const card = card_ref.current;
    if (!anchor_el || !card) return;
    const anchor_rect = anchor_el.getBoundingClientRect();
    const card_height = card.offsetHeight;
    const viewport_width = document.documentElement.clientWidth;

    let top = anchor_rect.bottom + 4;
    if (top + card_height > window.innerHeight - VIEWPORT_MARGIN) top = anchor_rect.top - card_height - 4;
    top = Math.max(VIEWPORT_MARGIN, top);

    let left = anchor_rect.left;
    if (left + width > viewport_width - VIEWPORT_MARGIN) left = viewport_width - width - VIEWPORT_MARGIN;
    left = Math.max(VIEWPORT_MARGIN, left);

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }, [anchor_el, width]);

  useLayoutEffect(() => {
    if (!is_open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [is_open, updatePosition]);

  return { is_open, card_ref, keepOpen, scheduleClose, updatePosition };
}
