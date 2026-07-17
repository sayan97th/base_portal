"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAdminContentOptimizationOrder } from "@/services/admin/content-optimization.service";
import { adminOrderDetailsService } from "@/services/admin/order-details.service";
import type { KeywordUrlDetailsItem } from "@/services/client/order-details.service";
import type { AdminOrder } from "@/types/admin";
import KeywordUrlIntakeSection, {
  type KeywordUrlEditableItem,
  type KeywordUrlEditableRow,
} from "@/components/shared/intake-data/KeywordUrlIntakeSection";

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

// ── Build editable items (padding rows to item.quantity) ─────────────────────────

function buildEditableItems(order: AdminOrder): KeywordUrlEditableItem[] {
  return order.items.map((item, item_index) => {
    const existing = item.co_intake_rows ?? [];
    const row_count = Math.max(item.quantity, existing.length);
    const rows: KeywordUrlEditableRow[] = [];
    for (let i = 0; i < row_count; i++) {
      const source = existing[i];
      rows.push({
        primary_keyword: source?.primary_keyword ?? "",
        secondary_keywords: source?.secondary_keywords ?? "",
        content_page_url: source?.content_page_url ?? "",
        notes: source?.notes ?? "",
      });
    }
    return {
      item_id: String(item.id),
      label: item.item_name ?? `Tier ${item_index + 1}`,
      quantity: item.quantity,
      rows,
    };
  });
}

// ── CSV export ─────────────────────────────────────────────────────────────────

function exportIntakeToCsv(order_id: string, items: KeywordUrlEditableItem[]) {
  const rows: string[][] = [
    ["Item", "Tier", "#", "Primary Keyword", "Secondary Keywords", "Content Page URL", "Notes"],
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
  link.download = `co-intake-${order_id.slice(0, 8).toUpperCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminContentOptimizationIntakeDataContent({
  order_id,
}: AdminContentOptimizationIntakeDataContentProps) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
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
        const data = await getAdminContentOptimizationOrder(order_id);
        setOrder(data);
        setEditableItems(buildEditableItems(data));
        setCurrentStatus(data.status);
      } catch {
        setError("We couldn't load the intake data for this order. Please try again.");
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

  const handleRowsPaste = (item_id: string, next_rows: KeywordUrlEditableRow[]) => {
    if (save_error) setSaveError(null);
    if (saved) setSaved(false);
    setEditableItems((prev) =>
      prev.map((item) => (item.item_id === item_id ? { ...item, rows: next_rows } : item))
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
      const result = await adminOrderDetailsService.submitContentOptimization(order_id, payload);
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
        href={`/admin/orders/${order_id}`}
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
          <div className="space-y-8">
            <SkeletonBlock className="h-64 w-full" />
            <SkeletonBlock className="h-64 w-full" />
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
                Progress saved. Fill in the target keyword and content page URL for every page to
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
                target keyword and content page URL for each page below and save on the
                client&apos;s behalf — the turnaround clock starts once the details are submitted.
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
              <KeywordUrlIntakeSection
                key={item.item_id}
                item_index={item_index}
                item={item}
                accent="violet"
                primary_keyword_label="Primary Keyword"
                secondary_keywords_label="Secondary Keywords"
                content_page_url_label="Content Page URL"
                row_noun="page"
                onRowChange={(row_index, field, value) =>
                  handleChange(item.item_id, row_index, field, value)
                }
                onRowsPaste={(next_rows) => handleRowsPaste(item.item_id, next_rows)}
              />
            ))}
          </div>

          {/* Save bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6 dark:border-gray-800">
            <Link
              href={`/admin/orders/${order_id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={is_saving}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              {is_saving ? "Saving…" : "Save Details"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
