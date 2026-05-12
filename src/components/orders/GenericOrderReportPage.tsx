"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import {
  fetchOrderByUuid,
  type DetectedOrderDetail,
} from "@/services/client/order-detail.service";
import { fetchOrderReportByType } from "@/services/client/order-report.service";
import type { OrderReport, ReportTable, ReportRow } from "@/types/admin/order-report";
import type { CartProductType } from "@/types/client/unified-cart";

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

const ROW_STATUS_CONFIG = {
  live: {
    label: "Live",
    bg: "bg-success-50 dark:bg-success-500/10",
    text: "text-success-700 dark:text-success-400",
    dot: "bg-success-500",
  },
  pending: {
    label: "Pending",
    bg: "bg-warning-50 dark:bg-warning-500/10",
    text: "text-warning-700 dark:text-warning-400",
    dot: "bg-warning-500",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-error-50 dark:bg-error-500/10",
    text: "text-error-700 dark:text-error-400",
    dot: "bg-error-500",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
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

const ExternalLinkIcon = () => (
  <svg
    className="h-3.5 w-3.5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
    />
  </svg>
);

const EmptyIcon = () => (
  <svg
    className="h-12 w-12 text-gray-300 dark:text-gray-600"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

// ─── Report Row Card ────────────────────────────────────────────────────────────

const ReportRowCard: React.FC<{ row: ReportRow; index: number }> = ({
  row,
  index,
}) => {
  const cfg = ROW_STATUS_CONFIG[row.status] ?? ROW_STATUS_CONFIG.pending;
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {index + 1}
          </span>
          <div>
            {row.keyword && (
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {row.keyword}
              </p>
            )}
            {row.landing_page && (
              <a
                href={row.landing_page}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
              >
                <ExternalLinkIcon />
                <span className="truncate max-w-[280px]">{row.landing_page}</span>
              </a>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {row.live_link && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-success-200 bg-success-50 px-3 py-2 dark:border-success-500/20 dark:bg-success-500/10">
          <svg
            className="h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
            />
          </svg>
          <a
            href={row.live_link}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs font-medium text-success-700 hover:underline dark:text-success-400"
          >
            {row.live_link}
          </a>
          {row.live_link_date && (
            <span className="ml-auto shrink-0 text-xs text-success-600 dark:text-success-500">
              Live since {formatDate(row.live_link_date)}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        {row.link_type && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>{" "}
            {row.link_type}
          </p>
        )}
        {row.dr !== null && row.dr !== undefined && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">DR:</span>{" "}
            {row.dr}
          </p>
        )}
        {row.exact_match && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Exact match
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Report Table Card ──────────────────────────────────────────────────────────

const ReportTableCard: React.FC<{ table: ReportTable; index: number }> = ({
  table,
  index,
}) => {
  const live_count = table.rows.filter((r) => r.status === "live").length;
  const pending_count = table.rows.filter((r) => r.status === "pending").length;
  const rejected_count = table.rows.filter((r) => r.status === "rejected").length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              {index + 1}
            </span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {table.title}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {live_count > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-success-600 dark:text-success-400">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                {live_count} live
              </span>
            )}
            {pending_count > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-warning-600 dark:text-warning-400">
                <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                {pending_count} pending
              </span>
            )}
            {rejected_count > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-error-600 dark:text-error-400">
                <span className="h-1.5 w-1.5 rounded-full bg-error-500" />
                {rejected_count} rejected
              </span>
            )}
          </div>
        </div>
        {table.description && (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {table.description}
          </p>
        )}
      </div>
      <div className="space-y-3 p-4">
        {table.rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
            No items in this section yet.
          </p>
        ) : (
          table.rows.map((row, i) => (
            <ReportRowCard key={row.id} row={row} index={i} />
          ))
        )}
      </div>
    </div>
  );
};

// ─── Summary Stats ──────────────────────────────────────────────────────────────

const ReportSummary: React.FC<{ report: OrderReport }> = ({ report }) => {
  const all_rows = report.tables.flatMap((t) => t.rows);
  const live = all_rows.filter((r) => r.status === "live").length;
  const pending = all_rows.filter((r) => r.status === "pending").length;
  const rejected = all_rows.filter((r) => r.status === "rejected").length;
  const total = all_rows.length;

  const stats = [
    { label: "Total Items", value: total, color: "text-gray-900 dark:text-white" },
    { label: "Live", value: live, color: "text-success-600 dark:text-success-400" },
    { label: "Pending", value: pending, color: "text-warning-600 dark:text-warning-400" },
    { label: "Rejected", value: rejected, color: "text-error-600 dark:text-error-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-white/3"
        >
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {stat.label}
          </p>
        </div>
      ))}
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
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-28 rounded-full" />
        <SkeletonBlock className="h-8 w-72" />
        <SkeletonBlock className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-20" />
        ))}
      </div>
      <SkeletonBlock className="h-48" />
      <SkeletonBlock className="h-64" />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

interface GenericOrderReportPageProps {
  order_id: string;
}

const GenericOrderReportPage: React.FC<GenericOrderReportPageProps> = ({
  order_id,
}) => {
  const router = useRouter();
  const [detected, setDetected] = useState<DetectedOrderDetail | null>(null);
  const [report, setReport] = useState<OrderReport | null>(null);
  const [report_not_found, setReportNotFound] = useState(false);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      setReportNotFound(false);
      try {
        const order_result = await fetchOrderByUuid(order_id);
        if (cancelled) return;
        setDetected(order_result);

        try {
          const report_result = await fetchOrderReportByType(
            order_id,
            order_result.product_type
          );
          if (!cancelled) setReport(report_result);
        } catch {
          if (!cancelled) setReportNotFound(true);
        }
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
                {title ?? `${type_cfg.label} Order`} — Delivery Report
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
              href={`/orders/${order_id}/tracking`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-600"
            >
              <BoltIcon />
              Track Order Progress
            </Link>
          </div>

          {/* Report not found state */}
          {report_not_found && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-white/3">
              <EmptyIcon />
              <h3 className="mt-4 text-base font-semibold text-gray-700 dark:text-white/80">
                Report not available yet
              </h3>
              <p className="mt-1.5 max-w-sm text-center text-sm text-gray-500 dark:text-gray-400">
                The delivery report for this order hasn&apos;t been published
                yet. It will appear here once our team completes the work.
              </p>
              <Link
                href={`/orders/${order_id}/tracking`}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
              >
                <BoltIcon />
                Track Order Progress
              </Link>
            </div>
          )}

          {/* Report content */}
          {report && !report_not_found && (
            <>
              {report.sent_at && (
                <div className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-3 dark:border-success-500/20 dark:bg-success-500/10">
                  <svg
                    className="h-4 w-4 shrink-0 text-success-600 dark:text-success-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-success-700 dark:text-success-400">
                    Report delivered on {formatDate(report.sent_at)}
                  </p>
                </div>
              )}

              <ReportSummary report={report} />

              {report.tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-white/3">
                  <EmptyIcon />
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    No report tables have been added yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.tables.map((table, i) => (
                    <ReportTableCard key={table.id} table={table} index={i} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default GenericOrderReportPage;
