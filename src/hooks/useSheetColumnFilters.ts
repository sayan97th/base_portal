"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  ColumnFilterPayload,
  FilterConditionOperator,
} from "@/types/admin/link-building-order";

// ── Filter types ───────────────────────────────────────────────────────────────

/**
 * "Filter by values" selection. `include` keeps only the listed values, `exclude`
 * keeps everything except them, which is how "Select all, then uncheck a few"
 * is stored without sending every value in the column. "" stands for "(Blanks)".
 */
export interface ValuesSelection {
  mode: "include" | "exclude";
  values: string[];
}

/** "Filter by condition" selection. Dates use the YYYY-MM-DD format of a native date input. */
export interface ConditionSelection {
  operator: FilterConditionOperator;
  value: string;
  value_to: string;
}

/** A single column's filter. A condition and a values selection can be combined (ANDed). */
export interface SheetColumnFilter {
  condition: ConditionSelection | null;
  values: ValuesSelection | null;
}

export type SheetColumnFilters = Partial<Record<string, SheetColumnFilter>>;

// ── Condition operators ────────────────────────────────────────────────────────

export type ConditionInputKind = "none" | "text" | "date" | "number" | "range";

export interface ConditionOperatorOption {
  value: FilterConditionOperator;
  label: string;
  group: "General" | "Text" | "Date" | "Number";
  input: ConditionInputKind;
}

export const CONDITION_OPERATOR_OPTIONS: ConditionOperatorOption[] = [
  { value: "is_empty", label: "Is empty", group: "General", input: "none" },
  { value: "is_not_empty", label: "Is not empty", group: "General", input: "none" },
  { value: "text_contains", label: "Text contains", group: "Text", input: "text" },
  { value: "text_not_contains", label: "Text does not contain", group: "Text", input: "text" },
  { value: "text_starts_with", label: "Text starts with", group: "Text", input: "text" },
  { value: "text_ends_with", label: "Text ends with", group: "Text", input: "text" },
  { value: "text_is_exactly", label: "Text is exactly", group: "Text", input: "text" },
  { value: "date_is", label: "Date is", group: "Date", input: "date" },
  { value: "date_is_before", label: "Date is before", group: "Date", input: "date" },
  { value: "date_is_after", label: "Date is after", group: "Date", input: "date" },
  { value: "greater_than", label: "Greater than", group: "Number", input: "number" },
  { value: "greater_than_or_equal", label: "Greater than or equal to", group: "Number", input: "number" },
  { value: "less_than", label: "Less than", group: "Number", input: "number" },
  { value: "less_than_or_equal", label: "Less than or equal to", group: "Number", input: "number" },
  { value: "is_equal_to", label: "Is equal to", group: "Number", input: "number" },
  { value: "is_not_equal_to", label: "Is not equal to", group: "Number", input: "number" },
  { value: "is_between", label: "Is between", group: "Number", input: "range" },
  { value: "is_not_between", label: "Is not between", group: "Number", input: "range" },
];

export function getConditionOperatorOption(
  operator: FilterConditionOperator
): ConditionOperatorOption | undefined {
  return CONDITION_OPERATOR_OPTIONS.find((o) => o.value === operator);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** True when the condition has every input its operator needs. */
export function isConditionComplete(condition: ConditionSelection): boolean {
  const input = getConditionOperatorOption(condition.operator)?.input ?? "none";
  if (input === "none") return true;
  if (input === "range") return condition.value.trim() !== "" && condition.value_to.trim() !== "";
  return condition.value.trim() !== "";
}

export function isSheetFilterActive(filter: SheetColumnFilter | undefined): boolean {
  if (!filter) return false;
  const has_condition = filter.condition !== null && isConditionComplete(filter.condition);
  // An exclude selection with nothing excluded is the same as "Select all", i.e. no filter.
  const has_values =
    filter.values !== null &&
    (filter.values.mode === "include" || filter.values.values.length > 0);
  return has_condition || has_values;
}

/** Converts the per-column filter state into the API's `column_filters` payload. */
export function toColumnFilterPayloads(filters: SheetColumnFilters): ColumnFilterPayload[] {
  const payloads: ColumnFilterPayload[] = [];

  for (const [key, filter] of Object.entries(filters)) {
    if (!filter || !isSheetFilterActive(filter)) continue;

    if (filter.condition && isConditionComplete(filter.condition)) {
      payloads.push({
        key,
        type: "condition",
        operator: filter.condition.operator,
        value: filter.condition.value.trim() || undefined,
        value_to: filter.condition.value_to.trim() || undefined,
      });
    }

    if (filter.values && (filter.values.mode === "include" || filter.values.values.length > 0)) {
      payloads.push({
        key,
        type: "values",
        mode: filter.values.mode,
        values: filter.values.values,
      });
    }
  }

  return payloads;
}

/** Label for a filter value, showing "(Blanks)" for empty cells. */
export function formatFilterValue(value: string): string {
  return value === "" ? "(Blanks)" : value;
}

/** Formats a YYYY-MM-DD date input value as MM/DD/YYYY, the format the table displays. */
function formatConditionDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${month}/${day}/${year}` : value;
}

/** Short human readable summary of a column filter, used by the active filter chips. */
export function describeSheetFilter(filter: SheetColumnFilter): string {
  const parts: string[] = [];

  if (filter.condition && isConditionComplete(filter.condition)) {
    const option = getConditionOperatorOption(filter.condition.operator);
    const label = option?.label ?? filter.condition.operator;
    const format = option?.input === "date" ? formatConditionDate : (v: string) => v;

    if (option?.input === "range") {
      parts.push(`${label} ${filter.condition.value} and ${filter.condition.value_to}`);
    } else if (option?.input === "none") {
      parts.push(label);
    } else {
      parts.push(`${label} "${format(filter.condition.value)}"`);
    }
  }

  if (filter.values) {
    const { mode, values } = filter.values;
    const listed =
      values.length <= 2
        ? values.map(formatFilterValue).join(", ")
        : `${values.length} values`;

    if (mode === "include") {
      parts.push(values.length === 0 ? "No values" : listed);
    } else if (values.length > 0) {
      parts.push(`All except ${listed}`);
    }
  }

  return parts.join(" · ");
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Manages spreadsheet style filters for a server-side data table. Each column
 * holds its own independent filter, so filters on several columns stay active
 * at the same time and are combined by the backend.
 */
export function useSheetColumnFilters() {
  const [sheet_filters, setSheetFilters] = useState<SheetColumnFilters>({});

  const setSheetFilter = useCallback((key: string, filter: SheetColumnFilter | null) => {
    setSheetFilters((prev) => {
      const next = { ...prev };
      if (filter === null || !isSheetFilterActive(filter)) {
        delete next[key];
      } else {
        next[key] = filter;
      }
      return next;
    });
  }, []);

  const clearSheetFilter = useCallback((key: string) => {
    setSheetFilters((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllSheetFilters = useCallback(() => setSheetFilters({}), []);

  const active_sheet_filter_count = useMemo(
    () => Object.values(sheet_filters).filter(isSheetFilterActive).length,
    [sheet_filters]
  );

  return {
    sheet_filters,
    setSheetFilter,
    clearSheetFilter,
    clearAllSheetFilters,
    active_sheet_filter_count,
  };
}
