"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  FilterConditionOperator,
  LinkBuildingOrderFilterValue,
  LinkBuildingOrderFilterValuesResponse,
} from "@/types/admin/link-building-order";
import {
  CONDITION_OPERATOR_OPTIONS,
  formatFilterValue,
  getConditionOperatorOption,
  isConditionComplete,
  isSheetFilterActive,
  type ConditionSelection,
  type SheetColumnFilter,
  type ValuesSelection,
} from "@/hooks/useSheetColumnFilters";
import { useDebounce } from "@/hooks/useDebounce";

// ── Constants ──────────────────────────────────────────────────────────────────

const OPERATOR_GROUPS = ["General", "Text", "Date", "Number"] as const;

const COMPACT_NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Height the menu needs to show its value list comfortably before it flips above its anchor. */
const PREFERRED_MENU_HEIGHT = 560;
const VIEWPORT_MARGIN = 12;

const INPUT_CLASS =
  "h-8 w-full rounded border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";

// ── Props ──────────────────────────────────────────────────────────────────────

interface SheetColumnFilterDropdownProps {
  col_label: string;
  is_sortable: boolean;
  /** Direction of the column's current sort, when it is the active sort. */
  sort_direction: "asc" | "desc" | null;
  current_filter: SheetColumnFilter | undefined;
  anchor_el: HTMLElement | null;
  /** Loads the column's distinct values. Must be referentially stable while open. */
  loadValues: (value_search: string) => Promise<LinkBuildingOrderFilterValuesResponse>;
  onSort: (direction: "asc" | "desc") => void;
  onApply: (filter: SheetColumnFilter | null) => void;
  onClose: () => void;
}

interface ValuesResult {
  /** Search text plus reload counter the result belongs to, used to derive the loading state. */
  request_key: string;
  data: LinkBuildingOrderFilterValue[];
  total_distinct: number;
  has_more: boolean;
  error: string | null;
}

// ── Small presentational pieces ────────────────────────────────────────────────

