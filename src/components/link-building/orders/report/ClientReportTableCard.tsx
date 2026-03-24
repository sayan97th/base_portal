"use client";

import { useState } from "react";
import type { ReportTable, ReportRowStatus } from "@/types/admin/order-report";

interface ClientReportTableCardProps {
  table: ReportTable;
  index: number;
}

const STATUS_CONFIG: Record<
  ReportRowStatus,
  { label: string; classes: string; dot: string; ring: string }
> = {
  pending: {
    label: "Pending",
    classes: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
    dot: "bg-warning-500",
    ring: "ring-warning-200 dark:ring-warning-500/20",
  },
  live: {
    label: "Live",
    classes: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    dot: "bg-success-500",
    ring: "ring-success-200 dark:ring-success-500/20",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    dot: "bg-error-500",
    ring: "ring-error-200 dark:ring-error-500/20",
  },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateUrl(url: string, max = 38): string {
  try {
    const parsed = new URL(url);
    const full = parsed.hostname + parsed.pathname;
    return full.length > max ? full.slice(0, max) + "…" : full;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

const ExternalLinkIcon = () => (
  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const ChevronDownIcon = ({ rotated }: { rotated: boolean }) => (
  <svg
    className={`h-4 w-4 transition-transform duration-200 ${rotated ? "-rotate-180" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

export default function ClientReportTableCard({ table, index }: ClientReportTableCardProps) {
  const [is_collapsed, setIsCollapsed] = useState(false);

  const rows_count = table.rows.length;
  const live_count = table.rows.filter((r) => r.status === "live").length;
  const pending_count = table.rows.filter((r) => r.status === "pending").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Card Header */}
      <button
        onClick={() => setIsCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-4 border-b border-gray-200 bg-gray-50/70 px-5 py-4 text-left transition-colors hover:bg-gray-100/60 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:bg-gray-800/70"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Table index badge */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {table.title}
              </h3>
              <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {rows_count} {rows_count === 1 ? "link" : "links"}
              </span>
              {live_count > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                  {live_count} live
                </span>
              )}
              {pending_count > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-600 dark:bg-warning-500/10 dark:text-warning-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                  {pending_count} pending
                </span>
              )}
            </div>
            {table.description && (
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {table.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <ChevronDownIcon rotated={!is_collapsed} />
        </div>
      </button>

      {/* Table Content */}
      {!is_collapsed && (
        <div className="overflow-x-auto">
          {rows_count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12">
              <svg
                className="h-10 w-10 text-gray-200 dark:text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 12H6m0 0v1.5m0-1.5C6 12.504 6.504 13.125 7.125 13.125m-3 0h1.5m-1.5 0C3.996 13.125 3.375 13.629 3.375 14.25v1.5c0 .621.504 1.125 1.125 1.125h1.5" />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No links added to this table yet.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {[
                    { label: "Order #", className: "whitespace-nowrap" },
                    { label: "Link Type", className: "whitespace-nowrap" },
                    { label: "Keyword", className: "" },
                    { label: "Landing Page", className: "" },
                    { label: "Exact Match", className: "whitespace-nowrap text-center" },
                    { label: "Request Date", className: "whitespace-nowrap" },
                    { label: "Status", className: "" },
                    { label: "Live Link", className: "" },
                    { label: "Live Date", className: "whitespace-nowrap" },
                    { label: "DR", className: "text-center" },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 ${col.className}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {table.rows.map((row) => {
                  const status_cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending;
                  return (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                    >
                      {/* Order # */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {row.order_number || "—"}
                        </span>
                      </td>

                      {/* Link Type */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-600 dark:text-gray-400">
                        {row.link_type || <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>

                      {/* Keyword */}
                      <td className="px-4 py-3.5">
                        {row.keyword ? (
                          <span className="text-xs font-medium text-gray-800 dark:text-white/90">
                            {row.keyword}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Landing Page */}
                      <td className="px-4 py-3.5">
                        {row.landing_page ? (
                          <a
                            href={row.landing_page}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={row.landing_page}
                            className="inline-flex max-w-[160px] items-center gap-1 truncate text-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                          >
                            <span className="truncate">{truncateUrl(row.landing_page)}</span>
                            <ExternalLinkIcon />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Exact Match */}
                      <td className="px-4 py-3.5 text-center">
                        {row.exact_match ? (
                          <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            No
                          </span>
                        )}
                      </td>

                      {/* Request Date */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(row.request_date)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${status_cfg.classes} ${status_cfg.ring}`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status_cfg.dot}`} />
                          {status_cfg.label}
                        </span>
                      </td>

                      {/* Live Link */}
                      <td className="px-4 py-3.5">
                        {row.live_link ? (
                          <a
                            href={row.live_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={row.live_link}
                            className="inline-flex max-w-[160px] items-center gap-1 rounded-md bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 underline-offset-2 transition-colors hover:bg-success-100 hover:underline dark:bg-success-500/10 dark:text-success-400 dark:hover:bg-success-500/20"
                          >
                            <span className="truncate">{truncateUrl(row.live_link)}</span>
                            <ExternalLinkIcon />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Live Date */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                        {row.live_link_date ? (
                          formatDate(row.live_link_date)
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* DR */}
                      <td className="px-4 py-3.5 text-center">
                        {row.dr !== null && row.dr !== undefined ? (
                          <span className="inline-flex items-center justify-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                            DR {row.dr}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Collapsed hint */}
      {is_collapsed && rows_count > 0 && (
        <div className="px-5 py-3 text-xs text-gray-400 dark:text-gray-500">
          {rows_count} link{rows_count !== 1 ? "s" : ""} · {live_count} live — click to expand
        </div>
      )}
    </div>
  );
}
