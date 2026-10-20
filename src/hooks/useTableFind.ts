import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseFindTerms, textMatchesAnyFindTerm } from "@/lib/table-find";

export interface TableFindMatch {
  row_id: string;
  col_key: string;
}

export type TableFindMatchState = "match" | "current" | null;

/**
 * Lets find continue past the loaded page: when the matches on this page run out,
 * Enter / Shift+Enter move to the next / previous page that holds matches.
 */
interface TableFindPagination {
  current_page: number;
  /** Pages holding at least one match, ascending (usually resolved by the API). */
  pages_with_matches: number[];
  /** Loads another page, find lands on its first or last match once its rows arrive. */
  onGoToPage: (page: number) => void;
}

interface UseTableFindOptions<TRow> {
  rows: TRow[];
  /** Columns to look through, in on-screen order (matches are ordered row by row, left to right). */
  column_keys: string[];
  getRowId: (row: TRow) => string;
  /** Text a cell shows (or holds), used for matching. Empty cells should return "". */
  getCellText: (row: TRow, col_key: string) => string;
  /** Called whenever the user moves to a match (typing, Enter, next/previous buttons). */
  onNavigateToMatch?: (match: TableFindMatch) => void;
  pagination?: TableFindPagination;
}

interface PendingPageLanding {
  page: number;
  position: "first" | "last";
}

const NO_FIND_TERMS: string[] = [];

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
 * Several terms can be looked up at once (see parseFindTerms), so a few orders can
 * be highlighted together and compared.
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
  pagination,
}: UseTableFindOptions<TRow>) {
  const [is_find_open, setIsFindOpen] = useState(false);
  const [find_query, setFindQueryState] = useState("");
  const [active_match_idx, setActiveMatchIdx] = useState(0);
  // Bumped every time the user explicitly moves to a match, so the effect below
  // scrolls only on navigation and not when a remote edit reshuffles the rows.
  const [navigation_tick, setNavigationTick] = useState(0);
  const [pending_landing, setPendingLanding] = useState<PendingPageLanding | null>(null);
  const find_input_ref = useRef<HTMLInputElement>(null);

  const on_navigate_ref = useRef(onNavigateToMatch);
  on_navigate_ref.current = onNavigateToMatch;

  const parsed_terms = useMemo(() => parseFindTerms(find_query), [find_query]);
  const find_terms = is_find_open ? parsed_terms : NO_FIND_TERMS;

  const matches = useMemo<TableFindMatch[]>(() => {
    if (find_terms.length === 0) return [];
    const found: TableFindMatch[] = [];
    for (const row of rows) {
      const row_id = getRowId(row);
      for (const col_key of column_keys) {
        if (textMatchesAnyFindTerm(getCellText(row, col_key), find_terms)) {
          found.push({ row_id, col_key });
        }
      }
    }
    return found;
  }, [rows, column_keys, getRowId, getCellText, find_terms]);

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

  const current_page = pagination?.current_page;
  const pages_with_matches = pagination?.pages_with_matches;
  const onGoToPage = pagination?.onGoToPage;

  // Once the requested page has loaded, land on its first (or last) match. Adjusted
  // while rendering (not in an effect) so the grid never paints the wrong match first.
  if (pending_landing && current_page === pending_landing.page) {
    setPendingLanding(null);
    setActiveMatchIdx(pending_landing.position === "first" ? 0 : Math.max(matches.length - 1, 0));
    setNavigationTick((tick) => tick + 1);
  }

  /** Next (1) or previous (-1) page holding matches, wrapping around, null when there is none. */
  const findAdjacentMatchPage = useCallback(
    (direction: 1 | -1): number | null => {
      if (current_page === undefined || !pages_with_matches) return null;
      const other_pages = pages_with_matches.filter((page) => page !== current_page);
      if (other_pages.length === 0) return null;
      if (direction === 1) return other_pages.find((page) => page > current_page) ?? other_pages[0];
      return [...other_pages].reverse().find((page) => page < current_page) ?? other_pages[other_pages.length - 1];
    },
    [current_page, pages_with_matches]
  );

  const goToMatchPage = useCallback(
    (page: number, position: PendingPageLanding["position"] = "first") => {
      if (!onGoToPage) return;
      setPendingLanding({ page, position });
      onGoToPage(page);
    },
    [onGoToPage]
  );

  const setFindQuery = useCallback((value: string) => {
    setFindQueryState(value);
    setActiveMatchIdx(0);
    setPendingLanding(null);
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
    setPendingLanding(null);
  }, []);

  const goToNextMatch = useCallback(() => {
    if (matches.length === 0 || current_match_idx === matches.length - 1) {
      const next_page = findAdjacentMatchPage(1);
      if (next_page !== null) {
        goToMatchPage(next_page, "first");
        return;
      }
    }
    if (matches.length === 0) return;
    setActiveMatchIdx((current_match_idx + 1) % matches.length);
    setNavigationTick((tick) => tick + 1);
  }, [matches.length, current_match_idx, findAdjacentMatchPage, goToMatchPage]);

  const goToPreviousMatch = useCallback(() => {
    if (matches.length === 0 || current_match_idx === 0) {
      const previous_page = findAdjacentMatchPage(-1);
      if (previous_page !== null) {
        goToMatchPage(previous_page, "last");
        return;
      }
    }
    if (matches.length === 0) return;
    setActiveMatchIdx((current_match_idx - 1 + matches.length) % matches.length);
    setNavigationTick((tick) => tick + 1);
  }, [matches.length, current_match_idx, findAdjacentMatchPage, goToMatchPage]);

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
    find_terms,
    find_input_ref,
    matches,
    matched_row_ids,
    current_match_idx,
    is_changing_page: pending_landing !== null,
    setFindQuery,
    openFind,
    closeFind,
    goToNextMatch,
    goToPreviousMatch,
    goToMatchPage,
    getCellMatchState,
  };
}
