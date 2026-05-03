"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import { getAdminOrder } from "@/services/admin/order.service";
import { listAdminOrders } from "@/services/admin/order.service";
import type {
  AdminOrder,
  AdminInvoice,
  OrderItem,
  OrderStatus,
  OrderCouponDetail,
  InvoiceCouponDiscount,
  AdminOrderProductType,
} from "@/types/admin";
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

const PRODUCT_TYPE_CONFIG: Record<
  AdminOrderProductType,
  { label: string; column_label: string; color: string; bg: string; border: string }
> = {
  link_building: {
    label: "Link Building",
    column_label: "Link / DR Tier",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    border: "border-violet-200 dark:border-violet-500/30",
  },
  new_content: {
    label: "New Content",
    column_label: "Content Package",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/30",
  },
  content_optimization: {
    label: "Content Optimization",
    column_label: "Optimization Package",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/30",
  },
  content_brief: {
    label: "Content Briefs",
    column_label: "Brief Package",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/30",
  },
};

function getItemPrimaryLabel(item: OrderItem): string {
  if (item.item_name) return item.item_name;
  if (item.dr_tier?.label) return item.dr_tier.label;
  if (item.dr_tier_id) return `DR Tier #${item.dr_tier_id}`;
  return `Item #${item.id}`;
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

const CartIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

interface InfoRowProps {
  label: React.ReactNode;
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
  coupons?: OrderCouponDetail[];
  total_amount?: number;
  product_type?: AdminOrderProductType | null;
  order_title?: string;
  order_id?: string;
}

const OrderItemsTable = ({ items, coupons, total_amount, product_type, order_title, order_id }: OrderItemsTableProps) => {
  const items_subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const coupon_total = coupons?.reduce((sum, c) => sum + c.discount_amount, 0) ?? 0;
  const bulk_discount_amount = Math.max(
    0,
    Math.round((items_subtotal - (total_amount ?? items_subtotal) - coupon_total) * 100) / 100
  );
  const has_bulk_discount = bulk_discount_amount > 0;
  const has_coupons = coupons && coupons.length > 0;
  const has_any_discount = has_bulk_discount || !!has_coupons;

  const type_cfg = product_type ? PRODUCT_TYPE_CONFIG[product_type] : null;
  const column_label = type_cfg?.column_label ?? "Product";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      {/* Product type identity strip */}
      {type_cfg && (
        <div className={`flex items-center gap-3 border-b px-5 py-2.5 ${type_cfg.bg} ${type_cfg.border}`}>
          <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${type_cfg.bg} ${type_cfg.color} ${type_cfg.border}`}>
            {type_cfg.label}
          </span>
          {order_title && (
            <span className={`text-xs font-medium ${type_cfg.color}`}>{order_title}</span>
          )}
          <span className={`text-xs ${type_cfg.color} opacity-70 ml-auto`}>
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
          {product_type === "new_content" && order_id && (
            <Link
              href={`/admin/new-content/orders/${order_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              View Keywords
            </Link>
          )}
        </div>
      )}

      {!type_cfg && (
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Order Items
            <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {items.length}
            </span>
          </h3>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                #
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {column_label}
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
                  <div>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                      type_cfg
                        ? `border ${type_cfg.border} ${type_cfg.bg} ${type_cfg.color}`
                        : "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                    }`}>
                      {getItemPrimaryLabel(item)}
                    </span>
                    {item.dr_tier && product_type === "link_building" && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400 dark:text-gray-500">
                        <span>DR {item.dr_tier.traffic_range}</span>
                        <span className="text-gray-200 dark:text-gray-700">·</span>
                        <span>{item.dr_tier.word_count.toLocaleString()} words</span>
                        <span className="text-gray-200 dark:text-gray-700">·</span>
                        <span>{formatCurrency(item.dr_tier.price_per_link)}/link</span>
                        {item.placements && item.placements.length > 0 && (
                          <>
                            <span className="text-gray-200 dark:text-gray-700">·</span>
                            <span className="font-medium text-violet-500 dark:text-violet-400">
                              {item.placements.length} placement{item.placements.length !== 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
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
            {has_any_discount ? (
              <>
                <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <td colSpan={4} className="px-5 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    Subtotal
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                    {formatCurrency(items_subtotal)}
                  </td>
                </tr>
                {has_bulk_discount && (
                  <tr className="bg-violet-50/40 dark:bg-violet-500/5">
                    <td colSpan={4} className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <svg className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                        </svg>
                        <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                          Bulk Discount (10% off)
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                      -{formatCurrency(bulk_discount_amount)}
                    </td>
                  </tr>
                )}
                {has_coupons && coupons.map((coupon) => (
                  <tr key={coupon.coupon_id} className="bg-emerald-50/40 dark:bg-emerald-500/5">
                    <td colSpan={4} className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                        </svg>
                        <span className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {coupon.code}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}% off`
                            : "Fixed discount"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      -{formatCurrency(coupon.discount_amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <td colSpan={4} className="px-5 py-3.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Total
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(total_amount ?? items_subtotal)}
                  </td>
                </tr>
              </>
            ) : (
              <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <td colSpan={4} className="px-5 py-3.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total
                </td>
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

// ── Session Items View ─────────────────────────────────────────────────────────
// Shown when the current order belongs to a multi-order session.
// Renders one OrderItemsTable per order so all items are visible at once.

interface SessionItemsViewProps {
  session_orders: AdminOrder[];
  session_title: string | null;
}

const SessionItemsView = ({ session_orders, session_title }: SessionItemsViewProps) => {
  const total_items = session_orders.reduce((s, o) => s + o.items.length, 0);
  const session_total = session_orders.reduce((s, o) => s + o.total_amount, 0);

  const unique_types = [
    ...new Set(
      session_orders
        .map((o) => o.product_type)
        .filter((t): t is AdminOrderProductType => t != null)
    ),
  ];

  return (
    <div className="space-y-4">
      {/* Session banner */}
      <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/60 px-5 py-3.5 dark:border-brand-500/25 dark:bg-brand-500/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
            <CartIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">
              {session_title ?? "Multi-Product Purchase"}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-brand-600/80 dark:text-brand-400/80">
              <span>{session_orders.length} services</span>
              <span>·</span>
              <span>{total_items} {total_items === 1 ? "item" : "items"} total</span>
              {unique_types.length > 0 && (
                <>
                  <span>·</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {unique_types.map((pt) => {
                      const cfg = PRODUCT_TYPE_CONFIG[pt];
                      return (
                        <span
                          key={pt}
                          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
                        >
                          {cfg.label}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-brand-600/70 dark:text-brand-400/70">Session Total</p>
          <p className="text-base font-bold text-brand-700 dark:text-brand-300">
            {formatCurrency(session_total)}
          </p>
        </div>
      </div>

      {/* One table per order, all visible at once */}
      {session_orders.map((order) => (
        <div key={order.id}>
          <OrderItemsTable
            items={order.items}
            coupons={order.coupons}
            total_amount={order.total_amount}
            product_type={order.product_type}
            order_title={order.order_title}
            order_id={order.id}
          />
        </div>
      ))}
    </div>
  );
};

interface InvoiceCardProps {
  invoice: AdminInvoice;
}

const InvoiceCard = ({ invoice }: InvoiceCardProps) => {
  const status_styles: Record<string, string> = {
    paid:    "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    unpaid:  "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
    overdue: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    refund:  "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    void:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
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
        {invoice.discount_amount != null && invoice.discount_amount > 0 && (
          <InfoRow
            label={
              <span className="flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                Bulk Discount (10%)
              </span>
            }
            value={<span className="font-semibold tabular-nums text-violet-600 dark:text-violet-400">-{formatCurrency(invoice.discount_amount)}</span>}
          />
        )}
        {invoice.coupon_discounts && invoice.coupon_discounts.length > 0 && (
          <>
            {invoice.coupon_discounts.map((coupon: InvoiceCouponDiscount) => (
              <InfoRow
                key={coupon.code}
                label={
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {coupon.code}
                    </span>
                    <span className="text-xs">
                      {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : "Fixed"}
                    </span>
                  </span>
                }
                value={<span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">-{formatCurrency(coupon.discount_amount)}</span>}
              />
            ))}
          </>
        )}
        {invoice.credit_amount > 0 && (
          <InfoRow
            label="Credits Applied"
            value={<span className="text-emerald-600 dark:text-emerald-400">-{formatCurrency(invoice.credit_amount)}</span>}
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
  const [session_orders, setSessionOrders] = useState<AdminOrder[]>([]);
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

        if (data.session_id) {
          try {
            const session_data = await listAdminOrders({
              session_id: data.session_id,
              per_page: 50,
            });
            // Client-side guard: keep only orders that actually belong to this session
            const related = session_data.data.filter(
              (o) => o.session_id === data.session_id
            );
            setSessionOrders(related.length > 1 ? related : []);
          } catch {
            setSessionOrders([]);
          }
        }
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
  const product_type_cfg = order?.product_type ? PRODUCT_TYPE_CONFIG[order.product_type] : null;
  const is_session_view = session_orders.length > 1;

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
              {/* Product type indicator banner (single order) or session indicator */}
              {is_session_view ? (
                <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                    Multi-Product Purchase
                  </span>
                  <span className="text-xs text-brand-600/70 dark:text-brand-400/70">
                    · {session_orders.length} services
                  </span>
                </div>
              ) : product_type_cfg ? (
                <div className={`mb-2 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 ${product_type_cfg.bg} ${product_type_cfg.border}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    order.product_type === "link_building" ? "bg-violet-500" :
                    order.product_type === "new_content" ? "bg-blue-500" :
                    order.product_type === "content_optimization" ? "bg-emerald-500" :
                    "bg-amber-500"
                  }`} />
                  <span className={`text-xs font-semibold uppercase tracking-wide ${product_type_cfg.color}`}>
                    {product_type_cfg.label}
                  </span>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {is_session_view
                    ? (order.session_title ?? "Multi-Product Purchase")
                    : (order.order_title || "Order Details")}
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
                {is_session_view ? "Session" : "Order"} ID:{" "}
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {is_session_view ? order.session_id : order.id}
                </span>
                {" "}&middot; Placed on {formatDate(order.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/orders/${order.id}/report`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300 dark:hover:bg-white/[0.07]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 12H6m0 0v1.5m0-1.5C6 12.504 6.504 13.125 7.125 13.125m-3 0h1.5m-1.5 0C3.996 13.125 3.375 13.629 3.375 14.25v1.5c0 .621.504 1.125 1.125 1.125h1.5" />
                </svg>
                Manage Report
              </Link>
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
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="col-span-12 space-y-5 lg:col-span-8">
              {/* Customer Info */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
                      >
                        View User
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items — session view shows all orders; single view shows this order only */}
              {is_session_view ? (
                <SessionItemsView
                  session_orders={session_orders}
                  session_title={order.session_title ?? null}
                />
              ) : (
                <OrderItemsTable
                  items={order.items}
                  coupons={order.coupons}
                  total_amount={order.total_amount}
                  product_type={order.product_type}
                />
              )}

              {/* Notes */}
              {order.order_notes && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
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
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {is_session_view ? "This Order Summary" : "Order Summary"}
                  </h3>
                  {is_session_view && (
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      For order:{" "}
                      <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
                    </p>
                  )}
                </div>
                <dl className="px-5 py-1">
                  {/* Product type row */}
                  {product_type_cfg && (
                    <InfoRow
                      label="Product Type"
                      value={
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${product_type_cfg.bg} ${product_type_cfg.color} ${product_type_cfg.border}`}>
                          {product_type_cfg.label}
                        </span>
                      }
                    />
                  )}
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
                  {(() => {
                    const order_items_subtotal = order.items.reduce((s, i) => s + i.subtotal, 0);
                    const order_coupon_total = order.coupons?.reduce((s, c) => s + c.discount_amount, 0) ?? 0;
                    const order_bulk_discount = Math.max(
                      0,
                      Math.round(((order.subtotal_before_discount ?? order_items_subtotal) - order.total_amount - order_coupon_total) * 100) / 100
                    );
                    const order_total_savings = order_bulk_discount + order_coupon_total;
                    const show_breakdown = order_bulk_discount > 0 || (order.coupons && order.coupons.length > 0);

                    return show_breakdown ? (
                      <>
                        <InfoRow
                          label="Subtotal"
                          value={formatCurrency(order.subtotal_before_discount ?? order_items_subtotal)}
                        />
                        {order_bulk_discount > 0 && (
                          <InfoRow
                            label={
                              <span className="flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                                </svg>
                                Bulk Discount (10%)
                              </span>
                            }
                            value={<span className="font-semibold tabular-nums text-violet-600 dark:text-violet-400">-{formatCurrency(order_bulk_discount)}</span>}
                          />
                        )}
                        {order.coupons && order.coupons.length > 0 && (
                          <div className="border-t border-dashed border-gray-100 py-2 dark:border-gray-800">
                            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                              </svg>
                              Coupons Applied
                            </p>
                            {order.coupons.map((coupon: OrderCouponDetail) => (
                              <div key={coupon.coupon_id} className="flex items-center justify-between gap-2 py-0.5">
                                <dt className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                                    {coupon.code}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {coupon.discount_type === "percentage"
                                      ? `${coupon.discount_value}% off`
                                      : "Fixed discount"}
                                  </span>
                                </dt>
                                <dd className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                  -{formatCurrency(coupon.discount_amount)}
                                </dd>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t border-gray-100 py-2.5 dark:border-gray-800">
                          <dt className="text-sm text-gray-500 dark:text-gray-400">Total</dt>
                          <dd className="text-base font-bold text-gray-900 dark:text-white">
                            {formatCurrency(order.total_amount)}
                          </dd>
                        </div>
                        {order_total_savings > 0 && (
                          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                            <dt className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total savings</dt>
                            <dd className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                              -{formatCurrency(order_total_savings)}
                            </dd>
                          </div>
                        )}
                      </>
                    ) : (
                      <InfoRow
                        label="Total"
                        value={<span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(order.total_amount)}</span>}
                      />
                    );
                  })()}

                  {/* Session total row */}
                  {is_session_view && (
                    <div className="mt-1 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2.5 dark:border-brand-500/25 dark:bg-brand-500/10">
                      <dt className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                        Session Total ({session_orders.length} orders)
                      </dt>
                      <dd className="text-base font-bold text-brand-700 dark:text-brand-300">
                        {formatCurrency(session_orders.reduce((s, o) => s + o.total_amount, 0))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Invoice Card */}
              {order.invoice && <InvoiceCard invoice={order.invoice} />}

              {/* Billing Address */}
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
                    <p>
                      {order.billing.city}, {order.billing.state} {order.billing.postal_code}
                    </p>
                    <p>{order.billing.country}</p>
                  </address>
                </div>
              )}

              {/* Payment Intent */}
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
