import React, { useEffect, useRef, useState } from "react";
import {
  getAvailableRangeStats,
  getRangeStatValue,
  pickRangeStat,
  RANGE_STAT_KEYS,
  RANGE_STAT_LABELS,
  type RangeStatKey,
  type RangeStats,
} from "@/lib/spreadsheet-navigation";

const SELECTION_STAT_STORAGE_KEY = "lbo_selection_stat_v1";

interface SelectionStatsBarProps {
  /** Statistics of the selected cells, null while fewer than two cells are selected. */
  stats: RangeStats | null;
  /** Size of the selected range, shown in the menu header. */
  cell_count: number;
}

function readPreferredStat(): RangeStatKey | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SELECTION_STAT_STORAGE_KEY);
    return RANGE_STAT_KEYS.find((key) => key === raw) ?? null;
  } catch {
    return null;
  }
}

function writePreferredStat(key: RangeStatKey): void {
  try {
    localStorage.setItem(SELECTION_STAT_STORAGE_KEY, key);
  } catch {
    // Storage unavailable, the choice still applies until the page reloads.
  }
}

function formatStatValue(key: RangeStatKey, value: number): string {
  if (key === "count" || key === "count_numbers") return value.toLocaleString();
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Google Sheets style summary of the selected cells, shown at the bottom of the
 * table: one statistic ("Sum: 1,250", "Count: 12") with a menu listing all of them.
 * Picking one from the menu makes it the default for later selections.
 */
export default function SelectionStatsBar({ stats, cell_count }: SelectionStatsBarProps) {
  // Nothing renders until cells are selected in the browser, so reading storage
  // up front can never make the server and client renders differ.
  const [preferred_stat, setPreferredStat] = useState<RangeStatKey | null>(readPreferredStat);
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const container_ref = useRef<HTMLDivElement>(null);

  // The menu closes with the selection, so it is not open again the next time cells are selected.
  if (!stats && is_menu_open) setIsMenuOpen(false);

  useEffect(() => {
    if (!is_menu_open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [is_menu_open]);

  if (!stats) return null;

  const shown_stat = pickRangeStat(stats, preferred_stat);
  const shown_value = getRangeStatValue(stats, shown_stat) ?? 0;
  const available_stats = getAvailableRangeStats(stats);

  const chooseStat = (key: RangeStatKey) => {
    setPreferredStat(key);
    writePreferredStat(key);
    setIsMenuOpen(false);
  };

  return (
    <div ref={container_ref} className="relative">
      <button
        type="button"
        // Keeps the grid focused, so the arrow keys still move the selection after a click here.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={is_menu_open}
        title="Summary of the selected cells. Click to choose which one to show."
        className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <span>{RANGE_STAT_LABELS[shown_stat]}:</span>
        <span className="font-semibold text-gray-900 tabular-nums dark:text-gray-100">
          {formatStatValue(shown_stat, shown_value)}
        </span>
        <svg
          className={`h-3 w-3 opacity-60 transition-transform ${is_menu_open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      </button>

      {is_menu_open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-50 mb-1.5 min-w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {cell_count.toLocaleString()} cells selected
          </p>
          {available_stats.map((key) => {
            const value = getRangeStatValue(stats, key) ?? 0;
            const is_shown = key === shown_stat;
            return (
              <button
                key={key}
                type="button"
                role="menuitemradio"
                aria-checked={is_shown}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseStat(key)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  is_shown ? "text-brand-600 dark:text-brand-400" : "text-gray-700 dark:text-gray-200"
                }`}
              >
                <svg
                  className={`h-3.5 w-3.5 shrink-0 ${is_shown ? "opacity-100" : "opacity-0"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="flex-1">{RANGE_STAT_LABELS[key]}</span>
                <span className="font-semibold tabular-nums">{formatStatValue(key, value)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
