"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminContentOptimizationOrder } from "@/services/admin/content-optimization.service";
import type { AdminOrder, ContentOptimizationIntakeRow } from "@/types/admin";

interface AdminContentOptimizationIntakeDataContentProps {
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

// ── CSV export ─────────────────────────────────────────────────────────────────

function exportIntakeToCsv(order: AdminOrder) {
  const rows: string[][] = [
    ["Item", "Tier", "#", "Target Keyword", "Secondary Keywords", "Content Page URL"],
  ];

  order.items.forEach((item, item_index) => {
    const tier_label = item.item_name ?? `Item ${item_index + 1}`;
    (item.co_intake_rows ?? []).forEach((row, row_index) => {
      rows.push([
        String(item_index + 1),
        tier_label,
        String(row_index + 1),
        row.primary_keyword,
        row.secondary_keywords,
        row.content_page_url,
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
  link.download = `co-intake-${order.id.slice(0, 8).toUpperCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── URL display helper ─────────────────────────────────────────────────────────

function truncateUrl(url: string, max_length = 50): string {
  if (url.length <= max_length) return url;
  return url.slice(0, max_length) + "…";
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

// ── Intake row card (for mobile-friendly alternate view) ───────────────────────

interface IntakeSectionProps {
  tier_name: string;
  tier_index: number;
  rows: ContentOptimizationIntakeRow[];
  total_tiers: number;
}

function IntakeSection({ tier_name, tier_index, rows, total_tiers }: IntakeSectionProps) {
  const filled_rows = rows.filter((r) => r.primary_keyword.trim() || r.content_page_url.trim());
  const empty_count = rows.length - filled_rows.length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
          {tier_index + 1}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {tier_name}
          </h2>
          <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
            {rows.length} {rows.length === 1 ? "page" : "pages"}
          </span>
          {empty_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {empty_count} incomplete
            </span>
          )}
          {total_tiers > 1 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Form {tier_index + 1} of {total_tiers}
            </span>
          )}
        </div>
      </div>

      {/* Intake table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col className="w-12" />
            <col className="w-2/5" />
            <col className="w-2/5" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              <th className="border-b border-r border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                #
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Target Keyword
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Secondary Keywords
              </th>
              <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Content Page URL
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, row_index) => {
              const has_keyword = !!row.primary_keyword.trim();
              const has_url = !!row.content_page_url.trim();
              const is_incomplete = !has_keyword || !has_url;

              return (
                <tr
                  key={row_index}
                  className={`border-b border-gray-100 last:border-b-0 dark:border-gray-800 ${
                    is_incomplete
                      ? "bg-amber-50/40 dark:bg-amber-500/5"
                      : "bg-white dark:bg-gray-900"
                  }`}
                >
                  {/* Row number */}
                  <td className="border-r border-gray-200 py-2 text-center text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                    {row_index + 1}
                  </td>

                  {/* Target keyword */}
                  <td className="border-r border-gray-200 px-4 py-2 dark:border-gray-700">
                    {has_keyword ? (
                      <span className="font-medium text-gray-800 dark:text-white/80">
                        {row.primary_keyword}
                      </span>
                    ) : (
                      <span className="italic text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>

                  {/* Secondary keywords */}
                  <td className="border-r border-gray-200 px-4 py-2 dark:border-gray-700">
                    {row.secondary_keywords?.trim() ? (
                      <span className="text-gray-600 dark:text-gray-400">
                        {row.secondary_keywords}
                      </span>
                    ) : (
                      <span className="italic text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>

                  {/* Content page URL */}
                  <td className="px-4 py-2">
                    {has_url ? (
                      <a
                        href={row.content_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={row.content_page_url}
                        className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 hover:underline dark:text-violet-400 dark:hover:text-violet-300"
                      >
                        <span className="truncate">{truncateUrl(row.content_page_url)}</span>
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </a>
                    ) : (
                      <span className="italic text-gray-300 dark:text-gray-600">—</span>
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
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminContentOptimizationIntakeDataContent({
  order_id,
}: AdminContentOptimizationIntakeDataContentProps) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAdminContentOptimizationOrder(order_id);
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
    (item) => item.co_intake_rows && item.co_intake_rows.length > 0
  ) ?? [];

  const total_rows = items_with_intake.reduce(
    (sum, item) => sum + (item.co_intake_rows?.length ?? 0),
    0
  );

  const total_filled = items_with_intake.reduce((sum, item) => {
    return sum + (item.co_intake_rows ?? []).filter(
      (r) => r.primary_keyword.trim() && r.content_page_url.trim()
    ).length;
  }, 0);

  const completion_pct = total_rows > 0 ? Math.round((total_filled / total_rows) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/admin/content-optimization/orders/${order_id}`}
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
          <SkeletonBlock className="h-14 w-full" />
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
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 dark:border-violet-500/30 dark:bg-violet-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Content Optimization
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

          {/* Stats banner */}
          {items_with_intake.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Total pages */}
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-800 dark:bg-white/3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Pages</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{total_rows}</p>
              </div>

              {/* Completed */}
              <div className="rounded-xl border border-success-200 bg-success-50/60 px-4 py-3.5 dark:border-success-500/20 dark:bg-success-500/5">
                <p className="text-xs font-medium uppercase tracking-wide text-success-600 dark:text-success-400">Complete</p>
                <p className="mt-1 text-2xl font-bold text-success-700 dark:text-success-400">{total_filled}</p>
              </div>

              {/* Incomplete */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3.5 dark:border-amber-500/20 dark:bg-amber-500/5">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">Incomplete</p>
                <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">{total_rows - total_filled}</p>
              </div>

              {/* Completion rate */}
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3.5 dark:border-violet-500/20 dark:bg-violet-500/5">
                <p className="text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">Completion</p>
                <div className="mt-1 flex items-end gap-2">
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{completion_pct}%</p>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-violet-200 dark:bg-violet-800/40">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${completion_pct}%` }}
                  />
                </div>
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
                href={`/admin/content-optimization/orders/${order_id}`}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300"
              >
                Back to order
              </Link>
            </div>
          )}

          {/* Intake sections */}
          {items_with_intake.length > 0 && (
            <div className="space-y-10">
              {items_with_intake.map((item, item_index) => (
                <IntakeSection
                  key={item.id}
                  tier_name={item.item_name ?? `Tier ${item_index + 1}`}
                  tier_index={item_index}
                  rows={item.co_intake_rows ?? []}
                  total_tiers={items_with_intake.length}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
