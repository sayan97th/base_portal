"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminNewContentOrder } from "@/services/admin/new-content.service";
import type { AdminOrder, NewContentIntakeRow } from "@/types/admin";

interface AdminNewContentIntakeDataContentProps {
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

// ── Skeleton ───────────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminNewContentIntakeDataContent({ order_id }: AdminNewContentIntakeDataContentProps) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAdminNewContentOrder(order_id);
        setOrder(data);
      } catch {
        setError("We couldn't load the intake data for this order. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [order_id]);

  const items_with_intake = order?.items.filter(
    (item) => item.intake_rows && item.intake_rows.length > 0
  ) ?? [];

  const total_articles = items_with_intake.reduce(
    (sum, item) => sum + (item.intake_rows?.length ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/admin/new-content/orders/${order_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Order Details
      </Link>

      {/* Loading */}
      {is_loading && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-8 w-56" />
              <SkeletonBlock className="h-4 w-72" />
            </div>
            <SkeletonBlock className="h-10 w-32" />
          </div>
          <SkeletonBlock className="h-12 w-full" />
          <div className="space-y-8">
            <SkeletonBlock className="h-48 w-full" />
            <SkeletonBlock className="h-48 w-full" />
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
      {!is_loading && order && (
        <>
          {/* Page header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-500/30 dark:bg-blue-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  New Content
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Intake Form Data
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {order.order_title} · Placed on {formatDate(order.created_at)}
              </p>
            </div>

            {items_with_intake.length > 0 && (
              <button
                onClick={() => exportIntakeToCsv(order)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300 dark:hover:bg-white/[0.07]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export CSV
              </button>
            )}
          </div>

          {/* Summary bar */}
          {items_with_intake.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-blue-200 bg-blue-50/40 px-6 py-3 dark:border-blue-500/30 dark:bg-blue-500/5">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${style.border}`}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* No intake data state */}
          {items_with_intake.length === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-white/3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">No intake data</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  This order does not have any intake form data attached.
                </p>
              </div>
              <Link
                href={`/admin/new-content/orders/${order_id}`}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300"
              >
                Back to order
              </Link>
            </div>
          )}

          {/* Intake sections */}
          {items_with_intake.length > 0 && (
            <div className="space-y-10">
              {items_with_intake.map((item, item_index) => {
                const tier_label = item.item_name ?? `Package ${item_index + 1}`;
                const row_count = item.intake_rows?.length ?? 0;

                return (
                  <div key={item.id} className="space-y-4">
                    {/* Section header */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                        {item_index + 1}
                      </div>
                      <div className="flex flex-1 flex-wrap items-center gap-3">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                          {tier_label}
                        </h2>
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                          {row_count} {row_count === 1 ? "article" : "articles"}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Qty ordered: {item.quantity}
                        </span>
                      </div>
                    </div>

                    {/* Intake table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="w-full border-collapse text-sm">
                        <colgroup>
                          <col className="w-14" />
                          <col className="w-2/5" />
                          <col className="w-48" />
                          <col />
                        </colgroup>
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/60">
                            <th className="border-b border-r border-gray-200 py-3 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                              #
                            </th>
                            <th className="border-b border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                              Keyword Phrase
                            </th>
                            <th className="border-b border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                              Type of Content
                            </th>
                            <th className="border-b border-gray-200 px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
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
                                <td className="border-r border-gray-200 py-3.5 text-center text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                                  {row_index + 1}
                                </td>
                                <td className="border-r border-gray-200 px-5 py-3.5 dark:border-gray-700">
                                  {is_empty_keyword ? (
                                    <span className="italic text-gray-300 dark:text-gray-600">—</span>
                                  ) : (
                                    <span className="font-medium text-gray-800 dark:text-white/80">
                                      {row.keyword_phrase}
                                    </span>
                                  )}
                                </td>
                                <td className="border-r border-gray-200 px-5 py-3.5 dark:border-gray-700">
                                  {row.type_of_content ? (
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${type_style.bg} ${type_style.text} ${type_style.border}`}>
                                      {row.type_of_content}
                                    </span>
                                  ) : (
                                    <span className="italic text-gray-300 dark:text-gray-600">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5">
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
          )}

          {/* Footer summary */}
          {items_with_intake.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/30">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-200">{total_articles}</span>{" "}
                {total_articles === 1 ? "article" : "articles"} across{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{items_with_intake.length}</span>{" "}
                {items_with_intake.length === 1 ? "package" : "packages"}
              </p>
              <Link
                href={`/admin/new-content/orders/${order_id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300 dark:hover:bg-white/[0.07]"
              >
                Back to Order
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
