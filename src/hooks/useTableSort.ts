"use client";

import { useState, useCallback, useRef } from "react";
import type { SortRulePayload } from "@/types/admin/backlink-order";

/**
 * Re-export so consumers can import the sort rule type from a single place
 * without coupling to the full backlink-order types.
 */
export type { SortRulePayload as SortRule };

export type SortDirection = "asc" | "desc";

/**
 * Manages multi-column sort state for a data table.
 * Sort rules are in the same shape as `SortRulePayload`, so they can be
 * passed directly into `BacklinkOrderSearchBody.sort_rules` without mapping.
 *
 * - Single click: set as the sole sort rule (asc → desc → cleared).
 * - Shift+click: add / cycle / remove from the multi-sort chain.
 */
export function useTableSort(default_rules: SortRulePayload[] = []) {
  const default_rules_ref = useRef(default_rules);
  const [sort_rules, setSortRules] = useState<SortRulePayload[]>(default_rules);

  const toggleSort = useCallback(
    (key: string, add_to_existing: boolean) => {
      setSortRules((prev) => {
        const existing_idx = prev.findIndex((r) => r.key === key);

        if (add_to_existing) {
          // Shift+click: append / cycle / remove from multi-sort chain
          if (existing_idx === -1) {
            return [...prev, { key, direction: "asc", nulls_last: true }];
          }
          if (prev[existing_idx].direction === "asc") {
            return prev.map((r, i) =>
              i === existing_idx ? { ...r, direction: "desc" as SortDirection } : r
            );
          }
          // Was descending — remove it
          return prev.filter((_, i) => i !== existing_idx);
        }

        // Plain click: replace with a single sort rule (asc → desc → reset to default)
        if (prev.length === 1 && existing_idx === 0) {
          if (prev[0].direction === "asc") return [{ key, direction: "desc", nulls_last: true }];

          // Was desc — reset to default. If the default for this key is also desc,
          // resetting would be a no-op, so cycle to asc instead so the user can toggle.
          const next = default_rules_ref.current;
          const stuck_at_desc =
            next.length === 1 && next[0].key === key && next[0].direction === "desc";
          return stuck_at_desc ? [{ key, direction: "asc", nulls_last: true }] : next;
        }
        return [{ key, direction: "asc", nulls_last: true }];
      });
    },
    []
  );

  const clearSort = useCallback(() => setSortRules(default_rules_ref.current), []);

  return { sort_rules, toggleSort, clearSort };
}
