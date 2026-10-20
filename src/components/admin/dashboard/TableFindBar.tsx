import React from "react";

interface TableFindBarProps {
  query: string;
  match_count: number;
  /** Zero based index of the current match, -1 when there are no matches. */
  current_match_idx: number;
  input_ref: React.RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}

/**
 * Compact "Find in page" bar for the Link Building Orders grid. It highlights the
 * matching cells on the loaded page and never filters rows out.
 */
export default function TableFindBar({
  query,
  match_count,
  current_match_idx,
  input_ref,
  onQueryChange,
  onNext,
  onPrevious,
  onClose,
}: TableFindBarProps) {
  const has_query = query.trim() !== "";

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

  const nav_button_class =
    "flex h-6 w-6 items-center justify-center rounded text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700";

  return (
    <div
      role="search"
      aria-label="Find in table"
      className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50/60 px-4 py-1.5 dark:border-amber-900/50 dark:bg-amber-950/20"
    >
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
          placeholder="Find in table..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Find in table"
          className="h-7 w-64 rounded-lg border border-amber-300 bg-white pl-8 pr-3 text-xs outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-amber-800 dark:bg-gray-800 dark:text-gray-200 dark:focus:ring-amber-900/40"
        />
      </div>

      <span
        className={`min-w-[72px] text-xs tabular-nums ${
          has_query && match_count === 0 ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
        }`}
        aria-live="polite"
      >
        {!has_query ? "" : match_count === 0 ? "No matches" : `${current_match_idx + 1} of ${match_count}`}
      </span>

      <div className="flex items-center gap-0.5">
        <button
          onClick={onPrevious}
          disabled={match_count === 0}
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
          disabled={match_count === 0}
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

      <span className="text-[11px] text-gray-400 dark:text-gray-500">
        Highlights matches on this page without hiding other rows. Use Search to look across all pages.
      </span>
    </div>
  );
}
