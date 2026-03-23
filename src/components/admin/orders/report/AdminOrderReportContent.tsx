"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { OrderReport, UpdateReportRowPayload } from "@/types/admin/order-report";
import {
  getOrderReport,
  updateReportRow,
  sendOrderReport,
} from "@/services/admin/order-report.service";
import ReportTableCard from "./ReportTableCard";

interface AdminOrderReportContentProps {
  order_id: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const SendIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const TableIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 12H6m0 0v1.5m0-1.5C6 12.504 6.504 13.125 7.125 13.125m-3 0h1.5m-1.5 0C3.996 13.125 3.375 13.629 3.375 14.25v1.5c0 .621.504 1.125 1.125 1.125h1.5" />
  </svg>
);

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

// ── Send Confirmation Modal ───────────────────────────────────────────────────

interface SendConfirmModalProps {
  is_open: boolean;
  is_sending: boolean;
  total_rows: number;
  already_sent: boolean;
  sent_at: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

function SendConfirmModal({
  is_open,
  is_sending,
  total_rows,
  already_sent,
  sent_at,
  onConfirm,
  onClose,
}: SendConfirmModalProps) {
  if (!is_open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
          <SendIcon />
        </div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {already_sent ? "Resend Report?" : "Send Report to Client"}
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {already_sent && sent_at
            ? `This report was previously sent on ${new Date(sent_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Sending again will notify the client with the latest data.`
            : `This will email the report (${total_rows} row${total_rows !== 1 ? "s" : ""} across all tables) to the client. This action cannot be undone.`}
        </p>
        {total_rows === 0 && (
          <div className="mt-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-xs font-medium text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-400">
            Warning: The report has no rows yet. Are you sure you want to send an empty report?
          </div>
        )}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={is_sending}
            className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {is_sending ? "Sending..." : "Send Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminOrderReportContent({ order_id }: AdminOrderReportContentProps) {
  const [report, setReport] = useState<OrderReport | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [is_send_modal_open, setIsSendModalOpen] = useState(false);
  const [is_sending, setIsSending] = useState(false);
  const [send_success, setSendSuccess] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getOrderReport(order_id);
      setReport(data);
    } catch {
      setError("Failed to load the report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [order_id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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

  // ── Send ────────────────────────────────────────────────────────────────────

  async function handleSendReport() {
    setIsSending(true);
    try {
      const res = await sendOrderReport(order_id);
      setReport((prev) => (prev ? { ...prev, sent_at: res.sent_at } : prev));
      setSendSuccess(true);
      setIsSendModalOpen(false);
      setTimeout(() => setSendSuccess(false), 4000);
    } catch {
      // keep modal open
    } finally {
      setIsSending(false);
    }
  }

  const total_rows = report?.tables.reduce((acc, t) => acc + t.rows.length, 0) ?? 0;

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
                Fill in delivery details and send the report to the client
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {report?.sent_at && (
              <div className="flex items-center gap-1.5 rounded-xl border border-success-200 bg-success-50 px-3 py-2 text-xs font-medium text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sent {new Date(report.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            )}

            <button
              onClick={() => setIsSendModalOpen(true)}
              disabled={is_loading || !report}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SendIcon />
              {report?.sent_at ? "Resend Report" : "Send Report"}
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {send_success && (
          <div className="flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3 dark:border-success-500/20 dark:bg-success-500/10">
            <svg className="h-5 w-5 shrink-0 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-success-700 dark:text-success-400">
              Report successfully sent to the client.
            </p>
          </div>
        )}

        {/* Error State */}
        {!is_loading && error && (
          <div className="rounded-xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
            <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
            <button
              onClick={fetchReport}
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

      <SendConfirmModal
        is_open={is_send_modal_open}
        is_sending={is_sending}
        total_rows={total_rows}
        already_sent={Boolean(report?.sent_at)}
        sent_at={report?.sent_at ?? null}
        onConfirm={handleSendReport}
        onClose={() => setIsSendModalOpen(false)}
      />
    </>
  );
}
