"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { linkBuildingService } from "@/services/client/link-building.service";
import { useDebounce } from "@/hooks/useDebounce";
import type { LinkBuildingOrderSummary, OrderStatus } from "@/types/client/link-building";

const PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function buildPageButtons(current: number, last: number): (number | "...")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(last - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < last - 2) pages.push("...");
  pages.push(last);
  return pages;
}

function getStatusConfig(status: OrderStatus): {
  color: "warning" | "info" | "success" | "error";
  label: string;
  dot: string;
} {
  switch (status) {
    case "pending":
      return { color: "warning", label: "Pending", dot: "bg-warning-500" };
    case "processing":
      return { color: "info", label: "Processing", dot: "bg-blue-light-500" };
    case "completed":
      return { color: "success", label: "Completed", dot: "bg-success-500" };
    case "cancelled":
      return { color: "error", label: "Cancelled", dot: "bg-error-500" };
  }
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

const BoltIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const ReportIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const UpdateDotIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 6 }).map((__, j) => (
            <TableCell key={j} className="py-3">
              <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<LinkBuildingOrderSummary[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const debounced_search = useDebounce(search, 400);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await linkBuildingService.fetchMyOrders({
        page,
        per_page: PER_PAGE,
        search: debounced_search || undefined,
      });
      setOrders(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch {
      setError("We couldn't load your orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debounced_search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const range_start = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const range_end = Math.min(page * PER_PAGE, total);
  const page_buttons = buildPageButtons(page, last_page);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            My Orders
          </h1>
          {!is_loading && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {total}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M7.25 1.5C4.075 1.5 1.5 4.075 1.5 7.25C1.5 10.425 4.075 13 7.25 13C10.425 13 13 10.425 13 7.25C13 4.075 10.425 1.5 7.25 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M11.5 11.5L14.5 14.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Order title, status"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500"
            />
          </div>

          {/* New Order button */}
          <Link
            href="/link-building"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Order
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
          <button
            onClick={loadOrders}
            className="mt-1 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              {["Order", "Status", "Date", "Links", "Total", "Actions"].map((col) => (
                <TableCell
                  key={col}
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {is_loading ? (
              <TableSkeleton />
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                >
                  {total === 0 && !search
                    ? "No orders yet. Place your first order to get started."
                    : "No orders match your search."}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const status_config = getStatusConfig(order.status);
                const is_active = order.status === "pending" || order.status === "processing";
                const has_updates = order.updates_count > 0;

                return (
                  <TableRow
                    key={order.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/2"
                  >
                    {/* Order name + ID */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        {is_active && (
                          <div className="relative flex h-2 w-2 shrink-0">
                            {order.status === "processing" && (
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
                            )}
                            <span className={`relative inline-flex h-2 w-2 rounded-full ${
                              order.status === "processing" ? "bg-blue-500" : "bg-warning-500"
                            }`} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {order.order_title ?? "Link Building Order"}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status + update count */}
                    <TableCell className="whitespace-nowrap py-3">
                      <div className="flex flex-col gap-1.5">
                        <Badge
                          variant="light"
                          size="sm"
                          color={status_config.color}
                          startIcon={
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${status_config.dot}`} />
                          }
                        >
                          {status_config.label}
                        </Badge>
                        {has_updates && (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <UpdateDotIcon />
                            {order.updates_count} update{order.updates_count !== 1 ? "s" : ""}
                            {order.last_update_at && (
                              <span className="text-gray-400 dark:text-gray-500">
                                · {formatRelativeTime(order.last_update_at)}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {formatDate(order.created_at)}
                    </TableCell>

                    {/* Links */}
                    <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {order.items_count}
                    </TableCell>

                    {/* Total */}
                    <TableCell className="whitespace-nowrap py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {formatCurrency(order.total_amount)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="whitespace-nowrap py-3">
                      <div className="flex items-center gap-2">
                        {order.status !== "cancelled" && (
                          <Link
                            href={`/link-building/orders/${order.id}/tracking`}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                              is_active
                                ? "bg-brand-500 text-white hover:bg-brand-600"
                                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
                            }`}
                          >
                            <BoltIcon />
                            Track
                          </Link>
                        )}
                        <Link
                          href={`/link-building/orders/${order.id}/report`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <ReportIcon />
                          Report
                        </Link>
                        <Link
                          href={`/link-building/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-coral-200 bg-coral-50 px-2.5 py-1.5 text-xs font-medium text-coral-600 transition-colors hover:bg-coral-500 hover:text-white dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-400 dark:hover:bg-coral-500 dark:hover:text-white"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 2.5C3.5 2.5 1.5 6 1.5 6C1.5 6 3.5 9.5 6 9.5C8.5 9.5 10.5 6 10.5 6C10.5 6 8.5 2.5 6 2.5Z" stroke="currentColor" strokeWidth="1.2" />
                            <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                          View
                          <ArrowRightIcon />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!is_loading && !error && total > 0 && (
        <div className="flex flex-col gap-3 border-t border-gray-200 px-1 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {range_start}–{range_end}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {total}
            </span>{" "}
            results &nbsp;·&nbsp; Page{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {page}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {last_page}
            </span>
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
                <span
                  key={`ellipsis-${i}`}
                  className="flex h-8 w-8 items-center justify-center text-xs text-gray-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={btn}
                  onClick={() => setPage(btn as number)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                    btn === page
                      ? "border-coral-500 bg-coral-500 text-white"
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
  );
};

export default MyOrdersPage;
