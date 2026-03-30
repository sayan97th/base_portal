"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import type { LinkBuildingOrderSummary, OrderStatus } from "@/types/client/link-building";

interface Props {
  orders: LinkBuildingOrderSummary[];
  is_loading: boolean;
}

type DisplayStatus =
  | "Live"
  | "Writing article"
  | "New request"
  | "Cancelled"
  | "Processing";

const api_to_display: Record<OrderStatus, DisplayStatus> = {
  pending: "New request",
  processing: "Writing article",
  completed: "Live",
  cancelled: "Cancelled",
};

const status_badge_color: Record<
  DisplayStatus,
  "success" | "error" | "warning" | "info" | "primary"
> = {
  Live: "success",
  "Writing article": "warning",
  "New request": "info",
  Cancelled: "error",
  Processing: "warning",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortId(id: string): string {
  return id.length > 8 ? `#${id.slice(0, 8).toUpperCase()}` : `#${id.toUpperCase()}`;
}

function TableSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(7)].map((__, j) => (
            <TableCell key={j} className="py-3">
              <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function OrderStatusTable({ orders, is_loading }: Props) {
  const [search_term, setSearchTerm] = useState("");
  const [status_filter, setStatusFilter] = useState<string>("All");

  const filtered_orders = useMemo(() => {
    return orders.filter((order) => {
      const display_status = api_to_display[order.status];
      const search_lower = search_term.toLowerCase();

      const matches_search =
        search_term === "" ||
        order.id.toLowerCase().includes(search_lower) ||
        (order.order_title ?? "").toLowerCase().includes(search_lower) ||
        display_status.toLowerCase().includes(search_lower);

      const matches_status =
        status_filter === "All" ||
        display_status === status_filter ||
        order.status === status_filter.toLowerCase();

      return matches_search && matches_status;
    });
  }, [orders, search_term, status_filter]);

  const status_options = ["All", "New request", "Writing article", "Live", "Cancelled"];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Order Status
          </h3>
          {!is_loading && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {filtered_orders.length}
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
              placeholder="Search orders..."
              value={search_term}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Status</span>
            <select
              value={status_filter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {status_options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Download */}
          <button className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600">
            DOWNLOAD
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              {[
                "Order ID",
                "Date",
                "Title",
                "Status",
                "Items",
                "Amount",
                "Last Update",
                "",
              ].map((col) => (
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
            ) : filtered_orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                >
                  {orders.length === 0
                    ? "No orders yet. Place your first order to get started."
                    : "No orders match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered_orders.map((order) => {
                const display_status = api_to_display[order.status];
                const badge_color = status_badge_color[display_status];

                return (
                  <TableRow key={order.id}>
                    {/* Order ID */}
                    <TableCell className="whitespace-nowrap py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {shortId(order.id)}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {formatDate(order.created_at)}
                    </TableCell>

                    {/* Title */}
                    <TableCell className="py-3 text-theme-sm">
                      <span className="max-w-[180px] truncate block text-gray-700 dark:text-gray-300">
                        {order.order_title ?? "Untitled Order"}
                      </span>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="whitespace-nowrap py-3">
                      <Badge size="sm" color={badge_color}>
                        {display_status}
                      </Badge>
                    </TableCell>

                    {/* Items count */}
                    <TableCell className="whitespace-nowrap py-3 text-center text-gray-500 text-theme-sm dark:text-gray-400">
                      {order.items_count}
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="whitespace-nowrap py-3 font-medium text-gray-700 text-theme-sm dark:text-gray-300">
                      ${order.total_amount.toLocaleString()}
                    </TableCell>

                    {/* Last Update */}
                    <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {order.last_update_at
                        ? formatDate(order.last_update_at)
                        : "—"}
                    </TableCell>

                    {/* View Details */}
                    <TableCell className="whitespace-nowrap py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-xs font-medium text-coral-500 hover:text-coral-600 hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      {!is_loading && orders.length > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="text-xs text-gray-400">
            Showing {filtered_orders.length} of {orders.length} orders
          </p>
          <Link
            href="/orders"
            className="text-sm font-medium text-coral-500 hover:text-coral-600"
          >
            View all orders →
          </Link>
        </div>
      )}
    </div>
  );
}
