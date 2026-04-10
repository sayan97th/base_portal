"use client";

import { useState, useCallback } from "react";
import type { BacklinkOrderRow } from "@/types/admin/backlink-order";

// ── Filter types ───────────────────────────────────────────────────────────────

export interface TextFilter {
  type: "text";
  value: string;
}

export interface SelectFilter {
  type: "select";
  /** Values that the cell must match one of. */
  values: string[];
}

export interface NumberFilter {
  type: "number";
  min: string;
  max: string;
}

export interface DateFilter {
  type: "date";
  /** MM/DD/YYYY lower bound (inclusive). */
  from: string;
  /** MM/DD/YYYY upper bound (inclusive). */
  to: string;
}

export type ColumnFilter = TextFilter | SelectFilter | NumberFilter | DateFilter;
export type ColumnFilters = Partial<Record<keyof BacklinkOrderRow, ColumnFilter>>;

// ── Helpers ────────────────────────────────────────────────────────────────────

export function isFilterActive(filter: ColumnFilter): boolean {
  switch (filter.type) {
    case "text":
      return filter.value.trim() !== "";
    case "select":
      return filter.values.length > 0;
    case "number":
      return filter.min.trim() !== "" || filter.max.trim() !== "";
    case "date":
      return filter.from.trim() !== "" || filter.to.trim() !== "";
  }
}

function parseMMDDYYYY(date_str: string): Date | null {
  const parts = date_str.split("/");
  if (parts.length !== 3) return null;
  const d = new Date(
    `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
  );
  return isNaN(d.getTime()) ? null : d;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Manages per-column filter state for a data table.
 * Each column can have an independent filter of the appropriate type.
 */
export function useColumnFilters() {
  const [column_filters, setColumnFilters] = useState<ColumnFilters>({});

  const setFilter = useCallback(
    (key: keyof BacklinkOrderRow, filter: ColumnFilter | null) => {
      setColumnFilters((prev) => {
        const next = { ...prev };
        if (filter === null || !isFilterActive(filter)) {
          delete next[key];
        } else {
          next[key] = filter;
        }
        return next;
      });
    },
    []
  );

  const clearFilter = useCallback((key: keyof BacklinkOrderRow) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => setColumnFilters({}), []);

  const active_filter_count = Object.values(column_filters).filter(
    (f) => f && isFilterActive(f)
  ).length;

  /** Returns a filtered copy of `data` according to all active column filters. */
  const applyFilters = useCallback(
    (data: BacklinkOrderRow[]): BacklinkOrderRow[] => {
      if (active_filter_count === 0) return data;

      return data.filter((row) => {
        for (const [raw_key, filter] of Object.entries(column_filters)) {
          if (!filter || !isFilterActive(filter)) continue;
          const key = raw_key as keyof BacklinkOrderRow;
          const val = (row[key] as string) ?? "";

          if (filter.type === "text") {
            if (!val.toLowerCase().includes(filter.value.toLowerCase()))
              return false;
          } else if (filter.type === "select") {
            if (!filter.values.includes(val)) return false;
          } else if (filter.type === "number") {
            const num = parseFloat(val);
            if (filter.min.trim() && (isNaN(num) || num < parseFloat(filter.min)))
              return false;
            if (filter.max.trim() && (isNaN(num) || num > parseFloat(filter.max)))
              return false;
          } else if (filter.type === "date") {
            const row_date = parseMMDDYYYY(val);
            if (!row_date) return false;
            if (filter.from.trim()) {
              const from = parseMMDDYYYY(filter.from);
              if (from && row_date < from) return false;
            }
            if (filter.to.trim()) {
              const to = parseMMDDYYYY(filter.to);
              if (to && row_date > to) return false;
            }
          }
        }
        return true;
      });
    },
    [column_filters, active_filter_count]
  );

  return {
    column_filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    active_filter_count,
    applyFilters,
  };
}
