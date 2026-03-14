"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { listAdminOrders } from "@/services/admin/order.service";
import type { AdminOrder, OrderStatus } from "@/services/admin/types";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  processing: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  completed: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  cancelled: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
};

export default function AdminOrdersContent() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);

  const fetchOrders = useCallback(async (current_page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAdminOrders(current_page);
      setOrders(data.data);
      setTotal(data.total);
      setLastPage(data.last_page);
    } catch {
      setError("Failed to load orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(page);
  }, [fetchOrders, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Orders
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {total > 0 ? `${total} total orders` : "Manage all platform orders"}
        </p>
      </div>

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
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading
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
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400">
                        No orders found.
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
                        <p className="text-xs text-gray-400 font-mono">
                          {order.id.slice(0, 8)}…
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        <p>{order.user.first_name} {order.user.last_name}</p>
                        <p className="text-xs text-gray-400">{order.user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[order.status]}`}>
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

        {!isLoading && last_page > 1 && (
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
