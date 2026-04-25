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
import { newContentService } from "@/services/client/new-content.service";
import { contentOptimizationService } from "@/services/client/content-optimization.service";
import { contentBriefsService } from "@/services/client/content-briefs.service";
import { useDebounce } from "@/hooks/useDebounce";
import type { CartProductType } from "@/types/client/unified-cart";

// ─── Unified order type ───────────────────────────────────────────────────────

type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

interface UnifiedOrder {
  id: string;
  product_type: CartProductType;
  label: string;
  total_amount: number;
  status: string;
  created_at: string;
  items_count: number;
  updates_count?: number;
  last_update_at?: string | null;
}

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

function getStatusConfig(status: string): {
  color: "warning" | "info" | "success" | "error";
  label: string;
  dot: string;
} {
  switch (status as OrderStatus) {
    case "pending":
      return { color: "warning", label: "Pending", dot: "bg-warning-500" };
    case "processing":
      return { color: "info", label: "Processing", dot: "bg-blue-light-500" };
    case "completed":
      return { color: "success", label: "Completed", dot: "bg-success-500" };
    case "cancelled":
      return { color: "error", label: "Cancelled", dot: "bg-error-500" };
    default:
      return { color: "info", label: status, dot: "bg-gray-400" };
  }
}

const PRODUCT_TYPE_CONFIG: Record<
  CartProductType,
  { label: string; color: string; bg: string }
> = {
  link_building: {
    label: "Link Building",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-500/20",
  },
  new_content: {
    label: "New Content",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-100 dark:bg-blue-500/20",
  },
  content_optimization: {
    label: "Content Optimization",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-100 dark:bg-emerald-500/20",
  },
  content_brief: {
    label: "Content Briefs",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-500/20",
  },
};

function getDetailLink(order: UnifiedOrder): string {
  switch (order.product_type) {
    case "link_building":
      return `/link-building/orders/${order.id}`;
    case "content_optimization":
      return `/content-refresh/content-optimizations`;
    case "new_content":
      return `/new-content`;
    case "content_brief":
      return `/content-refresh/content-briefs`;
  }
}

function getTrackingLink(order: UnifiedOrder): string | null {
  if (order.product_type === "link_building") {
    return `/link-building/orders/${order.id}/tracking`;
  }
  return null;
}

function getReportLink(order: UnifiedOrder): string | null {
  if (order.product_type === "link_building") {
    return `/link-building/orders/${order.id}/report`;
  }
  return null;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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

const UpdateDotIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j} className="py-3">
              <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterTab = "all" | CartProductType;

const filter_tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "link_building", label: "Link Building" },
  { key: "new_content", label: "New Content" },
  { key: "content_optimization", label: "Content Optimization" },
  { key: "content_brief", label: "Content Briefs" },
];

const PER_PAGE = 10;

// ─── Main component ────────────────────────────────────────────────────────────

