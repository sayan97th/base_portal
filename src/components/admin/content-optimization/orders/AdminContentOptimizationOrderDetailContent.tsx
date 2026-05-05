"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import { getAdminContentOptimizationOrder } from "@/services/admin/content-optimization.service";
import type {
  AdminOrder,
  AdminInvoice,
  OrderItem,
  OrderStatus,
  OrderCouponDetail,
} from "@/types/admin";

interface AdminContentOptimizationOrderDetailContentProps {
  order_id: string;
}

// ── Formatters ─────────────────────────────────────────────────────────────────

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

function getStatusConfig(status: OrderStatus): {
  color: "warning" | "info" | "success" | "error";
  label: string;
  dot: string;
} {
  switch (status) {
    case "pending": return { color: "warning", label: "Pending", dot: "bg-warning-500" };
    case "processing": return { color: "info", label: "Processing", dot: "bg-violet-500" };
    case "completed": return { color: "success", label: "Completed", dot: "bg-success-500" };
    case "cancelled": return { color: "error", label: "Cancelled", dot: "bg-error-500" };
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

interface InfoRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
}

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2.5 last:border-b-0 dark:border-gray-800">
    <dt className="shrink-0 text-sm text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-right text-sm font-medium text-gray-800 dark:text-white/90">{value}</dd>
  </div>
);

interface InvoiceCardProps {
  invoice: AdminInvoice;
}

