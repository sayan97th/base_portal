"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PartnershipDomainSuggestion } from "@/services/admin/link-building-dashboard.service";

interface PartnershipDomainDropdownProps {
  suggestions: PartnershipDomainSuggestion[];
  is_loading: boolean;
  /** The cell's current value, used to mark the domain it already holds. */
  current_value: string;
  /** Index into `suggestions`; -1 = none highlighted. */
  highlighted_idx: number;
  /** Cell element the panel is positioned against. */
  anchor_el: HTMLElement | null;
  onHighlightChange: (idx: number) => void;
  /** Fires when a domain is picked with the mouse. */
  onSelect: (suggestion: PartnershipDomainSuggestion) => void;
}

function toBareDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
}

/** Compact number for the traffic column, e.g. 2880 → "2.9K". */
function formatTraffic(value: string | null): string | null {
  if (!value) return null;
  const number = Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(number) || number <= 0) return value;
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(number);
}

/**
 * Floating domain picker for the Partnership cell. Each domain shows its niche
 * next to the DR, traffic and price of the latest order that used it, so the
 * admin can check what a site is about while choosing it. The cell stays a free
 * text input, so a domain that is not listed can still be typed or pasted.
 */
export default function PartnershipDomainDropdown({
  suggestions,
  is_loading,
  current_value,
  highlighted_idx,
  anchor_el,
  onHighlightChange,
  onSelect,
}: PartnershipDomainDropdownProps) {
  const panel_ref = useRef<HTMLDivElement>(null);
  const item_refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });
  const current_domain = toBareDomain(current_value);

  useLayoutEffect(() => {
    if (!anchor_el || !panel_ref.current) return;

    const anchor_rect = anchor_el.getBoundingClientRect();
    const panel_h = panel_ref.current.offsetHeight || 240;
    const panel_w = Math.max(anchor_rect.width, 340);
    const viewport_h = window.innerHeight;
    const viewport_w = window.innerWidth;

    let top = anchor_rect.bottom + 2;
    if (top + panel_h > viewport_h - 8) top = anchor_rect.top - panel_h - 2;
    if (top < 8) top = 8;

    let left = anchor_rect.left;
    if (left + panel_w > viewport_w - 8) left = viewport_w - panel_w - 8;
    if (left < 8) left = 8;

    setPosition({ top, left, width: panel_w });
  }, [anchor_el, suggestions.length, is_loading]);

  useEffect(() => {
    if (highlighted_idx >= 0) item_refs.current[highlighted_idx]?.scrollIntoView?.({ block: "nearest" });
  }, [highlighted_idx]);

  if (typeof document === "undefined" || !anchor_el) return null;

  const content = (
    <div
      ref={panel_ref}
      role="listbox"
      aria-label="Partnership domains"
      className="fixed z-[100001] max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-2xl shadow-gray-400/20 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/50"
      style={{ top: position.top, left: position.left, width: position.width }}
    >
      <div className="flex items-center justify-between px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        <span>Domain and niche</span>
        <span>DR · Traffic</span>
      </div>

      {suggestions.map((suggestion, idx) => {
        const is_highlighted = idx === highlighted_idx;
        const is_current_value = suggestion.domain === current_domain;
        const traffic = formatTraffic(suggestion.traffic);

        return (
          <button
            key={suggestion.domain}
            ref={(el) => {
              item_refs.current[idx] = el;
            }}
            type="button"
            role="option"
            aria-selected={is_highlighted}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => onHighlightChange(idx)}
            title={
              suggestion.order_count > 0
                ? `Used on ${suggestion.order_count} recent order${suggestion.order_count !== 1 ? "s" : ""}`
                : "Not used on an order yet"
            }
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
              is_highlighted ? "bg-brand-50 dark:bg-brand-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span
                className={`truncate ${
                  is_current_value ? "font-semibold text-brand-600 dark:text-brand-400" : "font-medium text-gray-800 dark:text-gray-100"
                }`}
              >
                {suggestion.domain}
              </span>
              <span className="mt-0.5 flex min-w-0 items-center gap-1">
                {suggestion.niche ? (
                  <span className="truncate rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {suggestion.niche}
                  </span>
                ) : (
                  <span className="text-[10px] italic text-gray-400 dark:text-gray-500">No niche yet</span>
                )}
                {suggestion.order_count > 0 && (
                  <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                    {suggestion.order_count}× used
                  </span>
                )}
              </span>
            </span>
            <span className="shrink-0 text-right text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
              {suggestion.dr ? `DR ${suggestion.dr}` : "DR n/a"}
              {traffic ? ` · ${traffic}` : ""}
            </span>
          </button>
        );
      })}

      {suggestions.length === 0 && (
        <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
          {is_loading ? "Looking up domains..." : "No matching domains. Keep typing to use a new one."}
        </p>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
