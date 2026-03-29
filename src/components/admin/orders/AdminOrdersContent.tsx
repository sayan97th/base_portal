"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { listAdminOrders } from "@/services/admin/order.service";
import type {
  AdminOrder,
  AdminOrderFilters,
  OrderStatus,
  OrderSortField,
  SortDirection,
} from "@/types/admin";
import { useDebounce } from "@/hooks/useDebounce";
import OrderFiltersBar from "./OrderFiltersBar";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  processing:
    "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  completed:
    "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  cancelled:
    "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
};

type SortableColumn = "order_title" | "status" | "total_amount" | "created_at";

function SortIcon({
  field,
  active_field,
  direction,
}: {
  field: SortableColumn;
  active_field: OrderSortField | undefined;
  direction: SortDirection;
}) {
  const is_active = active_field === field;
  return (
    <span
      className={`ml-1 inline-flex flex-col gap-px transition-opacity ${
        is_active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
      }`}
    >
      <svg
        className={`h-2.5 w-2.5 transition-colors ${
          is_active && direction === "asc"
            ? "text-brand-500"
            : "text-gray-400"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <svg
        className={`-mt-1 h-2.5 w-2.5 transition-colors ${
          is_active && direction === "desc"
            ? "text-brand-500"
            : "text-gray-400"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
}

export default function AdminOrdersContent() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);

  // Filter & sort state
  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<OrderStatus | "">("");
  const [sort_field, setSortField] = useState<OrderSortField | undefined>(
    "created_at"
  );
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");

  // Debounce the search so we don't fire a request on every keystroke
  const debounced_search = useDebounce(search_input, 450);

  const fetchOrders = useCallback(
    async (filters: AdminOrderFilters) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listAdminOrders(filters);
        setOrders(data.data);
        setTotal(data.total);
        setLastPage(data.last_page);
      } catch {
        setError("Failed to load orders. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Re-fetch whenever page, debounced search, status, or sort changes
  useEffect(() => {
    fetchOrders({
      page,
      search: debounced_search,
      status: status_filter || undefined,
      sort_field,
      sort_direction,
    });
  }, [fetchOrders, page, debounced_search, status_filter, sort_field, sort_direction]);

  // Reset to page 1 when filters change (but not page itself)
  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function handleStatusChange(status: OrderStatus | "") {
    setStatusFilter(status);
    setPage(1);
  }

  function handleSortChange(field: OrderSortField, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(1);
  }

  function handleColumnSort(field: SortableColumn) {
    if (sort_field === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(1);
  }

  // "Clear all" from the bar resets sort to default
  function handleClearAll() {
    setSearchInput("");
    setStatusFilter("");
    setSortField("created_at");
    setSortDirection("desc");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Orders
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage and track all platform orders
        </p>
      </div>

      {/* Filters */}
      <OrderFiltersBar
        search_value={search_input}
        on_search_change={handleSearchChange}
        status_filter={status_filter}
        on_status_change={handleStatusChange}
        sort_field={sort_field}
        sort_direction={sort_direction}
        on_sort_change={handleSortChange}
        total={total}
        is_loading={is_loading}
        on_clear_all={handleClearAll}
      />

      {error && (
        <div className="rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                {/* Order / Title — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("order_title")}
                >
                  <span className="inline-flex items-center">
                    Order
                    <SortIcon
                      field="order_title"
                      active_field={sort_field}
                      direction={sort_direction}
                    />
                  </span>
                </th>

                {/* Customer — not sortable */}
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Customer
                </th>

                {/* Status — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("status")}
                >
                  <span className="inline-flex items-center">
                    Status
                    <SortIcon
                      field="status"
                      active_field={sort_field}
                      direction={sort_direction}
                    />
                  </span>
                </th>

                {/* Total — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("total_amount")}
                >
                  <span className="inline-flex items-center">
                    Total
                    <SortIcon
                      field="total_amount"
                      active_field={sort_field}
                      direction={sort_direction}
                    />
                  </span>
                </th>

                {/* Date — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("created_at")}
                >
                  <span className="inline-flex items-center">
                    Date
                    <SortIcon
                      field="created_at"
                      active_field={sort_field}
                      direction={sort_direction}
                    />
                  </span>
                </th>

                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {is_loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                : orders.length === 0
                  ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center"
                      >
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <svg
                            className="h-8 w-8 text-gray-300 dark:text-gray-700"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            No orders found
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                  : orders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {order.order_title}
                        </p>
                        <p className="font-mono text-xs text-gray-400">
                          {order.id.slice(0, 8)}…
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        <p>
                          {order.user.first_name} {order.user.last_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {order.user.email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        ${order.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!is_loading && last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {last_page}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(last_page, p + 1))}
                disabled={page === last_page}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
