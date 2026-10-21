"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  metricsImportLinkBuildingOrders,
  importPartnershipMetrics,
  getPartnershipMetricsSummary,
  getLinkBuildingImportStatus,
  METRIC_COLUMN_OPTIONS,
  PARTNERSHIP_METRIC_COLUMN_OPTIONS,
  SITE_REMOVED_VALUE,
  type ImportStatus,
  type ImportStartResponse,
  type MetricColumnKey,
  type PartnershipMetricColumnKey,
  type PartnershipMetricsSummary,
  type PartnershipReferenceColumn,
} from "@/services/admin/link-building-dashboard.service";
import FilterDatePicker from "@/components/admin/users/FilterDatePicker";

// ── Types ───────────────────────────────────────────────────────────────────────

type ModalPhase =
  | "idle"
  | "file_selected"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

/**
 * How uploaded rows find the Link Table rows they update. "partnership" works like
 * the VLOOKUPs of the BASE Google Sheet: one row per domain updates every order
 * whose Partnership is that domain. "order_id" is the original per order update.
 */
type MatchMode = "partnership" | "order_id";

interface Props {
  is_open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const ACCEPTED_EXTENSIONS = [".csv", ".txt"];
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const POLL_INTERVAL_MS = 1500;

const DEFAULT_SELECTED_COLUMNS: MetricColumnKey[] = [
  "current_traffic",
  "dr_formula",
  "current_poc",
  "current_price",
];

const DEFAULT_PARTNERSHIP_COLUMNS: PartnershipMetricColumnKey[] =
  PARTNERSHIP_METRIC_COLUMN_OPTIONS.map((col) => col.key);

/** Months of Request Date updated by default. Older rows keep their values, like frozen rows in the sheet. */
const DEFAULT_RANGE_MONTHS: Record<MatchMode, number> = {
  partnership: 2,
  order_id: 1,
};

const REFERENCE_COLUMN_LABELS: Record<PartnershipReferenceColumn, string> = {
  dr: "DR",
  traffic: "Traffic",
  current_poc: "Current POC",
  current_price: "Current Price",
};

/** Header names the backend recognises for each field of a partnership metrics file. */
const ACCEPTED_HEADERS: Array<{ field: string; headers: string }> = [
  { field: "Partnership", headers: "Partnership, Domain, Website, Site, URL" },
  { field: "DR", headers: "DR, DR Formula, Domain Rating, Ahrefs DR" },
  { field: "Traffic", headers: "Traffic, Current Traffic, Organic Traffic" },
  { field: "POC", headers: "Current POC, POC, Publisher, Posted By" },
  { field: "Price", headers: "Current Price, Price, Posting Fee, Fee" },
];

const TEMPLATE_CSV =
  "Partnership,DR,Traffic,Current POC,Current Price\n" +
  "ecommercefastlane.com,74,2300,Muhammad,80\n" +
  "techkaya.com,52,1800,David,20\n";

// ── Helpers ─────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return `File type not supported. Please upload a CSV file (.csv).`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large (${formatBytes(file.size)}). Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToMmddyyyy(date: string): string {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return "";
  return `${m}/${d}/${y}`;
}

/** Default Request Date range of a match mode: the last N months up to today. */
function getDefaultRange(mode: MatchMode): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - DEFAULT_RANGE_MONTHS[mode]);
  return { from: toIso(from), to: toIso(to) };
}

