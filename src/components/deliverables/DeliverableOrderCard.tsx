"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchClientOrderReport } from "@/services/client/order-report.service";
import type { DeliverableSummary } from "@/types/client/deliverables";
import type { OrderReport, ReportRow, ReportRowStatus } from "@/types/admin/order-report";
import type { OrderStatus } from "@/types/client/link-building";
import Badge from "@/components/ui/badge/Badge";

// ── Status configs ────────────────────────────────────────────────────────────

const order_status_config: Record<
  OrderStatus,
  { label: string; color: "success" | "error" | "warning" | "info" | "light"; dot: string }
> = {
  pending: { label: "Pending", color: "warning", dot: "bg-warning-500" },
  processing: { label: "Processing", color: "info", dot: "bg-blue-500" },
  completed: { label: "Completed", color: "success", dot: "bg-success-500" },
  cancelled: { label: "Cancelled", color: "error", dot: "bg-error-500" },
  payment_pending: { label: "Payment Pending", color: "light", dot: "bg-gray-400" },
};

const row_status_config: Record<
  ReportRowStatus,
  { label: string; color: "success" | "warning" | "error"; dot: string }
> = {
  live: { label: "Live", color: "success", dot: "bg-success-500" },
  pending: { label: "Pending", color: "warning", dot: "bg-warning-500" },
  rejected: { label: "Rejected", color: "error", dot: "bg-error-500" },
};

// ── Icons ─────────────────────────────────────────────────────────────────────

const ReportIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function shortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function truncateUrl(url: string | null, max = 32): string {
  if (!url) return "—";
  try {
    const parsed = new URL(url);
    const path = parsed.hostname + parsed.pathname;
    return path.length > max ? path.slice(0, max) + "…" : path;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

// ── Row-level skeleton ────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
          {[1, 2, 3, 4, 5, 6].map((j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Placement table ───────────────────────────────────────────────────────────

const PLACEMENT_COLS = ["Link Type", "Keyword", "Landing Page", "Status", "Live Link", "DR"];

interface PlacementTableProps {
  rows: ReportRow[];
}

function PlacementTable({ rows }: PlacementTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <LinkIcon />
        <p className="text-sm text-gray-400 dark:text-gray-500">No placements found for this order.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-y border-gray-100 dark:border-gray-800">
            {PLACEMENT_COLS.map((col) => (
              <th
                key={col}
                className="px-4 py-2.5 font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status_cfg = row_status_config[row.status] ?? row_status_config.pending;
            return (
              <tr
                key={row.id}
                className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/60 dark:border-gray-800/60 dark:hover:bg-white/[0.02]"
              >
                {/* Link Type */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {row.link_type || "—"}
                  </span>
                </td>

                {/* Keyword */}
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {row.keyword || <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>

                {/* Landing Page */}
                <td className="px-4 py-3">
                  {row.landing_page ? (
                    <a
                      href={row.landing_page}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={row.landing_page}
                      className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:underline"
                    >
                      <span className="max-w-[180px] truncate">{truncateUrl(row.landing_page)}</span>
                      <ExternalLinkIcon />
                    </a>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold
                      ${status_cfg.color === "success"
                        ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                        : status_cfg.color === "warning"
                        ? "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400"
                        : "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400"
                      }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
                    {status_cfg.label}
                  </span>
                </td>

                {/* Live Link */}
                <td className="px-4 py-3">
                  {row.live_link ? (
                    <a
                      href={row.live_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={row.live_link}
                      className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:underline"
                    >
                      <span className="max-w-[160px] truncate">{truncateUrl(row.live_link)}</span>
                      <ExternalLinkIcon />
                    </a>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                  )}
                </td>

                {/* DR */}
                <td className="px-4 py-3">
                  {row.dr != null ? (
                    <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      {row.dr}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main card component ───────────────────────────────────────────────────────

interface DeliverableOrderCardProps {
  item: DeliverableSummary;
  default_expanded?: boolean;
  /** Pre-loaded report from the list endpoint. When provided the card never
   *  makes a separate fetch — null means the order has no report yet. */
  initial_report?: OrderReport | null;
}

export default function DeliverableOrderCard({
  item,
  default_expanded = true,
  initial_report,
}: DeliverableOrderCardProps) {
  const preloaded = initial_report !== undefined;
  const [is_expanded, setIsExpanded] = useState(default_expanded);
  const [report, setReport] = useState<OrderReport | null>(preloaded ? initial_report : null);
  const [is_loading_report, setIsLoadingReport] = useState(false);
  const [report_error, setReportError] = useState<string | null>(null);
  const [has_fetched, setHasFetched] = useState(preloaded);

  const status_cfg = order_status_config[item.status] ?? order_status_config.pending;
  const live_pct = item.total_links > 0 ? Math.round((item.live_count / item.total_links) * 100) : 0;

  useEffect(() => {
    if (!is_expanded || has_fetched) return;
    setHasFetched(true);
    setIsLoadingReport(true);
    fetchClientOrderReport(item.order_id)
      .then((data) => setReport(data))
      .catch(() => setReportError("Unable to load order details."))
      .finally(() => setIsLoadingReport(false));
  }, [is_expanded, has_fetched, item.order_id]);

  const all_rows: ReportRow[] = report?.tables.flatMap((t) => t.rows) ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      {/* Gradient accent top bar */}
      <div className={`h-1 w-full ${
        item.status === "completed"
          ? "bg-gradient-to-r from-success-400 via-success-500 to-emerald-500"
          : item.status === "cancelled"
          ? "bg-gradient-to-r from-error-400 to-error-500"
          : item.status === "processing"
          ? "bg-gradient-to-r from-blue-400 via-brand-500 to-brand-600"
          : "bg-gradient-to-r from-warning-300 via-warning-400 to-orange-400"
      }`} />

      {/* Card header */}
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left — icon + title + meta */}
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <ReportIcon />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                {item.order_title ?? `Order ${item.order_id.slice(0, 8).toUpperCase()}`}
              </h3>
              <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                {shortId(item.order_id)}{" "}
                <span className="mx-1 opacity-40">·</span>
                Created {formatDate(item.created_at)}
                {item.report_sent_at && (
                  <>
                    <span className="mx-1 opacity-40">·</span>
                    Report sent {formatDate(item.report_sent_at)}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right — actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/link-building/orders/${item.order_id}/report`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              View Report
              <ArrowRightIcon />
            </Link>
            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
              title={is_expanded ? "Collapse" : "Expand"}
            >
              {is_expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
          </div>
        </div>

        {/* Status row + progress */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Status badge */}
          <Badge size="sm" color={status_cfg.color}>
            <span className={`mr-1 h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
            {status_cfg.label}
          </Badge>

          {/* Link stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <LinkIcon />
              <span className="font-medium text-gray-700 dark:text-gray-200">{item.total_links}</span>
              total
            </span>
            {item.live_count > 0 && (
              <span className="flex items-center gap-1 text-success-600 dark:text-success-400">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                <span className="font-medium">{item.live_count}</span>
                live
              </span>
            )}
            {item.pending_count > 0 && (
              <span className="flex items-center gap-1 text-warning-600 dark:text-warning-400">
                <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                <span className="font-medium">{item.pending_count}</span>
                pending
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {item.total_links > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">Delivery progress</span>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{live_pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-success-400 to-success-500 transition-all duration-500"
                style={{ width: `${live_pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expandable placement details */}
      {is_expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Section label */}
          <div className="flex items-center justify-between bg-gray-50/80 px-5 py-2.5 dark:bg-white/[0.02]">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Order Details
            </span>
            {!is_loading_report && !report_error && all_rows.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {all_rows.length} {all_rows.length === 1 ? "link" : "links"}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="px-1">
            {is_loading_report ? (
              <table className="w-full">
                <tbody>
                  <RowSkeleton />
                </tbody>
              </table>
            ) : report_error ? (
              <div className="flex items-center gap-2 px-5 py-5 text-sm text-error-500">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {report_error}
              </div>
            ) : (
              <PlacementTable rows={all_rows} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
