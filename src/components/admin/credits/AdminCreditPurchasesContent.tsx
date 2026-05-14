"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import { adminCreditsService } from "@/services/admin/credits.service";
import type { AdminCreditPurchase, CreditPurchaseStatus } from "@/types/admin/credits";
import { useDebounce } from "@/hooks/useDebounce";

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Date picker input ──────────────────────────────────────────────────────────

interface DatePickerInputProps {
  value: string;
  placeholder: string;
  max_date?: string;
  min_date?: string;
  on_change: (value: string) => void;
  is_active?: boolean;
}

function DatePickerInput({ value, placeholder, max_date, min_date, on_change, is_active }: DatePickerInputProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const fp_ref = useRef<FlatpickrInstance | null>(null);
  const on_change_ref = useRef(on_change);
  on_change_ref.current = on_change;

  useEffect(() => {
    if (!input_ref.current) return;
    fp_ref.current = flatpickr(input_ref.current, {
      dateFormat: "Y-m-d",
      appendTo: document.body,
      disableMobile: true,
      maxDate: max_date || undefined,
      minDate: min_date || undefined,
      onChange: (_, date_str) => on_change_ref.current(date_str),
    });
    return () => fp_ref.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fp_ref.current) return;
    if (value) fp_ref.current.setDate(value, false);
    else fp_ref.current.clear(false);
  }, [value]);

  useEffect(() => { fp_ref.current?.set("maxDate", max_date || undefined); }, [max_date]);
  useEffect(() => { fp_ref.current?.set("minDate", min_date || undefined); }, [min_date]);

  return (
    <div className="relative">
      <input
        ref={input_ref}
        readOnly
        placeholder={placeholder}
        className={`h-8 w-36 cursor-pointer rounded-lg border px-3 pr-8 text-xs outline-none transition placeholder:text-gray-400 ${
          is_active
            ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
            : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:border-gray-600"
        }`}
      />
      <span className={`pointer-events-none absolute inset-y-0 right-2 flex items-center ${is_active ? "text-brand-500 dark:text-brand-400" : "text-gray-400"}`}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V9.75z" />
        </svg>
      </span>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_MAP: Record<CreditPurchaseStatus, { label: string; cls: string; dot: string }> = {
  completed: {
    label: "Completed",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  pending: {
    label: "Pending",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  failed: {
    label: "Failed",
    cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    dot: "bg-red-500",
  },
  refunded: {
    label: "Refunded",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    dot: "bg-blue-500",
  },
};

function StatusBadge({ status }: { status: CreditPurchaseStatus }) {
  const { label, cls, dot } = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ── Stat cards ─────────────────────────────────────────────────────────────────

interface StatCardData {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: "emerald" | "brand" | "blue" | "violet";
}

const COLOR_MAP = {
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
  violet: {
    bg: "bg-violet-50 dark:bg-violet-500/10",
    border: "border-violet-100 dark:border-violet-500/20",
    icon_bg: "bg-violet-100 dark:bg-violet-500/20",
    icon_text: "text-violet-600 dark:text-violet-400",
    value_text: "text-violet-700 dark:text-violet-300",
  },
};

function StatCard({ label, value, sub, icon, color }: StatCardData) {
  const c = COLOR_MAP[color];
  return (
    <div className={`flex items-center gap-4 rounded-2xl border ${c.border} ${c.bg} p-5`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.icon_bg}`}>
        <span className={c.icon_text}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`mt-0.5 text-xl font-bold tabular-nums ${c.value_text}`}>{value}</p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</p>
      </div>
    </div>
  );
}

// ── Skeleton rows ──────────────────────────────────────────────────────────────

function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      {[130, 60, 110, 80, 80, 70].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ── Mobile purchase card ───────────────────────────────────────────────────────

function MobilePurchaseCard({ purchase }: { purchase: AdminCreditPurchase }) {
  return (
    <div className="border-b border-gray-100 px-5 py-4 last:border-0 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/15">
              <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {purchase.user.first_name} {purchase.user.last_name}
              </p>
              <p className="truncate text-xs text-gray-400 dark:text-gray-500">{purchase.user.email}</p>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{purchase.package_name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(purchase.created_at)}</p>
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

// ── Aggregate summary stats (computed from current page) ──────────────────────

interface SummaryData {
  total_revenue: number;
  total_credits: number;
  completed_count: number;
  total_count: number;
}

function buildSummary(purchases: AdminCreditPurchase[]): SummaryData {
  const completed = purchases.filter((p) => p.status === "completed");
  return {
    total_revenue: completed.reduce((s, p) => s + p.amount_paid, 0),
    total_credits: completed.reduce((s, p) => s + p.credits_amount, 0),
    completed_count: completed.length,
    total_count: purchases.length,
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

const PER_PAGE = 15;

const STATUS_OPTIONS: { value: CreditPurchaseStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export default function AdminCreditPurchasesContent() {
  const [purchases, setPurchases] = useState<AdminCreditPurchase[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);

  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<CreditPurchaseStatus | "">("");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");

  const debounced_search = useDebounce(search_input, 450);

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminCreditsService.fetchAllPurchases({
        page,
        search: debounced_search || undefined,
        status: status_filter || undefined,
        date_from: date_from || undefined,
        date_to: date_to || undefined,
      });
      setPurchases(result.data);
      setTotal(result.total);
      setLastPage(result.last_page);
    } catch {
      setError("Failed to load credit purchases. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debounced_search, status_filter, date_from, date_to]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  function handleSearchChange(value: string) { setSearchInput(value); setPage(1); }
  function handleStatusChange(value: CreditPurchaseStatus | "") { setStatusFilter(value); setPage(1); }
  function handleDateRangeChange(from: string, to: string) { setDateFrom(from); setDateTo(to); setPage(1); }
  function handleClearAll() {
    setSearchInput(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); setPage(1);
  }

  const has_active_filters = search_input !== "" || status_filter !== "" || date_from !== "" || date_to !== "";
  const has_date_range = date_from !== "" || date_to !== "";
  const summary = buildSummary(purchases);
  const range_start = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const range_end = Math.min(page * PER_PAGE, total);
  const page_buttons = buildPageButtons(page, last_page);

  const stat_cards: StatCardData[] = [
    {
      label: "Total Revenue",
      value: formatUSD(summary.total_revenue),
      sub: "from completed purchases",
      color: "emerald",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
        </svg>
      ),
    },
    {
      label: "Credits Issued",
      value: `${formatCredits(summary.total_credits)} CR`,
      sub: "total credits sold (completed)",
      color: "brand",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: "Transactions",
      value: String(total),
      sub: "total purchase records",
      color: "blue",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      ),
    },
    {
      label: "Success Rate",
      value: summary.total_count > 0
        ? `${Math.round((summary.completed_count / summary.total_count) * 100)}%`
        : "—",
      sub: `${summary.completed_count} of ${summary.total_count} completed`,
      color: "violet",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 font-medium transition-colors hover:text-gray-800 dark:hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Orders
            </Link>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">Credit Purchases</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">Credit Purchases</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All credit package purchases made by clients across the platform
          </p>
        </div>

        <Link
          href="/admin/credits/clients"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/8"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
          Client Balances
        </Link>
      </div>

      {/* ── Stat cards ── */}
      {is_loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stat_cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            type="text"
            value={search_input}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by client name or email…"
            className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={status_filter}
            onChange={(e) => handleStatusChange(e.target.value as CreditPurchaseStatus | "")}
            className={`h-9 appearance-none rounded-xl border pl-3 pr-8 text-sm outline-none transition focus:ring-2 ${
              status_filter
                ? "border-brand-400 bg-brand-50 text-brand-700 focus:ring-brand-500/20 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
                : "border-gray-200 bg-white text-gray-600 focus:border-brand-400 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </span>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <DatePickerInput
            value={date_from}
            placeholder="From date"
            max_date={date_to || undefined}
            on_change={(val) => handleDateRangeChange(val, date_to)}
            is_active={date_from !== ""}
          />
          <svg className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <DatePickerInput
            value={date_to}
            placeholder="To date"
            min_date={date_from || undefined}
            on_change={(val) => handleDateRangeChange(date_from, val)}
            is_active={date_to !== ""}
          />
          {has_date_range && (
            <button
              onClick={() => handleDateRangeChange("", "")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Clear dates"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Clear all */}
        {has_active_filters && (
          <button
            onClick={handleClearAll}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-sm font-medium text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear all
          </button>
        )}

        {/* Total count pill */}
        {!is_loading && (
          <span className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400">
            {total.toLocaleString()} {total === 1 ? "record" : "records"}
          </span>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
          <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchPurchases}
            className="ml-auto text-xs font-semibold text-red-600 underline hover:text-red-700 dark:text-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
        {/* Table header bar */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Purchase History</h2>
            {!is_loading && total > 0 && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Showing {range_start}–{range_end} of {total.toLocaleString()} purchases
              </p>
            )}
          </div>
          {has_date_range && (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              {date_from && date_to ? `${date_from} → ${date_to}` : date_from ? `From ${date_from}` : `Until ${date_to}`}
            </span>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {[
                  { label: "Client", cls: "" },
                  { label: "Date", cls: "w-28" },
                  { label: "Package", cls: "" },
                  { label: "Credits", cls: "w-32" },
                  { label: "Amount", cls: "w-28" },
                  { label: "Status", cls: "w-32" },
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
              {is_loading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} />)
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg className="h-7 w-7 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No purchases found</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {has_active_filters ? "Try adjusting your filters" : "No credit purchases have been made yet"}
                        </p>
                      </div>
                      {has_active_filters && (
                        <button
                          onClick={handleClearAll}
                          className="text-xs font-medium text-brand-500 underline hover:text-brand-600 dark:text-brand-400"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                  >
                    {/* Client */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                            {purchase.user.first_name.charAt(0).toUpperCase()}
                            {purchase.user.last_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {purchase.user.first_name} {purchase.user.last_name}
                          </p>
                          <p className="truncate text-xs text-gray-400 dark:text-gray-500">{purchase.user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="whitespace-nowrap px-5 py-4">
                      <p
                        className="text-sm text-gray-600 dark:text-gray-300"
                        title={formatDateFull(purchase.created_at)}
                      >
                        {formatDate(purchase.created_at)}
                      </p>
                    </td>

                    {/* Package */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/15">
                          <svg className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{purchase.package_name}</p>
                          {purchase.payment_intent_id && (
                            <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400 dark:text-gray-500">
                              {purchase.payment_intent_id.slice(0, 22)}…
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden">
          {is_loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-36 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="h-3 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              </div>
            ))
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No purchases found</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {has_active_filters ? "Try adjusting your filters" : "No credit purchases yet"}
              </p>
            </div>
          ) : (
            purchases.map((purchase) => (
              <MobilePurchaseCard key={purchase.id} purchase={purchase} />
            ))
          )}
        </div>

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
}
