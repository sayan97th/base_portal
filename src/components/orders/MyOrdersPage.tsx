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
import type { LinkBuildingOrderSummary, OrderStatus } from "@/types/client/link-building";

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

const ArrowRightIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const UpdateDotIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <TableRow>
    {Array.from({ length: 6 }).map((_, i) => (
      <TableCell key={i} className="px-5 py-4">
        <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </TableCell>
    ))}
  </TableRow>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
      <svg className="h-7 w-7 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    </div>
    <p className="text-sm font-semibold text-gray-700 dark:text-white/80">No orders yet</p>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Place your first link building order to get started.
    </p>
    <Link
      href="/link-building"
      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
    >
      Order Links
    </Link>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<LinkBuildingOrderSummary[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await linkBuildingService.fetchMyOrders();
      setOrders(data);
    } catch {
      setError("We couldn't load your orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            My Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View and track all your link building orders.
          </p>
        </div>
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

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-5 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
          <button
            onClick={loadOrders}
            className="mt-2 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Orders table ──────────────────────────────────────────────────── */}
      {!error && (
        <div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800/60">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Order
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Status
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Date
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Links
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Total
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      &nbsp;
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {is_loading ? (
                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState />
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
                          className={`transition-colors hover:bg-gray-50 dark:hover:bg-white/2 ${
                            is_active && has_updates
                              ? "bg-blue-50/30 dark:bg-blue-500/3"
                              : ""
                          }`}
                        >
                          {/* Order name + ID */}
                          <TableCell className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {/* Active pulse indicator */}
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
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {order.order_title ?? "Link Building Order"}
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                                  #{order.id.slice(0, 8).toUpperCase()}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Status + update count */}
                          <TableCell className="px-5 py-4">
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
                          <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(order.created_at)}
                          </TableCell>

                          {/* Links */}
                          <TableCell className="px-5 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                            {order.items_count}
                          </TableCell>

                          {/* Total */}
                          <TableCell className="px-5 py-4 text-right text-sm font-medium text-gray-800 dark:text-white/90">
                            {formatCurrency(order.total_amount)}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {/* Track button — only for non-cancelled */}
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

                              {/* View details */}
                              <Link
                                href={`/link-building/orders/${order.id}`}
                                className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                              >
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
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
