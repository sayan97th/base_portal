"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminContentBriefOrder } from "@/services/admin/content-briefs.service";
import type { AdminOrder, ContentOptimizationIntakeRow } from "@/types/admin";

interface AdminContentBriefIntakeDataContentProps {
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

// ── Secondary keyword chips ────────────────────────────────────────────────────

function parseKeywords(raw: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/,|;/)
    .map((kw) => kw.trim())
    .filter(Boolean);
}

function SecondaryKeywordChips({ keywords }: { keywords: string }) {
  const chips = parseKeywords(keywords);
  if (chips.length === 0) {
    return <span className="italic text-gray-300 dark:text-gray-600">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

// ── Notes cell ─────────────────────────────────────────────────────────────────

function NotesCell({ notes }: { notes: string }) {
  const has_notes = notes && notes.trim() && notes.trim().toLowerCase() !== "none";
  if (!has_notes) {
    return <span className="italic text-gray-300 dark:text-gray-600">—</span>;
  }
  return (
    <div className="flex items-start gap-1.5">
      <svg
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
        />
      </svg>
      <span className="text-gray-600 dark:text-gray-400">{notes}</span>
    </div>
  );
}

// ── URL display helper ─────────────────────────────────────────────────────────

function truncateUrl(url: string, max_length = 45): string {
  if (url.length <= max_length) return url;
  return url.slice(0, max_length) + "…";
}

// ── CSV export ─────────────────────────────────────────────────────────────────

function exportIntakeToCsv(order: AdminOrder) {
  const rows: string[][] = [
    ["Item", "Tier", "#", "Primary Target Keyword", "Secondary Keyword(s)", "Notes", "Current Live URL"],
  ];

  order.items.forEach((item, item_index) => {
    const tier_label = item.item_name ?? `Item ${item_index + 1}`;
    (item.co_intake_rows ?? []).forEach((row, row_index) => {
      rows.push([
        String(item_index + 1),
        tier_label,
        String(row_index + 1),
        row.primary_keyword,
        row.secondary_keywords ?? "",
        row.notes ?? "",
        row.content_page_url,
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
  link.download = `cb-intake-${order.id.slice(0, 8).toUpperCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

// ── Intake section stats ───────────────────────────────────────────────────────

function IntakeSectionStats({ rows }: { rows: ContentOptimizationIntakeRow[] }) {
  const with_secondary = rows.filter((r) => r.secondary_keywords?.trim()).length;
  const with_notes = rows.filter(
    (r) => r.notes?.trim() && r.notes.trim().toLowerCase() !== "none"
  ).length;
  const with_url = rows.filter((r) => r.content_page_url?.trim()).length;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
      <span>{rows.length} {rows.length === 1 ? "page" : "pages"}</span>
      {with_secondary > 0 && (
        <>
          <span className="opacity-40">·</span>
          <span>{with_secondary} with secondary keywords</span>
        </>
      )}
      {with_notes > 0 && (
        <>
          <span className="opacity-40">·</span>
          <span>{with_notes} with notes</span>
        </>
      )}
      {with_url > 0 && (
        <>
          <span className="opacity-40">·</span>
          <span>{with_url} with live URL</span>
        </>
      )}
    </div>
  );
}

// ── Intake section ─────────────────────────────────────────────────────────────

interface IntakeSectionProps {
  tier_name: string;
  tier_index: number;
  rows: ContentOptimizationIntakeRow[];
  total_tiers: number;
}

function IntakeSection({ tier_name, tier_index, rows, total_tiers }: IntakeSectionProps) {
  const filled_rows = rows.filter(
    (r) => r.primary_keyword.trim() || r.content_page_url.trim()
  );
  const empty_count = rows.length - filled_rows.length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
          {tier_index + 1}
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {tier_name}
            </h2>
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
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
          <IntakeSectionStats rows={rows} />
        </div>
      </div>

      {/* Intake table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col className="w-10" />
            <col className="w-[22%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              <th className="border-b border-r border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                #
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.773 4.773zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Primary Target Keyword
                </div>
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                  Secondary Keyword(s)
                </div>
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  Notes
                </div>
              </th>
              <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  Current Live URL
                </div>
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
                  <td className="border-r border-gray-200 py-3 text-center text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                    {row_index + 1}
                  </td>

                  {/* Primary target keyword */}
                  <td className="border-r border-gray-200 px-4 py-3 dark:border-gray-700">
                    {has_keyword ? (
                      <span className="font-medium text-gray-800 dark:text-white/80">
                        {row.primary_keyword}
                      </span>
                    ) : (
                      <span className="italic text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>

                  {/* Secondary keywords */}
                  <td className="border-r border-gray-200 px-4 py-3 dark:border-gray-700">
                    <SecondaryKeywordChips keywords={row.secondary_keywords ?? ""} />
                  </td>

                  {/* Notes */}
                  <td className="border-r border-gray-200 px-4 py-3 dark:border-gray-700">
                    <NotesCell notes={row.notes ?? ""} />
                  </td>

                  {/* Current live URL */}
                  <td className="px-4 py-3">
                    {has_url ? (
                      <a
                        href={row.content_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={row.content_page_url}
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
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

export default function AdminContentBriefIntakeDataContent({
  order_id,
}: AdminContentBriefIntakeDataContentProps) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAdminContentBriefOrder(order_id);
        setOrder(data);
      } catch {
        setError("We couldn't load the intake data for this order. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [order_id]);

  const items_with_intake =
    order?.items.filter((item) => item.co_intake_rows && item.co_intake_rows.length > 0) ?? [];

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
          <SkeletonBlock className="h-64 w-full" />
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
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 dark:border-brand-500/30 dark:bg-brand-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  Content Brief
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
                href={`/admin/orders/${order_id}`}
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
