"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deliverablesService } from "@/services/client/deliverables.service";
import type { DeliverableSummary, DeliverableListFilters } from "@/types/client/deliverables";
import type { ClientPaginatedResponse } from "@/types/client/link-building";
import type { OrderStatus } from "@/types/client/link-building";

// ── Icons ───────────────────────────────────────────────────────────────────

const ReportIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 16.803z" />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const EmptyIcon = () => (
  <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

// ── Status config ───────────────────────────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-warning-50 dark:bg-warning-500/10",
    text: "text-warning-700 dark:text-warning-400",
    dot: "bg-warning-500",
  },
  processing: {
    label: "Processing",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    bg: "bg-success-50 dark:bg-success-500/10",
    text: "text-success-700 dark:text-success-400",
    dot: "bg-success-500",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-error-50 dark:bg-error-500/10",
    text: "text-error-700 dark:text-error-400",
    dot: "bg-error-500",
  },
};

const STATUS_FILTER_OPTIONS: { label: string; value: OrderStatus | "" }[] = [
  { label: "All Statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 ${className}`} />
);

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Deliverable card ─────────────────────────────────────────────────────────

interface DeliverableCardProps {
  item: DeliverableSummary;
}

function DeliverableCard({ item }: DeliverableCardProps) {
  const status_cfg = ORDER_STATUS_CONFIG[item.status];
  const delivery_pct =
    item.total_links > 0
      ? Math.round((item.live_count / item.total_links) * 100)
      : 0;

  return (
    <div className="group rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left — icon + title + meta */}
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <ReportIcon />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {item.order_title ?? `Order ${item.order_id.slice(0, 8).toUpperCase()}`}
              </p>
              <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                {item.order_id.slice(0, 8).toUpperCase()} · Created {formatDate(item.created_at)}
              </p>
            </div>
          </div>

          {/* Right — stats + badge + button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Link counts */}
            <div className="hidden items-center gap-4 sm:flex">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <LinkIcon />
                <span className="font-medium text-gray-800 dark:text-gray-200">{item.total_links}</span>
                <span>total</span>
              </div>
              <div className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
             
            </div>

            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status_cfg.bg} ${status_cfg.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
              {status_cfg.label}
            </span>

            {/* View report button */}
            <Link
              href={`/link-building/orders/${item.order_id}/report`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              View Report
              <ArrowRightIcon />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  onPageChange: (page: number) => void;
}

function Pagination({ current_page, last_page, total, per_page, onPageChange }: PaginationProps) {
  const from = (current_page - 1) * per_page + 1;
  const to = Math.min(current_page * per_page, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium text-gray-700 dark:text-gray-300">{from}–{to}</span> of{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span> deliverables
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(current_page - 1)}
          disabled={current_page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
        >
          <ChevronLeftIcon />
        </button>
        {Array.from({ length: last_page }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === last_page || Math.abs(p - current_page) <= 1)
          .reduce<(number | "…")[]>((acc, p, idx, arr) => {
            if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
              acc.push("…");
            }
            acc.push(p);
            return acc;
          }, [])
          .map((p, idx) =>
            p === "…" ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  p === current_page
                    ? "bg-brand-500 text-white"
                    : "border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                }`}
              >
                {p}
              </button>
            )
          )}
        <button
          onClick={() => onPageChange(current_page + 1)}
          disabled={current_page >= last_page}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}

// ── Main page component ──────────────────────────────────────────────────────

export default function DeliverablesPage() {
  const [result, setResult] = useState<ClientPaginatedResponse<DeliverableSummary> | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<OrderStatus | "">("");
  const [current_page, setCurrentPage] = useState(1);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const filters: DeliverableListFilters = {
          page: current_page,
          per_page: 10,
          search: search || undefined,
          status: status_filter || undefined,
        };
        const data = await deliverablesService.fetchDeliverables(filters);
        setResult(data);
      } catch {
        setError("Unable to load deliverables. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [current_page, search, status_filter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(search_input);
    setCurrentPage(1);
  }

  function handleStatusChange(value: OrderStatus | "") {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="h-1 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
        <div className="p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <ReportIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Deliverables</h1>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                All your order reports and link delivery progress in one place.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search by title or order ID..."
              value={search_input}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Search
          </button>
        </form>

        <select
          value={status_filter}
          onChange={(e) => handleStatusChange(e.target.value as OrderStatus | "")}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {is_loading && <LoadingSkeleton />}

      {/* Error */}
      {!is_loading && error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-error-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-error-700 dark:text-error-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm font-medium text-error-600 underline underline-offset-2 hover:text-error-700 dark:text-error-400"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!is_loading && !error && result && result.data.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-gray-200 dark:text-gray-700">
            <EmptyIcon />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-600 dark:text-gray-300">
              No deliverables found
            </p>
            <p className="mt-1 max-w-sm text-sm text-gray-400 dark:text-gray-500">
              {search || status_filter
                ? "No results match your current filters. Try adjusting your search."
                : "Your deliverable reports will appear here once your orders are processed."}
            </p>
            {(search || status_filter) && (
              <button
                onClick={() => { setSearch(""); setSearchInput(""); setStatusFilter(""); setCurrentPage(1); }}
                className="mt-3 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Deliverables list */}
      {!is_loading && !error && result && result.data.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Deliverables ({result.total})
            </h2>
          </div>

          <div className="space-y-3">
            {result.data.map((item) => (
              <DeliverableCard key={item.order_id} item={item} />
            ))}
          </div>

          {result.last_page > 1 && (
            <Pagination
              current_page={result.current_page}
              last_page={result.last_page}
              total={result.total}
              per_page={result.per_page}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
