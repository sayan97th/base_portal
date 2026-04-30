"use client";

import React, { useCallback, useEffect, useState } from "react";
import { adminSeoSubscriptionService } from "@/services/admin/seo-packages-subscription.service";
import type {
  AdminSeoSubscription,
  AdminSeoSubscriptionFilters,
  SeoSubscriptionStatus,
  SeoSubscriptionSortField,
  SortDirection,
  SeoSubscriptionStats,
} from "@/services/admin/seo-packages-subscription.service";
import { useDebounce } from "@/hooks/useDebounce";
import ActivateSubscriptionModal from "./ActivateSubscriptionModal";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SeoSubscriptionStatus,
  { label: string; badge: string; dot: string }
> = {
  active: {
    label: "Active",
    badge: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    dot: "bg-success-500",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    dot: "bg-error-500",
  },
  expired: {
    label: "Expired",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
    dot: "bg-gray-400",
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  dot_color,
}: {
  label: string;
  value: number;
  dot_color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <span className={`h-2 w-2 rounded-full ${dot_color}`} />
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {label}:{" "}
        <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: SeoSubscriptionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SortIcon({
  field,
  active_field,
  direction,
}: {
  field: SeoSubscriptionSortField;
  active_field?: SeoSubscriptionSortField;
  direction: SortDirection;
}) {
  const is_active = active_field === field;
  return (
    <span className={`ml-1 inline-flex flex-col gap-px transition-opacity ${is_active ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}>
      <svg className={`h-2.5 w-2.5 ${is_active && direction === "asc" ? "text-brand-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <svg className={`-mt-1 h-2.5 w-2.5 ${is_active && direction === "desc" ? "text-brand-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
}

function CancelConfirmModal({
  subscription,
  is_cancelling,
  onConfirm,
  onClose,
}: {
  subscription: AdminSeoSubscription | null;
  is_cancelling: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!subscription) return null;
  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
            Cancel subscription?
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This will cancel the{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {subscription.package.name}
            </span>{" "}
            subscription for{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {subscription.user.first_name} {subscription.user.last_name}
            </span>
            . This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={is_cancelling}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Keep Active
          </button>
          <button
            onClick={onConfirm}
            disabled={is_cancelling}
            className="inline-flex items-center gap-2 rounded-xl bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 disabled:opacity-60"
          >
            {is_cancelling ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Cancelling…
              </>
            ) : (
              "Yes, Cancel"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const SORTABLE_COLS: { field: SeoSubscriptionSortField; label: string }[] = [
  { field: "starts_at", label: "Start Date" },
  { field: "ends_at", label: "End Date" },
  { field: "created_at", label: "Created" },
  { field: "status", label: "Status" },
];

const PER_PAGE = 20;

export default function AdminSeoSubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<AdminSeoSubscription[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);
  const [stats, setStats] = useState<SeoSubscriptionStats | null>(null);

  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<SeoSubscriptionStatus | "">("");
  const [sort_field, setSortField] = useState<SeoSubscriptionSortField>("created_at");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");

  const [show_activate_modal, setShowActivateModal] = useState(false);
  const [cancel_target, setCancelTarget] = useState<AdminSeoSubscription | null>(null);
  const [is_cancelling, setIsCancelling] = useState(false);

  const debounced_search = useDebounce(search_input, 450);

  const fetchSubscriptions = useCallback(async (filters: AdminSeoSubscriptionFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminSeoSubscriptionService.fetchSubscriptions(filters);
      setSubscriptions(data.data);
      setTotal(data.total);
      setLastPage(data.last_page);
    } catch {
      setError("Failed to load subscriptions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminSeoSubscriptionService.fetchStats();
      setStats(data);
    } catch {
      // stats are non-critical
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchSubscriptions({
      page,
      per_page: PER_PAGE,
      search: debounced_search || undefined,
      status: status_filter || undefined,
      sort_field,
      sort_direction,
    });
  }, [fetchSubscriptions, page, debounced_search, status_filter, sort_field, sort_direction]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function handleStatusFilter(value: SeoSubscriptionStatus | "") {
    setStatusFilter(value);
    setPage(1);
  }

  function handleColumnSort(field: SeoSubscriptionSortField) {
    if (sort_field === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput("");
    setStatusFilter("");
    setSortField("created_at");
    setSortDirection("desc");
    setPage(1);
  }

  async function handleCancelConfirm() {
    if (!cancel_target) return;
    setIsCancelling(true);
    try {
      await adminSeoSubscriptionService.cancelSubscription(cancel_target.id);
      setCancelTarget(null);
      fetchStats();
      fetchSubscriptions({
        page,
        per_page: PER_PAGE,
        search: debounced_search || undefined,
        status: status_filter || undefined,
        sort_field,
        sort_direction,
      });
    } catch {
      setError("Failed to cancel subscription. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  }

  function handleActivateSuccess() {
    setShowActivateModal(false);
    fetchStats();
    fetchSubscriptions({
      page: 1,
      per_page: PER_PAGE,
      sort_field,
      sort_direction,
    });
    setPage(1);
  }

  function formatDate(date_str: string | null) {
    if (!date_str) return "—";
    return new Date(date_str).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const has_active_filters = !!search_input || !!status_filter;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            SEO Subscriptions
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {total > 0 ? `${total} total subscriptions` : "Manage active SEO package subscriptions"}
          </p>
        </div>
        <button
          onClick={() => setShowActivateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Activate Subscription
        </button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="flex flex-wrap gap-3">
          <StatCard label="Total" value={stats.total} dot_color="bg-brand-400" />
          <StatCard label="Active" value={stats.active} dot_color="bg-success-500" />
          <StatCard label="Cancelled" value={stats.cancelled} dot_color="bg-error-500" />
          <StatCard label="Expired" value={stats.expired} dot_color="bg-gray-400" />
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search_input}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by client, email, or package…"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <select
          value={status_filter}
          onChange={(e) => handleStatusFilter(e.target.value as SeoSubscriptionStatus | "")}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        {has_active_filters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Client
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Package
                </th>
                {SORTABLE_COLS.map(({ field, label }) => (
                  <th key={field} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <button
                      onClick={() => handleColumnSort(field)}
                      className="group inline-flex items-center gap-0.5 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {label}
                      <SortIcon field={field} active_field={sort_field} direction={sort_direction} />
                    </button>
                  </th>
                ))}
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {is_loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" style={{ width: `${60 + (j * 13) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {has_active_filters ? "No subscriptions match your filters." : "No subscriptions yet."}
                      </p>
                      {!has_active_filters && (
                        <button
                          onClick={() => setShowActivateModal(true)}
                          className="text-sm font-medium text-brand-500 hover:underline"
                        >
                          Activate the first subscription
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {sub.user.first_name} {sub.user.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{sub.user.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {sub.package.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ${sub.package.price_per_month}/mo
                      </p>
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                      {formatDate(sub.starts_at)}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                      {formatDate(sub.ends_at)}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                      {formatDate(sub.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {sub.status === "active" && (
                        <button
                          onClick={() => setCancelTarget(sub)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {last_page}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(last_page, p + 1))}
                disabled={page === last_page}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {show_activate_modal && (
        <ActivateSubscriptionModal
          onSuccess={handleActivateSuccess}
          onCancel={() => setShowActivateModal(false)}
        />
      )}
      <CancelConfirmModal
        subscription={cancel_target}
        is_cancelling={is_cancelling}
        onConfirm={handleCancelConfirm}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}
