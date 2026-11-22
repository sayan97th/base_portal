"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminSeoSubscriptionService } from "@/services/admin/seo-packages-subscription.service";
import type {
  ActivateSeoSubscriptionResult,
  AdminSeoSubscription,
  AdminSeoSubscriptionFilters,
  SeoSubscriptionPaymentStatus,
  SeoSubscriptionStatus,
  SeoSubscriptionSortField,
  SortDirection,
  SeoSubscriptionStats,
} from "@/services/admin/seo-packages-subscription.service";
import { useDebounce } from "@/hooks/useDebounce";
import ActivateSubscriptionModal from "./ActivateSubscriptionModal";
import { clientName, formatDate, formatMoney, formatMoneyCompact } from "./subscription-format";
import styles from "./SeoSubscriptionBilling.module.scss";

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

const SORTABLE_COLS: { field: SeoSubscriptionSortField; label: string }[] = [
  { field: "next_billing_date", label: "Next charge" },
  { field: "starts_at", label: "Start Date" },
  { field: "status", label: "Status" },
];

const PER_PAGE = 20;
const COLUMN_COUNT = 7;

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
  is_featured = false,
}: {
  label: string;
  value: string;
  hint?: string;
  is_featured?: boolean;
}) {
  return (
    <div className={`${styles.kpi} ${is_featured ? styles.isFeatured : ""}`}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiValue}>{value}</p>
      {hint && <p className={styles.kpiHint}>{hint}</p>}
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

function BillingCell({ subscription }: { subscription: AdminSeoSubscription }) {
  if (subscription.status !== "active") {
    return <span className="text-xs text-gray-400">No upcoming charges</span>;
  }

  if (subscription.payment_status === "past_due") {
    const retry_at = subscription.last_charge?.next_retry_at;
    return (
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning-500" />
          Past due
        </span>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {retry_at ? `Retry ${formatDate(retry_at, { month: "short", day: "numeric" })}` : "Needs attention"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-medium text-gray-900 dark:text-white">{formatDate(subscription.next_billing_date)}</p>
      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        {subscription.auto_renew ? (
          <>
            <svg className="h-3 w-3 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Auto renew
          </>
        ) : (
          "Manual billing"
        )}
      </p>
    </div>
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminSeoSubscriptionsContent() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<AdminSeoSubscription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string; subscription_id: number } | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);
  const [stats, setStats] = useState<SeoSubscriptionStats | null>(null);
  const [loaded_key, setLoadedKey] = useState<string | null>(null);
  const [refresh_token, setRefreshToken] = useState(0);

  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<SeoSubscriptionStatus | "">("");
  const [payment_filter, setPaymentFilter] = useState<SeoSubscriptionPaymentStatus | "">("");
  const [sort_field, setSortField] = useState<SeoSubscriptionSortField>("created_at");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");
  const [show_activate_modal, setShowActivateModal] = useState(false);

  const debounced_search = useDebounce(search_input, 450);

  const filters = useMemo<AdminSeoSubscriptionFilters>(
    () => ({
      page,
      per_page: PER_PAGE,
      search: debounced_search || undefined,
      status: status_filter || undefined,
      payment_status: payment_filter || undefined,
      sort_field,
      sort_direction,
    }),
    [page, debounced_search, status_filter, payment_filter, sort_field, sort_direction]
  );
  const query_key = `${JSON.stringify(filters)}#${refresh_token}`;
  const is_loading = loaded_key !== query_key;

  useEffect(() => {
    let is_current = true;
    adminSeoSubscriptionService
      .fetchSubscriptions(filters)
      .then((data) => {
        if (!is_current) return;
        setSubscriptions(data.data);
        setTotal(data.total);
        setLastPage(data.last_page);
        setError(null);
      })
      .catch(() => is_current && setError("Failed to load subscriptions. Please try again."))
      .finally(() => is_current && setLoadedKey(query_key));
    return () => {
      is_current = false;
    };
  }, [filters, query_key]);

  useEffect(() => {
    let is_current = true;
    adminSeoSubscriptionService
      .fetchStats()
      .then((data) => is_current && setStats(data))
      .catch(() => {
        // stats are non critical
      });
    return () => {
      is_current = false;
    };
  }, [refresh_token]);

  function handleColumnSort(field: SeoSubscriptionSortField) {
    if (sort_field === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "next_billing_date" ? "asc" : "desc");
    }
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput("");
    setStatusFilter("");
    setPaymentFilter("");
    setSortField("created_at");
    setSortDirection("desc");
    setPage(1);
  }

  function handleActivateSuccess(result: ActivateSeoSubscriptionResult) {
    setShowActivateModal(false);
    const name = clientName(result.data);

    if (result.charge_result && !result.charge_result.success) {
      setNotice({
        tone: "warning",
        text: `Subscription activated for ${name}, but the first charge failed: ${result.charge_result.message}`,
        subscription_id: result.data.id,
      });
    } else {
      setNotice({
        tone: "success",
        text: result.charge_result?.success
          ? `Subscription activated for ${name}. ${result.charge_result.message}`
          : `Subscription activated for ${name} at ${formatMoneyCompact(result.data.monthly_price)}/month.`,
        subscription_id: result.data.id,
      });
    }

    setPage(1);
    setRefreshToken((token) => token + 1);
  }

  const has_active_filters = !!search_input || !!status_filter || !!payment_filter;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">SEO Subscriptions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Custom pricing, automatic monthly renewals and payment history for every client
          </p>
        </div>
        <button
          onClick={() => setShowActivateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Activate Subscription
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <KpiCard
              is_featured
              label="Monthly recurring"
              value={formatMoneyCompact(stats.monthly_recurring)}
              hint={`${stats.active} active subscription${stats.active === 1 ? "" : "s"}`}
            />
          </div>
          <KpiCard label="Auto renew" value={String(stats.auto_renew)} hint={`${stats.renewing_next_7_days} renewing in 7 days`} />
          <KpiCard label="Collected this month" value={formatMoneyCompact(stats.collected_this_month)} hint="Subscription payments" />
          <KpiCard label="Past due" value={String(stats.past_due)} hint={stats.past_due > 0 ? "Need attention" : "All payments current"} />
          <KpiCard label="Cancelled / expired" value={`${stats.cancelled} / ${stats.expired}`} hint={`${stats.total} total`} />
        </div>
      )}

      {/* Notice */}
      {notice && (
        <div
          className={`flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
            notice.tone === "success"
              ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400"
              : "border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-400"
          }`}
        >
          <span>{notice.text}</span>
          <div className="flex shrink-0 items-center gap-3">
            <Link href={`/admin/seo-packages-subscriptions/${notice.subscription_id}`} className="font-semibold underline-offset-2 hover:underline">
              Manage subscription
            </Link>
            <button onClick={() => setNotice(null)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Search by client, email, or plan…"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <select
          value={status_filter}
          onChange={(e) => {
            setStatusFilter(e.target.value as SeoSubscriptionStatus | "");
            setPage(1);
          }}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={payment_filter}
          onChange={(e) => {
            setPaymentFilter(e.target.value as SeoSubscriptionPaymentStatus | "");
            setPage(1);
          }}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <option value="">All Payments</option>
          <option value="past_due">Past due</option>
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
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Client</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <button onClick={() => handleColumnSort("monthly_price")} className="group inline-flex items-center gap-0.5 uppercase hover:text-gray-700 dark:hover:text-gray-200">
                    Plan and price
                    <SortIcon field="monthly_price" active_field={sort_field} direction={sort_direction} />
                  </button>
                </th>
                {SORTABLE_COLS.map(({ field, label }) => (
                  <th key={field} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <button onClick={() => handleColumnSort(field)} className="group inline-flex items-center gap-0.5 uppercase hover:text-gray-700 dark:hover:text-gray-200">
                      {label}
                      <SortIcon field={field} active_field={sort_field} direction={sort_direction} />
                    </button>
                  </th>
                ))}
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Last payment</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {is_loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: COLUMN_COUNT }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" style={{ width: `${60 + ((j * 13) % 40)}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="px-5 py-16 text-center">
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
                        <button onClick={() => setShowActivateModal(true)} className="text-sm font-medium text-brand-500 hover:underline">
                          Activate the first subscription
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const detail_href = `/admin/seo-packages-subscriptions/${sub.id}`;
                  const last_charge = sub.last_charge;
                  return (
                    <tr
                      key={sub.id}
                      onClick={() => router.push(detail_href)}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{clientName(sub)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{sub.user.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">{sub.plan_name}</p>
                          {sub.pricing_type === "custom" && <span className={styles.customBadge}>Custom</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatMoneyCompact(sub.monthly_price)}/mo
                          {sub.pricing_type === "custom" && sub.package && sub.package.price_per_month !== sub.monthly_price && (
                            <span className="ml-1.5 text-gray-400 line-through">{formatMoneyCompact(sub.package.price_per_month)}</span>
                          )}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <BillingCell subscription={sub} />
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{formatDate(sub.starts_at)}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="px-5 py-4">
                        {last_charge ? (
                          <div>
                            <p className={`text-xs font-semibold ${last_charge.status === "succeeded" ? "text-success-600 dark:text-success-400" : last_charge.status === "failed" ? "text-error-600 dark:text-error-400" : "text-warning-600"}`}>
                              {last_charge.status === "succeeded" ? "Paid" : last_charge.status === "failed" ? "Failed" : "Pending"} · {formatMoney(last_charge.amount)}
                            </p>
                            <p className="text-xs text-gray-400">{last_charge.period_label}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No payments yet</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={detail_href}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          Manage
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {last_page} · {total} subscriptions
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

      {show_activate_modal && (
        <ActivateSubscriptionModal onSuccess={handleActivateSuccess} onCancel={() => setShowActivateModal(false)} />
      )}
    </div>
  );
}