const InvoiceCard = ({ invoice }: InvoiceCardProps) => {
  const status_styles: Record<string, string> = {
    paid: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    unpaid: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
    overdue: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    refund: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    void: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
          </svg>
          Invoice
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${status_styles[invoice.status]}`}>
          {invoice.status}
        </span>
      </div>
      <dl className="px-5 py-1">
        <InfoRow label="Invoice #" value={<span className="font-mono">{invoice.invoice_number}</span>} />
        <InfoRow label="Payment" value={invoice.payment_method} />
        <InfoRow label="Total" value={<span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total_amount)}</span>} />
        {invoice.date_paid && (
          <InfoRow label="Paid on" value={<span className="text-success-600 dark:text-success-400">{formatDate(invoice.date_paid)}</span>} />
        )}
      </dl>
    </div>
  );
};

// ── Order items table ──────────────────────────────────────────────────────────

interface OrderItemsTableProps {
  items: OrderItem[];
  coupons?: OrderCouponDetail[];
  total_amount?: number;
}

const OrderItemsTable = ({ items, coupons, total_amount }: OrderItemsTableProps) => {
  const items_subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const coupon_total = coupons?.reduce((sum, c) => sum + c.discount_amount, 0) ?? 0;
  const bulk_discount = Math.max(
    0,
    Math.round((items_subtotal - (total_amount ?? items_subtotal) - coupon_total) * 100) / 100
  );
  const has_bulk = bulk_discount > 0;
  const has_coupons = coupons && coupons.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 bg-white dark:border-violet-500/30 dark:bg-white/3">
      {/* Header strip */}
      <div className="flex items-center gap-3 border-b border-violet-200 bg-violet-50 px-5 py-2.5 dark:border-violet-500/30 dark:bg-violet-500/10">
        <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
          Content Optimization
        </span>
        <span className="ml-auto text-xs text-violet-600/70 dark:text-violet-400/70">
          {items.length} {items.length === 1 ? "tier" : "tiers"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">#</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Optimization Tier</th>
              <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Pages</th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Qty</th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Unit Price</th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item, index) => {
              const intake_count = item.co_intake_rows?.length ?? 0;
              return (
                <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-xs text-gray-400 dark:text-gray-500">{index + 1}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                      {item.item_name ?? `Tier ${index + 1}`}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {intake_count > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {intake_count}
                      </span>
                    ) : (
                      <span className="text-xs italic text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-gray-800 dark:text-white/90">{item.quantity}</td>
                  <td className="px-5 py-3.5 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.unit_price)}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(item.subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {(has_bulk || has_coupons) ? (
              <>
                <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <td colSpan={5} className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">Subtotal</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-700 dark:text-gray-300">{formatCurrency(items_subtotal)}</td>
                </tr>
                {has_bulk && (
                  <tr className="bg-violet-50/40 dark:bg-violet-500/5">
                    <td colSpan={5} className="px-5 py-2.5 text-right text-xs font-medium text-violet-700 dark:text-violet-300">
                      Bulk Discount (10% off)
                    </td>
                    <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                      -{formatCurrency(bulk_discount)}
                    </td>
                  </tr>
                )}
                {has_coupons && coupons.map((coupon) => (
                  <tr key={coupon.coupon_id} className="bg-emerald-50/40 dark:bg-emerald-500/5">
                    <td colSpan={5} className="px-5 py-2.5 text-right">
                      <span className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      -{formatCurrency(coupon.discount_amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <td colSpan={5} className="px-5 py-3.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Total</td>
                  <td className="px-5 py-3.5 text-right text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(total_amount ?? items_subtotal)}
                  </td>
                </tr>
              </>
            ) : (
              <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <td colSpan={5} className="px-5 py-3.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Total</td>
                <td className="px-5 py-3.5 text-right text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency(items_subtotal)}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminContentOptimizationOrderDetailContent({
  order_id,
}: AdminContentOptimizationOrderDetailContentProps) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAdminContentOptimizationOrder(order_id);
        setOrder(data);
      } catch {
        setError("We couldn't load this order. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [order_id]);

  const status_config = order ? getStatusConfig(order.status) : null;
  const total_pages = order?.items.reduce((sum, i) => {
    const co_count = i.co_intake_rows?.length ?? 0;
    return sum + (co_count > 0 ? co_count : i.quantity);
  }, 0) ?? 0;
  const has_intake_data = order?.items.some((i) => i.co_intake_rows && i.co_intake_rows.length > 0) ?? false;
  const total_intake_rows = order?.items.reduce((sum, i) => sum + (i.co_intake_rows?.length ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/content-optimization/orders"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Content Optimization Orders
      </Link>

      {/* Loading */}
      {is_loading && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="h-8 w-64" />
              <SkeletonBlock className="h-4 w-80" />
            </div>
            <div className="flex gap-2">
              <SkeletonBlock className="h-10 w-40" />
              <SkeletonBlock className="h-10 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-4 lg:col-span-8">
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-48" />
            </div>
            <div className="col-span-12 space-y-4 lg:col-span-4">
              <SkeletonBlock className="h-40" />
              <SkeletonBlock className="h-48" />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {!is_loading && error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Main content */}
      {!is_loading && order && status_config && (
        <>
          {/* Page header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 dark:border-violet-500/30 dark:bg-violet-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Content Optimization
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {order.order_title || "Order Details"}
                </h1>
                <Badge
                  variant="light"
                  size="sm"
                  color={status_config.color}
                  startIcon={
                    <span className={`inline-block h-2 w-2 rounded-full ${status_config.dot}`} />
                  }
                >
                  {status_config.label}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Order ID:{" "}
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {order.id}
                </span>
                {" "}·{" "}Placed on {formatDate(order.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Intake Data button */}
              {has_intake_data ? (
                <Link
                  href={`/admin/content-optimization/orders/${order_id}/intake`}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-500/25 transition hover:bg-violet-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 12H6m0 0v1.5m0-1.5C6 12.504 6.504 13.125 7.125 13.125m-3 0h1.5m-1.5 0C3.996 13.125 3.375 13.629 3.375 14.25v1.5c0 .621.504 1.125 1.125 1.125h1.5" />
                  </svg>
                  View Intake Data
                  <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-400/30 px-1.5 text-xs font-bold text-white">
                    {total_intake_rows}
                  </span>
                </Link>
              ) : (
                <span
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-400 shadow-sm dark:border-gray-700 dark:bg-white/3"
                  title="No intake data available"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 12H6m0 0v1.5m0-1.5C6 12.504 6.504 13.125 7.125 13.125m-3 0h1.5m-1.5 0C3.996 13.125 3.375 13.629 3.375 14.25v1.5c0 .621.504 1.125 1.125 1.125h1.5" />
                  </svg>
                  View Intake Data
                </span>
              )}

              <Link
                href={`/admin/orders/${order.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300 dark:hover:bg-white/[0.07]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Full Order
              </Link>
            </div>
          </div>

          {/* Intake data callout */}
          {has_intake_data && (
            <div className="flex items-center gap-4 rounded-xl border border-violet-200 bg-violet-50 px-5 py-3.5 dark:border-violet-500/25 dark:bg-violet-500/10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                  Intake Form Data Available
                </p>
                <p className="mt-0.5 text-xs text-violet-600/80 dark:text-violet-400/80">
                  This order includes{" "}
                  <span className="font-semibold">{total_intake_rows} content</span>{" "}
                  {total_intake_rows === 1 ? "page" : "pages"} to optimize across{" "}
                  <span className="font-semibold">{total_pages}</span>{" "}
                  {total_pages === 1 ? "tier" : "tiers"}.
                </p>
              </div>
              <Link
                href={`/admin/content-optimization/orders/${order_id}/intake`}
                className="shrink-0 rounded-lg border border-violet-300 bg-white px-3.5 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
              >
                View Intake Data →
              </Link>
            </div>
          )}

          {/* Main grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left column */}
            <div className="col-span-12 space-y-5 lg:col-span-8">
              {/* Customer card */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Customer</h3>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
                      {order.user.first_name[0]}{order.user.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {order.user.first_name} {order.user.last_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.user.email}</p>
                    </div>
                    <div className="ml-auto">
                      <Link
                        href={`/admin/users/${order.user_id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
                      >
                        View User
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order items */}
              <OrderItemsTable
                items={order.items}
                coupons={order.coupons}
                total_amount={order.total_amount}
              />

              {/* Order notes */}
              {order.order_notes && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                  <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">Order Notes</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{order.order_notes}</p>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="col-span-12 space-y-5 lg:col-span-4">
              {/* Order summary */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Order Summary</h3>
                </div>
                <dl className="px-5 py-1">
                  <InfoRow
                    label="Product"
                    value={
                      <span className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                        Content Optimization
                      </span>
                    }
                  />
                  <InfoRow label="Status" value={
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      order.status === "pending" ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400" :
                      order.status === "processing" ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400" :
                      order.status === "completed" ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" :
                      "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                    }`}>{order.status}</span>
                  } />
                  <InfoRow label="Tiers" value={`${order.items.length} ${order.items.length === 1 ? "tier" : "tiers"}`} />
                  <InfoRow
                    label="Pages to Optimize"
                    value={
                      <span className="font-semibold text-violet-600 dark:text-violet-400">{total_pages}</span>
                    }
                  />
                  {has_intake_data && (
                    <InfoRow
                      label="Intake Entries"
                      value={
                        <Link
                          href={`/admin/content-optimization/orders/${order_id}/intake`}
                          className="font-semibold text-violet-600 underline hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                        >
                          {total_intake_rows} entries →
                        </Link>
                      }
                    />
                  )}
                  <InfoRow label="Placed" value={formatDate(order.created_at)} />
                  <InfoRow label="Last Updated" value={formatDate(order.updated_at)} />
                  <InfoRow
                    label="Total"
                    value={<span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(order.total_amount)}</span>}
                  />
                </dl>
              </div>

              {/* Invoice */}
              {order.invoice && <InvoiceCard invoice={order.invoice} />}

              {/* Billing address */}
              {order.billing && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                  <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Billing Address</h3>
                  </div>
                  <address className="space-y-0.5 px-5 py-4 text-sm not-italic text-gray-600 dark:text-gray-400">
                    {order.billing.company && (
                      <p className="font-medium text-gray-800 dark:text-white/80">{order.billing.company}</p>
                    )}
                    <p>{order.billing.address}</p>
                    <p>{order.billing.city}, {order.billing.state} {order.billing.postal_code}</p>
                    <p>{order.billing.country}</p>
                  </address>
                </div>
              )}

              {/* Payment reference */}
              {order.payment_intent_id && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Payment Reference
                  </h3>
                  <p className="break-all font-mono text-xs text-gray-600 dark:text-gray-400">
                    {order.payment_intent_id}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