function SectionToggle({
  label,
  is_open,
  is_active,
  onToggle,
}: {
  label: string;
  is_open: boolean;
  is_active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={is_open}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      <svg
        className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${is_open ? "rotate-90" : ""}`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
      <span className="flex-1">{label}</span>
      {is_active && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Active" />}
    </button>
  );
}

function SortButton({
  label,
  is_current,
  onClick,
  children,
}: {
  label: string;
  is_current: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      <span className="text-gray-400">{children}</span>
      <span className="flex-1">{label}</span>
      {is_current && (
        <svg className="h-3.5 w-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Spreadsheet style column filter menu, modeled after Google Sheets: sort the
 * column, filter it by a condition, and/or pick any number of its values from a
 * searchable checklist. Changes are staged locally and only applied on "Apply".
 */
export default function SheetColumnFilterDropdown({
  col_label,
  is_sortable,
  sort_direction,
  current_filter,
  anchor_el,
  loadValues,
  onSort,
  onApply,
  onClose,
}: SheetColumnFilterDropdownProps) {
  const dropdown_ref = useRef<HTMLDivElement>(null);
  // Either `top` (opens below the anchor) or `bottom` (opens above it) is set.
  const [position, setPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    max_height: number;
  }>({ top: 0, left: 0, max_height: PREFERRED_MENU_HEIGHT });

  // ── Positioning ──────────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    if (!anchor_el) return;

    const reposition = () => {
      const rect = anchor_el.getBoundingClientRect();
      const dropdown_w = dropdown_ref.current?.offsetWidth ?? 304;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - dropdown_w - 8));
      const space_below = window.innerHeight - rect.bottom - 4 - VIEWPORT_MARGIN;
      const space_above = rect.top - 4 - VIEWPORT_MARGIN;

      // Opens below the anchor by default, and flips above it when the header sits
      // low on the screen and there is clearly more room up there.
      if (space_below < PREFERRED_MENU_HEIGHT && space_above > space_below) {
        setPosition({
          bottom: window.innerHeight - rect.top + 4,
          left,
          max_height: Math.min(PREFERRED_MENU_HEIGHT, space_above),
        });
        return;
      }

      setPosition({
        top: rect.bottom + 4,
        left,
        max_height: Math.max(260, Math.min(PREFERRED_MENU_HEIGHT, space_below)),
      });
    };

    // Keeps the menu attached to its header while the table (or page) scrolls,
    // ignoring scrolls of the menu's own value list.
    const handleScroll = (e: Event) => {
      if (dropdown_ref.current?.contains(e.target as Node)) return;
      reposition();
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [anchor_el]);

  // ── Close on outside click / Escape ──────────────────────────────────────────

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdown_ref.current?.contains(target) || anchor_el?.contains(target)) return;
      onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [anchor_el, onClose]);

  // ── Filter by condition (staged) ─────────────────────────────────────────────

  const [is_condition_open, setIsConditionOpen] = useState(current_filter?.condition != null);
  const [operator, setOperator] = useState<FilterConditionOperator | "">(
    current_filter?.condition?.operator ?? ""
  );
  const [condition_value, setConditionValue] = useState(current_filter?.condition?.value ?? "");
  const [condition_value_to, setConditionValueTo] = useState(current_filter?.condition?.value_to ?? "");

  const operator_input = operator ? getConditionOperatorOption(operator)?.input ?? "none" : "none";

  const condition: ConditionSelection | null = operator
    ? { operator, value: condition_value, value_to: condition_value_to }
    : null;
  const is_condition_incomplete = condition !== null && !isConditionComplete(condition);

  // ── Filter by values (staged) ────────────────────────────────────────────────

  const [is_values_open, setIsValuesOpen] = useState(true);
  // "exclude" with an empty set is the default "everything checked" state.
  const [selection_mode, setSelectionMode] = useState<ValuesSelection["mode"]>(
    current_filter?.values?.mode ?? "exclude"
  );
  const [selection_values, setSelectionValues] = useState<Set<string>>(
    () => new Set(current_filter?.values?.values ?? [])
  );
  const [value_search, setValueSearch] = useState("");
  const debounced_value_search = useDebounce(value_search.trim(), 300);
  const [reload_count, setReloadCount] = useState(0);
  const [values_result, setValuesResult] = useState<ValuesResult | null>(null);

  const request_key = `${reload_count}:${debounced_value_search}`;

  useEffect(() => {
    let is_cancelled = false;

    loadValues(debounced_value_search)
      .then((res) => {
        if (is_cancelled) return;
        setValuesResult({
          request_key,
          data: res.data,
          total_distinct: res.total_distinct,
          has_more: res.has_more,
          error: null,
        });
      })
      .catch(() => {
        if (is_cancelled) return;
        setValuesResult({
          request_key,
          data: [],
          total_distinct: 0,
          has_more: false,
          error: "Could not load the values for this column.",
        });
      });

    return () => {
      is_cancelled = true;
    };
  }, [loadValues, debounced_value_search, request_key]);

  const is_loading_values = values_result?.request_key !== request_key;
  const items = useMemo(() => values_result?.data ?? [], [values_result]);
  const is_searching = debounced_value_search !== "";
  // While typing, the visible list still belongs to the previous search text.
  const is_search_pending = value_search.trim() !== debounced_value_search || is_loading_values;

  const isChecked = (value: string) =>
    selection_mode === "include" ? selection_values.has(value) : !selection_values.has(value);

  const toggleValue = (value: string) =>
    setSelectionValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  /** Checks or unchecks every value. While searching, only the listed matches are touched. */
  const setAllChecked = (checked: boolean) => {
    if (!is_searching) {
      setSelectionMode(checked ? "exclude" : "include");
      setSelectionValues(new Set());
      return;
    }

    setSelectionValues((prev) => {
      const next = new Set(prev);
      // In include mode the set lists checked values, in exclude mode unchecked ones.
      const should_be_in_set = selection_mode === "include" ? checked : !checked;
      items.forEach((item) => {
        if (should_be_in_set) next.add(item.value);
        else next.delete(item.value);
      });
      return next;
    });
  };

  const values_selection = useMemo((): ValuesSelection | null => {
    // Like Google Sheets, applying while searching keeps only the matching values
    // that are checked. This is how "all variations of a client" is picked quickly.
    if (is_searching) {
      return {
        mode: "include",
        values: items
          .filter((item) =>
            selection_mode === "include"
              ? selection_values.has(item.value)
              : !selection_values.has(item.value)
          )
          .map((item) => item.value),
      };
    }
    if (selection_mode === "exclude") {
      return selection_values.size > 0 ? { mode: "exclude", values: [...selection_values] } : null;
    }
    return { mode: "include", values: [...selection_values] };
  }, [is_searching, items, selection_mode, selection_values]);

  const is_values_empty = values_selection?.mode === "include" && values_selection.values.length === 0;
  const checked_visible_count = items.filter((item) => isChecked(item.value)).length;

  // ── Apply / clear ────────────────────────────────────────────────────────────

  const can_apply =
    !is_condition_incomplete && !is_values_empty && !(is_searching && is_search_pending);

  const handleApply = () => {
    if (!can_apply) return;
    onApply(condition || values_selection ? { condition, values: values_selection } : null);
    onClose();
  };

  const handleClearFilter = () => {
    onApply(null);
    onClose();
  };

  const handleSort = (direction: "asc" | "desc") => {
    onSort(direction);
    onClose();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  const has_active_filter = isSheetFilterActive(current_filter);
  const total_distinct = values_result?.total_distinct ?? 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  if (typeof document === "undefined") return null;

  const content = (
    <div
      ref={dropdown_ref}
      role="dialog"
      aria-label={`Filter ${col_label}`}
      className="fixed z-[9999] flex w-[19rem] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      style={{
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        maxHeight: position.max_height,
      }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/60">
        <p className="truncate text-xs font-semibold text-gray-700 dark:text-gray-200">
          {col_label}
        </p>
        {has_active_filter && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Filtered
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Sort */}
        {is_sortable && (
          <div className="border-b border-gray-100 py-1 dark:border-gray-800">
            <SortButton label="Sort A to Z" is_current={sort_direction === "asc"} onClick={() => handleSort("asc")}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </SortButton>
            <SortButton label="Sort Z to A" is_current={sort_direction === "desc"} onClick={() => handleSort("desc")}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              </svg>
            </SortButton>
          </div>
        )}

        {/* Filter by condition */}
        <div className="border-b border-gray-100 dark:border-gray-800">
          <SectionToggle
            label="Filter by condition"
            is_open={is_condition_open}
            is_active={condition !== null && !is_condition_incomplete}
            onToggle={() => setIsConditionOpen((v) => !v)}
          />
          {is_condition_open && (
            <div className="space-y-2 px-3 pb-3">
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as FilterConditionOperator | "")}
                className={INPUT_CLASS}
                aria-label="Condition"
              >
                <option value="">None</option>
                {OPERATOR_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {CONDITION_OPERATOR_OPTIONS.filter((o) => o.group === group).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {(operator_input === "text" || operator_input === "number" || operator_input === "date") && (
                <input
                  type={operator_input}
                  step={operator_input === "number" ? "any" : undefined}
                  value={condition_value}
                  onChange={(e) => setConditionValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Value"
                  aria-label="Condition value"
                  className={INPUT_CLASS}
                />
              )}

              {operator_input === "range" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={condition_value}
                    onChange={(e) => setConditionValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="From"
                    aria-label="Range start"
                    className={INPUT_CLASS}
                  />
                  <span className="text-xs text-gray-400">and</span>
                  <input
                    type="number"
                    step="any"
                    value={condition_value_to}
                    onChange={(e) => setConditionValueTo(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="To"
                    aria-label="Range end"
                    className={INPUT_CLASS}
                  />
                </div>
              )}

              {is_condition_incomplete && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Enter a value to use this condition.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Filter by values */}
        <div>
          <SectionToggle
            label="Filter by values"
            is_open={is_values_open}
            is_active={values_selection !== null}
            onToggle={() => setIsValuesOpen((v) => !v)}
          />
          {is_values_open && (
            <div className="px-3 pb-3">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllChecked(true)}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {is_searching
                      ? "Select all matches"
                      : `Select all ${COMPACT_NUMBER_FORMAT.format(total_distinct)}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllChecked(false)}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Clear
                  </button>
                </div>
                {!is_loading_values && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {values_result?.has_more
                      ? `Displaying ${items.length} of ${COMPACT_NUMBER_FORMAT.format(total_distinct)}`
                      : `Displaying ${items.length}`}
                  </span>
                )}
              </div>

              <div className="relative mb-2">
                <input
                  type="text"
                  value={value_search}
                  onChange={(e) => setValueSearch(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search values"
                  aria-label="Search values"
                  autoFocus
                  className={`${INPUT_CLASS} pr-7`}
                />
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                </svg>
              </div>

              <div className="h-56 overflow-y-auto rounded border border-gray-100 dark:border-gray-800">
                {is_loading_values ? (
                  <div className="flex h-full items-center justify-center gap-2 text-xs text-gray-400">
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading values
                  </div>
                ) : values_result?.error ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1.5 px-4 text-center text-xs text-red-500">
                    {values_result.error}
                    <button
                      type="button"
                      onClick={() => setReloadCount((c) => c + 1)}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Try again
                    </button>
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-400">
                    {is_searching ? "No values match your search." : "This column has no values."}
                  </div>
                ) : (
                  <ul className="py-1">
                    {items.map((item) => (
                      <li key={item.value}>
                        <label className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                          <input
                            type="checkbox"
                            checked={isChecked(item.value)}
                            onChange={() => toggleValue(item.value)}
                            className="h-3.5 w-3.5 shrink-0 rounded accent-brand-500"
                          />
                          <span
                            className={`min-w-0 flex-1 truncate ${item.value === "" ? "italic text-gray-400" : "text-gray-700 dark:text-gray-300"}`}
                            title={formatFilterValue(item.value)}
                          >
                            {formatFilterValue(item.value)}
                          </span>
                          <span className="shrink-0 tabular-nums text-[10px] text-gray-400 dark:text-gray-500">
                            {item.count}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {is_values_empty && !is_loading_values && (
                <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  Select at least one value.
                </p>
              )}
              {is_searching && !is_loading_values && checked_visible_count > 0 && (
                <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                  Apply keeps only the {checked_visible_count} checked match{checked_visible_count !== 1 ? "es" : ""}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
        {has_active_filter ? (
          <button
            type="button"
            onClick={handleClearFilter}
            className="text-xs text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
          >
            Clear filter
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!can_apply}
            className="rounded bg-brand-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
