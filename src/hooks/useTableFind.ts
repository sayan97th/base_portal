import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeFindQuery, textMatchesFind } from "@/lib/table-find";

export interface TableFindMatch {
  row_id: string;
  col_key: string;
}

export type TableFindMatchState = "match" | "current" | null;

interface UseTableFindOptions<TRow> {
  rows: TRow[];
  /** Columns to look through, in on-screen order (matches are ordered row by row, left to right). */
  column_keys: string[];
  getRowId: (row: TRow) => string;
  /** Text a cell shows (or holds), used for matching. Empty cells should return "". */
  getCellText: (row: TRow, col_key: string) => string;
  /** Called whenever the user moves to a match (typing, Enter, next/previous buttons). */
  onNavigateToMatch?: (match: TableFindMatch) => void;
}

function toMatchKey(row_id: string, col_key: string): string {
  return `${row_id}::${col_key}`;
}

/** Ignores Ctrl/Cmd+F while a modal dialog is open, so it keeps the browser's own find. */
function isInsideDialog(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[role="dialog"], [aria-modal="true"]');
}

/**
 * Browser style "Find in page" for a data grid: Ctrl/Cmd+F opens a find bar, every
 * matching cell is highlighted and Enter / Shift+Enter jump between matches. Rows
 * are never filtered out, which is what separates it from the regular search.
 *
 * Pressing Ctrl/Cmd+F again while the find input already has focus falls through
 * to the browser's native find, so that is never fully taken away from the user.
 */
export function useTableFind<TRow>({
  rows,
  column_keys,
  getRowId,
  getCellText,
  onNavigateToMatch,
}: UseTableFindOptions<TRow>) {
  const [is_find_open, setIsFindOpen] = useState(false);
  const [find_query, setFindQueryState] = useState("");
  const [active_match_idx, setActiveMatchIdx] = useState(0);
  // Bumped every time the user explicitly moves to a match, so the effect below
  // scrolls only on navigation and not when a remote edit reshuffles the rows.
  const [navigation_tick, setNavigationTick] = useState(0);
  const find_input_ref = useRef<HTMLInputElement>(null);

  const on_navigate_ref = useRef(onNavigateToMatch);
  on_navigate_ref.current = onNavigateToMatch;

  const normalized_query = is_find_open ? normalizeFindQuery(find_query) : "";

  const matches = useMemo<TableFindMatch[]>(() => {
    if (!normalized_query) return [];
    const found: TableFindMatch[] = [];
    for (const row of rows) {
      const row_id = getRowId(row);
      for (const col_key of column_keys) {
        if (textMatchesFind(getCellText(row, col_key), normalized_query)) {
          found.push({ row_id, col_key });
        }
      }
    }
    return found;
  }, [rows, column_keys, getRowId, getCellText, normalized_query]);

  const match_keys = useMemo(
    () => new Set(matches.map((match) => toMatchKey(match.row_id, match.col_key))),
    [matches]
  );

  const matched_row_ids = useMemo(() => new Set(matches.map((match) => match.row_id)), [matches]);

  // Rows can change under the find bar (edits, live updates, page changes), so the
  // stored index is clamped instead of trusted.
  const current_match_idx = matches.length === 0 ? -1 : Math.min(active_match_idx, matches.length - 1);
  const current_match = current_match_idx === -1 ? null : matches[current_match_idx];

  useEffect(() => {
    if (navigation_tick === 0 || !current_match) return;
    on_navigate_ref.current?.(current_match);
    // Only an explicit navigation should scroll the grid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation_tick]);

  const setFindQuery = useCallback((value: string) => {
    setFindQueryState(value);
    setActiveMatchIdx(0);
    setNavigationTick((tick) => tick + 1);
  }, []);

  const openFind = useCallback(() => {
    setIsFindOpen(true);
    // Wait for the bar to mount before focusing and selecting the previous query.
    requestAnimationFrame(() => {
      find_input_ref.current?.focus();
      find_input_ref.current?.select();
    });
  }, []);

  const closeFind = useCallback(() => {
    setIsFindOpen(false);
  }, []);

  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setActiveMatchIdx((current_match_idx + 1) % matches.length);
    setNavigationTick((tick) => tick + 1);
  }, [matches.length, current_match_idx]);

  const goToPreviousMatch = useCallback(() => {
    if (matches.length === 0) return;
    setActiveMatchIdx((current_match_idx - 1 + matches.length) % matches.length);
    setNavigationTick((tick) => tick + 1);
  }, [matches.length, current_match_idx]);

  const getCellMatchState = useCallback(
    (row_id: string, col_key: string): TableFindMatchState => {
      if (!match_keys.has(toMatchKey(row_id, col_key))) return null;
      return current_match?.row_id === row_id && current_match?.col_key === col_key ? "current" : "match";
    },
    [match_keys, current_match]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== "f") return;
      if (isInsideDialog(e.target)) return;
      if (document.activeElement === find_input_ref.current) return;
      e.preventDefault();
      openFind();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openFind]);

  return {
    is_find_open,
    find_query,
    normalized_query,
    find_input_ref,
    matches,
    matched_row_ids,
    current_match_idx,
    setFindQuery,
    openFind,
    closeFind,
    goToNextMatch,
    goToPreviousMatch,
    getCellMatchState,
  };
}
