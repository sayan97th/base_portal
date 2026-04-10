"use client";

import { useState, useCallback } from "react";
import type { BacklinkOrderRow } from "@/types/admin/backlink-order";

export type SortDirection = "asc" | "desc";

export interface SortRule {
  key: keyof BacklinkOrderRow;
  direction: SortDirection;
}

/**
 * Manages multi-column sort state for a data table.
 *
 * - Single click on a column: set as the sole sort rule (asc → desc → cleared).
 * - Shift+click on a column: add/cycle/remove it from the multi-sort chain.
 */
export function useTableSort() {
  const [sort_rules, setSortRules] = useState<SortRule[]>([]);

  const toggleSort = useCallback(
    (key: keyof BacklinkOrderRow, add_to_existing: boolean) => {
      setSortRules((prev) => {
        const existing_idx = prev.findIndex((r) => r.key === key);

        if (add_to_existing) {
          // Shift+click: append / cycle / remove from multi-sort chain
          if (existing_idx === -1) {
            return [...prev, { key, direction: "asc" }];
          }
          if (prev[existing_idx].direction === "asc") {
            return prev.map((r, i) =>
              i === existing_idx ? { ...r, direction: "desc" as SortDirection } : r
            );
          }
          // Was descending — remove it
          return prev.filter((_, i) => i !== existing_idx);
        }

        // Plain click: replace with single sort rule (asc → desc → cleared)
        if (prev.length === 1 && existing_idx === 0) {
          if (prev[0].direction === "asc") return [{ key, direction: "desc" }];
          return []; // clear
        }
        return [{ key, direction: "asc" }];
      });
    },
    []
  );

  const clearSort = useCallback(() => setSortRules([]), []);

  /** Returns a sorted copy of `data` according to the active sort rules. */
  const applySorting = useCallback(
    (data: BacklinkOrderRow[]): BacklinkOrderRow[] => {
      if (sort_rules.length === 0) return data;

      return [...data].sort((a, b) => {
        for (const rule of sort_rules) {
          const a_val = (a[rule.key] as string) ?? "";
          const b_val = (b[rule.key] as string) ?? "";

          const a_num = parseFloat(a_val);
          const b_num = parseFloat(b_val);

          let cmp: number;
          if (!isNaN(a_num) && !isNaN(b_num)) {
            cmp = a_num - b_num;
          } else {
            cmp = a_val.localeCompare(b_val, undefined, {
              numeric: true,
              sensitivity: "base",
            });
          }

          if (cmp !== 0) return rule.direction === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    },
    [sort_rules]
  );

  return { sort_rules, toggleSort, clearSort, applySorting };
}
