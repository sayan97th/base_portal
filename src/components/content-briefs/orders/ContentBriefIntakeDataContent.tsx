"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { contentBriefsService } from "@/services/client/content-briefs.service";
import {
  orderDetailsService,
  type KeywordUrlDetailsItem,
} from "@/services/client/order-details.service";
import type { ContentBriefOrderDetail } from "@/types/client/content-briefs";

interface ContentBriefIntakeDataContentProps {
  order_id: string;
}

// ── Editable row model ───────────────────────────────────────────────────────────

interface KeywordUrlEditableRow {
  primary_keyword: string;
  secondary_keywords: string;
  content_page_url: string;
  notes: string;
}

interface KeywordUrlEditableItem {
  item_id: string;
  label: string;
  quantity: number;
  rows: KeywordUrlEditableRow[];
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Build editable items (padding rows to item.quantity) ─────────────────────────

function buildEditableItems(order: ContentBriefOrderDetail): KeywordUrlEditableItem[] {
  return order.items.map((item, item_index) => {
    const existing = item.co_intake_rows ?? [];
    const row_count = Math.max(item.quantity, existing.length);
    const rows: KeywordUrlEditableRow[] = [];
    for (let i = 0; i < row_count; i++) {
      const source = existing[i] as
        | { primary_keyword?: string; secondary_keywords?: string; content_page_url?: string; notes?: string }
        | undefined;
      rows.push({
        primary_keyword: source?.primary_keyword ?? "",
        secondary_keywords: source?.secondary_keywords ?? "",
        content_page_url: source?.content_page_url ?? "",
        notes: source?.notes ?? "",
      });
    }
    return {
      item_id: item.id,
      label: item.tier?.label ?? `Tier ${item_index + 1}`,
      quantity: item.quantity,
      rows,
    };
  });
}

// ── CSV export ─────────────────────────────────────────────────────────────────

function exportIntakeToCsv(order_id: string, items: KeywordUrlEditableItem[]) {
  const rows: string[][] = [
    ["Item", "Tier", "#", "Primary Target Keyword", "Secondary Keyword(s)", "Current Live URL", "Notes"],
  ];

  items.forEach((item, item_index) => {
    item.rows.forEach((row, row_index) => {
      rows.push([
        String(item_index + 1),
        item.label,
        String(row_index + 1),
        row.primary_keyword,
        row.secondary_keywords,
        row.content_page_url,
        row.notes,
      ]);
    });
  });

  const csv_content = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv_content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cb-keywords-${order_id.slice(0, 8).toUpperCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

// ── Main component ─────────────────────────────────────────────────────────────

export default function ContentBriefIntakeDataContent({
  order_id,
}: ContentBriefIntakeDataContentProps) {
  const [order, setOrder] = useState<ContentBriefOrderDetail | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editable_items, setEditableItems] = useState<KeywordUrlEditableItem[]>([]);
  const [current_status, setCurrentStatus] = useState<string>("");
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await contentBriefsService.fetchOrderDetail(order_id);
        setOrder(data);
        setEditableItems(buildEditableItems(data));
        setCurrentStatus(data.status);
      } catch {
        setError("We couldn't load the keyword data for this order. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [order_id]);

  const total_rows = useMemo(
    () => editable_items.reduce((sum, item) => sum + item.rows.length, 0),
    [editable_items]
  );

  const filled_count = useMemo(
    () =>
      editable_items.reduce(
        (sum, item) =>
          sum +
          item.rows.filter(
            (r) => r.primary_keyword.trim() !== "" && r.content_page_url.trim() !== ""
          ).length,
        0
      ),
    [editable_items]
  );

  const is_pending_details = current_status === "pending_details";

  const handleChange = (
    item_id: string,
    row_index: number,
    field: keyof KeywordUrlEditableRow,
    value: string
  ) => {
    if (save_error) setSaveError(null);
    if (saved) setSaved(false);
    setEditableItems((prev) =>
      prev.map((item) =>
        item.item_id === item_id
          ? {
              ...item,
              rows: item.rows.map((row, index) =>
                index === row_index ? { ...row, [field]: value } : row
              ),
            }
          : item
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const payload: KeywordUrlDetailsItem[] = editable_items.map((item) => ({
        item_id: item.item_id,
        intake_rows: item.rows.map((row) => ({
          primary_keyword: row.primary_keyword.trim() || null,
          secondary_keywords: row.secondary_keywords.trim() || null,
          content_page_url: row.content_page_url.trim() || null,
          notes: row.notes.trim() || null,
        })),
      }));
      const result = await orderDetailsService.submitContentBrief(order_id, payload);
      setCurrentStatus(result.status);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSaveError("We couldn't save the details. Please review the fields and try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/content-refresh/content-briefs"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Content Briefs
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
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Content Brief
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                My Keywords
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {order.order_title
                  ? `${order.order_title} · `
                  : `Order ${order.id.slice(0, 8).toUpperCase()} · `}
                Placed on {formatDate(order.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
                {filled_count} / {total_rows} completed
              </span>
              {total_rows > 0 && (
                <button
                  onClick={() => exportIntakeToCsv(order.id, editable_items)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300 dark:hover:bg-white/[0.07]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {/* Status banners */}
          {saved && !is_pending_details && (
            <div className="flex items-start gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3 dark:border-success-500/25 dark:bg-success-500/10">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <p className="text-sm text-success-700 dark:text-success-300">
                Details submitted. This order is now in the work queue and the turnaround clock has
                started.
              </p>
            </div>
          )}

          {saved && is_pending_details && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/25 dark:bg-blue-500/10">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Progress saved. Fill in the primary keyword and current live URL for every page to
                move this order into the work queue.
              </p>
            </div>
          )}

          {is_pending_details && !saved && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/8">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This order is <span className="font-semibold">Pending Details</span>. Enter the
                primary target keyword and current live URL for each page below and save — the
                turnaround clock starts once the details are submitted.
              </p>
            </div>
          )}

          {save_error && (
            <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 dark:border-error-500/25 dark:bg-error-500/10">
              <p className="text-sm font-medium text-error-600 dark:text-error-400">{save_error}</p>
            </div>
          )}

          {/* Intake sections */}
          <div className="space-y-10">
            {editable_items.map((item, item_index) => (
              <div key={item.item_id} className="space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    {item_index + 1}
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      {item.label}
                    </h2>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {item.rows.length} {item.rows.length === 1 ? "page" : "pages"}
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
                      <col className="w-12" />
                      <col className="w-[24%]" />
                      <col className="w-[24%]" />
                      <col className="w-[28%]" />
                      <col />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60">
                        <th className="border-b border-r border-gray-200 py-2 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                          #
                        </th>
                        <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          Primary Target Keyword
                        </th>
                        <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          Secondary Keyword(s)
                        </th>
                        <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          Current Live URL
                        </th>
                        <th className="border-b border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.rows.map((row, row_index) => (
                        <tr
                          key={row_index}
                          className="border-b border-gray-100 bg-white last:border-b-0 dark:border-gray-800 dark:bg-gray-900"
                        >
                          <td className="border-r border-gray-200 py-1 text-center text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                            {row_index + 1}
                          </td>
                          <td className="border-r border-gray-200 px-2 py-1 dark:border-gray-700">
                            <input
                              type="text"
                              value={row.primary_keyword}
                              onChange={(e) => handleChange(item.item_id, row_index, "primary_keyword", e.target.value)}
                              placeholder="e.g. best running shoes"
                              className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:bg-gray-800"
                            />
                          </td>
                          <td className="border-r border-gray-200 px-2 py-1 dark:border-gray-700">
                            <input
                              type="text"
                              value={row.secondary_keywords}
                              onChange={(e) => handleChange(item.item_id, row_index, "secondary_keywords", e.target.value)}
                              placeholder="Comma-separated keywords"
                              className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:bg-gray-800"
                            />
                          </td>
                          <td className="border-r border-gray-200 px-2 py-1 dark:border-gray-700">
                            <input
                              type="text"
                              value={row.content_page_url}
                              onChange={(e) => handleChange(item.item_id, row_index, "content_page_url", e.target.value)}
                              placeholder="https://example.com/page"
                              className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:bg-gray-800"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) => handleChange(item.item_id, row_index, "notes", e.target.value)}
                              placeholder="Optional notes"
                              className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:bg-gray-800"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Save bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6 dark:border-gray-800">
            <Link
              href="/content-refresh/content-briefs"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={is_saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              {is_saving ? "Saving…" : "Save Details"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
