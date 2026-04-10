"use client";

import React, { useEffect, useState } from "react";
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
import type {
  LinkBuildingOrderDetail,
  OrderCouponDetail,
  OrderItemDetail,
  OrderStatus,
} from "@/types/client/link-building";
import OrderProgressTimeline from "@/components/orders/OrderProgressTimeline";

interface LinkBuildingOrderDetailPageProps {
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

const CheckIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const LinkIcon = () => (
  <svg
    className="h-4 w-4"
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

interface OrderItemCardProps {
  item: OrderItemDetail;
  index: number;
}

const OrderItemCard: React.FC<OrderItemCardProps> = ({ item, index }) => {
  const [is_expanded, setIsExpanded] = useState(true);

  const filled_placements = item.placements.filter(
    (p) => p.keyword || p.landing_page
  );
  const empty_placements = item.quantity - filled_placements.length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Item Header */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {item.dr_tier.dr_label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatCurrency(item.unit_price)} per link &middot;{" "}
              {item.quantity} placement{item.quantity !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(item.subtotal)}
          </p>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${
              is_expanded ? "rotate-180" : ""
            }`}
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

      {/* Tier Meta Row */}
      <div className="grid grid-cols-2 gap-0 border-t border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-white/[0.01] sm:grid-cols-4">
        {[
          { label: "DR Tier", value: item.dr_tier.dr_label },
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

      {/* Placements Table */}
      {is_expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {filled_placements.length > 0 ? (
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
                    .map((placement) => (
                      <TableRow
                        key={placement.id ?? placement.row_index}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <TableCell className="px-4 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
                          {placement.row_index + 1}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                          {placement.keyword ? (
                            <span className="font-medium">
                              {placement.keyword}
                            </span>
                          ) : (
                            <span className="italic text-gray-400 dark:text-gray-600">
                              Not specified
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm">
                          {placement.landing_page ? (
                            <a
                              href={placement.landing_page}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-[260px] items-center gap-1 truncate text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                            >
                              <LinkIcon />
                              <span className="truncate">
                                {placement.landing_page}
                              </span>
                            </a>
                          ) : (
                            <span className="italic text-gray-400 dark:text-gray-600">
                              Not specified
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          {placement.exact_match ? (
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
          ) : null}

          {/* Empty placements notice */}
          {empty_placements > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {empty_placements} placement
                {empty_placements !== 1 ? "s" : ""} without keyword/URL — our
                team will follow up.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`}
  />
);

const LinkBuildingOrderDetailPage: React.FC<
  LinkBuildingOrderDetailPageProps
> = ({ order_id }) => {
  const [order, setOrder] = useState<LinkBuildingOrderDetail | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await linkBuildingService.fetchLinkBuildingOrderDetail(
          order_id
        );
        setOrder(data);
      } catch {
        setError("We couldn't load this order. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [order_id]);

  const total_links = order?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  // Derive bulk discount from: subtotal_before_discount − total_amount − Σ coupon_discounts
  const coupon_discount_total =
    order?.coupons?.reduce((s, c) => s + c.discount_amount, 0) ?? 0;
  const raw_subtotal =
    order?.subtotal_before_discount ??
    order?.items.reduce((s, i) => s + i.subtotal, 0) ??
    0;
  const bulk_discount_amount = Math.max(
    0,
    Math.round((raw_subtotal - (order?.total_amount ?? 0) - coupon_discount_total) * 100) / 100
  );
  const has_bulk_discount = total_links >= 10 && bulk_discount_amount > 0;
  const total_savings = bulk_discount_amount + coupon_discount_total;

  const status_config = order ? getStatusConfig(order.status) : null;

  const is_new_order = order?.status === "pending";

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/link-building"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <BackIcon />
        Back to Link Building
      </Link>

      {/* Loading State */}
      {is_loading && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-8 w-64" />
              <SkeletonBlock className="h-4 w-40" />
            </div>
            <SkeletonBlock className="h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-4 lg:col-span-8">
              <SkeletonBlock className="h-48" />
              <SkeletonBlock className="h-48" />
            </div>
            <div className="col-span-12 space-y-4 lg:col-span-4">
              <SkeletonBlock className="h-40" />
              <SkeletonBlock className="h-32" />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
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
      {!is_loading && order && status_config && (
        <>
          {/* Success Banner — shown on newly placed orders */}
          {is_new_order && (
            <div className="flex items-start gap-4 rounded-xl border border-success-200 bg-success-50 px-5 py-4 dark:border-success-500/20 dark:bg-success-500/10">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
                <CheckIcon />
              </span>
              <div>
                <p className="text-sm font-semibold text-success-700 dark:text-success-400">
                  Order placed successfully!
                </p>
                <p className="mt-0.5 text-sm text-success-600 dark:text-success-500">
                  Your order is being reviewed. Our team will reach out if any
                  information is needed before processing.
                </p>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {order.order_title ?? "Link Building Order"}
                </h1>
                <Badge
                  variant="light"
                  size="sm"
                  color={status_config.color}
                  startIcon={
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${status_config.dot}`}
                    />
                  }
                >
                  {status_config.label}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Order ID:{" "}
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {order.id}
                </span>{" "}
                &middot; Placed on {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left — Items */}
            <div className="col-span-12 space-y-4 lg:col-span-8">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                ORDER ITEMS ({order.items.length})
              </h2>
              {order.items.map((item, index) => (
                <OrderItemCard key={item.id} item={item} index={index} />
              ))}

              {/* Notes */}
              {order.order_notes && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-white/80">
                    Order Notes
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {order.order_notes}
                  </p>
                </div>
              )}

              {/* Order Progress Timeline */}
              <OrderProgressTimeline
                order_id={order.id}
                current_status={order.status}
              />
            </div>

            {/* Right — Summary & Billing */}
            <div className="col-span-12 space-y-4 lg:col-span-4">
              {/* Order Summary Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Order Summary
                </h3>
                <dl className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <dt className="text-sm text-gray-600 dark:text-gray-400">
                        {item.dr_tier.dr_label}{" "}
                        <span className="text-gray-400">
                          &times; {item.quantity}
                        </span>
                      </dt>
                      <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {formatCurrency(item.subtotal)}
                      </dd>
                    </div>
                  ))}

                  <div className="flex justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">
                      Subtotal
                    </dt>
                    <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {formatCurrency(order.subtotal_before_discount ?? order.items.reduce((s, i) => s + i.subtotal, 0))}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-2">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">
                      Total links
                    </dt>
                    <dd className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {total_links}
                    </dd>
                  </div>

                  {has_bulk_discount && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-sm font-medium text-violet-600 dark:text-violet-400">
                        Bulk Discount (10% off)
                      </dt>
                      <dd className="text-sm font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                        -{formatCurrency(bulk_discount_amount)}
                      </dd>
                    </div>
                  )}

                  {order.coupons && order.coupons.length > 0 && (
                    <>
                      <div className="border-t border-dashed border-gray-200 pt-3 dark:border-gray-700">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          <TagIcon />
                          Coupon discounts applied
                        </p>
                        <div className="space-y-2">
                          {order.coupons.map((coupon: OrderCouponDetail) => (
                            <div
                              key={coupon.coupon_id}
                              className="flex items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center rounded border border-emerald-300 bg-white px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-400">
                                    {coupon.code}
                                  </span>
                                </div>
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
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                    <dt className="text-base font-semibold text-gray-900 dark:text-white">
                      Total
                    </dt>
                    <dd className="text-base font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(order.total_amount)}
                    </dd>
                  </div>

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

              {/* Billing Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Billing Address
                </h3>
                <address className="space-y-0.5 text-sm not-italic text-gray-600 dark:text-gray-400">
                  {order.billing.company && (
                    <p className="font-medium text-gray-800 dark:text-white/80">
                      {order.billing.company}
                    </p>
                  )}
                  <p>{order.billing.address}</p>
                  <p>
                    {order.billing.city}, {order.billing.state}{" "}
                    {order.billing.postal_code}
                  </p>
                  <p>{order.billing.country}</p>
                </address>
              </div>

              {/* Order Meta Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Order Details
                </h3>
                <dl className="space-y-2.5">
                  {[
                    { label: "Status", value: status_config.label },
                    { label: "Placed", value: formatDate(order.created_at) },
                    {
                      label: "Last updated",
                      value: formatDate(order.updated_at),
                    },
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

              {/* Track order CTA */}
              <Link
                href={`/link-building/orders/${order.id}/tracking`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Track Order Progress
              </Link>

              {/* View Report CTA */}
              <Link
                href={`/link-building/orders/${order.id}/report`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.05]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                View Delivery Report
              </Link>

              {/* New order CTA */}
              <Link
                href="/link-building"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.05]"
              >
                Place Another Order
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LinkBuildingOrderDetailPage;
