"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  fetchOrderByUuid,
  type DetectedOrderDetail,
} from "@/services/client/order-detail.service";
import type {
  OrderItemDetail,
  LinkBuildingOrderDetail,
  OrderDiscountDetail,
} from "@/types/client/link-building";
import type { CartProductType } from "@/types/client/unified-cart";
import OrderComments from "@/components/orders/OrderComments";
import OrderProgressTimeline from "@/components/orders/OrderProgressTimeline";

// ─── Types ─────────────────────────────────────────────────────────────────────

type GenericStatus =
  | "pending"
  | "new_request"
  | "processing"
  | "completed"
  | "cancelled"
  | "payment_pending";

interface ContentItem {
  id: string;
  label: string;
  meta: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// Generic coupon shape shared across all order types
interface GenericOrderCoupon {
  coupon_id: string;
  code: string;
  name: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

function getStatusConfig(status: string): {
  color: "warning" | "info" | "success" | "error";
  label: string;
  dot: string;
} {
  switch (status as GenericStatus) {
    case "pending":
    case "new_request":
      return { color: "info", label: "New Request", dot: "bg-teal-500" };
    case "processing":
      return { color: "info", label: "Processing", dot: "bg-blue-light-500" };
    case "completed":
      return { color: "success", label: "Completed", dot: "bg-success-500" };
    case "cancelled":
      return { color: "error", label: "Cancelled", dot: "bg-error-500" };
    case "payment_pending":
      return {
        color: "warning",
        label: "Payment Pending",
        dot: "bg-amber-500",
      };
    default:
      return { color: "info", label: status, dot: "bg-gray-400" };
  }
}

function getKeywordsLink(
  product_type: CartProductType,
  order_id: string
): string | null {
  if (product_type === "new_content")
    return `/new-content/orders/${order_id}/intake`;
  if (product_type === "content_optimization")
    return `/content-refresh/content-optimizations/orders/${order_id}/intake`;
  if (product_type === "content_brief")
    return `/content-refresh/content-briefs/orders/${order_id}/intake`;
  return null;
}

function buildContentItems(detected: DetectedOrderDetail): ContentItem[] {
  if (detected.product_type === "link_building") return [];

  if (detected.product_type === "new_content") {
    return detected.data.items.map((item) => ({
      id: item.id,
      label: item.tier.label,
      meta: `${item.tier.turnaround_time} turnaround`,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }));
  }

  if (detected.product_type === "content_optimization") {
    return detected.data.items.map((item) => ({
      id: item.id,
      label: item.tier.label,
      meta: `${item.tier.word_count_range} · ${item.tier.turnaround_days}d turnaround`,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }));
  }

  return detected.data.items.map((item) => ({
    id: item.id,
    label: item.tier.label,
    meta: `${item.tier.turnaround_days}d turnaround`,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
  }));
}

// Extract coupons from any detected order type
function getDetectedCoupons(detected: DetectedOrderDetail | null): GenericOrderCoupon[] {
  if (!detected) return [];
  const data = detected.data as { coupons?: GenericOrderCoupon[] };
  return data.coupons ?? [];
}

// Extract credit_amount from any detected order type
function getDetectedCreditAmount(detected: DetectedOrderDetail | null): number {
  if (!detected) return 0;
  const data = detected.data as { credit_amount?: number };
  return data.credit_amount ?? 0;
}

// Extract payment_method from any detected order type
function getDetectedPaymentMethod(detected: DetectedOrderDetail | null): string {
  if (!detected) return "Credit Card";
  const data = detected.data as { payment_method?: string };
  return data.payment_method ?? "Credit Card";
}

// Extract subtotal_before_discount from any detected order type
function getDetectedSubtotal(detected: DetectedOrderDetail | null): number {
  if (!detected) return 0;
  const data = detected.data as { subtotal_before_discount?: number; total_amount: number };
  return data.subtotal_before_discount ?? data.total_amount;
}

// Extract discounts from any detected order type
function getDetectedDiscounts(detected: DetectedOrderDetail | null): OrderDiscountDetail[] {
  if (!detected) return [];
  const data = detected.data as { discounts?: OrderDiscountDetail[] };
  return data.discounts ?? [];
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 19.5L8.25 12l7.5-7.5"
    />
  </svg>
);

const TagIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

const BoltIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
    />
  </svg>
);

const ReportIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
    />
  </svg>
);

const KeywordsIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.75a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
    />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
    />
  </svg>
);

const SparkleIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
    />
  </svg>
);

const WalletIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3m18 0H3"
    />
  </svg>
);

const CreditCardIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
    />
  </svg>
);

// ─── Link Building Item Card ────────────────────────────────────────────────────

const LBOrderItemCard: React.FC<{ item: OrderItemDetail; index: number }> = ({
  item,
  index,
}) => {
  const [is_expanded, setIsExpanded] = useState(true);
  const filled = item.placements.filter((p) => p.keyword || p.landing_page);
  const empty = item.quantity - filled.length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/2"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {item.dr_tier.label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatCurrency(item.unit_price)} per link &middot; {item.quantity}{" "}
              placement{item.quantity !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(item.subtotal)}
          </p>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${is_expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-0 border-t border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-white/1 sm:grid-cols-4">
        {[
          { label: "DR Tier", value: item.dr_tier.label },
          { label: "Traffic Range", value: item.dr_tier.traffic_range },
          { label: "Word Count", value: `${item.dr_tier.word_count} words` },
          { label: "Links", value: `${item.quantity}` },
        ].map((meta) => (
          <div
            key={meta.label}
            className="border-b border-r border-gray-100 px-4 py-2.5 last:border-r-0 dark:border-gray-800"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {meta.label}
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {meta.value}
            </p>
          </div>
        ))}
      </div>

      {is_expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {filled.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800/60">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="w-8 px-4 py-2.5 text-center text-xs font-medium text-gray-400 dark:text-gray-500"
                    >
                      #
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Keyword
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Landing Page
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Exact Match
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[...item.placements]
                    .sort((a, b) => a.row_index - b.row_index)
                    .map((p) => (
                      <TableRow
                        key={p.id ?? p.row_index}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-white/2"
                      >
                        <TableCell className="px-4 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
                          {p.row_index + 1}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                          {p.keyword ? (
                            <span className="font-medium">{p.keyword}</span>
                          ) : (
                            <span className="italic text-gray-400 dark:text-gray-600">
                              Not specified
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          {p.landing_page ? (
                            <a
                              href={p.landing_page}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-[260px] items-center gap-1 truncate text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                            >
                              <ExternalLinkIcon />
                              <span className="truncate">{p.landing_page}</span>
                            </a>
                          ) : (
                            <span className="italic text-gray-400 dark:text-gray-600">
                              Not specified
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          {p.exact_match ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-success-50 p-1 text-success-600 dark:bg-success-500/10 dark:text-success-400">
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={3}
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-full bg-gray-100 p-1 text-gray-400 dark:bg-gray-800 dark:text-gray-600">
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={3}
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
          {empty > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {empty} placement{empty !== 1 ? "s" : ""} without keyword/URL —
                our team will follow up.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Content Item Card ──────────────────────────────────────────────────────────

const ContentItemCard: React.FC<{ item: ContentItem; index: number }> = ({
  item,
  index,
}) => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          {index + 1}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {item.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{item.meta}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(item.subtotal)}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {item.quantity} &times; {formatCurrency(item.unit_price)}
        </p>
      </div>
    </div>
  </div>
);

// ─── Coupon Row ──────────────────────────────────────────────────────────────────

const CouponRow: React.FC<{ coupon: GenericOrderCoupon }> = ({ coupon }) => (
  <div className="flex items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/10">
    <div className="min-w-0">
      <span className="inline-flex items-center rounded border border-emerald-300 bg-white px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-400">
        {coupon.code}
      </span>
      <p className="mt-0.5 truncate text-xs text-emerald-600 dark:text-emerald-500">
        {coupon.name}
        {coupon.discount_type === "percentage"
          ? ` — ${coupon.discount_value}% off`
          : ""}
      </p>
    </div>
    <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
      -{formatCurrency(coupon.discount_amount)}
    </span>
  </div>
);

// ─── Payment Method Badge ────────────────────────────────────────────────────────

const PaymentMethodBadge: React.FC<{ payment_method: string }> = ({ payment_method }) => {
  const is_card = payment_method === "Credit Card";
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${
      is_card
        ? "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10"
        : "border-sky-200 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10"
    }`}>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${
        is_card
          ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
          : "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
      }`}>
        {is_card ? <CreditCardIcon /> : <WalletIcon />}
      </span>
      <div>
        <p className={`text-xs font-medium uppercase tracking-wide ${
          is_card ? "text-blue-500 dark:text-blue-400" : "text-sky-500 dark:text-sky-400"
        }`}>
          Payment Method
        </p>
        <p className={`text-sm font-semibold ${
          is_card ? "text-blue-700 dark:text-blue-300" : "text-sky-700 dark:text-sky-300"
        }`}>
          {is_card ? "Credit Card" : "Account Credits"}
        </p>
      </div>
    </div>
  );
};

// ─── Credits Panel ───────────────────────────────────────────────────────────────

const CreditsPanel: React.FC<{ credit_amount: number; payment_method: string }> = ({ credit_amount, payment_method }) => {
  const fully_credits = payment_method === "Account Balance";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 dark:border-sky-500/20 dark:bg-sky-500/10">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
          <WalletIcon />
        </span>
        <span className="text-sm font-medium text-sky-700 dark:text-sky-400">
          {fully_credits ? "Paid with Credits" : "Credits Applied"}
        </span>
      </div>
      <span className="text-sm font-semibold tabular-nums text-sky-700 dark:text-sky-400">
        -{formatCurrency(credit_amount)}
      </span>
    </div>
  );
};

// ─── Skeleton ───────────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`}
  />
);

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-28 rounded-full" />
          <SkeletonBlock className="h-8 w-72" />
          <SkeletonBlock className="h-4 w-48" />
        </div>
        <SkeletonBlock className="h-6 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-4 lg:col-span-8">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
        <div className="col-span-12 space-y-4 lg:col-span-4">
          <SkeletonBlock className="h-44" />
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-11 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

interface OrderDetailPageProps {
  order_id: string;
}

const OrderDetailPage: React.FC<OrderDetailPageProps> = ({ order_id }) => {
  const router = useRouter();
  const search_params = useSearchParams();
  const comment_id_param = search_params.get("comment_id");
  const target_comment_id = comment_id_param ? Number(comment_id_param) : null;
  const [detected, setDetected] = useState<DetectedOrderDetail | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchOrderByUuid(order_id);
        if (!cancelled) setDetected(result);
      } catch {
        if (!cancelled)
          setError("We couldn't load this order. Please try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [order_id]);

  const product_type: CartProductType = detected?.product_type ?? "new_content";
  const type_cfg = PRODUCT_TYPE_CONFIG[product_type];
  const is_lb = detected?.product_type === "link_building";
  const lb_data = is_lb ? (detected!.data as LinkBuildingOrderDetail) : null;

  const status = detected?.data.status ?? "";
  const title =
    (detected?.data as { order_title?: string | null })?.order_title ?? null;
  const notes = detected?.data.order_notes ?? null;
  const total_amount = detected?.data.total_amount ?? 0;
  const created_at = detected?.data.created_at ?? "";
  const updated_at =
    (detected?.data as { updated_at?: string })?.updated_at ?? "";
  const status_cfg = status ? getStatusConfig(status) : null;

  // Unified financial data extraction — works for all product types
  const all_coupons: GenericOrderCoupon[] = is_lb
    ? ((lb_data?.coupons as GenericOrderCoupon[]) ?? [])
    : getDetectedCoupons(detected);

  const all_discounts: OrderDiscountDetail[] = is_lb
    ? (lb_data?.discounts ?? [])
    : getDetectedDiscounts(detected);

  const credit_amount = is_lb
    ? (lb_data?.credit_amount ?? 0)
    : getDetectedCreditAmount(detected);

  const payment_method = is_lb
    ? (lb_data?.payment_method ?? "Credit Card")
    : getDetectedPaymentMethod(detected);

  const items_subtotal = is_lb
    ? (lb_data?.items.reduce((s, i) => s + i.subtotal, 0) ?? 0)
    : (detected && !is_lb ? buildContentItems(detected).reduce((s, i) => s + i.subtotal, 0) : 0);

  const raw_subtotal = is_lb
    ? (lb_data?.subtotal_before_discount ?? items_subtotal)
    : getDetectedSubtotal(detected);

  const coupon_discount_total = all_coupons.reduce((s, c) => s + c.discount_amount, 0);
  const discount_total = all_discounts.reduce((s, d) => s + d.discount_amount, 0);

  const total_links = lb_data?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const total_savings = discount_total + coupon_discount_total + credit_amount;
  const has_discounts_or_credits = discount_total > 0 || coupon_discount_total > 0 || credit_amount > 0;

  const content_items = detected && !is_lb ? buildContentItems(detected) : [];
  const keywords_link = detected
    ? getKeywordsLink(detected.product_type, order_id)
    : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/orders")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <BackIcon />
        Back to My Orders
      </button>

      {/* Loading */}
      {is_loading && <LoadingSkeleton />}

      {/* Error */}
      {!is_loading && error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Main Content */}
      {!is_loading && detected && status_cfg && (
        <>
          {/* Payment Pending Banner */}
          {status === "payment_pending" && (
            <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/25 dark:bg-amber-500/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                <svg
                  className="h-4 w-4 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Payment is pending for this order
                </p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                  Your order has been placed but payment has not been received
                  yet. Work will begin once payment is completed.
                </p>
                <Link
                  href="/invoices"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500 hover:text-white dark:border-amber-500/40 dark:bg-transparent dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white"
                >
                  Go to My Invoices
                </Link>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${type_cfg.bg} ${type_cfg.color}`}
                >
                  {type_cfg.label}
                </span>
                <Badge
                  variant="light"
                  size="sm"
                  color={status_cfg.color}
                  startIcon={
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${status_cfg.dot}`}
                    />
                  }
                >
                  {status_cfg.label}
                </Badge>
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {title ??
                  (is_lb
                    ? "Link Building Order"
                    : `${type_cfg.label} Order`)}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Order ID:{" "}
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {order_id}
                </span>
                {created_at && ` · Placed on ${formatDate(created_at)}`}
              </p>
            </div>
            {keywords_link && (
              <Link
                href={keywords_link}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-500 hover:text-white dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500 dark:hover:text-white"
              >
                <KeywordsIcon />
                View Keywords &amp; Intake
              </Link>
            )}
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left — Items + Notes + Timeline */}
            <div id="live-links" className="col-span-12 space-y-4 lg:col-span-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Order Items (
                {is_lb ? lb_data!.items.length : content_items.length})
              </h2>

              {is_lb
                ? lb_data!.items.map((item, i) => (
                    <LBOrderItemCard key={item.id} item={item} index={i} />
                  ))
                : content_items.map((item, i) => (
                    <ContentItemCard key={item.id} item={item} index={i} />
                  ))}

              {notes && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-white/80">
                    Order Notes
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {notes}
                  </p>
                </div>
              )}

              <OrderProgressTimeline
                order_id={order_id}
                current_status={status}
                product_type={product_type}
              />
            </div>

            {/* Right — Summary + Billing + Metadata + CTAs */}
            <div className="col-span-12 space-y-4 lg:col-span-4">
              {/* Order Summary */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Order Summary
                </h3>
                <dl className="space-y-3">
                  {/* Line items */}
                  {is_lb
                    ? lb_data!.items.map((item) => (
                        <div key={item.id} className="flex justify-between gap-2">
                          <dt className="text-sm text-gray-600 dark:text-gray-400">
                            {item.dr_tier.label}{" "}
                            <span className="text-gray-400">
                              &times; {item.quantity}
                            </span>
                          </dt>
                          <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {formatCurrency(item.subtotal)}
                          </dd>
                        </div>
                      ))
                    : content_items.map((item) => (
                        <div key={item.id} className="flex justify-between gap-2">
                          <dt className="text-sm text-gray-600 dark:text-gray-400">
                            {item.label}{" "}
                            <span className="text-gray-400">
                              &times; {item.quantity}
                            </span>
                          </dt>
                          <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {formatCurrency(item.subtotal)}
                          </dd>
                        </div>
                      ))}

                  {/* Subtotal row — shown when there are any discounts or credits */}
                  {has_discounts_or_credits && (
                    <div className="flex justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        Subtotal
                      </dt>
                      <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {formatCurrency(raw_subtotal)}
                      </dd>
                    </div>
                  )}

                  {/* LB-only rows */}
                  {is_lb && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        Total links
                      </dt>
                      <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {total_links}
                      </dd>
                    </div>
                  )}

                  {/* Applied discounts — all product types */}
                  {all_discounts.map((discount) => (
                    <div key={discount.name} className="flex justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                        <SparkleIcon />
                        {discount.name}{" "}
                        <span className="text-xs font-normal">
                          ({discount.discount_type === "percentage"
                            ? `${Math.round(discount.discount_rate)}% off`
                            : `${formatCurrency(discount.discount_rate)} off`})
                        </span>
                      </dt>
                      <dd className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                        -{formatCurrency(discount.discount_amount)}
                      </dd>
                    </div>
                  ))}

                  {/* Coupon discounts — all product types */}
                  {all_coupons.length > 0 && (
                    <div className={`space-y-2 ${has_discounts_or_credits && all_discounts.length === 0 ? "" : "border-t border-dashed border-gray-200 pt-3 dark:border-gray-700"}`}>
                      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        <TagIcon />
                        Coupon discounts applied
                      </p>
                      <div className="space-y-2">
                        {all_coupons.map((coupon) => (
                          <CouponRow key={coupon.coupon_id} coupon={coupon} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Credits applied — all product types */}
                  {credit_amount > 0 && (
                    <CreditsPanel credit_amount={credit_amount} payment_method={payment_method} />
                  )}

                  {/* Total */}
                  <div className="flex justify-between gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                    <dt className="text-base font-semibold text-gray-900 dark:text-white">
                      Total
                    </dt>
                    <dd className="text-base font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(total_amount)}
                    </dd>
                  </div>

                  {/* Total savings badge */}
                  {total_savings > 0 && (
                    <div className="flex justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                      <dt className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Total savings
                      </dt>
                      <dd className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                        -{formatCurrency(total_savings)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Billing Address (LB only) */}
              {is_lb && lb_data?.billing && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                  <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                    Billing Address
                  </h3>
                  <address className="space-y-0.5 text-sm not-italic text-gray-600 dark:text-gray-400">
                    {lb_data.billing.company && (
                      <p className="font-medium text-gray-800 dark:text-white/80">
                        {lb_data.billing.company}
                      </p>
                    )}
                    <p>{lb_data.billing.address}</p>
                    <p>
                      {lb_data.billing.city}, {lb_data.billing.state}{" "}
                      {lb_data.billing.postal_code}
                    </p>
                    <p>{lb_data.billing.country}</p>
                  </address>
                </div>
              )}

              {/* Payment Method */}
              <PaymentMethodBadge payment_method={payment_method} />

              {/* Order Metadata */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Order Details
                </h3>
                <dl className="space-y-2.5">
                  {[
                    { label: "Status", value: status_cfg.label },
                    {
                      label: "Placed",
                      value: created_at ? formatDate(created_at) : "—",
                    },
                    ...(updated_at
                      ? [
                          {
                            label: "Last updated",
                            value: formatDate(updated_at),
                          },
                        ]
                      : []),
                  ].map((field) => (
                    <div key={field.label} className="flex justify-between gap-4">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        {field.label}
                      </dt>
                      <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* CTAs */}
              <Link
                href={`/orders/${order_id}/tracking`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-600"
              >
                <BoltIcon />
                Track Order Progress
              </Link>
              <Link
                href={`/orders/${order_id}/report`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <ReportIcon />
                View Delivery Report
              </Link>
              {keywords_link && (
                <Link
                  href={keywords_link}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  <KeywordsIcon />
                  View Keywords &amp; Intake
                </Link>
              )}
            </div>
          </div>

          {/* Order Discussion */}
          <OrderComments
            purchase_type="single_order"
            order_id={order_id}
            target_comment_id={target_comment_id}
          />
        </>
      )}
    </div>
  );
};

export default OrderDetailPage;
