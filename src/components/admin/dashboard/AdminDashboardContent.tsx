"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NewsFeedWidget from "@/components/admin/news/NewsFeedWidget";
import { useAuth } from "@/context/AuthContext";
import {
  GroupIcon,
  DollarLineIcon,
  ListIcon,
  ChatIcon,
  TaskIcon,
  ArrowRightIcon,
  UserIcon,
  CreditCardIcon,
} from "@/icons/index";
import { listAdminOrders } from "@/services/admin/order.service";
import { listAdminUsers, listAdminClients } from "@/services/admin/user.service";
import { listAdminInvoices } from "@/services/admin/invoice.service";
import type { AdminOrder, OrderStatus } from "@/types/admin";

// ── Status styles ──────────────────────────────────────────────────────────────

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

const STATUS_BAR_COLORS: Record<OrderStatus, string> = {
  pending: "bg-warning-400",
  processing: "bg-brand-500",
  completed: "bg-success-500",
  cancelled: "bg-error-400",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardStats {
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_clients: number;
  total_staff: number;
  total_paid_invoices: number;
}

// ── Stat card skeleton ─────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-6 w-14 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge_color: string;
}

function StatCard({
  label,
  value,
  description,
  icon,
  href,
  badge_color,
}: StatCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${badge_color} text-white`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-500">
          {description}
        </p>
      </div>
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminDashboardContent() {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent_orders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        all_orders_res,
        pending_res,
        processing_res,
        completed_res,
        cancelled_res,
        clients_res,
        staff_res,
        invoices_res,
        recent_orders_res,
      ] = await Promise.all([
        listAdminOrders({ per_page: 1 }),
        listAdminOrders({ per_page: 1, status: "pending" }),
        listAdminOrders({ per_page: 1, status: "processing" }),
        listAdminOrders({ per_page: 1, status: "completed" }),
        listAdminOrders({ per_page: 1, status: "cancelled" }),
        listAdminClients({}),
        listAdminUsers({}, "staff"),
        listAdminInvoices({ per_page: 1, status: "paid" }),
        listAdminOrders({
          per_page: 8,
          sort_field: "created_at",
          sort_direction: "desc",
        }),
      ]);

      setStats({
        total_orders: all_orders_res.total,
        pending_orders: pending_res.total,
        processing_orders: processing_res.total,
        completed_orders: completed_res.total,
        cancelled_orders: cancelled_res.total,
        total_clients: clients_res.total,
        total_staff: staff_res.total,
        total_paid_invoices: invoices_res.total,
      });

      setRecentOrders(recent_orders_res.data);
    } catch {
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const total_categorized = stats
    ? stats.pending_orders +
      stats.processing_orders +
      stats.completed_orders +
      stats.cancelled_orders
    : 0;

  const status_breakdown: {
    status: OrderStatus;
    count: number;
    label: string;
  }[] = stats
    ? [
        { status: "pending", count: stats.pending_orders, label: "Pending" },
        {
          status: "processing",
          count: stats.processing_orders,
          label: "Processing",
        },
        {
          status: "completed",
          count: stats.completed_orders,
          label: "Completed",
        },
        {
          status: "cancelled",
          count: stats.cancelled_orders,
          label: "Cancelled",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Staff Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back,{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {user?.first_name}
            </span>
            . Here is your operations overview.
          </p>
        </div>
        <p className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
          {today}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      {/* KPI stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {is_loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Total Orders"
              value={stats?.total_orders ?? 0}
              description="All time orders placed"
              icon={<ListIcon />}
              href="/admin/orders"
              badge_color="bg-brand-500"
            />
            <StatCard
              label="Pending Orders"
              value={stats?.pending_orders ?? 0}
              description="Orders awaiting processing"
              icon={<TaskIcon />}
              href="/admin/orders"
              badge_color="bg-warning-500"
            />
            <StatCard
              label="Total Clients"
              value={stats?.total_clients ?? 0}
              description="Registered client accounts"
              icon={<GroupIcon />}
              href="/admin/clients"
              badge_color="bg-success-500"
            />
            <StatCard
              label="Paid Invoices"
              value={stats?.total_paid_invoices ?? 0}
              description="Successfully paid invoices"
              icon={<DollarLineIcon />}
              href="/admin/invoices"
              badge_color="bg-error-500"
            />
          </>
        )}
      </div>

      {/* Main grid — recent orders + right sidebar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Orders table — takes 2/3 */}
        <div className="xl:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Recent Orders
                </h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Latest orders across all clients
                </p>
              </div>
              <Link
                href="/admin/orders"
                className="flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                View all
                <ArrowRightIcon />
              </Link>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40">
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Order
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Customer
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Date
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {is_loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }).map((__, j) => (
                            <td key={j} className="px-5 py-4">
                              <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : recent_orders.length === 0
                      ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-14 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <svg
                                className="h-9 w-9 text-gray-300 dark:text-gray-700"
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
                                No orders yet
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Orders will appear here once they are placed
                              </p>
                            </div>
                          </td>
                        </tr>
                      )
                      : recent_orders.map((order) => (
                          <tr
                            key={order.id}
                            className="transition-colors hover:bg-gray-50 dark:hover:bg-white/2"
                          >
                            <td className="px-5 py-4">
                              <p className="max-w-[160px] truncate font-medium text-gray-900 dark:text-white">
                                {order.order_title}
                              </p>
                              <p className="font-mono text-xs text-gray-400">
                                #{order.id.slice(0, 8)}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-gray-700 dark:text-gray-300">
                                {order.user.first_name} {order.user.last_name}
                              </p>
                              <p className="max-w-[140px] truncate text-xs text-gray-400">
                                {order.user.email}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[order.status]}`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                              ${order.total_amount.toFixed(2)}
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                              {new Date(order.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar — 1/3 */}
        <div className="space-y-6">
          {/* Order Status Breakdown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Order Breakdown
              </h2>
              {!is_loading && stats && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {stats.total_orders} total
                </span>
              )}
            </div>

            {is_loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                      <div className="h-3 w-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="h-2 w-full animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {status_breakdown.map(({ status, count, label }) => {
                  const pct =
                    total_categorized > 0
                      ? (count / total_categorized) * 100
                      : 0;
                  return (
                    <div key={status}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {label}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {count}{" "}
                          <span className="text-gray-400 dark:text-gray-600">
                            ({pct.toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR_COLORS[status]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Platform Summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Platform Summary
            </h2>
            <div className="space-y-2">
              {[
                {
                  label: "Registered Clients",
                  value: is_loading ? "—" : (stats?.total_clients ?? 0),
                  href: "/admin/clients",
                  icon: <GroupIcon />,
                  icon_color:
                    "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
                },
                {
                  label: "Staff Members",
                  value: is_loading ? "—" : (stats?.total_staff ?? 0),
                  href: "/admin/users",
                  icon: <UserIcon />,
                  icon_color:
                    "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
                },
                {
                  label: "Processing Orders",
                  value: is_loading ? "—" : (stats?.processing_orders ?? 0),
                  href: "/admin/orders",
                  icon: <ListIcon />,
                  icon_color:
                    "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
                },
                {
                  label: "Paid Invoices",
                  value: is_loading ? "—" : (stats?.total_paid_invoices ?? 0),
                  href: "/admin/invoices",
                  icon: <CreditCardIcon />,
                  icon_color:
                    "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
                },
              ].map(({ label, value, href, icon, icon_color }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${icon_color}`}
                  >
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {label}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {value}
                    </p>
                  </div>
                  <ArrowRightIcon />
                </Link>
              ))}
            </div>
          </div>

          {/* News & Promos Feed */}
          <NewsFeedWidget />

          {/* Quick Actions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <div className="space-y-1">
              {[
                {
                  label: "Invite Team Member",
                  description: "Send a staff invitation",
                  href: "/admin/invitations",
                  icon: <ChatIcon />,
                },
                {
                  label: "Manage Organizations",
                  description: "Review client organizations",
                  href: "/admin/organizations",
                  icon: <TaskIcon />,
                },
                {
                  label: "View All Orders",
                  description: "Browse the full order list",
                  href: "/admin/orders",
                  icon: <ListIcon />,
                },
              ].map(({ label, description, href, icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    {icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