const MyOrdersPage: React.FC = () => {
  const [all_orders, setAllOrders] = useState<UnifiedOrder[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [active_filter, setActiveFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const debounced_search = useDebounce(search, 400);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (filter: FilterTab) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [lb_result, nc_result, co_result, cb_result] =
        await Promise.allSettled([
          linkBuildingService.fetchMyOrders({ per_page: 200 }),
          newContentService.fetchMyOrders(),
          contentOptimizationService.fetchMyOrders(),
          contentBriefsService.fetchMyOrders(),
        ]);

      const merged: UnifiedOrder[] = [];

      if (lb_result.status === "fulfilled") {
        lb_result.value.data.forEach((o) =>
          merged.push({
            id: o.id,
            product_type: "link_building",
            label: o.order_title ?? "Link Building Order",
            total_amount: o.total_amount,
            status: o.status,
            created_at: o.created_at,
            items_count: o.items_count,
            updates_count: o.updates_count,
            last_update_at: o.last_update_at,
          })
        );
      }

      if (nc_result.status === "fulfilled") {
        nc_result.value.forEach((o) =>
          merged.push({
            id: o.id,
            product_type: "new_content",
            label: o.order_notes ?? "New Content Order",
            total_amount: o.total_amount,
            status: o.status,
            created_at: o.created_at,
            items_count: o.items_count,
          })
        );
      }

      if (co_result.status === "fulfilled") {
        co_result.value.forEach((o) =>
          merged.push({
            id: o.id,
            product_type: "content_optimization",
            label: o.order_notes ?? "Content Optimization Order",
            total_amount: o.total_amount,
            status: o.status,
            created_at: o.created_at,
            items_count: o.items_count,
          })
        );
      }

      if (cb_result.status === "fulfilled") {
        cb_result.value.forEach((o) =>
          merged.push({
            id: o.id,
            product_type: "content_brief",
            label: o.order_notes ?? "Content Briefs Order",
            total_amount: o.total_amount,
            status: o.status,
            created_at: o.created_at,
            items_count: o.items_count,
          })
        );
      }

      merged.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAllOrders(merged);
    } catch {
      setError("We couldn't load your orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered_orders = React.useMemo(() => {
    let result = all_orders;

    if (active_filter !== "all") {
      result = result.filter((o) => o.product_type === active_filter);
    }

    if (debounced_search.trim()) {
      const query = debounced_search.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.label.toLowerCase().includes(query) ||
          o.status.toLowerCase().includes(query) ||
          o.id.toLowerCase().includes(query) ||
          PRODUCT_TYPE_CONFIG[o.product_type].label.toLowerCase().includes(query)
      );
    }

    return result;
  }, [all_orders, active_filter, debounced_search]);

  const total = filtered_orders.length;
  const last_page = Math.max(1, Math.ceil(total / PER_PAGE));
  const safe_page = Math.min(page, last_page);
  const paginated_orders = filtered_orders.slice(
    (safe_page - 1) * PER_PAGE,
    safe_page * PER_PAGE
  );
  const range_start = total === 0 ? 0 : (safe_page - 1) * PER_PAGE + 1;
  const range_end = Math.min(safe_page * PER_PAGE, total);
  const page_buttons = buildPageButtons(safe_page, last_page);

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
              placeholder="Search orders…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500"
            />
          </div>

          {/* New Order button */}
          <Link
            href="/store"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Order
          </Link>
        </div>
      </div>

      {/* Product type filters */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {filter_tabs.map((tab) => {
          const is_active = active_filter === tab.key;
          const count =
            tab.key === "all"
              ? all_orders.length
              : all_orders.filter((o) => o.product_type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                is_active
                  ? "bg-gray-800 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  is_active
                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-gray-900"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
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
              {["Order", "Service", "Status", "Date", "Items", "Total", "Actions"].map(
                (col) => (
                  <TableCell
                    key={col}
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    {col}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {is_loading ? (
              <TableSkeleton />
            ) : paginated_orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                >
                  {total === 0 && !search && active_filter === "all"
                    ? "No orders yet. Place your first order to get started."
                    : "No orders match your search."}
                </TableCell>
              </TableRow>
            ) : (
              paginated_orders.map((order) => {
                const status_config = getStatusConfig(order.status);
                const is_active =
                  order.status === "pending" || order.status === "processing";
                const has_updates =
                  (order.updates_count ?? 0) > 0;
                const type_config = PRODUCT_TYPE_CONFIG[order.product_type];
                const tracking_link = getTrackingLink(order);
                const report_link = getReportLink(order);
                const detail_link = getDetailLink(order);

                return (
                  <TableRow
                    key={`${order.product_type}-${order.id}`}
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
                            <span
                              className={`relative inline-flex h-2 w-2 rounded-full ${
                                order.status === "processing"
                                  ? "bg-blue-500"
                                  : "bg-warning-500"
                              }`}
                            />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {order.label}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Product type badge */}
                    <TableCell className="whitespace-nowrap py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${type_config.bg} ${type_config.color}`}
                      >
                        {type_config.label}
                      </span>
                    </TableCell>

                    {/* Status + update count */}
                    <TableCell className="whitespace-nowrap py-3">
                      <div className="flex flex-col gap-1.5">
                        <Badge
                          variant="light"
                          size="sm"
                          color={status_config.color}
                          startIcon={
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${status_config.dot}`}
                            />
                          }
                        >
                          {status_config.label}
                        </Badge>
                        {has_updates && (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <UpdateDotIcon />
                            {order.updates_count} update
                            {order.updates_count !== 1 ? "s" : ""}
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

                    {/* Items */}
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
                        {tracking_link && order.status !== "cancelled" && (
                          <Link
                            href={tracking_link}
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
                        {report_link && (
                          <Link
                            href={report_link}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            <ReportIcon />
                            Report
                          </Link>
                        )}
                        <Link
                          href={detail_link}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-coral-200 bg-coral-50 px-2.5 py-1.5 text-xs font-medium text-coral-600 transition-colors hover:bg-coral-500 hover:text-white dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-400 dark:hover:bg-coral-500 dark:hover:text-white"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M6 2.5C3.5 2.5 1.5 6 1.5 6C1.5 6 3.5 9.5 6 9.5C8.5 9.5 10.5 6 10.5 6C10.5 6 8.5 2.5 6 2.5Z"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                            <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                          View
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
              {safe_page}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {last_page}
            </span>
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={safe_page === 1}
              className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M7.5 2.5L4.5 6L7.5 9.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
                    btn === safe_page
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
              disabled={safe_page === last_page}
              className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Next
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4.5 2.5L7.5 6L4.5 9.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
