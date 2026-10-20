import React from "react";
import { getFindTermColorIdx, joinFindTerms, toSingleLineFindQuery } from "@/lib/table-find";
import type { LinkBuildingOrderFindPage } from "@/types/admin/link-building-order";
import styles from "./LinkBuildingOrdersTable.module.scss";

/** Page buttons listed before the rest collapse into "+N more". */
const MAX_LISTED_MATCH_PAGES = 12;

interface TableFindBarProps {
  query: string;
  /** Normalized terms parsed from `query`, one colored chip each. */
  find_terms: string[];
  /** Matching cells on the loaded page. */
  match_count: number;
  /** Zero based index of the current match, -1 when there are no matches. */
  current_match_idx: number;
  input_ref: React.RefObject<HTMLInputElement | null>;
  current_page: number;
  /** Pages of the whole result set holding matching rows, ascending. */
  match_pages: LinkBuildingOrderFindPage[];
  /** Rows matching across every page. */
  matched_row_count: number;
  /** True while the pages holding matches are still being looked up. */
  is_searching_pages: boolean;
  has_pages_error: boolean;
  /** True while find is loading another page to land on its matches. */
  is_changing_page: boolean;
  onQueryChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onGoToPage: (page: number) => void;
  onClose: () => void;
}

/**
 * Compact "Find in page" bar for the Link Building Orders grid. It highlights the
 * matching cells and never filters rows out. Several terms (comma separated, or a
 * pasted column of order ids) are highlighted together, each with its own color,
 * and Enter keeps going through the matches on the other pages.
 */
export default function TableFindBar({
  query,
  find_terms,
  match_count,
  current_match_idx,
  input_ref,
  current_page,
  match_pages,
  matched_row_count,
  is_searching_pages,
  has_pages_error,
  is_changing_page,
  onQueryChange,
  onNext,
  onPrevious,
  onGoToPage,
  onClose,
}: TableFindBarProps) {
  const has_query = find_terms.length > 0;
  const other_match_pages = match_pages.filter((match_page) => match_page.page !== current_page);
  const can_navigate = match_count > 0 || other_match_pages.length > 0;
  const listed_match_pages = match_pages.slice(0, MAX_LISTED_MATCH_PAGES);
  const hidden_match_page_count = match_pages.length - listed_match_pages.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevious();
      } else {
        onNext();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Keeps the grid's own Escape handling (clearing a range selection) out of it.
      e.stopPropagation();
      onClose();
    }
  };

  // A text input drops line breaks, so a column pasted from a spreadsheet would
  // glue every order id together. It is turned into a comma separated list instead.
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted_text = e.clipboardData.getData("text");
    if (!/[\t\r\n]/.test(pasted_text)) return;

    e.preventDefault();
    const input = e.currentTarget;
    const selection_start = input.selectionStart ?? query.length;
    const selection_end = input.selectionEnd ?? query.length;
    const before = query.slice(0, selection_start);
    const after = query.slice(selection_end);
    const needs_separator = before.trim() !== "" && !/[,;]\s*$/.test(before);
    const inserted = `${needs_separator ? ", " : ""}${toSingleLineFindQuery(pasted_text)}`;

    onQueryChange(`${before}${inserted}${after}`);
    requestAnimationFrame(() => {
      const caret = before.length + inserted.length;
      input_ref.current?.setSelectionRange(caret, caret);
    });
  };

  const removeTerm = (term: string) => {
    onQueryChange(joinFindTerms(find_terms.filter((find_term) => find_term !== term)));
    input_ref.current?.focus();
  };

  const counter_text = (() => {
    if (!has_query) return "";
    if (match_count > 0) return `${current_match_idx + 1} of ${match_count} on this page`;
    if (is_searching_pages || is_changing_page) return "Searching...";
    if (other_match_pages.length > 0) return "None on this page";
    return "No matches";
  })();

  const nav_button_class =
    "flex h-6 w-6 items-center justify-center rounded text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700";

  return (
    <div
      role="search"
      aria-label="Find in table"
      className="flex flex-col gap-1.5 border-b border-amber-200 bg-amber-50/60 px-4 py-1.5 dark:border-amber-900/50 dark:bg-amber-950/20"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={input_ref}
            type="text"
            placeholder="Find orders, e.g. BL-4544, BL-4860"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            aria-label="Find in table"
            className="h-7 w-72 max-w-full rounded-lg border border-amber-300 bg-white pl-8 pr-3 text-xs outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-amber-800 dark:bg-gray-800 dark:text-gray-200 dark:focus:ring-amber-900/40"
          />
        </div>

        <span
          className={`min-w-[112px] text-xs tabular-nums ${
            counter_text === "No matches" ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
          }`}
          aria-live="polite"
        >
          {counter_text}
        </span>

        <div className="flex items-center gap-0.5">
          <button
            onClick={onPrevious}
            disabled={!can_navigate}
            className={nav_button_class}
            title="Previous match (Shift+Enter)"
            aria-label="Previous match"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          <button
            onClick={onNext}
            disabled={!can_navigate}
            className={nav_button_class}
            title="Next match (Enter)"
            aria-label="Next match"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <button onClick={onClose} className={nav_button_class} title="Close (Esc)" aria-label="Close find">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {find_terms.length > 1 && (
          <ul className="flex flex-wrap items-center gap-1" aria-label="Find terms">
            {find_terms.map((term, term_idx) => (
              <li key={term}>
                <button
                  type="button"
                  onClick={() => removeTerm(term)}
                  className={`${styles.find_term_chip} ${styles[`find_term_${getFindTermColorIdx(term_idx)}`]}`}
                  title={`Stop finding "${term}"`}
                  aria-label={`Remove find term ${term}`}
                >
                  {term}
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
        {has_query && match_pages.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span>
              {matched_row_count} matching {matched_row_count === 1 ? "order" : "orders"} on{" "}
              {match_pages.length === 1 ? "page" : "pages"}
            </span>
            {listed_match_pages.map((match_page) => {
              const is_current_page = match_page.page === current_page;
              return (
                <button
                  key={match_page.page}
                  type="button"
                  onClick={() => onGoToPage(match_page.page)}
                  disabled={is_current_page}
                  aria-current={is_current_page ? "page" : undefined}
                  title={`Page ${match_page.page}, ${match_page.row_count} matching ${
                    match_page.row_count === 1 ? "order" : "orders"
                  }`}
                  className={`h-5 min-w-[20px] rounded px-1.5 font-medium tabular-nums transition ${
                    is_current_page
                      ? "cursor-default bg-amber-400 text-white dark:bg-amber-500"
                      : "bg-white text-amber-700 ring-1 ring-inset ring-amber-300 hover:bg-amber-100 dark:bg-gray-800 dark:text-amber-400 dark:ring-amber-800 dark:hover:bg-amber-950/40"
                  }`}
                >
                  {match_page.page}
                </button>
              );
            })}
            {hidden_match_page_count > 0 && <span>+{hidden_match_page_count} more</span>}
          </div>
        )}
        {has_query && has_pages_error && (
          <span className="text-red-500 dark:text-red-400">
            Could not look through the other pages, showing matches on this page only.
          </span>
        )}
        <span className="text-gray-400 dark:text-gray-500">
          Separate terms with commas to compare several orders. Matches are highlighted without hiding other rows.
        </span>
      </div>
    </div>
  );
}
