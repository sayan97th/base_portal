"use client";

import React, { useCallback, useEffect, useRef } from "react";

interface LinkBuildingFilterPanelProps {
  is_open: boolean;
  onOpenChange: (is_open: boolean) => void;
  is_advanced_mode: boolean;
  onModeChange: (is_advanced_mode: boolean) => void;
  /** Filters set from the panel, shown on the toolbar button as "Filter / 2". */
  active_filter_count: number;
  /** Rows matching every filter on the table. */
  result_count: number;
  /** Every dashboard row, null until it is known. */
  total_count: number | null;
  is_loading: boolean;
  can_clear: boolean;
  onClearAll: () => void;
  /** Shown in the footer, e.g. that the other mode's filters still apply. */
  footer_note?: string | null;
  /** Classes of the split button frame (no padding, each half pads itself), idle and active. */
  button_class: string;
  active_button_class: string;
  /** Saved views shown above both modes, e.g. the "Needs LB TL Approval" switch. */
  quick_views?: React.ReactNode;
  /** The Quick filters or Advanced filters content. */
  children: React.ReactNode;
}

function showingLabel(result_count: number, total_count: number | null): string {
  const noun = (count: number) => (count === 1 ? "order" : "orders");
  if (total_count === null) return `${result_count.toLocaleString()} ${noun(result_count)}`;
  if (result_count === total_count) return `Showing all of ${total_count.toLocaleString()} ${noun(total_count)}`;
  return `Showing ${result_count.toLocaleString()} of ${total_count.toLocaleString()} ${noun(total_count)}`;
}

/**
 * The "Filter" split button and its monday style panel. The main part opens
 * Quick filters (click values to pick them) and the arrow opens Advanced filters
 * (rules joined with And / Or). Filters from both modes apply together, and
 * everything is saved to the admin's account automatically.
 */
export default function LinkBuildingFilterPanel({
  is_open,
  onOpenChange,
  is_advanced_mode,
  onModeChange,
  active_filter_count,
  result_count,
  total_count,
  is_loading,
  can_clear,
  onClearAll,
  footer_note,
  button_class,
  active_button_class,
  quick_views,
  children,
}: LinkBuildingFilterPanelProps) {
  const container_ref = useRef<HTMLDivElement>(null);
  const title = is_advanced_mode ? "Advanced filters" : "Quick filters";

  const closePanel = useCallback(() => onOpenChange(false), [onOpenChange]);

  /** Opens the panel in the given mode, or closes it when it is already showing that mode. */
  const openMode = (advanced: boolean) => {
    if (is_open && is_advanced_mode === advanced) {
      closePanel();
      return;
    }
    onModeChange(advanced);
    onOpenChange(true);
  };

  useEffect(() => {
    if (!is_open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) closePanel();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [is_open, closePanel]);

  return (
    <div ref={container_ref} className="relative">
      <div
        className={is_open || active_filter_count > 0 ? active_button_class : button_class}
        role="group"
        aria-label="Filter"
      >
        <button
          type="button"
          onClick={() => openMode(false)}
          aria-haspopup="dialog"
          aria-expanded={is_open && !is_advanced_mode}
          aria-label={active_filter_count > 0 ? `Filter, ${active_filter_count} active` : "Filter"}
          title="Quick filters, pick values with one click"
          className="flex h-full items-center gap-1.5 pl-3 pr-2.5 transition-colors hover:bg-black/5 focus:outline-none focus-visible:bg-black/5 dark:hover:bg-white/5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          <span>
            Filter
            {active_filter_count > 0 && <span className="font-semibold"> / {active_filter_count}</span>}
          </span>
        </button>
        <span className="h-5 w-px self-center bg-current opacity-20" aria-hidden="true" />
        <button
          type="button"
          onClick={() => openMode(true)}
          aria-haspopup="dialog"
          aria-expanded={is_open && is_advanced_mode}
          aria-label="Advanced filters"
          title="Advanced filters, combine rules with And / Or"
          className="flex h-full items-center px-2 transition-colors hover:bg-black/5 focus:outline-none focus-visible:bg-black/5 dark:hover:bg-white/5"
        >
          <svg
            className={`h-3 w-3 transition-transform ${is_open && is_advanced_mode ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {is_open && (
        <div
          role="dialog"
          aria-label={title}
          className="absolute right-0 top-full z-50 mt-1.5 flex w-[52rem] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-1 pt-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
              <span className={`text-[13px] text-gray-500 dark:text-gray-400 ${is_loading ? "animate-pulse" : ""}`} aria-live="polite">
                {showingLabel(result_count, total_count)}
              </span>
              <span
                tabIndex={0}
                className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] font-semibold leading-none text-gray-500 dark:border-gray-500 dark:text-gray-400"
                title="Filters narrow the orders shown in the table. They are saved to your account automatically, and Saved Filters lets you share them with the team."
                aria-label="About filters"
              >
                ?
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onClearAll}
                disabled={!can_clear}
                className="h-8 rounded-lg px-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close filters"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {quick_views}

          {children}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">{footer_note}</p>
            <button
              type="button"
              onClick={() => onModeChange(!is_advanced_mode)}
              className="h-8 rounded-lg px-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Switch to {is_advanced_mode ? "quick" : "advanced"} filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
