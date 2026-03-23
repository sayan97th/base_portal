"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { OrderReport, UpdateReportRowPayload } from "@/types/admin/order-report";
import type { OrderStatus, AdminOrder } from "@/types/admin";
import {
  getOrderReport,
  updateReportRow,
} from "@/services/admin/order-report.service";
import { getAdminOrder } from "@/services/admin/order.service";
import { updateOrderStatus } from "@/services/admin/order-tracking.service";
import ReportTableCard from "./ReportTableCard";
import CompleteOrderModal from "./CompleteOrderModal";
import ChangeOrderStatusModal from "./ChangeOrderStatusModal";

interface AdminOrderReportContentProps {
  order_id: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const TableIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 12H6m0 0v1.5m0-1.5C6 12.504 6.504 13.125 7.125 13.125m-3 0h1.5m-1.5 0C3.996 13.125 3.375 13.629 3.375 14.25v1.5c0 .621.504 1.125 1.125 1.125h1.5" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowsIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
  </svg>
);

// ── Status badge config ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: {
    label: "Pending",
    bg: "bg-warning-50 dark:bg-warning-500/10",
    text: "text-warning-700 dark:text-warning-400",
    dot: "bg-warning-500",
  },
  processing: {
    label: "Processing",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    bg: "bg-success-50 dark:bg-success-500/10",
    text: "text-success-700 dark:text-success-400",
    dot: "bg-success-500",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-error-50 dark:bg-error-500/10",
    text: "text-error-700 dark:text-error-400",
    dot: "bg-error-500",
  },
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "info";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
}

function Toast({ message, variant = "success" }: ToastProps) {
  const styles: Record<ToastVariant, { wrapper: string; icon_color: string }> = {
    success: {
      wrapper: "border-success-200 bg-success-50 dark:border-success-500/20 dark:bg-success-500/10",
      icon_color: "text-success-500",
    },
    info: {
      wrapper: "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
      icon_color: "text-blue-500",
    },
  };
  const s = styles[variant];
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.wrapper}`}>
      <svg className={`h-5 w-5 shrink-0 ${s.icon_color}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className={`text-sm font-medium ${variant === "success" ? "text-success-700 dark:text-success-400" : "text-blue-700 dark:text-blue-400"}`}>
        {message}
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminOrderReportContent({ order_id }: AdminOrderReportContentProps) {
  const [report, setReport] = useState<OrderReport | null>(null);
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Complete order modal
  const [is_complete_modal_open, setIsCompleteModalOpen] = useState(false);
  const [is_completing, setIsCompleting] = useState(false);

  // Change status modal
  const [is_status_modal_open, setIsStatusModalOpen] = useState(false);
  const [is_updating_status, setIsUpdatingStatus] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [report_data, order_data] = await Promise.all([
        getOrderReport(order_id),
        getAdminOrder(order_id),
      ]);
      setReport(report_data);
      setOrder(order_data);
    } catch {
      setError("Failed to load the report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [order_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Row Edit ────────────────────────────────────────────────────────────────

  async function handleEditRow(table_id: string, row_id: string, payload: UpdateReportRowPayload) {
    const updated_row = await updateReportRow(order_id, table_id, row_id, payload);
    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tables: prev.tables.map((t) =>
          t.id === table_id
            ? { ...t, rows: t.rows.map((r) => (r.id === row_id ? updated_row : r)) }
            : t
        ),
      };
    });
  }

  // ── Complete Order ──────────────────────────────────────────────────────────

  async function handleCompleteOrder(notify_user: boolean) {
    setIsCompleting(true);
    try {
      await updateOrderStatus(order_id, "completed", notify_user);
      setOrder((prev) => (prev ? { ...prev, status: "completed" } : prev));
      setIsCompleteModalOpen(false);
      showToast(
        notify_user
          ? "Order marked as completed. The client has been notified."
          : "Order marked as completed.",
        "success"
      );
    } catch {
      // keep modal open on error
    } finally {
      setIsCompleting(false);
    }
  }

  // ── Change Status ────────────────────────────────────────────────────────────

  async function handleChangeStatus(new_status: OrderStatus, notify_user: boolean) {
    setIsUpdatingStatus(true);
    try {
      await updateOrderStatus(order_id, new_status, notify_user);
      setOrder((prev) => (prev ? { ...prev, status: new_status } : prev));
      setIsStatusModalOpen(false);
      const status_label = new_status.charAt(0).toUpperCase() + new_status.slice(1);
      showToast(
        notify_user
          ? `Order status updated to ${status_label}. The client has been notified.`
          : `Order status updated to ${status_label}.`,
        "info"
      );
    } catch {
      // keep modal open on error
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const current_status = order?.status ?? "pending";
  const is_already_completed = current_status === "completed";

  return (
    <>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href={`/admin/orders/${order_id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200"
        >
          <BackIcon />
          Back to Order
        </Link>

        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <TableIcon />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Order Report
              </h1>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Manage delivery details and finalize the order for the client
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Current status badge */}
            {!is_loading && order && (
              <OrderStatusBadge status={current_status} />
            )}

            {/* Change Status button */}
            <button
              onClick={() => setIsStatusModalOpen(true)}
              disabled={is_loading || !order}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700"
            >
              <ArrowsIcon />
              Change Status
            </button>

            {/* Mark as Completed — hidden when already completed */}
            {!is_already_completed && (
              <button
                onClick={() => setIsCompleteModalOpen(true)}
                disabled={is_loading || !order}
                className="inline-flex items-center gap-2 rounded-xl bg-success-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-success-500/20 transition hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-success-600 dark:hover:bg-success-500"
              >
                <CheckCircleIcon />
                Mark as Completed
              </button>
            )}

            {/* Completed badge — shown instead of button once done */}
            {is_already_completed && !is_loading && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-2.5 text-sm font-semibold text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400">
                <CheckCircleIcon />
                Order Completed
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && <Toast message={toast.message} variant={toast.variant} />}

        {/* Error State */}
        {!is_loading && error && (
          <div className="rounded-xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
            <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {is_loading && <LoadingSkeleton />}

        {/* Tables */}
        {!is_loading && report && (
          <>
            {report.tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-white/[0.02]">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <TableIcon />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  No link building data yet
                </h3>
                <p className="mt-1.5 max-w-xs text-sm text-gray-500 dark:text-gray-400">
                  Tables are automatically generated from the client&apos;s link building order. No items have been submitted yet.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {report.tables.map((table) => (
                  <ReportTableCard
                    key={table.id}
                    table={table}
                    onEditRow={handleEditRow}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Complete Order Modal */}
      <CompleteOrderModal
        is_open={is_complete_modal_open}
        is_submitting={is_completing}
        order_id={order_id}
        user={order?.user ?? null}
        onConfirm={handleCompleteOrder}
        onClose={() => setIsCompleteModalOpen(false)}
      />

      {/* Change Status Modal */}
      <ChangeOrderStatusModal
        is_open={is_status_modal_open}
        is_submitting={is_updating_status}
        current_status={current_status}
        onConfirm={handleChangeStatus}
        onClose={() => setIsStatusModalOpen(false)}
      />
    </>
  );
}
