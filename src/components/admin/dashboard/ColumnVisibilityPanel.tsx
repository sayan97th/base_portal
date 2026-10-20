import React, { useMemo, useState } from "react";

export interface ColumnVisibilityGroup {
  key: string;
  label: string;
  /** Tailwind background class of the group's color swatch, matching its header color. */
  swatch_class: string;
  columns: { key: string; label: string }[];
}

interface ColumnVisibilityPanelProps {
  groups: ColumnVisibilityGroup[];
  hidden_columns: Set<string>;
  has_custom_widths: boolean;
  onToggleColumn: (col_key: string) => void;
  onSetGroupHidden: (col_keys: string[], is_hidden: boolean) => void;
  onShowAll: () => void;
  onResetWidths: () => void;
}

/**
 * Column chooser for the Link Building Orders table. Columns are listed under the
 * same groups (and colors) as the table headers, can be searched by name, and a
 * whole group can be shown or hidden at once.
 */
export default function ColumnVisibilityPanel({
  groups,
  hidden_columns,
  has_custom_widths,
  onToggleColumn,
  onSetGroupHidden,
  onShowAll,
  onResetWidths,
}: ColumnVisibilityPanelProps) {
  const [column_search, setColumnSearch] = useState("");

  const total_columns = groups.reduce((sum, group) => sum + group.columns.length, 0);
  const visible_count = total_columns - hidden_columns.size;

  const filtered_groups = useMemo(() => {
    const query = column_search.trim().toLowerCase();
    if (query === "") return groups;
    return groups
      .map((group) => ({
        ...group,
        columns: group.columns.filter((col) => col.label.toLowerCase().includes(query)),
      }))
      .filter((group) => group.columns.length > 0);
  }, [groups, column_search]);

  return (
    <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-4 sm:px-5 dark:border-gray-800 dark:bg-gray-900/60">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Visible columns</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {visible_count} of {total_columns} columns shown. Click a column to show or hide it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={column_search}
              onChange={(e) => setColumnSearch(e.target.value)}
              placeholder="Find a column..."
              aria-label="Find a column"
              className="h-8 w-44 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          {has_custom_widths && (
            <button
              type="button"
              onClick={onResetWidths}
              title="Restore every column to its default width"
              className="h-8 rounded-lg px-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              Reset column widths
            </button>
          )}
          <button
            type="button"
            onClick={onShowAll}
            disabled={hidden_columns.size === 0}
            className="h-8 rounded-lg border border-brand-200 bg-white px-3 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-800 dark:bg-gray-800 dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            Show all
          </button>
        </div>
      </div>

      {filtered_groups.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">No column matches &ldquo;{column_search}&rdquo;.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {filtered_groups.map((group) => {
            const group_keys = group.columns.map((col) => col.key);
            const group_hidden_count = group_keys.filter((key) => hidden_columns.has(key)).length;
            const is_group_fully_hidden = group_hidden_count === group_keys.length;
            return (
              <div
                key={group.key}
                className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${group.swatch_class}`} aria-hidden="true" />
                    <span className="truncate">{group.label}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetGroupHidden(group_keys, !is_group_fully_hidden)}
                    className="shrink-0 text-[11px] font-medium text-gray-400 hover:text-brand-600 dark:text-gray-500 dark:hover:text-brand-400"
                  >
                    {is_group_fully_hidden ? "Show group" : "Hide group"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.columns.map((col) => {
                    const is_visible = !hidden_columns.has(col.key);
                    return (
                      <button
                        key={col.key}
                        type="button"
                        aria-pressed={is_visible}
                        onClick={() => onToggleColumn(col.key)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                          is_visible
                            ? "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            : "border-dashed border-gray-300 bg-transparent text-gray-400 line-through dark:border-gray-600 dark:text-gray-500"
                        }`}
                      >
                        {is_visible ? (
                          <svg className="h-2.5 w-2.5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {col.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
