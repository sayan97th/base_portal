"use client";

import { useEffect, useState } from "react";
import { deliverablesService } from "@/services/client/deliverables.service";
import type { DeliverableSummary, DeliverableListFilters } from "@/types/client/deliverables";
import type { ClientPaginatedResponse, OrderStatus } from "@/types/client/link-building";
import DeliverableOrderCard from "./DeliverableOrderCard";

// ── Icons ─────────────────────────────────────────────────────────────────────

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

const EmptyIcon = () => (
  <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
);

// ── Status filter options ─────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: { label: string; value: OrderStatus | "" }[] = [
  { label: "All Statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Payment Pending", value: "payment_pending" },
];

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="h-1 w-full animate-pulse bg-gray-100 dark:bg-gray-800" />
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="space-y-2">
                  <div className="h-4 w-56 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-36 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-28 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <div className="h-5 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="mt-3">
              <div className="h-1.5 w-full animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800">
            <div className="bg-gray-50/80 px-5 py-2.5 dark:bg-white/[0.02]">
              <div className="h-3 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="space-y-2 p-5">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-4 w-full animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

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
        Showing{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">{from}–{to}</span>{" "}
        of{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>{" "}
        deliverables
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

// ── Main page ─────────────────────────────────────────────────────────────────

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

  function clearFilters() {
    setSearch("");
    setSearchInput("");
    setStatusFilter("");
    setCurrentPage(1);
  }

  const has_filters = Boolean(search || status_filter);

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
                Track your order details and link delivery status at a glance. Each card auto-expands to show placement-level progress.
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
              placeholder="Search by title or order ID…"
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

        {has_filters && (
          <button
            onClick={clearFilters}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading */}
      {is_loading && <LoadingSkeleton />}

      {/* Error */}
      {!is_loading && error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-error-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
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
            <p className="text-base font-semibold text-gray-600 dark:text-gray-300">No deliverables found</p>
            <p className="mt-1 max-w-sm text-sm text-gray-400 dark:text-gray-500">
              {has_filters
                ? "No results match your current filters. Try adjusting your search."
                : "Your deliverable reports will appear here once your orders are processed."}
            </p>
            {has_filters && (
              <button
                onClick={clearFilters}
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
          {/* List header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Deliverables
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {result.total}
              </span>
            </h2>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            {result.data.map((item) => (
              <DeliverableOrderCard
                key={item.order_id}
                item={item}
                default_expanded={true}
              />
            ))}
          </div>

          {/* Pagination */}
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
