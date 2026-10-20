import React from "react";

export interface ActiveFilterChip {
  key: string;
  label: string;
  description: string;
  /** Text read out by the remove button, e.g. "Remove the Link Type filter". */
  remove_label: string;
  /** "quick" chips come from the toolbar controls, "column" chips from a column's filter menu. */
  kind: "quick" | "column";
  /** Opens the control that edits this filter, receives the chip so menus can anchor to it. */
  onEdit?: (anchor_el: HTMLElement) => void;
  onRemove: () => void;
}

interface ActiveFiltersBarProps {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
}

/**
 * One row that lists every filter shaping the table, from the toolbar and from
 * the column menus alike (hidden columns included), so the current view is always
 * explained in one place and each filter can be edited or removed on its own.
 */
export default function ActiveFiltersBar({ chips, onClearAll }: ActiveFiltersBarProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 bg-gray-50/70 px-4 py-2 sm:px-5 dark:border-gray-800 dark:bg-gray-900/60">
      <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtered by:
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={`inline-flex max-w-xs items-center overflow-hidden rounded-full border text-xs ${
            chip.kind === "column"
              ? "border-amber-200 bg-white text-gray-700 dark:border-amber-800/60 dark:bg-gray-800 dark:text-gray-200"
              : "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800/60 dark:bg-brand-500/10 dark:text-brand-200"
          }`}
        >
          {chip.onEdit ? (
            <button
              type="button"
              onClick={(e) => chip.onEdit?.(e.currentTarget)}
              className="min-w-0 truncate py-0.5 pl-2.5 pr-1 text-left hover:text-brand-600 dark:hover:text-brand-400"
              title={`${chip.label}: ${chip.description}. Click to edit.`}
            >
              <span className="font-semibold">{chip.label}:</span> {chip.description}
            </button>
          ) : (
            <span className="min-w-0 truncate py-0.5 pl-2.5 pr-1" title={`${chip.label}: ${chip.description}`}>
              <span className="font-semibold">{chip.label}:</span> {chip.description}
            </span>
          )}
          <button
            type="button"
            onClick={chip.onRemove}
            className="shrink-0 py-1 pl-1 pr-2 text-gray-400 hover:text-red-500"
            aria-label={chip.remove_label}
            title="Remove filter"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:underline dark:text-gray-400 dark:hover:text-red-400"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
