"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import { getAdminOrder } from "@/services/admin/order.service";
import type { AdminOrder, AdminInvoice, AdminOrderCoupon, OrderItem, OrderStatus } from "@/types/admin";
import OrderTrackingPanel from "./OrderTrackingPanel";

interface AdminOrderDetailContentProps {
  order_id: string;
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

function formatCouponDiscount(coupon: AdminOrderCoupon): string {
  if (coupon.discount_type === "percentage") {
    return `${coupon.discount_value}% off`;
  }
  return formatCurrency(coupon.discount_value);
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

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const ReceiptIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
  </svg>
);

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-b-0 dark:border-gray-800">
    <dt className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</dt>
    <dd className="text-sm font-medium text-gray-800 text-right dark:text-white/90">{value}</dd>
  </div>
);

interface OrderItemsTableProps {
  items: OrderItem[];
}

const OrderItemsTable = ({ items }: OrderItemsTableProps) => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
    <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
        Order Items
        <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {items.length}
        </span>
      </h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              #
            </th>
            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              DR Tier
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Qty
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Unit Price
            </th>
            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item, index) => (
            <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
              <td className="px-5 py-3.5 text-xs text-gray-400 dark:text-gray-500">{index + 1}</td>
              <td className="px-5 py-3.5">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  DR Tier #{item.dr_tier_id}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right font-medium text-gray-800 dark:text-white/90">
                {item.quantity}
              </td>
              <td className="px-5 py-3.5 text-right text-gray-600 dark:text-gray-400">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="px-5 py-3.5 text-right font-semibold text-gray-900 dark:text-white">
                {formatCurrency(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <td colSpan={4} className="px-5 py-3.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
              Total
            </td>
            <td className="px-5 py-3.5 text-right text-sm font-bold text-gray-900 dark:text-white">
              {formatCurrency(items.reduce((sum, i) => sum + i.subtotal, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

interface InvoiceCardProps {
  invoice: AdminInvoice;
}

const InvoiceCard = ({ invoice }: InvoiceCardProps) => {
  const status_styles = {
    paid: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    void: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
          <ReceiptIcon />
          Invoice
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${status_styles[invoice.status]}`}>
          {invoice.status}
        </span>
      </div>
      <dl className="px-5 py-1">
        <InfoRow label="Invoice Number" value={<span className="font-mono">{invoice.invoice_number}</span>} />
        <InfoRow label="Payment Method" value={invoice.payment_method} />
        <InfoRow label="Currency" value={invoice.currency_type.toUpperCase()} />
        <InfoRow label="Subtotal" value={formatCurrency(invoice.subtotal_amount)} />
        {invoice.discount_amount > 0 && invoice.coupon_code && (
          <InfoRow
            label="Coupon"
            value={
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-mono text-xs font-semibold tracking-wide text-success-600 dark:text-success-400">
                  {invoice.coupon_code}
                </span>
                {invoice.coupon_name && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {invoice.coupon_name}
                  </span>
                )}
                <span className="text-sm font-semibold text-success-600 dark:text-success-400">
                  -{formatCurrency(invoice.discount_amount)}
                </span>
              </div>
            }
          />
        )}
        {invoice.credit_amount > 0 && (
          <InfoRow
            label="Credits Applied"
            value={<span className="text-success-600 dark:text-success-400">-{formatCurrency(invoice.credit_amount)}</span>}
          />
        )}
        <InfoRow
          label="Total"
          value={<span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total_amount)}</span>}
        />
        {invoice.date_issued && <InfoRow label="Date Issued" value={formatDate(invoice.date_issued)} />}
        {invoice.date_due && <InfoRow label="Due Date" value={formatDate(invoice.date_due)} />}
        {invoice.date_paid && (
          <InfoRow
            label="Date Paid"
            value={<span className="text-success-600 dark:text-success-400">{formatDate(invoice.date_paid)}</span>}
          />
        )}
      </dl>
    </div>
  );
};

const AdminOrderDetailContent: React.FC<AdminOrderDetailContentProps> = ({ order_id }) => {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [current_status, setCurrentStatus] = useState<OrderStatus | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAdminOrder(order_id);
        setOrder(data);
        setCurrentStatus(data.status);
      } catch {
        setError("We couldn't load this order. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [order_id]);

  const effective_status = current_status ?? order?.status ?? "pending";
  const status_config = order ? getStatusConfig(effective_status) : null;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        <BackIcon />
        Back to Orders
      </Link>

      {/* Loading State */}
      {is_loading && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-8 w-64" />
              <SkeletonBlock className="h-4 w-80" />
            </div>
            <SkeletonBlock className="h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-4 lg:col-span-8">
              <SkeletonBlock className="h-48" />
              <SkeletonBlock className="h-32" />
            </div>
            <div className="col-span-12 space-y-4 lg:col-span-4">
              <SkeletonBlock className="h-40" />
              <SkeletonBlock className="h-48" />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
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

      {/* Main Content */}
      {!is_loading && order && status_config && (
        <>
          {/* Page Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
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
                <span className="font-mono text-gray-700 dark:text-gray-300">{order.id}</span>
                {" "}&middot; Placed on {formatDate(order.created_at)}
              </p>
            </div>
            <Link
              href={`/admin/orders/${order.id}/tracking`}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Manage Tracking
            </Link>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="col-span-12 space-y-5 lg:col-span-8">
              {/* Customer Info */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                  <span className="text-gray-400 dark:text-gray-500">
                    <UserIcon />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Customer
                  </h3>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                      >
                        View User
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <OrderItemsTable items={order.items} />

              {/* Notes */}
              {order.order_notes && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
                    Order Notes
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{order.order_notes}</p>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="col-span-12 space-y-5 lg:col-span-4">
              {/* Order Summary */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Order Summary</h3>
                </div>
                <dl className="px-5 py-1">
                  <InfoRow label="Status" value={
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      effective_status === "pending" ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400" :
                      effective_status === "processing" ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400" :
                      effective_status === "completed" ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" :
                      "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                    }`}>{effective_status}</span>
                  } />
                  <InfoRow label="Items" value={`${order.items.length} item${order.items.length !== 1 ? "s" : ""}`} />
                  <InfoRow label="Placed" value={formatDate(order.created_at)} />
                  <InfoRow label="Last Updated" value={formatDate(order.updated_at)} />
                  <InfoRow label="Subtotal" value={formatCurrency(order.subtotal_amount)} />
                  {order.coupon && (
                    <InfoRow
                      label="Coupon"
                      value={
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-mono text-xs font-semibold tracking-wide text-success-600 dark:text-success-400">
                            {order.coupon.coupon_code}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {order.coupon.coupon_name} &middot; {formatCouponDiscount(order.coupon)}
                          </span>
                          <span className="text-sm font-semibold text-success-600 dark:text-success-400">
                            -{formatCurrency(order.discount_amount)}
                          </span>
                        </div>
                      }
                    />
                  )}
                  <InfoRow
                    label="Total"
                    value={<span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(order.total_amount)}</span>}
                  />
                </dl>
              </div>

              {/* Invoice Card */}
              {order.invoice && <InvoiceCard invoice={order.invoice} />}

              {/* Billing Address */}
              {order.billing && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Billing Address</h3>
                  </div>
                  <address className="space-y-0.5 px-5 py-4 text-sm not-italic text-gray-600 dark:text-gray-400">
                    {order.billing.company && (
                      <p className="font-medium text-gray-800 dark:text-white/80">{order.billing.company}</p>
                    )}
                    <p>{order.billing.address}</p>
                    <p>
                      {order.billing.city}, {order.billing.state} {order.billing.postal_code}
                    </p>
                    <p>{order.billing.country}</p>
                  </address>
                </div>
              )}

              {/* Payment Intent */}
              {order.payment_intent_id && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
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

          {/* Order Tracking / Activity Panel */}
          <OrderTrackingPanel
            order_id={order.id}
            current_status={effective_status}
            onStatusChange={(new_status) => setCurrentStatus(new_status)}
          />
        </>
      )}
    </div>
  );
};

export default AdminOrderDetailContent;
