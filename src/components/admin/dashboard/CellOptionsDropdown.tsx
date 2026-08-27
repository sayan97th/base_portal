"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface CellOptionsDropdownProps {
  /** The predefined choices for this column (e.g. the Status dropdown's preset list). */
  options: string[];
  /** Filters the option list; blank shows every option, matching a native <select>'s
   *  behavior of listing everything until the admin actually starts typing. */
  query: string;
  /** The cell's actual value, used only to mark the matching option with a checkmark
   *  — independent of `query`, which may be blank while this is still non-empty. */
  current_value: string;
  /** Index into the combined [custom-value row?, ...filtered options] list; -1 = none highlighted. */
  highlighted_idx: number;
  /** Cell element the panel is positioned against. */
  anchor_el: HTMLElement | null;
  onHighlightChange: (idx: number) => void;
  /** Fires when an option (or the custom-value row) is picked with the mouse. */
  onSelect: (value: string) => void;
}

/**
 * Floating, keyboard-navigable options panel for an editable select-type table cell.
 * Unlike a native <select>, it never restricts the cell to its predefined list — a
 * typed or pasted value that doesn't match anything shows as a "Use ..." row instead
 * of being hidden, so admins can always keep whatever they entered.
 */
export default function CellOptionsDropdown({
  options,
  query,
  current_value,
  highlighted_idx,
  anchor_el,
  onHighlightChange,
  onSelect,
}: CellOptionsDropdownProps) {
  const panel_ref = useRef<HTMLDivElement>(null);
  const item_refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 160 });

  const trimmed_query = query.trim();
  const trimmed_current_value = current_value.trim();
  const filtered_options =
    trimmed_query === ""
      ? options
      : options.filter((opt) => opt.toLowerCase().includes(trimmed_query.toLowerCase()));
  const has_exact_match = options.some((opt) => opt.toLowerCase() === trimmed_query.toLowerCase());
  const show_custom_row = trimmed_query !== "" && !has_exact_match;
  const item_count = (show_custom_row ? 1 : 0) + filtered_options.length;

  useLayoutEffect(() => {
    if (!anchor_el || !panel_ref.current) return;

    const anchor_rect = anchor_el.getBoundingClientRect();
    const panel_h = panel_ref.current.offsetHeight || 200;
    const panel_w = Math.max(anchor_rect.width, 200);
    const viewport_h = window.innerHeight;
    const viewport_w = window.innerWidth;

    let top = anchor_rect.bottom + 2;
    if (top + panel_h > viewport_h - 8) {
      top = anchor_rect.top - panel_h - 2;
    }
    if (top < 8) top = 8;

    let left = anchor_rect.left;
    if (left + panel_w > viewport_w - 8) left = viewport_w - panel_w - 8;
    if (left < 8) left = 8;

    setPosition({ top, left, width: panel_w });
  }, [anchor_el, item_count]);

  useEffect(() => {
    if (highlighted_idx >= 0) {
      item_refs.current[highlighted_idx]?.scrollIntoView?.({ block: "nearest" });
    }
  }, [highlighted_idx]);

  if (typeof document === "undefined" || !anchor_el) return null;

  const content = (
    <div
      ref={panel_ref}
      className="fixed z-[9999] max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-2xl shadow-gray-400/20 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/50"
      style={{ top: position.top, left: position.left, minWidth: position.width }}
    >
      {show_custom_row && (
        <>
          <button
            ref={(el) => {
              item_refs.current[0] = el;
            }}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(trimmed_query)}
            onMouseEnter={() => onHighlightChange(0)}
            className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs transition-colors ${
              highlighted_idx === 0
                ? "bg-brand-50 dark:bg-brand-900/20"
                : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <svg className="h-3 w-3 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="truncate text-gray-600 dark:text-gray-300">
              Use &ldquo;<span className="font-semibold text-gray-800 dark:text-gray-100">{trimmed_query}</span>&rdquo;
            </span>
          </button>
          {filtered_options.length > 0 && <div className="my-1 border-t border-gray-100 dark:border-gray-700" />}
        </>
      )}

      {filtered_options.map((opt, i) => {
        const idx = show_custom_row ? i + 1 : i;
        const is_highlighted = idx === highlighted_idx;
        const is_current_value = opt.toLowerCase() === trimmed_current_value.toLowerCase();

        return (
          <button
            key={opt}
            ref={(el) => {
              item_refs.current[idx] = el;
            }}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(opt)}
            onMouseEnter={() => onHighlightChange(idx)}
            className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs transition-colors ${
              is_highlighted ? "bg-brand-50 dark:bg-brand-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
            } ${is_current_value ? "font-medium text-gray-800 dark:text-gray-100" : "text-gray-600 dark:text-gray-300"}`}
          >
            {is_current_value ? (
              <svg className="h-3 w-3 shrink-0 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <span className="w-3 shrink-0" />
            )}
            <span className="truncate">{opt}</span>
          </button>
        );
      })}

      {item_count === 0 && (
        <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No options configured</p>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
