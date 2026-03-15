"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import { getAdminUser, listAdminUserOrders } from "@/services/admin/user.service";
import type { AdminUser, AdminUserOrderSummary, OrderStatus, PaginatedResponse } from "@/services/admin/types";

interface AdminUserDetailContentProps {
  user_id: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getInitials(first_name: string, last_name: string): string {
  return `${first_name[0] ?? ""}${last_name[0] ?? ""}`.toUpperCase();
}

function getOrderStatusConfig(status: OrderStatus): {
  color: "warning" | "info" | "success" | "error";
  dot: string;
  label: string;
} {
  switch (status) {
    case "pending":
      return { color: "warning", dot: "bg-warning-500", label: "Pending" };
    case "processing":
      return { color: "info", dot: "bg-blue-light-500", label: "Processing" };
    case "completed":
      return { color: "success", dot: "bg-success-500", label: "Completed" };
    case "cancelled":
      return { color: "error", dot: "bg-error-500", label: "Cancelled" };
  }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const MailIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

// ── Small helpers ─────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

const InfoRow = ({ label, value, icon }: InfoRowProps) => (
  <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2.5 last:border-b-0 dark:border-gray-800">
    <dt className="flex shrink-0 items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
      {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
      {label}
    </dt>
    <dd className="text-right text-sm font-medium text-gray-800 dark:text-white/90">{value}</dd>
  </div>
);

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
}

const StatCard = ({ label, value, icon, accent }: StatCardProps) => (
  <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

// ── Orders table ──────────────────────────────────────────────────────────────

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  processing: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  completed: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  cancelled: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
};

interface UserOrdersTableProps {
  orders: AdminUserOrderSummary[];
  is_loading: boolean;
  page: number;
  last_page: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

const UserOrdersTable = ({
  orders,
  is_loading,
  page,
  last_page,
  total,
  onPrev,
  onNext,
}: UserOrdersTableProps) => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
        Order History
        {!is_loading && (
          <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {total}
          </span>
        )}
      </h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Order
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Items
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Date
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {is_loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </td>
                  ))}
                </tr>
              ))
            : orders.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    This user has no orders yet.
                  </td>
                </tr>
              )
              : orders.map((order) => {
                  const status_cfg = getOrderStatusConfig(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {order.order_title}
                        </p>
                        <p className="font-mono text-xs text-gray-400">
                          {order.id.slice(0, 8)}…
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ORDER_STATUS_STYLES[order.status]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
                          {status_cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-gray-700 dark:text-gray-300">
                        {order.items_count}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                        >
                          <ExternalLinkIcon />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
        </tbody>
      </table>
    </div>

    {!is_loading && last_page > 1 && (
      <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Page {page} of {last_page}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onPrev}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={page === last_page}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      </div>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const AdminUserDetailContent: React.FC<AdminUserDetailContentProps> = ({ user_id }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState<AdminUserOrderSummary[]>([]);
  const [orders_loading, setOrdersLoading] = useState(true);
  const [orders_page, setOrdersPage] = useState(1);
  const [orders_last_page, setOrdersLastPage] = useState(1);
  const [orders_total, setOrdersTotal] = useState(0);

  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAdminUser(user_id);
        setUser(data);
      } catch {
        setError("We couldn't load this user. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [user_id]);

  const fetchOrders = useCallback(
    async (p: number) => {
      setOrdersLoading(true);
      try {
        const data: PaginatedResponse<AdminUserOrderSummary> = await listAdminUserOrders(user_id, p);
        setOrders(data.data);
        setOrdersTotal(data.total);
        setOrdersLastPage(data.last_page);
      } catch {
        // silently fail — table will show empty state
      } finally {
        setOrdersLoading(false);
      }
    },
    [user_id]
  );

  useEffect(() => {
    fetchOrders(orders_page);
  }, [fetchOrders, orders_page]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (is_loading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-4 w-28" />
        {/* Header skeleton */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-5">
              <SkeletonBlock className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <SkeletonBlock className="h-6 w-48" />
                <SkeletonBlock className="h-4 w-64" />
                <SkeletonBlock className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <SkeletonBlock className="h-72 rounded-xl" />
          </div>
          <div className="col-span-12 space-y-4 lg:col-span-4">
            <SkeletonBlock className="h-48 rounded-xl" />
            <SkeletonBlock className="h-36 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !user) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
        >
          <BackIcon />
          Back to Users
        </Link>
        <div className="rounded-xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">
            {error ?? "User not found."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const role_names = user.roles.map((r) => (typeof r === "string" ? r : r.display_name));
  const is_email_verified = !!user.email_verified_at;
  const initials = getInitials(user.first_name, user.last_name);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
      >
        <BackIcon />
        Back to Users
      </Link>

      {/* ── Hero Header Card ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Gradient accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />

        <div className="p-6">
          {/* User identity row */}
          <div className="flex flex-wrap items-start gap-5">
            {/* Avatar */}
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-bold text-white shadow-md">
              {initials}
              <span
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 ${
                  is_email_verified ? "bg-success-500" : "bg-warning-400"
                }`}
              />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {user.first_name} {user.last_name}
                </h1>
                {/* Email verified badge */}
                {is_email_verified ? (
                  <Badge variant="light" size="sm" color="success" startIcon={<CheckCircleIcon />}>
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="light" size="sm" color="warning">
                    Unverified
                  </Badge>
                )}
              </div>

              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <MailIcon />
                {user.email}
              </p>

              {user.job_title && (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
                  <BriefcaseIcon />
                  {user.job_title}
                </p>
              )}

              {/* Role pills */}
              {role_names.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {role_names.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                    >
                      <ShieldIcon />
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* User ID chip */}
            <div className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-500">User ID</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                #{user.id}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Total Orders"
              value={orders_loading ? "—" : orders_total}
              icon={
                <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                </svg>
              }
              accent="bg-brand-50 dark:bg-brand-500/10"
            />
            <StatCard
              label="Member Since"
              value={new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              icon={<ClockIcon />}
              accent="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            />
            <StatCard
              label="Email Status"
              value={is_email_verified ? "Verified" : "Pending"}
              icon={<MailIcon />}
              accent={is_email_verified ? "bg-success-50 dark:bg-success-500/10" : "bg-warning-50 dark:bg-warning-500/10"}
            />
            <StatCard
              label="Roles"
              value={role_names.length || "None"}
              icon={<ShieldIcon />}
              accent="bg-gray-100 dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      {/* ── Main Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left — Orders table */}
        <div className="col-span-12 lg:col-span-8">
          <UserOrdersTable
            orders={orders}
            is_loading={orders_loading}
            page={orders_page}
            last_page={orders_last_page}
            total={orders_total}
            onPrev={() => setOrdersPage((p) => Math.max(1, p - 1))}
            onNext={() => setOrdersPage((p) => Math.min(orders_last_page, p + 1))}
          />
        </div>

        {/* Right — Info cards */}
        <div className="col-span-12 space-y-4 lg:col-span-4">
          {/* Account Details */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Account Details
              </h3>
            </div>
            <dl className="px-5 py-1">
              <InfoRow
                label="Email"
                icon={<MailIcon />}
                value={
                  <span className="break-all">{user.email}</span>
                }
              />
              {user.business_email && (
                <InfoRow
                  label="Business Email"
                  icon={<MailIcon />}
                  value={<span className="break-all">{user.business_email}</span>}
                />
              )}
              {user.phone && (
                <InfoRow
                  label="Phone"
                  icon={<PhoneIcon />}
                  value={user.phone}
                />
              )}
              {user.job_title && (
                <InfoRow
                  label="Job Title"
                  icon={<BriefcaseIcon />}
                  value={user.job_title}
                />
              )}
              <InfoRow
                label="Verified"
                icon={<CheckCircleIcon />}
                value={
                  is_email_verified ? (
                    <span className="text-success-600 dark:text-success-400">
                      {formatDate(user.email_verified_at!)}
                    </span>
                  ) : (
                    <span className="text-warning-600 dark:text-warning-400">Not verified</span>
                  )
                }
              />
              <InfoRow
                label="Joined"
                icon={<ClockIcon />}
                value={formatDate(user.created_at)}
              />
              <InfoRow
                label="Last Updated"
                icon={<ClockIcon />}
                value={formatDate(user.updated_at)}
              />
            </dl>
          </div>

          {/* Organization */}
          {user.organization ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                <span className="text-gray-400 dark:text-gray-500">
                  <BuildingIcon />
                </span>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Organization
                </h3>
              </div>
              <dl className="px-5 py-1">
                <InfoRow label="Name" value={user.organization.name} />
                {user.organization.website && (
                  <InfoRow
                    label="Website"
                    value={
                      <a
                        href={user.organization.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {user.organization.website.replace(/^https?:\/\//, "")}
                        <ExternalLinkIcon />
                      </a>
                    }
                  />
                )}
                {user.organization.contact_email && (
                  <InfoRow label="Contact" value={user.organization.contact_email} />
                )}
                <InfoRow
                  label="Status"
                  value={
                    user.organization.is_active ? (
                      <span className="text-success-600 dark:text-success-400">Active</span>
                    ) : (
                      <span className="text-error-500 dark:text-error-400">Inactive</span>
                    )
                  }
                />
              </dl>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-center dark:border-gray-800 dark:bg-white/[0.03]">
              <BuildingIcon />
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Not part of any organization
              </p>
            </div>
          )}

          {/* Roles */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <span className="text-gray-400 dark:text-gray-500">
                <ShieldIcon />
              </span>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Roles &amp; Permissions
              </h3>
            </div>
            <div className="px-5 py-4">
              {role_names.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No roles assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {role_names.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                    >
                      <ShieldIcon />
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetailContent;
