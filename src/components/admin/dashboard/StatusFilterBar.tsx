import React, { useMemo } from "react";
import {
  LINK_BUILDING_ORDER_STATUSES,
  STATUS_DOT_CLASSES,
  DEFAULT_STATUS_DOT_CLASS,
} from "@/lib/link-building-order-statuses";

interface StatusFilterBarProps {
  /** Rows per status for the current filters, null while the counts are loading. */
  status_counts: Record<string, number> | null;
  /** Rows matching every filter except the Status ones, null while loading. */
  total_count: number | null;
  /** Selected status, "" for All. */
  active_status: string;
  needs_approval_active: boolean;
  needs_approval_count: number | null;
  onSelectStatus: (status: string) => void;
  onToggleNeedsApproval: () => void;
}

function formatCount(count: number | null | undefined): string {
  if (count === null || count === undefined) return "";
  return count.toLocaleString();
}

/**
 * Status pipeline for the Link Building Orders table: one pill per status with its
 * row count, so admins can see where orders stand and jump to a status in one
 * click. Scrolls sideways on narrow screens instead of wrapping onto several lines.
 */
export default function StatusFilterBar({
  status_counts,
  total_count,
  active_status,
  needs_approval_active,
  needs_approval_count,
  onSelectStatus,
  onToggleNeedsApproval,
}: StatusFilterBarProps) {
  // Statuses typed by hand (outside the preset list) still get their own pill.
  const statuses = useMemo(() => {
    const custom_statuses = Object.keys(status_counts ?? {})
      .filter((status) => status !== "" && !LINK_BUILDING_ORDER_STATUSES.includes(status))
      .sort((a, b) => a.localeCompare(b));
    return [...LINK_BUILDING_ORDER_STATUSES, ...custom_statuses];
  }, [status_counts]);

  const is_all_active = active_status === "" && !needs_approval_active;

  const pill_base_class =
    "flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";
  const pill_idle_class =
    "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800";
  const pill_active_class =
    "border-gray-900 bg-gray-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-gray-900";
  const count_idle_class = "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  const count_active_class = "bg-white/20 text-white dark:bg-gray-900/10 dark:text-gray-900";

  return (
    <div
      data-status-filter-bar
      role="radiogroup"
      aria-label="Filter by status"
      className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:thin] sm:px-5"
    >
      <button
        type="button"
        role="radio"
        aria-checked={is_all_active}
        onClick={() => onSelectStatus("")}
        className={`${pill_base_class} ${is_all_active ? pill_active_class : pill_idle_class}`}
      >
        All orders
        {total_count !== null && (
          <span className={`rounded-full px-1.5 py-px text-[11px] tabular-nums ${is_all_active ? count_active_class : count_idle_class}`}>
            {formatCount(total_count)}
          </span>
        )}
      </button>

      {/* Live orders that still need a team lead review, kept up front since it is the most used view. */}
      <button
        type="button"
        role="radio"
        aria-checked={needs_approval_active}
        onClick={onToggleNeedsApproval}
        title="Show Live orders that still need LB TL Approval"
        className={`${pill_base_class} ${
          needs_approval_active
            ? "border-amber-500 bg-amber-500 text-white shadow-sm"
            : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
        }`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        Needs LB TL Approval
        {needs_approval_count !== null && needs_approval_count > 0 && (
          <span
            className={`rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums ${
              needs_approval_active ? "bg-white/25 text-white" : "bg-amber-500 text-white"
            }`}
          >
            {formatCount(needs_approval_count)}
          </span>
        )}
      </button>

      <span className="mx-1 h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />

      {statuses.map((status) => {
        const is_active = active_status === status && !needs_approval_active;
        const count = status_counts ? status_counts[status] ?? 0 : null;
        const is_empty = count === 0 && !is_active;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={is_active}
            onClick={() => onSelectStatus(is_active ? "" : status)}
            title={is_active ? `Showing ${status} orders, click again to show all` : `Show ${status} orders`}
            className={`${pill_base_class} ${is_active ? pill_active_class : pill_idle_class}${is_empty ? " opacity-55" : ""}`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[status] ?? DEFAULT_STATUS_DOT_CLASS}`} aria-hidden="true" />
            {status}
            {count !== null && (
              <span className={`rounded-full px-1.5 py-px text-[11px] tabular-nums ${is_active ? count_active_class : count_idle_class}`}>
                {formatCount(count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
