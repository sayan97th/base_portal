"use client";

import type { OrderReport, ReportRow } from "@/types/admin/order-report";

interface ReportSummaryStatsProps {
  report: OrderReport;
}

function getAllRows(report: OrderReport): ReportRow[] {
  return report.tables.flatMap((t) => t.rows);
}

const LinkIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TableGroupIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 12H6m0 0v1.5m0-1.5C6 12.504 6.504 13.125 7.125 13.125m-3 0h1.5m-1.5 0C3.996 13.125 3.375 13.629 3.375 14.25v1.5c0 .621.504 1.125 1.125 1.125h1.5" />
  </svg>
);

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  icon_bg: string;
  icon_color: string;
  value_color?: string;
}

function StatCard({ label, value, icon, icon_bg, icon_color, value_color }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${icon_bg} ${icon_color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className={`mt-0.5 text-2xl font-bold ${value_color ?? "text-gray-900 dark:text-white"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function ReportSummaryStats({ report }: ReportSummaryStatsProps) {
  const all_rows = getAllRows(report);
  const total_links = all_rows.length;
  const live_count = all_rows.filter((r) => r.status === "live").length;
  const pending_count = all_rows.filter((r) => r.status === "pending").length;
  const rejected_count = all_rows.filter((r) => r.status === "rejected").length;
  const tables_count = report.tables.length;

  const live_percentage = total_links > 0 ? Math.round((live_count / total_links) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar Section */}
      {total_links > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Overall Delivery Progress</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {live_count} of {total_links} link{total_links !== 1 ? "s" : ""} delivered live
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{live_percentage}%</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">complete</p>
            </div>
          </div>
          {/* Segmented progress bar */}
          <div className="relative h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            {/* Rejected segment — shown from the right */}
            {rejected_count > 0 && (
              <div
                className="absolute right-0 top-0 h-full bg-error-400 dark:bg-error-500"
                style={{ width: `${(rejected_count / total_links) * 100}%` }}
              />
            )}
            {/* Live segment — shown from the left */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-success-500 transition-all duration-700"
              style={{ width: `${live_percentage}%` }}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              Live ({live_count})
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
              Pending ({pending_count})
            </span>
            {rejected_count > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="h-2 w-2 rounded-full bg-error-400" />
                Rejected ({rejected_count})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Links"
          value={total_links}
          icon={<LinkIcon />}
          icon_bg="bg-brand-50 dark:bg-brand-500/10"
          icon_color="text-brand-600 dark:text-brand-400"
        />
        <StatCard
          label="Live"
          value={live_count}
          icon={<CheckCircleIcon />}
          icon_bg="bg-success-50 dark:bg-success-500/10"
          icon_color="text-success-600 dark:text-success-400"
          value_color="text-success-700 dark:text-success-400"
        />
        <StatCard
          label="Pending"
          value={pending_count}
          icon={<ClockIcon />}
          icon_bg="bg-warning-50 dark:bg-warning-500/10"
          icon_color="text-warning-600 dark:text-warning-400"
          value_color="text-warning-700 dark:text-warning-400"
        />
        <StatCard
          label="Tables"
          value={tables_count}
          icon={<TableGroupIcon />}
          icon_bg="bg-blue-50 dark:bg-blue-500/10"
          icon_color="text-blue-600 dark:text-blue-400"
        />
      </div>
    </div>
  );
}
