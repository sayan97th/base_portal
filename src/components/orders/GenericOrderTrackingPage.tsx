"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import {
  fetchOrderByUuid,
  type DetectedOrderDetail,
} from "@/services/client/order-detail.service";
import type { CartProductType } from "@/types/client/unified-cart";
import OrderProgressTimeline from "@/components/orders/OrderProgressTimeline";

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

function getStatusConfig(status: string): {
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
    case "payment_pending":
      return { color: "warning", label: "Payment Pending", dot: "bg-amber-500" };
    default:
      return { color: "info", label: status, dot: "bg-gray-400" };
  }
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

// ─── Skeleton ───────────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`}
  />
);

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-28 rounded-full" />
        <SkeletonBlock className="h-8 w-64" />
        <SkeletonBlock className="h-4 w-48" />
      </div>
      <SkeletonBlock className="h-64" />
      <SkeletonBlock className="h-48" />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

interface GenericOrderTrackingPageProps {
  order_id: string;
}

const GenericOrderTrackingPage: React.FC<GenericOrderTrackingPageProps> = ({
  order_id,
}) => {
  const router = useRouter();
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
  const status = detected?.data.status ?? "";
  const title =
    (detected?.data as { order_title?: string | null })?.order_title ?? null;
  const created_at = detected?.data.created_at ?? "";
  const status_cfg = status ? getStatusConfig(status) : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push(`/orders/${order_id}`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <BackIcon />
        Back to Order
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
          {/* Header */}
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
                {title ?? `${type_cfg.label} Order`} — Tracking
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Order ID:{" "}
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {order_id}
                </span>
                {created_at && ` · Placed on ${formatDate(created_at)}`}
              </p>
            </div>
            <Link
              href={`/orders/${order_id}/report`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <ReportIcon />
              View Delivery Report
            </Link>
          </div>

          {/* Timeline */}
          <OrderProgressTimeline
            order_id={order_id}
            current_status={status}
            product_type={product_type}
          />
        </>
      )}
    </div>
  );
};

export default GenericOrderTrackingPage;