function formatSyncDate(iso: string | null): string {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "partnership-metrics-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{pct}%</span>
        {max > 0 && (
          <span>
            {value.toLocaleString()} / {max.toLocaleString()} rows
          </span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatBadge({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: "blue" | "amber" | "red" | "gray";
}) {
  const styles: Record<string, string> = {
    blue:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    red:   "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    gray:  "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700",
  };

  return (
    <div className={`flex flex-col items-center rounded-xl border px-5 py-3 ${styles[color]}`}>
      <span className="text-2xl font-bold tabular-nums">{count.toLocaleString()}</span>
      <span className="mt-0.5 text-xs font-medium">{label}</span>
    </div>
  );
}

function InfoIcon({ class_name }: { class_name: string }) {
  return (
    <svg className={class_name} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

function WarningIcon({ class_name }: { class_name: string }) {
  return (
    <svg className={class_name} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

/** Size and freshness of the partner metrics reference list. */
function ReferenceSummary({ summary, is_loading }: { summary: PartnershipMetricsSummary | null; is_loading: boolean }) {
  if (is_loading) {
    return <div className="h-9 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />;
  }

  if (!summary || summary.total_domains === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        No partner metrics uploaded yet. The first upload creates the reference list.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
        <p className="font-semibold text-gray-800 dark:text-gray-100">
          {summary.metrics_domains.toLocaleString()} domains with metrics
        </p>
        <p className="text-gray-500 dark:text-gray-400">Updated {formatSyncDate(summary.last_metrics_sync)}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
        <p className="font-semibold text-gray-800 dark:text-gray-100">
          {summary.listed_partners.toLocaleString()} listed partners
        </p>
        <p className="text-gray-500 dark:text-gray-400">Updated {formatSyncDate(summary.last_partner_sync)}</p>
      </div>
    </div>
  );
}

// ── Main modal ──────────────────────────────────────────────────────────────────

export default function LinkBuildingMetricsUpdateModal({ is_open, onClose, onImportComplete }: Props) {
  const [phase, setPhase]                     = useState<ModalPhase>("idle");
  const [match_mode, setMatchMode]            = useState<MatchMode>("partnership");
  const [selected_file, setSelectedFile]      = useState<File | null>(null);
  const [file_error, setFileError]            = useState<string | null>(null);
  const [upload_pct, setUploadPct]            = useState(0);
  const [status, setStatus]                   = useState<ImportStatus | null>(null);
  const [error_message, setErrorMessage]      = useState<string | null>(null);
  const [is_dragging_over, setIsDraggingOver] = useState(false);
  const [selected_columns, setSelectedColumns] = useState<Set<MetricColumnKey>>(
    new Set(DEFAULT_SELECTED_COLUMNS)
  );
  const [partnership_columns, setPartnershipColumns] = useState<Set<PartnershipMetricColumnKey>>(
    new Set(DEFAULT_PARTNERSHIP_COLUMNS)
  );
  const [mark_missing_as_removed, setMarkMissingAsRemoved] = useState(true);
  const [reference_summary, setReferenceSummary] = useState<PartnershipMetricsSummary | null>(null);
  const [is_summary_loading, setIsSummaryLoading] = useState(false);

  // ── Date range, always visible and defaulting to the window of the match mode,
  // so the admin sees exactly what will be applied before uploading. ──

  const [date_from, setDateFrom] = useState<string>(() => getDefaultRange("partnership").from);
  const [date_to, setDateTo]     = useState<string>(() => getDefaultRange("partnership").to);

  const file_input_ref  = useRef<HTMLInputElement>(null);
  const poll_timer_ref  = useRef<ReturnType<typeof setInterval> | null>(null);
  const completed_ref   = useRef(false);

  const is_partnership_mode = match_mode === "partnership";

  // ── Reference list summary ─────────────────────────────────────────────────

  const loadReferenceSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      setReferenceSummary(await getPartnershipMetricsSummary());
    } catch {
      setReferenceSummary(null);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (is_open) loadReferenceSummary();
  }, [is_open, loadReferenceSummary]);

  // ── Reset on close ──────────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    if (poll_timer_ref.current) {
      clearInterval(poll_timer_ref.current);
      poll_timer_ref.current = null;
    }
    setPhase("idle");
    setMatchMode("partnership");
    setSelectedFile(null);
    setFileError(null);
    setUploadPct(0);
    setStatus(null);
    setErrorMessage(null);
    setIsDraggingOver(false);
    setSelectedColumns(new Set(DEFAULT_SELECTED_COLUMNS));
    setPartnershipColumns(new Set(DEFAULT_PARTNERSHIP_COLUMNS));
    setMarkMissingAsRemoved(true);
    const default_range = getDefaultRange("partnership");
    setDateFrom(default_range.from);
    setDateTo(default_range.to);
    completed_ref.current = false;
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const changeMatchMode = useCallback((mode: MatchMode) => {
    setMatchMode(mode);
    const default_range = getDefaultRange(mode);
    setDateFrom(default_range.from);
    setDateTo(default_range.to);
  }, []);

  // ── Polling ─────────────────────────────────────────────────────────────────

  const startPolling = useCallback((id: string) => {
    if (poll_timer_ref.current) clearInterval(poll_timer_ref.current);

    poll_timer_ref.current = setInterval(async () => {
      if (completed_ref.current) return;

      try {
        const result = await getLinkBuildingImportStatus(id);
        setStatus(result);

        if (result.status === "completed") {
          completed_ref.current = true;
          clearInterval(poll_timer_ref.current!);
          poll_timer_ref.current = null;
          setPhase("completed");
        } else if (result.status === "failed") {
          completed_ref.current = true;
          clearInterval(poll_timer_ref.current!);
          poll_timer_ref.current = null;
          setPhase("failed");
          setErrorMessage(result.errors[0]?.message ?? "The metrics update job failed unexpectedly.");
        }
      } catch {
        // Network hiccup, keep polling
      }
    }, POLL_INTERVAL_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (poll_timer_ref.current) clearInterval(poll_timer_ref.current);
    };
  }, []);

  // ── File selection ──────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((file: File) => {
    const err = isValidFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
    setPhase("file_selected");
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => setIsDraggingOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // ── Column selection ─────────────────────────────────────────────────────────

  const toggleColumn = useCallback((key: MetricColumnKey) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const togglePartnershipColumn = useCallback((key: PartnershipMetricColumnKey) => {
    setPartnershipColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // ── Upload & start update ───────────────────────────────────────────────────

  const handleStartUpdate = useCallback(async () => {
    const column_count = is_partnership_mode ? partnership_columns.size : selected_columns.size;
    if (!selected_file || column_count === 0) return;

    setPhase("uploading");
    setUploadPct(0);
    setErrorMessage(null);

    try {
      const date_range = {
        date_from: date_from ? isoToMmddyyyy(date_from) : undefined,
        date_to:   date_to   ? isoToMmddyyyy(date_to)   : undefined,
      };

      let response: ImportStartResponse;
      if (is_partnership_mode) {
        response = await importPartnershipMetrics(
          selected_file,
          Array.from(partnership_columns),
          { ...date_range, mark_missing_as_removed },
          setUploadPct
        );
      } else {
        response = await metricsImportLinkBuildingOrders(
          selected_file,
          Array.from(selected_columns),
          date_range,
          setUploadPct
        );
      }

      setStatus({
        status:    "queued",
        total:     response.total,
        processed: 0,
        created:   0,
        updated:   0,
        skipped:   0,
        errors:    [],
      });
      setPhase("processing");
      startPolling(response.import_id);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: string }).message)
          : "Upload failed. Please try again.";

      setPhase("failed");
      setErrorMessage(msg);
    }
  }, [
    selected_file,
    selected_columns,
    partnership_columns,
    is_partnership_mode,
    mark_missing_as_removed,
    date_from,
    date_to,
    startPolling,
  ]);

  // ── Dismiss & refresh ───────────────────────────────────────────────────────

  const handleDoneAndRefresh = useCallback(() => {
    resetState();
    onClose();
    onImportComplete();
  }, [resetState, onClose, onImportComplete]);

  // ── Render guard ────────────────────────────────────────────────────────────

  if (!is_open) return null;

  // ── Derived ─────────────────────────────────────────────────────────────────

  const is_busy        = phase === "uploading" || phase === "processing";
  const processed_rows = status?.processed ?? 0;
  const total_rows     = status?.total ?? 0;
  const is_idle_phase  = phase === "idle" || phase === "file_selected";
  const column_count   = is_partnership_mode ? partnership_columns.size : selected_columns.size;
  const can_start      = !!selected_file && column_count > 0;
  const reference_columns = (status?.reference_columns ?? []).map((col) => REFERENCE_COLUMN_LABELS[col]).join(", ");

  // ── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={is_busy ? undefined : handleClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-3 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Update Metrics
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {is_partnership_mode ? (
                <>
                  Upload the latest domain metrics, POC and pricing. Every order is updated by its{" "}
                  <strong>Partnership</strong>, like a VLOOKUP.
                </>
              ) : (
                <>
                  Upload a CSV to bulk update selected metric columns. Rows are matched by{" "}
                  <strong>Order ID</strong>.
                </>
              )}
            </p>
          </div>
          {!is_busy && (
            <button
              onClick={handleClose}
              className="ml-4 shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label="Close dialog"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">

          {/* ── idle / file_selected: options + drop zone ── */}
          {is_idle_phase && (
            <div className="space-y-3">
              {/* Match mode */}
              <div role="radiogroup" aria-label="Match rows by" className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                {([
                  { mode: "partnership", label: "Match by Partnership" },
                  { mode: "order_id", label: "Match by Order ID" },
                ] as const).map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    role="radio"
                    aria-checked={match_mode === option.mode}
                    onClick={() => changeMatchMode(option.mode)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      match_mode === option.mode
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Reference list */}
              {is_partnership_mode && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Partner Metrics List
                    </p>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="text-xs font-medium text-brand-500 hover:text-brand-600"
                    >
                      Download CSV template
                    </button>
                  </div>
                  <ReferenceSummary summary={reference_summary} is_loading={is_summary_loading} />
                </div>
              )}

              {/* Columns & date range */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Columns to Update
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {is_partnership_mode
                    ? PARTNERSHIP_METRIC_COLUMN_OPTIONS.map((col) => (
                      <label key={col.key} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={partnership_columns.has(col.key)}
                          onChange={() => togglePartnershipColumn(col.key)}
                          className="rounded accent-brand-500"
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                          {col.label}
                          <span className="ml-1 font-normal text-gray-400 dark:text-gray-500">from {col.source}</span>
                        </span>
                      </label>
                    ))
                    : METRIC_COLUMN_OPTIONS.map((col) => (
                      <label key={col.key} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected_columns.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded accent-brand-500"
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                          {col.label}
                        </span>
                      </label>
                    ))}
                </div>
                {column_count === 0 && (
                  <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                    Select at least one column to update.
                  </p>
                )}

                <div className="my-3 border-t border-gray-200 dark:border-gray-700" />

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Date Range (Request Date)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Start Date
                    </label>
                    <FilterDatePicker
                      id="metrics_date_from"
                      placeholder="Start date"
                      value={date_from}
                      max_date={date_to || undefined}
                      on_change={setDateFrom}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      End Date
                    </label>
                    <FilterDatePicker
                      id="metrics_date_to"
                      placeholder="End date"
                      value={date_to}
                      min_date={date_from || undefined}
                      on_change={setDateTo}
                    />
                  </div>
                </div>
                {is_partnership_mode && (
                  <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    Orders requested before the start date keep their current values.
                  </p>
                )}

                {is_partnership_mode && (
                  <>
                    <div className="my-3 border-t border-gray-200 dark:border-gray-700" />
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={mark_missing_as_removed}
                        onChange={(e) => setMarkMissingAsRemoved(e.target.checked)}
                        className="mt-0.5 rounded accent-brand-500"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-200">
                        <span className="font-medium">This file is the complete partner list.</span>{" "}
                        <span className="text-gray-500 dark:text-gray-400">
                          Partnerships missing from it show <strong>{SITE_REMOVED_VALUE}</strong> in Current POC
                          and Current Price. Only applies when the file has POC or price columns.
                        </span>
                      </span>
                    </label>
                  </>
                )}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => file_input_ref.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors ${
                  is_dragging_over
                    ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/20"
                    : "border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-brand-600"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  is_dragging_over
                    ? "bg-brand-100 dark:bg-brand-900/40"
                    : "bg-gray-100 dark:bg-gray-700"
                }`}>
                  <svg
                    className={`h-5 w-5 transition-colors ${
                      is_dragging_over ? "text-brand-500" : "text-gray-400 dark:text-gray-500"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {is_dragging_over ? "Drop your file here" : "Drag & drop your file here"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    or <span className="font-medium text-brand-500">click to browse</span>
                  </p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Accepts <strong>.csv</strong> files · Max {MAX_FILE_SIZE_MB} MB
                </p>
              </div>

              <input
                ref={file_input_ref}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleInputChange}
              />

              {/* File error */}
              {file_error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-900/20">
                  <WarningIcon class_name="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-xs text-red-600 dark:text-red-400">{file_error}</p>
                </div>
              )}

              {/* Selected file preview */}
              {selected_file && (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                      {selected_file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatBytes(selected_file.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPhase("idle");
                      if (file_input_ref.current) file_input_ref.current.value = "";
                    }}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    aria-label="Remove file"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Info note */}
              <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-900/10">
                <InfoIcon class_name="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                {is_partnership_mode ? (
                  <div className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
                    <p>
                      One row per domain. The file can have only metrics, only POC and price, or both.
                      Columns missing from the file keep the values saved before. Recognised headers:
                    </p>
                    <ul className="space-y-0.5">
                      {ACCEPTED_HEADERS.map((item) => (
                        <li key={item.field}>
                          <strong>{item.field}:</strong> {item.headers}
                        </li>
                      ))}
                    </ul>
                    <p>
                      When a writer changes the Partnership of a row, its metrics, POC and price are filled
                      from this list automatically.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Only the checked columns are updated. Order IDs not found are skipped, no new rows are created.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── uploading: file transfer progress ── */}
          {phase === "uploading" && (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/20">
                  <svg
                    className="h-5 w-5 animate-pulse text-brand-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Uploading file…
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {selected_file?.name}
                  </p>
                </div>
              </div>
              <ProgressBar value={upload_pct} max={100} />
            </div>
          )}

          {/* ── processing: job running, polling status ── */}
          {phase === "processing" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-1 text-center">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20">
                  <svg
                    className="h-5 w-5 animate-spin text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Updating metrics…
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {is_partnership_mode && (status?.reference_rows ?? 0) > 0
                      ? `${status!.reference_rows!.toLocaleString()} domains loaded, applying them to the Link Table in batches of 500`
                      : "Applying updates in batches of 500, please wait"}
                  </p>
                </div>
              </div>

              {total_rows > 0 ? (
                <ProgressBar value={processed_rows} max={total_rows} />
              ) : (
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className="h-full animate-pulse rounded-full bg-brand-400" style={{ width: "60%" }} />
                </div>
              )}

              {status && (processed_rows > 0 || status.updated > 0) && (
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                    {status.updated.toLocaleString()} updated
                  </span>
                  {status.skipped > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                      {status.skipped.toLocaleString()} skipped
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── completed: success summary ── */}
          {phase === "completed" && status && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-1 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Metrics update complete!
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {status.updated.toLocaleString()} row(s) updated
                  </p>
                  {is_partnership_mode && (status.reference_rows ?? 0) > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {status.reference_rows!.toLocaleString()} domains saved to the partner metrics list
                      {reference_columns && ` (${reference_columns})`}
                    </p>
                  )}
                </div>
              </div>

              {is_partnership_mode ? (
                <div className="grid grid-cols-2 gap-3">
                  <StatBadge count={status.updated} label="Updated" color="blue" />
                  <StatBadge count={status.unchanged ?? 0} label="Already up to date" color="gray" />
                  <StatBadge count={status.site_removed ?? 0} label="Site removed" color="red" />
                  <StatBadge count={status.out_of_range ?? 0} label="Outside date range" color="amber" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <StatBadge count={status.updated} label="Updated" color="blue"  />
                  <StatBadge count={status.skipped} label="Skipped" color="amber" />
                </div>
              )}

              {status.errors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
                  <div className="flex items-center gap-2 border-b border-red-200 px-4 py-2.5 dark:border-red-800">
                    <WarningIcon class_name="h-3.5 w-3.5 shrink-0 text-red-500" />
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                      {status.errors.length} row{status.errors.length !== 1 ? "s" : ""} had errors
                    </p>
                  </div>
                  <ul className="max-h-24 divide-y divide-red-100 overflow-y-auto dark:divide-red-900/40">
                    {status.errors.map((e, i) => (
                      <li key={i} className="px-4 py-2 text-xs">
                        <span className="font-medium text-red-700 dark:text-red-400">{e.order_id}</span>
                        <span className="ml-2 text-red-600 dark:text-red-500">{e.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(status.skipped_records?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2 border-b border-amber-200 px-4 py-2.5 dark:border-amber-800">
                    <WarningIcon class_name="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {is_partnership_mode
                        ? `Showing ${status.skipped_records!.length} order${status.skipped_records!.length !== 1 ? "s" : ""} to review`
                        : `${status.skipped} skipped, showing ${status.skipped_records!.length} reason${status.skipped_records!.length !== 1 ? "s" : ""}`}
                      {!is_partnership_mode && status.skipped > status.skipped_records!.length && (
                        <span className="ml-1 font-normal opacity-70">
                          ({status.skipped - status.skipped_records!.length} more not shown)
                        </span>
                      )}
                    </p>
                  </div>
                  <ul className="max-h-28 divide-y divide-amber-100 overflow-y-auto dark:divide-amber-900/40">
                    {status.skipped_records!.map((r, i) => (
                      <li key={i} className="px-4 py-2 text-xs">
                        <span className="font-medium text-amber-700 dark:text-amber-400">{r.order_id}</span>
                        <span className="ml-2 text-amber-600 dark:text-amber-500">{r.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── failed: error message ── */}
          {phase === "failed" && (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                  <WarningIcon class_name="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Metrics update failed
                  </p>
                  {error_message && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error_message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-3 dark:border-gray-800">
          {/* Cancel / Close */}
          {phase !== "completed" && (
            <button
              onClick={handleClose}
              disabled={is_busy}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {is_busy ? "Processing…" : "Cancel"}
            </button>
          )}

          {/* Start update */}
          {phase === "file_selected" && (
            <button
              onClick={handleStartUpdate}
              disabled={!can_start}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Start Update
            </button>
          )}

          {/* Try again */}
          {phase === "failed" && (
            <button
              onClick={() => {
                setPhase(selected_file ? "file_selected" : "idle");
                setErrorMessage(null);
              }}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              Try Again
            </button>
          )}

          {/* Done & refresh */}
          {phase === "completed" && (
            <>
              <button
                onClick={handleClose}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={handleDoneAndRefresh}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Close & Refresh Table
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
