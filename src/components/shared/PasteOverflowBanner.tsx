"use client";

interface PasteOverflowBannerProps {
  overflow_row_count: number;
  available_row_count: number;
  onDismiss: () => void;
}

/** Warns that a bulk paste had more rows than the table could hold, since row
 * count here is capped to the quantity purchased for this item. */
export default function PasteOverflowBanner({
  overflow_row_count,
  available_row_count,
  onDismiss,
}: PasteOverflowBannerProps) {
  if (overflow_row_count <= 0) return null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
      <p className="text-xs text-amber-700 dark:text-amber-400">
        Only the first {available_row_count} row
        {available_row_count !== 1 ? "s" : ""} from your paste were filled in
        — the remaining {overflow_row_count} row
        {overflow_row_count !== 1 ? "s" : ""} were ignored because this table
        has {available_row_count} row{available_row_count !== 1 ? "s" : ""}{" "}
        (based on the quantity purchased). Increase the quantity for this
        item to add more rows.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
      >
        Dismiss
      </button>
    </div>
  );
}
