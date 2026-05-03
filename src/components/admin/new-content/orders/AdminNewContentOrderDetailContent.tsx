"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import { getAdminNewContentOrder } from "@/services/admin/new-content.service";
import type { AdminOrder, AdminInvoice, OrderItem, OrderStatus, OrderCouponDetail, InvoiceCouponDiscount, NewContentIntakeRow } from "@/types/admin";

interface AdminNewContentOrderDetailContentProps {
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
    case "processing": return { color: "info", label: "Processing", dot: "bg-blue-light-500" };
    case "completed": return { color: "success", label: "Completed", dot: "bg-success-500" };
    case "cancelled": return { color: "error", label: "Cancelled", dot: "bg-error-500" };
  }
}

// ── Content type badge colors ──────────────────────────────────────────────────

const CONTENT_TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Blog Article": {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-500/30",
  },
  "Product Page": {
    bg: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-500/30",
  },
  "Home Page": {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-500/30",
  },
  "About Us Page": {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-500/30",
  },
  "Other": {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
  },
};

function getContentTypeStyle(type: string) {
  return CONTENT_TYPE_STYLES[type] ?? CONTENT_TYPE_STYLES["Other"];
}

// ── CSV export ─────────────────────────────────────────────────────────────────

function exportIntakeToCsv(order: AdminOrder) {
  const rows: string[][] = [["Item", "Tier", "#", "Keyword Phrase", "Type of Content", "Notes"]];

  order.items.forEach((item, item_index) => {
    const tier_label = item.item_name ?? `Item ${item_index + 1}`;
    (item.intake_rows ?? []).forEach((row, row_index) => {
      rows.push([
        String(item_index + 1),
        tier_label,
        String(row_index + 1),
        row.keyword_phrase,
        row.type_of_content,
        row.notes,
      ]);
    });
  });

  const csv_content = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv_content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `intake-${order.id.slice(0, 8).toUpperCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Intake Data Modal ──────────────────────────────────────────────────────────

interface IntakeDataModalProps {
  order: AdminOrder;
  on_close: () => void;
}

function IntakeDataModal({ order, on_close }: IntakeDataModalProps) {
  const overlay_ref = useRef<HTMLDivElement>(null);
  const total_articles = order.items.reduce(
    (sum, item) => sum + (item.intake_rows?.length ?? 0),
    0
  );
  const items_with_intake = order.items.filter(
    (item) => item.intake_rows && item.intake_rows.length > 0
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") on_close();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [on_close]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlay_ref.current) on_close();
  };

  if (items_with_intake.length === 0) {
    return (
      <div
        ref={overlay_ref}
        onClick={handleOverlayClick}
        className="fixed inset-0 z-99999 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60"
      >
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Intake Form Data</h2>
            <button onClick={on_close} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">No intake data</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This order does not have any intake form data attached.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={overlay_ref}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto p-4 py-10 backdrop-blur-sm bg-gray-900/70"
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Modal header */}
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 shadow-sm shadow-blue-500/30">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 12H6m0 0v1.5m0-1.5C6 12.504 6.504 13.125 7.125 13.125m-3 0h1.5m-1.5 0C3.996 13.125 3.375 13.629 3.375 14.25v1.5c0 .621.504 1.125 1.125 1.125h1.5" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Intake Form Data
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {order.order_title} ·{" "}
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {total_articles} {total_articles === 1 ? "article" : "articles"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Export CSV */}
              <button
                onClick={() => exportIntakeToCsv(order)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300 dark:hover:bg-white/[0.07]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export CSV
              </button>

              {/* Close */}
              <button
                onClick={on_close}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 bg-blue-50/40 px-6 py-2.5 dark:border-gray-800 dark:bg-blue-500/5">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{items_with_intake.length}</span>{" "}
                {items_with_intake.length === 1 ? "package" : "packages"} ·{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{total_articles}</span>{" "}
                {total_articles === 1 ? "article" : "articles"} total
              </span>
            </div>
            {/* Content type legend */}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {Object.entries(CONTENT_TYPE_STYLES).map(([type, style]) => (
                <span
                  key={type}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text} ${style.border}`}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal body */}
        <div className="space-y-8 p-6">
          {items_with_intake.map((item, item_index) => {
            const tier_label = item.item_name ?? `Package ${item_index + 1}`;
            const row_count = item.intake_rows?.length ?? 0;

            return (
              <div key={item.id} className="space-y-3">
                {/* Section header */}
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    {item_index + 1}
                  </div>
                  <div className="flex flex-1 items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tier_label}
                    </h3>
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                      {row_count} {row_count === 1 ? "article" : "articles"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Qty ordered: {item.quantity}
                    </span>
                  </div>
                </div>

                {/* Intake table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <colgroup>
                      <col className="w-12" />
                      <col />
                      <col className="w-44" />
                      <col />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60">
                        <th className="border-b border-r border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                          #
                        </th>
                        <th className="border-b border-r border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          Keyword Phrase
                        </th>
                        <th className="border-b border-r border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          Type of Content
                        </th>
                        <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.intake_rows ?? []).map((row: NewContentIntakeRow, row_index: number) => {
                        const type_style = getContentTypeStyle(row.type_of_content);
                        const is_empty_keyword = !row.keyword_phrase.trim();

                        return (
                          <tr
                            key={row_index}
                            className="border-b border-gray-100 bg-white last:border-b-0 dark:border-gray-800 dark:bg-gray-900"
                          >
                            <td className="border-r border-gray-200 py-3 text-center text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                              {row_index + 1}
                            </td>
                            <td className="border-r border-gray-200 px-4 py-3 dark:border-gray-700">
                              {is_empty_keyword ? (
                                <span className="italic text-gray-300 dark:text-gray-600">—</span>
                              ) : (
                                <span className="font-medium text-gray-800 dark:text-white/80">
                                  {row.keyword_phrase}
                                </span>
                              )}
                            </td>
                            <td className="border-r border-gray-200 px-4 py-3 dark:border-gray-700">
                              {row.type_of_content ? (
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${type_style.bg} ${type_style.text} ${type_style.border}`}>
                                  {row.type_of_content}
                                </span>
                              ) : (
                                <span className="italic text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {row.notes && row.notes.toLowerCase() !== "none" ? (
                                <span className="text-gray-600 dark:text-gray-400">{row.notes}</span>
                              ) : (
                                <span className="italic text-gray-300 dark:text-gray-600">
                                  {row.notes || "—"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/30">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-200">{total_articles}</span>{" "}
            {total_articles === 1 ? "article" : "articles"} across{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{items_with_intake.length}</span>{" "}
            {items_with_intake.length === 1 ? "package" : "packages"}
          </p>
          <button
            onClick={on_close}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300 dark:hover:bg-white/[0.07]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
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
    refund: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
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
    <div className="overflow-hidden rounded-xl border border-blue-200 bg-white dark:border-blue-500/30 dark:bg-white/3">
      {/* Header strip */}
      <div className="flex items-center gap-3 border-b border-blue-200 bg-blue-50 px-5 py-2.5 dark:border-blue-500/30 dark:bg-blue-500/10">
        <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          New Content
        </span>
        <span className="ml-auto text-xs text-blue-600/70 dark:text-blue-400/70">
          {items.length} {items.length === 1 ? "package" : "packages"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">#</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Content Package</th>
              <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Keywords</th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Qty</th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Unit Price</th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item, index) => {
              const intake_count = item.intake_rows?.length ?? 0;
              return (
                <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-xs text-gray-400 dark:text-gray-500">{index + 1}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                      {item.item_name ?? `Package ${index + 1}`}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {intake_count > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
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

export default function AdminNewContentOrderDetailContent({ order_id }: AdminNewContentOrderDetailContentProps) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intake_modal_open, setIntakeModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAdminNewContentOrder(order_id);
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
  const total_articles = order?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  const has_intake_data = order?.items.some((i) => i.intake_rows && i.intake_rows.length > 0) ?? false;
  const total_intake_rows = order?.items.reduce((sum, i) => sum + (i.intake_rows?.length ?? 0), 0) ?? 0;

  return (
    <>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/admin/new-content/orders"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to New Content Orders
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
                {/* Product type badge */}
                <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-500/30 dark:bg-blue-500/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    New Content
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
                <button
                  onClick={() => setIntakeModalOpen(true)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
                    has_intake_data
                      ? "bg-blue-500 text-white shadow-blue-500/25 hover:bg-blue-600"
                      : "cursor-not-allowed border border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-white/3"
                  }`}
                  disabled={!has_intake_data}
                  title={has_intake_data ? "View intake form data" : "No intake data available"}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 12H6m0 0v1.5m0-1.5C6 12.504 6.504 13.125 7.125 13.125m-3 0h1.5m-1.5 0C3.996 13.125 3.375 13.629 3.375 14.25v1.5c0 .621.504 1.125 1.125 1.125h1.5" />
                  </svg>
                  View Intake Data
                  {has_intake_data && (
                    <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-400/30 px-1.5 text-xs font-bold text-white">
                      {total_intake_rows}
                    </span>
                  )}
                </button>

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

            {/* Intake data callout — only when intake data exists */}
            {has_intake_data && (
              <div className="flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3.5 dark:border-blue-500/25 dark:bg-blue-500/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Intake Form Data Available
                  </p>
                  <p className="mt-0.5 text-xs text-blue-600/80 dark:text-blue-400/80">
                    This order includes{" "}
                    <span className="font-semibold">{total_intake_rows} keyword</span>{" "}
                    {total_intake_rows === 1 ? "entry" : "entries"} across{" "}
                    <span className="font-semibold">{total_articles}</span>{" "}
                    {total_articles === 1 ? "article" : "articles"}.
                  </p>
                </div>
                <button
                  onClick={() => setIntakeModalOpen(true)}
                  className="shrink-0 rounded-lg border border-blue-300 bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                >
                  View Intake Data →
                </button>
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
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
                        <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                          New Content
                        </span>
                      }
                    />
                    <InfoRow label="Status" value={
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        order.status === "pending" ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400" :
                        order.status === "processing" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
                        order.status === "completed" ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" :
                        "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                      }`}>{order.status}</span>
                    } />
                    <InfoRow label="Packages" value={`${order.items.length} ${order.items.length === 1 ? "package" : "packages"}`} />
                    <InfoRow
                      label="Articles"
                      value={
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{total_articles}</span>
                      }
                    />
                    {has_intake_data && (
                      <InfoRow
                        label="Keywords Entered"
                        value={
                          <button
                            onClick={() => setIntakeModalOpen(true)}
                            className="font-semibold text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {total_intake_rows} entries →
                          </button>
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

      {/* Intake data modal */}
      {intake_modal_open && order && (
        <IntakeDataModal order={order} on_close={() => setIntakeModalOpen(false)} />
      )}
    </>
  );
}
