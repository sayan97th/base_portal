import React from "react";

interface TablePaginationProps {
  is_loading: boolean;
  /** False until the first page arrives. Later loads keep the current summary visible, dimmed. */
  has_loaded_once: boolean;
  total: number;
  from_row: number | null;
  to_row: number | null;
  /** Rows on the current page, used when the API does not send from / to. */
  page_row_count: number;
  visible_column_count: number;
  total_column_count: number;
  current_page: number;
  last_page: number;
  per_page: number;
  per_page_options: readonly number[];
  onPageChange: (page: number) => void;
  onPerPageChange: (per_page: number) => void;
}

/**
 * Page numbers to render: always the first and last page, plus a window around the
 * current one, with null marking a gap ("...") between them.
 */
export function buildPageItems(current_page: number, last_page: number): (number | null)[] {
  if (last_page <= 7) return Array.from({ length: last_page }, (_, idx) => idx + 1);

  const window_start = Math.max(2, current_page - 1);
  const window_end = Math.min(last_page - 1, current_page + 1);
  const items: (number | null)[] = [1];

  if (window_start > 2) items.push(null);
  for (let page = window_start; page <= window_end; page += 1) items.push(page);
  if (window_end < last_page - 1) items.push(null);
  items.push(last_page);

  return items;
}

/** Footer of the Link Building Orders table: row range, rows per page and page numbers. */
export default function TablePagination({
  is_loading,
  has_loaded_once,
  total,
  from_row,
  to_row,
  page_row_count,
  visible_column_count,
  total_column_count,
  current_page,
  last_page,
  per_page,
  per_page_options,
  onPageChange,
  onPerPageChange,
}: TablePaginationProps) {
  const nav_button_class =
    "flex h-8 min-w-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700";

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800">
      <p
        className={`text-xs text-gray-500 transition-opacity duration-300 dark:text-gray-400 ${has_loaded_once && is_loading ? "opacity-50" : "opacity-100"}`}
      >
        {!has_loaded_once ? (
          "Loading..."
        ) : total === 0 ? (
          "No rows"
        ) : (
          <>
            Showing{" "}
            <span className="font-semibold text-gray-800 tabular-nums dark:text-gray-100">
              {(from_row ?? 1).toLocaleString()} to {(to_row ?? page_row_count).toLocaleString()}
            </span>{" "}
            of <span className="font-semibold text-gray-800 tabular-nums dark:text-gray-100">{total.toLocaleString()}</span> rows
            <span className="mx-1.5 text-gray-300 dark:text-gray-600">&middot;</span>
            {visible_column_count} of {total_column_count} columns visible
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          Rows per page
          <select
            value={per_page}
            onChange={(e) => onPerPageChange(parseInt(e.target.value, 10))}
            disabled={is_loading}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            {per_page_options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            disabled={current_page <= 1 || is_loading}
            onClick={() => onPageChange(current_page - 1)}
            className={nav_button_class}
            title="Previous page"
            aria-label="Previous page"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          {buildPageItems(current_page, Math.max(last_page, 1)).map((page, idx) =>
            page === null ? (
              <span key={`gap-${idx}`} className="px-1 text-xs text-gray-400" aria-hidden="true">
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                disabled={is_loading}
                onClick={() => page !== current_page && onPageChange(page)}
                aria-current={page === current_page ? "page" : undefined}
                className={
                  page === current_page
                    ? "flex h-8 min-w-8 items-center justify-center rounded-lg bg-brand-500 px-2 text-xs font-semibold text-white tabular-nums shadow-sm"
                    : `${nav_button_class} tabular-nums`
                }
              >
                {page}
              </button>
            )
          )}
          <button
            type="button"
            disabled={current_page >= last_page || is_loading}
            onClick={() => onPageChange(current_page + 1)}
            className={nav_button_class}
            title="Next page"
            aria-label="Next page"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  );
}
