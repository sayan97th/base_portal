"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useArticleDocTitle } from "@/hooks/useArticleDocTitle";
import { getGoogleDocKindLabel, isGoogleDocLink } from "@/lib/article-doc-title";

/** Wait before a hover opens the card, so moving the mouse across the table does not flash it. */
const HOVER_OPEN_DELAY_MS = 350;
/** Grace period to move the mouse from the cell into the card without it closing. */
const HOVER_CLOSE_DELAY_MS = 150;
const CARD_WIDTH = 320;
const VIEWPORT_MARGIN = 8;

interface ArticleDocPreviewProps {
  /** The Article link. */
  url: string;
  /** The row's Article Title, shown when the doc's own title cannot be read. */
  fallback_title: string;
  /** The Article cell, hovering it opens the card and the card is placed under it. */
  anchor_el: HTMLElement | null;
  /** True while the Article cell is selected, the card then stays open, like a link chip in Google Sheets. */
  is_active: boolean;
  /** The link text shown in the cell. */
  children: React.ReactNode;
}

/**
 * Article cell link with a preview card that shows the title of the linked
 * Google Doc when the cell is hovered or selected, the same way Google Sheets
 * previews a Docs link. The title is read on the server from the doc's public
 * page, and the row's Article Title is shown instead for docs that are not
 * shared publicly.
 */
export default function ArticleDocPreview({ url, fallback_title, anchor_el, is_active, children }: ArticleDocPreviewProps) {
  const is_google_doc = isGoogleDocLink(url);
  const trimmed_fallback_title = fallback_title.trim();
  // Links outside Google still preview the Article Title, when there is one.
  const has_preview = is_google_doc || trimmed_fallback_title !== "";

  const [is_hover_open, setIsHoverOpen] = useState(false);
  const is_open = has_preview && (is_hover_open || is_active);

  const card_ref = useRef<HTMLDivElement>(null);
  const open_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [just_copied, setJustCopied] = useState(false);

  const { result, is_loading, has_error } = useArticleDocTitle(url, is_open && is_google_doc);

  const clearTimers = useCallback(() => {
    if (open_timer_ref.current) clearTimeout(open_timer_ref.current);
    if (close_timer_ref.current) clearTimeout(close_timer_ref.current);
    open_timer_ref.current = null;
    close_timer_ref.current = null;
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimers();
    open_timer_ref.current = setTimeout(() => setIsHoverOpen(true), HOVER_OPEN_DELAY_MS);
  }, [clearTimers]);

  const scheduleClose = useCallback(() => {
    clearTimers();
    close_timer_ref.current = setTimeout(() => setIsHoverOpen(false), HOVER_CLOSE_DELAY_MS);
  }, [clearTimers]);

  // Listens on the cell itself, so the whole cell opens the card, not only the link text.
  useEffect(() => {
    if (!anchor_el || !has_preview) return;
    anchor_el.addEventListener("mouseenter", scheduleOpen);
    anchor_el.addEventListener("mouseleave", scheduleClose);
    return () => {
      anchor_el.removeEventListener("mouseenter", scheduleOpen);
      anchor_el.removeEventListener("mouseleave", scheduleClose);
    };
  }, [anchor_el, has_preview, scheduleOpen, scheduleClose]);

  useEffect(() => clearTimers, [clearTimers]);

  // Places the card under the cell, or above it when there is no room below, and
  // follows the cell while the table or the page scrolls. Written straight to the
  // card's style, so scrolling does not re-render the cell.
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
    if (left + CARD_WIDTH > viewport_width - VIEWPORT_MARGIN) left = viewport_width - CARD_WIDTH - VIEWPORT_MARGIN;
    left = Math.max(VIEWPORT_MARGIN, left);

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }, [anchor_el]);

  useLayoutEffect(() => {
    if (!is_open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [is_open, updatePosition, is_loading, result]);

  const doc_title = result?.status === "ok" ? result.title : null;
  const shown_title = doc_title ?? (trimmed_fallback_title || null);
  const is_fallback_title = doc_title === null && shown_title !== null;

  const copyTitle = async () => {
    if (!shown_title) return;
    try {
      await navigator.clipboard.writeText(shown_title);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      // Clipboard access denied, the title can still be selected and copied by hand.
    }
  };

  // The card is portaled, but React still bubbles its events to the cell, which
  // would start a range selection or open the editor.
  const stopCellEvent = (e: React.SyntheticEvent) => e.stopPropagation();

  let note: string | null = null;
  if (is_google_doc && !is_loading) {
    if (has_error || result?.status === "unavailable") {
      note = "Google did not answer, so the doc title could not be loaded. Try again in a moment.";
    } else if (result?.status === "private") {
      note = "This doc is not shared with \"Anyone with the link\", so its title cannot be read.";
    }
    if (note && is_fallback_title) note += " Showing the Article Title column instead.";
  }

  const card =
    is_open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={card_ref}
            role="tooltip"
            className="fixed z-[60] rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-800"
            style={{ top: -9999, left: -9999, width: CARD_WIDTH }}
            onMouseEnter={clearTimers}
            onMouseLeave={scheduleClose}
            onMouseDown={stopCellEvent}
            onMouseUp={stopCellEvent}
            onClick={stopCellEvent}
            onDoubleClick={stopCellEvent}
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 13h8v1.5H8V13zm0 3h8v1.5H8V16zm0-6h3v1.5H8V10z" />
              </svg>
              {is_google_doc ? getGoogleDocKindLabel(result?.kind ?? null) : "Article"}
            </div>

            {is_google_doc && is_loading ? (
              <div className="space-y-1.5 py-0.5" aria-label="Loading the doc title">
                <div className="h-3 w-11/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ) : shown_title ? (
              <p className="select-text break-words text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
                {shown_title}
              </p>
            ) : (
              <p className="text-sm italic text-gray-400 dark:text-gray-500">Title not available</p>
            )}

            {doc_title && trimmed_fallback_title && trimmed_fallback_title !== doc_title && (
              <p className="mt-1 break-words text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-medium">Article Title column:</span> {trimmed_fallback_title}
              </p>
            )}

            {note && <p className="mt-1.5 text-[11px] leading-snug text-amber-600 dark:text-amber-400">{note}</p>}

            <div className="mt-2.5 flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {is_google_doc ? "Open doc" : "Open link"}
              </a>
              {shown_title && (
                <button
                  type="button"
                  onClick={copyTitle}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    just_copied ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {just_copied ? "Copied" : "Copy title"}
                </button>
              )}
              <span className="ml-auto min-w-0 truncate text-[10px] text-gray-400 dark:text-gray-500" title={url}>
                {url.replace(/^https?:\/\//, "")}
              </span>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        // The card shows the link, a native tooltip on top of it would only cover it.
        title={has_preview ? undefined : url}
      >
        {children}
      </a>
      {card}
    </>
  );
}
