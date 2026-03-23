"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { OrderReport, UpdateReportRowPayload } from "@/types/admin/order-report";
import type { OrderStatus, AdminOrder } from "@/types/admin";
import {
  getOrderReport,
  updateReportRow,
  importOrderItems,
} from "@/services/admin/order-report.service";
import { getAdminOrder } from "@/services/admin/order.service";
import { updateOrderStatus } from "@/services/admin/order-tracking.service";
import ReportTableCard from "./ReportTableCard";
import CompleteOrderModal from "./CompleteOrderModal";
import ChangeOrderStatusModal from "./ChangeOrderStatusModal";
import ImportOrderItemsModal from "./ImportOrderItemsModal";

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

const DotsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
  </svg>
);

const ImportIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
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

function Toast({ message, variant = "success" }: { message: string; variant?: ToastVariant }) {
  const styles: Record<ToastVariant, { wrapper: string; icon_color: string; text: string }> = {
    success: {
      wrapper: "border-success-200 bg-success-50 dark:border-success-500/20 dark:bg-success-500/10",
      icon_color: "text-success-500",
      text: "text-success-700 dark:text-success-400",
    },
    info: {
      wrapper: "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
      icon_color: "text-blue-500",
      text: "text-blue-700 dark:text-blue-400",
    },
  };
  const s = styles[variant];
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.wrapper}`}>
      <svg className={`h-5 w-5 shrink-0 ${s.icon_color}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className={`text-sm font-medium ${s.text}`}>{message}</p>
    </div>
  );
}

// ── Actions dropdown ──────────────────────────────────────────────────────────

interface ActionsMenuProps {
  disabled: boolean;
  has_incomplete_import: boolean;
  onImport: () => void;
}

function ActionsMenu({ disabled, has_incomplete_import, onImport }: ActionsMenuProps) {
  const [is_open, setIsOpen] = useState(false);
  const menu_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!is_open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menu_ref.current && !menu_ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [is_open]);

  return (
    <div ref={menu_ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={disabled}
        aria-label="More actions"
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          is_open
            ? "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        }`}
      >
        <DotsIcon />
        {/* Incomplete import indicator dot */}
        {has_incomplete_import && !disabled && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warning-500 ring-2 ring-white dark:ring-gray-800" />
        )}
      </button>

      {is_open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {/* Section label */}
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Report Tools
          </div>

          {/* Import order items */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onImport();
            }}
            className="group flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:group-hover:bg-brand-500/20">
              <ImportIcon />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Import Order Items
                </span>
                {has_incomplete_import && (
                  <span className="rounded-full bg-warning-100 px-1.5 py-0.5 text-[10px] font-semibold text-warning-700 dark:bg-warning-500/20 dark:text-warning-400">
                    Incomplete
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                Sync report rows from the original purchase
              </p>
            </div>
          </button>

          <div className="h-px bg-gray-100 dark:bg-gray-800" />

          {/* Footer hint */}
          <div className="px-3 py-2 text-[10px] text-gray-400 dark:text-gray-600">
            More actions available soon
          </div>
        </div>
      )}
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

  // Import modal
  const [is_import_modal_open, setIsImportModalOpen] = useState(false);
  const [is_importing, setIsImporting] = useState(false);

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

  // ── Import Order Items ──────────────────────────────────────────────────────

  async function handleImportItems(placement_ids: string[]) {
    setIsImporting(true);
    try {
      const result = await importOrderItems(order_id, { placement_ids });
      setReport(result.report);
      setIsImportModalOpen(false);
      showToast(
        `Successfully imported ${result.imported_count} row${result.imported_count !== 1 ? "s" : ""} into the report.`,
        "success"
      );
    } catch {
      // keep modal open on error
    } finally {
      setIsImporting(false);
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const current_status = order?.status ?? "pending";
  const is_already_completed = current_status === "completed";

  const total_report_rows = report?.tables.reduce((acc, t) => acc + t.rows.length, 0) ?? 0;

  // Count total placements from the order (what should be in the report)
  const total_order_placements =
    order?.items.reduce((acc, item) => acc + (item.placements?.length ?? item.quantity), 0) ?? 0;

  // Show "Incomplete" indicator when there are more placements than imported rows
  const has_incomplete_import =
    !is_loading &&
    !!order &&
    total_order_placements > 0 &&
    total_report_rows < total_order_placements;

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
            {!is_loading && order && <OrderStatusBadge status={current_status} />}

            {/* Change Status button */}
            <button
              onClick={() => setIsStatusModalOpen(true)}
              disabled={is_loading || !order}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700"
            >
              <ArrowsIcon />
              Change Status
            </button>

            {/* Mark as Completed */}
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

            {/* Completed static badge */}
            {is_already_completed && !is_loading && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-2.5 text-sm font-semibold text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400">
                <CheckCircleIcon />
                Order Completed
              </div>
            )}

            {/* 3-dot menu */}
            <ActionsMenu
              disabled={is_loading || !order}
              has_incomplete_import={has_incomplete_import}
              onImport={() => setIsImportModalOpen(true)}
            />
          </div>
        </div>

        {/* Incomplete import banner */}
        {has_incomplete_import && (
          <div className="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3.5 dark:border-warning-500/20 dark:bg-warning-500/10">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-warning-700 dark:text-warning-400">
                Report rows are missing
              </p>
              <p className="mt-0.5 text-xs text-warning-600 dark:text-warning-500">
                The order has <strong>{total_order_placements}</strong> placement{total_order_placements !== 1 ? "s" : ""} but only{" "}
                <strong>{total_report_rows}</strong> {total_report_rows === 1 ? "row has" : "rows have"} been imported.{" "}
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="font-semibold underline underline-offset-2 hover:text-warning-800 dark:hover:text-warning-300"
                >
                  Import missing placements now
                </button>
              </p>
            </div>
          </div>
        )}

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

      {/* Import Order Items Modal */}
      <ImportOrderItemsModal
        is_open={is_import_modal_open}
        is_importing={is_importing}
        items={order?.items ?? []}
        existing_row_count={total_report_rows}
        onConfirm={handleImportItems}
        onClose={() => setIsImportModalOpen(false)}
      />
    </>
  );
}
