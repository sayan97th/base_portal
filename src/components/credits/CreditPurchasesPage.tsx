"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { creditsService } from "@/services/client/credits.service";
import type { CreditPurchase, CreditPurchaseListResponse } from "@/types/client/credits";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatCredits(amount: number): string {
  return amount.toLocaleString("en-US");
}

function formatDate(date_string: string): string {
  return new Date(date_string).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateFull(date_string: string): string {
  return new Date(date_string).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildPageButtons(current: number, last: number): (number | "...")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(last - 1, current + 1); p++) pages.push(p);
  if (current < last - 2) pages.push("...");
  pages.push(last);
  return pages;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CreditPurchase["status"] }) {
  const map: Record<CreditPurchase["status"], { label: string; cls: string }> = {
    completed: {
      label: "Completed",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    },
    pending: {
      label: "Pending",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    },
    failed: {
      label: "Failed",
      cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    },
    refunded: {
      label: "Refunded",
      cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    },
  };
  const { label, cls } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PurchaseRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      {[60, 130, 80, 80, 70].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className={`h-4 w-${w / 4} animate-pulse rounded bg-gray-100 dark:bg-gray-800`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ── Purchase Row ──────────────────────────────────────────────────────────────

function PurchaseRow({ purchase }: { purchase: CreditPurchase }) {
  return (
    <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-white/[0.02]">
      {/* Date */}
      <td className="whitespace-nowrap px-5 py-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white" title={formatDateFull(purchase.created_at)}>
          {formatDate(purchase.created_at)}
        </p>
      </td>

      {/* Package */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/15">
            <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{purchase.package_name}</p>
            {purchase.payment_intent_id && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400 dark:text-gray-500">
                {purchase.payment_intent_id.slice(0, 20)}…
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Credits */}
      <td className="whitespace-nowrap px-5 py-4">
        <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          +{formatCredits(purchase.credits_amount)} CR
        </span>
      </td>

      {/* Amount */}
      <td className="whitespace-nowrap px-5 py-4">
        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
          {formatUSD(purchase.amount_paid)}
        </span>
      </td>

      {/* Status */}
      <td className="whitespace-nowrap px-5 py-4">
        <StatusBadge status={purchase.status} />
      </td>
    </tr>
  );
}

// ── Mobile Purchase Card (shown on small screens) ─────────────────────────────

function PurchaseCard({ purchase }: { purchase: CreditPurchase }) {
  return (
    <div className="border-b border-gray-100 px-5 py-4 last:border-0 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/15">
            <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{purchase.package_name}</p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{formatDate(purchase.created_at)}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatCredits(purchase.credits_amount)} CR
          </p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
            {formatUSD(purchase.amount_paid)}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <StatusBadge status={purchase.status} />
        {purchase.payment_intent_id && (
          <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
            {purchase.payment_intent_id.slice(0, 16)}…
          </span>
        )}
      </div>
    </div>
  );
}

// ── Summary Stats ─────────────────────────────────────────────────────────────

function PurchaseSummaryStats({ purchases }: { purchases: CreditPurchase[] }) {
  const completed = purchases.filter((p) => p.status === "completed");
  const total_credits = completed.reduce((s, p) => s + p.credits_amount, 0);
  const total_spent = completed.reduce((s, p) => s + p.amount_paid, 0);

  const stats = [
    {
      label: "Total Purchased",
      value: `+${formatCredits(total_credits)} CR`,
      sub: `${formatUSD(total_credits)} USD equivalent`,
      color: "emerald" as const,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      label: "Total Spent",
      value: formatUSD(total_spent),
      sub: `across ${completed.length} purchase${completed.length !== 1 ? "s" : ""}`,
      color: "brand" as const,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
        </svg>
      ),
    },
    {
      label: "Avg. Savings",
      value: total_spent > 0 ? `${Math.round(((total_credits - total_spent) / total_credits) * 100)}%` : "—",
      sub: "bulk discount applied",
      color: "blue" as const,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" />
        </svg>
      ),
    },
  ];

  const color_map = {
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-100 dark:border-emerald-500/20",
      icon_bg: "bg-emerald-100 dark:bg-emerald-500/20",
      icon_text: "text-emerald-600 dark:text-emerald-400",
      value_text: "text-emerald-700 dark:text-emerald-300",
    },
    brand: {
      bg: "bg-brand-50 dark:bg-brand-500/10",
      border: "border-brand-100 dark:border-brand-500/20",
      icon_bg: "bg-brand-100 dark:bg-brand-500/20",
      icon_text: "text-brand-600 dark:text-brand-400",
      value_text: "text-brand-700 dark:text-brand-300",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-500/10",
      border: "border-blue-100 dark:border-blue-500/20",
      icon_bg: "bg-blue-100 dark:bg-blue-500/20",
      icon_text: "text-blue-600 dark:text-blue-400",
      value_text: "text-blue-700 dark:text-blue-300",
    },
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((s) => {
        const c = color_map[s.color];
        return (
          <div key={s.label} className={`flex items-center gap-4 rounded-2xl border ${c.border} ${c.bg} p-5`}>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.icon_bg}`}>
              <span className={c.icon_text}>{s.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className={`mt-0.5 text-xl font-bold tabular-nums ${c.value_text}`}>{s.value}</p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{s.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const PER_PAGE = 10;

const CreditPurchasesPage: React.FC = () => {
  const [data, setData] = useState<CreditPurchaseListResponse | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadPurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await creditsService.fetchPurchaseHistory(page);
      setData(result);
    } catch {
      setError("Unable to load your purchase history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const purchases = data?.data ?? [];
  const total = data?.total ?? 0;
  const last_page = data?.last_page ?? 1;
  const range_start = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const range_end = Math.min(page * PER_PAGE, total);
  const page_buttons = buildPageButtons(page, last_page);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/credits"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Credits
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Purchase History</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">All your credit purchases</p>
            </div>
          </div>
        </div>

        <Link
          href="/credits/buy"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Buy Credits
        </Link>
      </div>

      {/* ── Summary stats (only when data loaded) ── */}
      {!is_loading && !error && purchases.length > 0 && (
        <PurchaseSummaryStats purchases={purchases} />
      )}
      {is_loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
        {/* Table header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Credit Purchases</h2>
            {!is_loading && total > 0 && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {total} purchase{total !== 1 ? "s" : ""} on your account
              </p>
            )}
          </div>
        </div>

        {/* Loading state */}
        {is_loading && (
          <>
            {/* Desktop table skeleton */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["Date", "Package", "Credits", "Amount", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => <PurchaseRowSkeleton key={i} />)}
                </tbody>
              </table>
            </div>
            {/* Mobile skeleton */}
            <div className="sm:hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                      <div className="space-y-2">
                        <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                      <div className="h-3 w-14 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Error state */}
        {!is_loading && error && (
          <div className="flex flex-col items-center justify-center px-6 py-14">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">{error}</p>
            <button
              onClick={loadPurchases}
              className="mt-2 text-sm font-medium text-brand-500 underline hover:text-brand-600 dark:text-brand-400"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!is_loading && !error && purchases.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">No purchases yet</p>
            <p className="mt-1.5 max-w-xs text-xs text-gray-400 dark:text-gray-500">
              Your credit purchases will appear here. Buy your first bundle to get started.
            </p>
            <Link
              href="/credits/buy"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Buy Credits
            </Link>
          </div>
        )}

        {/* Desktop table */}
        {!is_loading && !error && purchases.length > 0 && (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {[
                      { label: "Date", cls: "w-28" },
                      { label: "Package", cls: "" },
                      { label: "Credits", cls: "w-32" },
                      { label: "Amount", cls: "w-28" },
                      { label: "Status", cls: "w-28" },
                    ].map(({ label, cls }) => (
                      <th
                        key={label}
                        className={`${cls} px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <PurchaseRow key={purchase.id} purchase={purchase} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden">
              {purchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {!is_loading && !error && total > PER_PAGE && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{range_start}–{range_end}</span>{" "}
              of{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>{" "}
              purchases
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M7.5 2.5L4.5 6L7.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Prev
              </button>

              {page_buttons.map((btn, i) =>
                btn === "..." ? (
                  <span key={`e-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={btn}
                    onClick={() => setPage(btn as number)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                      btn === page
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    {btn}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === last_page}
                className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Next
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditPurchasesPage;
