"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import type { AdvancedFilterColumn } from "@/lib/link-building-advanced-filters";

interface AdvancedFilterValuesPickerProps {
  column: AdvancedFilterColumn;
  values: string[];
  onChange: (values: string[]) => void;
  /** Loads the distinct values of a column, narrowed by `search`. Used when the column has no fixed options. */
  loadValues: (key: string, search: string) => Promise<string[]>;
}

const MENU_MAX_HEIGHT = 320;
const MENU_WIDTH = 260;
const MAX_SHOWN_CHIPS = 2;

function formatValue(value: string): string {
  return value === "" ? "(Blanks)" : value;
}

/**
 * Multi select behind the "is" / "is not" conditions. Columns with a fixed list
 * (Status, Link Type, Currency...) show it right away; any other column loads its
 * distinct values from the server as the admin types. Picked values are always
 * listed first, so they can be unchecked even when the search hides them.
 */
export default function AdvancedFilterValuesPicker({ column, values, onChange, loadValues }: AdvancedFilterValuesPickerProps) {
  const [is_open, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  // The last server response, tagged with the request it answers so a stale one is never shown as current.
  const [load_result, setLoadResult] = useState<{ request_key: string; values: string[]; has_error: boolean } | null>(null);
  const [menu_style, setMenuStyle] = useState<React.CSSProperties>({});

  const container_ref = useRef<HTMLDivElement>(null);
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const field_ref = useRef<HTMLDivElement>(null);
  const debounced_search = useDebounce(search, 300);
  const has_fixed_options = column.options !== undefined && column.options.length > 0;
  const request_key = `${column.key}\n${debounced_search}`;
  const is_loading = !has_fixed_options && load_result?.request_key !== request_key;
  const has_error = load_result?.request_key === request_key && load_result.has_error;

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setSearch("");
  }, []);

  const updatePosition = useCallback(() => {
    const rect = field_ref.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, MENU_WIDTH);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const space_below = window.innerHeight - rect.bottom;
    const opens_above = space_below < MENU_MAX_HEIGHT && rect.top > space_below;
    setMenuStyle(
      opens_above
        ? { position: "fixed", left, width, bottom: window.innerHeight - rect.top + 4 }
        : { position: "fixed", left, width, top: rect.bottom + 4 }
    );
  }, []);

  useLayoutEffect(() => {
    if (is_open) updatePosition();
  }, [is_open, updatePosition]);

  useEffect(() => {
    if (!is_open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [is_open, closeMenu, updatePosition]);

  // Server values, reloaded as the search changes while the menu is open.
  useEffect(() => {
    if (!is_open || has_fixed_options) return;
    let is_cancelled = false;
    loadValues(column.key, debounced_search)
      .then((values) => {
        if (!is_cancelled) setLoadResult({ request_key, values, has_error: false });
      })
      .catch(() => {
        if (!is_cancelled) setLoadResult({ request_key, values: [], has_error: true });
      });
    return () => {
      is_cancelled = true;
    };
  }, [is_open, has_fixed_options, column.key, debounced_search, request_key, loadValues]);

  const listed_values = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = has_fixed_options ? (column.options as string[]) : load_result?.values ?? [];
    const matching = source.filter((value) => query === "" || value.toLowerCase().includes(query));
    const picked = values.filter((value) => !matching.includes(value));
    return [...picked, ...matching];
  }, [search, has_fixed_options, column.options, load_result, values]);

  const toggleValue = (value: string) => {
    onChange(values.includes(value) ? values.filter((picked) => picked !== value) : [...values, value]);
  };

  // Two chips fit next to the column and condition fields, the rest are counted.
  const shown_chips = values.slice(0, MAX_SHOWN_CHIPS);
  const hidden_chip_count = values.length - shown_chips.length;

  return (
    <div
      ref={container_ref}
      className="relative min-w-0 flex-1 basis-40"
      onKeyDown={(e) => {
        if (e.key === "Escape" && is_open) {
          e.preventDefault();
          e.stopPropagation();
          closeMenu();
          trigger_ref.current?.focus();
        }
      }}
    >
      {/* The field shows the picked values as removable chips, like monday's multi select. */}
      <div
        ref={field_ref}
        className={`flex h-8 w-full items-center gap-1 rounded-lg border bg-white pl-1 text-xs transition-colors dark:bg-gray-900 ${
          is_open
            ? "border-brand-400 ring-2 ring-brand-500/10"
            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
        }`}
      >
        {shown_chips.map((value) => (
          <span
            key={`chip_${value}`}
            className="inline-flex h-6 min-w-0 max-w-[7.5rem] shrink items-center gap-1 rounded-md bg-brand-50 pl-1.5 pr-0.5 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200"
          >
            {column.dot_classes && (
              <span className={`h-2 w-2 shrink-0 rounded-full ${column.dot_classes[value] ?? column.default_dot_class ?? ""}`} aria-hidden="true" />
            )}
            <span className={`min-w-0 truncate ${value === "" ? "italic" : ""}`} title={formatValue(value)}>
              {formatValue(value)}
            </span>
            <button
              type="button"
              onClick={() => onChange(values.filter((picked) => picked !== value))}
              aria-label={`Remove ${formatValue(value)}`}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-brand-500 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-500/20"
            >
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        {hidden_chip_count > 0 && (
          <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            +{hidden_chip_count}
          </span>
        )}
        <button
          ref={trigger_ref}
          type="button"
          onClick={() => (is_open ? closeMenu() : setIsOpen(true))}
          aria-haspopup="listbox"
          aria-expanded={is_open}
          aria-label={`${column.label} values`}
          title={values.length > 0 ? values.map(formatValue).join(", ") : undefined}
          className="flex h-full min-w-0 flex-1 items-center justify-between gap-1 rounded-r-lg pl-1.5 pr-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
        >
          <span className="min-w-0 truncate text-gray-400 dark:text-gray-500">{values.length === 0 ? "Select values" : ""}</span>
          <svg className="h-3 w-3 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {is_open && (
        <div
          style={menu_style}
          className="z-[60] flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30"
        >
          <div className="border-b border-gray-100 p-1.5 dark:border-gray-700">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${column.label}`}
              aria-label={`Search ${column.label} values`}
              className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 px-2 text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <ul role="listbox" aria-multiselectable="true" aria-label={`${column.label} values`} className="overflow-y-auto py-1" style={{ maxHeight: MENU_MAX_HEIGHT - 80 }}>
            {is_loading && listed_values.length === 0 ? (
              [0, 1, 2].map((i) => (
                <li key={i} className="mx-2 my-1 h-6 animate-pulse rounded bg-gray-100 dark:bg-gray-700" aria-hidden="true" />
              ))
            ) : has_error ? (
              <li className="px-3 py-2 text-xs text-red-500">Could not load the values. Try again.</li>
            ) : listed_values.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No values found</li>
            ) : (
              listed_values.map((value) => {
                const is_checked = values.includes(value);
                return (
                  <li key={`value_${value}`} role="option" aria-selected={is_checked}>
                    <label className="mx-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={is_checked}
                        onChange={() => toggleValue(value)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
                      />
                      <span className={`min-w-0 flex-1 truncate ${value === "" ? "italic text-gray-400" : ""}`}>{formatValue(value)}</span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>

          {values.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5 dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{values.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
