import React from "react";

interface TableStatusFooterProps {
  is_loading: boolean;
  /** False until the first rows arrive. Later loads keep the current summary visible, dimmed. */
  has_loaded_once: boolean;
  /** Rows matching the filters on the server. */
  total: number;
  /** Rows of the result set already in the grid. */
  loaded_row_count: number;
  /** True while the rest of the result set is still arriving. */
  is_loading_more_rows: boolean;
  visible_column_count: number;
  total_column_count: number;
  /** Summary of the selected cells (Sum, Count...), shown on the right like the Google Sheets status bar. */
  selection_summary?: React.ReactNode;
}

/**
 * Footer of the Link Building Orders table, like the status bar of a spreadsheet:
 * how many rows the sheet holds, the loading progress while the rest of a large
 * result set arrives, and the summary of the selected cells.
 */
export default function TableStatusFooter({
  is_loading,
  has_loaded_once,
  total,
  loaded_row_count,
  is_loading_more_rows,
  visible_column_count,
  total_column_count,
  selection_summary,
}: TableStatusFooterProps) {
  const progress_percent = total > 0 ? Math.min(100, Math.round((loaded_row_count / total) * 100)) : 100;

  return (
    <div
      role="group"
      aria-label="Table status"
      className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800"
    >
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500 transition-opacity duration-300 dark:text-gray-400 ${has_loaded_once && is_loading ? "opacity-50" : "opacity-100"}`}
      >
        {!has_loaded_once ? (
          <span>Loading...</span>
        ) : total === 0 ? (
          <span>No rows</span>
        ) : (
          <span>
            <span className="font-semibold text-gray-800 tabular-nums dark:text-gray-100">{total.toLocaleString()}</span>{" "}
            {total === 1 ? "row" : "rows"}
            <span className="mx-1.5 text-gray-300 dark:text-gray-600">&middot;</span>
            {visible_column_count} of {total_column_count} columns visible
          </span>
        )}

        {has_loaded_once && is_loading_more_rows && (
          <span className="flex items-center gap-2" role="status" aria-live="polite">
            <span
              className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
              role="progressbar"
              aria-label="Loading rows"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={loaded_row_count}
            >
              <span
                className="block h-full rounded-full bg-brand-500 transition-[width] duration-300"
                style={{ width: `${progress_percent}%` }}
              />
            </span>
            <span className="tabular-nums">
              Loading {loaded_row_count.toLocaleString()} of {total.toLocaleString()} rows
            </span>
          </span>
        )}
      </div>

      {selection_summary && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{selection_summary}</div>}
    </div>
  );
}
