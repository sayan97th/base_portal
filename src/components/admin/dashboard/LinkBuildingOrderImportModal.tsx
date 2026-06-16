"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  importLinkBuildingOrders,
  getLinkBuildingImportStatus,
  type ImportStatus,
  type ImportOptions,
} from "@/services/admin/link-building-dashboard.service";
import FilterDatePicker from "@/components/admin/users/FilterDatePicker";

// ── Types ───────────────────────────────────────────────────────────────────────

type ImportPhase =
  | "idle"
  | "file_selected"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

type DateMode = "last_year" | "custom" | "all";

interface Props {
  is_open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const ACCEPTED_EXTENSIONS = [".csv", ".txt"];
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const POLL_INTERVAL_MS = 1500;

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

function formatMMDDYYYY(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
}

function mmddyyyyToIso(date: string): string {
  const [m, d, y] = date.split("/");
  if (!m || !d || !y) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function isoToMmddyyyy(date: string): string {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return "";
  return `${m}/${d}/${y}`;
}

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return formatMMDDYYYY(d);
}


// ── Sub-components ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color = "brand" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar_color = color === "green"
    ? "bg-green-500"
    : color === "red"
    ? "bg-red-500"
    : "bg-brand-500";

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
          className={`h-full rounded-full transition-all duration-300 ${bar_color}`}
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
  color: "green" | "blue" | "amber" | "red" | "purple";
}) {
  const styles: Record<string, string> = {
    green:  "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    blue:   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    amber:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    red:    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  };

  return (
    <div className={`flex flex-col items-center rounded-xl border px-5 py-3 ${styles[color]}`}>
      <span className="text-2xl font-bold tabular-nums">{count.toLocaleString()}</span>
      <span className="mt-0.5 text-xs font-medium">{label}</span>
    </div>
  );
}

// ── Main modal ──────────────────────────────────────────────────────────────────

export default function LinkBuildingOrderImportModal({ is_open, onClose, onImportComplete }: Props) {
  const [phase, setPhase]                     = useState<ImportPhase>("idle");
  const [selected_file, setSelectedFile]      = useState<File | null>(null);
  const [file_error, setFileError]            = useState<string | null>(null);
  const [upload_pct, setUploadPct]            = useState(0);
  const [import_id, setImportId]              = useState<string | null>(null);
  const [status, setStatus]                   = useState<ImportStatus | null>(null);
  const [error_message, setErrorMessage]      = useState<string | null>(null);
  const [is_dragging_over, setIsDraggingOver] = useState(false);

  // ── Advanced options ────────────────────────────────────────────────────────

  const [show_advanced, setShowAdvanced]           = useState(false);
  const [date_mode, setDateMode]                   = useState<DateMode>("last_year");
  const [custom_date_from, setCustomDateFrom]      = useState<string>("");
  const [custom_date_to, setCustomDateTo]          = useState<string>("");
  const [include_external, setIncludeExternal]     = useState(true);
  const [include_internal, setIncludeInternal]     = useState(false);
  const [only_new_records, setOnlyNewRecords]      = useState(false);

  const file_input_ref  = useRef<HTMLInputElement>(null);
  const poll_timer_ref  = useRef<ReturnType<typeof setInterval> | null>(null);
  const completed_ref   = useRef(false);

  // ── Build ImportOptions from current state ──────────────────────────────────

  const buildImportOptions = useCallback((): ImportOptions => {
    const apply_date_filter = date_mode !== "all";

    let date_from: string | undefined;
    let date_to: string | undefined;

    if (date_mode === "last_year") {
      date_from = getDefaultDateFrom();
      // No upper bound — only excludes records older than 1 year. Defaulting
      // date_to to "today" would silently reject legitimately future-dated
      // request dates (e.g. orders scheduled ahead).
      date_to   = undefined;
    } else if (date_mode === "custom") {
      date_from = custom_date_from ? isoToMmddyyyy(custom_date_from) : undefined;
      date_to   = custom_date_to   ? isoToMmddyyyy(custom_date_to)   : undefined;
    }

    let link_type_filter: ImportOptions["link_type_filter"];
    if (include_external && include_internal) {
      link_type_filter = "all";
    } else if (include_internal) {
      link_type_filter = "internal_only";
    } else {
      link_type_filter = "external_only";
    }

    return { apply_date_filter, date_from, date_to, link_type_filter, only_new_records };
  }, [date_mode, custom_date_from, custom_date_to, include_external, include_internal, only_new_records]);

  // ── Reset on close ──────────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    if (poll_timer_ref.current) {
      clearInterval(poll_timer_ref.current);
      poll_timer_ref.current = null;
    }
    setPhase("idle");
    setSelectedFile(null);
    setFileError(null);
    setUploadPct(0);
    setImportId(null);
    setStatus(null);
    setErrorMessage(null);
    setIsDraggingOver(false);
    completed_ref.current = false;
    setShowAdvanced(false);
    setDateMode("last_year");
    setCustomDateFrom("");
    setCustomDateTo("");
    setIncludeExternal(true);
    setIncludeInternal(false);
    setOnlyNewRecords(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

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
          setErrorMessage(result.errors[0]?.message ?? "The import job failed unexpectedly.");
        }
      } catch {
        // Network hiccup — keep polling
      }
    }, POLL_INTERVAL_MS);
  }, []);

  // Cleanup on unmount
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

  // ── Upload & start import ───────────────────────────────────────────────────

  const handleStartImport = useCallback(async () => {
    if (!selected_file) return;

    setPhase("uploading");
    setUploadPct(0);
    setErrorMessage(null);

    try {
      const options  = buildImportOptions();
      const response = await importLinkBuildingOrders(selected_file, options, (pct) => {
        setUploadPct(pct);
      });

      setImportId(response.import_id);
      setStatus({
        status:    "queued",
        total:     response.total,
        processed: 0,
        created:   0,
        updated:   0,
        skipped:   0,
        assigned:  0,
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
  }, [selected_file, buildImportOptions, startPolling]);

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

  // Validation: at least one link type must be selected
  const link_type_valid = include_external || include_internal;
  const can_start = !!selected_file && link_type_valid;

  // Active filter summary shown when advanced panel is collapsed
  const date_summary =
    date_mode === "all"
      ? "All dates"
      : date_mode === "last_year"
      ? `From ${getDefaultDateFrom()} onward (no upper limit)`
      : `Custom (${custom_date_from ? isoToMmddyyyy(custom_date_from) : "?"} – ${custom_date_to ? isoToMmddyyyy(custom_date_to) : "?"})`;

  const link_summary =
    include_external && include_internal
      ? "External & Internal"
      : include_external
      ? "External only"
      : include_internal
      ? "Internal only"
      : "None selected";

  const import_mode_summary = only_new_records ? "New records only" : "Create & update";

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
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Import Link Building Orders
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Upload a CSV file exported from Google Sheets. Existing orders are matched
              by <strong>Order ID</strong> and updated automatically.
            </p>
          </div>
          {!is_busy && (
            <button
              onClick={handleClose}
              className="ml-4 shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">

          {/* ── idle / file_selected: drop zone ── */}
          {is_idle_phase && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => file_input_ref.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  is_dragging_over
                    ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/20"
                    : "border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-brand-600"
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                  is_dragging_over
                    ? "bg-brand-100 dark:bg-brand-900/40"
                    : "bg-gray-100 dark:bg-gray-700"
                }`}>
                  <svg
                    className={`h-6 w-6 transition-colors ${
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
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
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

              {/* ── Advanced Options ─────────────────────────────────────────── */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                {/* Toggle header */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                      Advanced Options
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {!show_advanced && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {date_summary} · {link_summary} · {import_mode_summary}
                      </span>
                    )}
                    <svg
                      className={`h-3.5 w-3.5 text-gray-400 transition-transform ${show_advanced ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded panel */}
                {show_advanced && (
                  <div className="space-y-5 border-t border-gray-200 px-4 pb-4 pt-4 dark:border-gray-700">

                    {/* Date Range */}
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Date Range (Request Date)
                      </p>
                      <div className="space-y-2">
                        {(["last_year", "custom", "all"] as DateMode[]).map((mode) => (
                          <label key={mode} className="flex cursor-pointer items-start gap-2.5">
                            <input
                              type="radio"
                              name="date_mode"
                              value={mode}
                              checked={date_mode === mode}
                              onChange={() => setDateMode(mode)}
                              className="mt-0.5 accent-brand-500"
                            />
                            <div>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                {mode === "last_year" && "Last year (default)"}
                                {mode === "custom"    && "Custom range"}
                                {mode === "all"       && "All dates — no restriction"}
                              </span>
                              {mode === "last_year" && (
                                <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                                  From {getDefaultDateFrom()} onward — no upper limit, future-dated orders are included
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Custom date inputs */}
                      {date_mode === "custom" && (
                        <div className="ml-5 mt-2 grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                              Start Date
                            </label>
                            <FilterDatePicker
                              id="import_date_from"
                              placeholder="Start date"
                              value={custom_date_from}
                              max_date={custom_date_to || undefined}
                              on_change={setCustomDateFrom}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                              End Date
                            </label>
                            <FilterDatePicker
                              id="import_date_to"
                              placeholder="End date"
                              value={custom_date_to}
                              min_date={custom_date_from || undefined}
                              on_change={setCustomDateTo}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700" />

                    {/* Link Type Filter */}
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Link Type Filter
                      </p>
                      <div className="space-y-2">
                        <label className="flex cursor-pointer items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={include_external}
                            onChange={(e) => setIncludeExternal(e.target.checked)}
                            className="rounded accent-brand-500"
                          />
                          <div>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                              External link types{" "}
                              <span className="font-normal text-gray-400 dark:text-gray-500">(default)</span>
                            </span>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                              e.g. DR 30+ External, DR 40+ External
                            </p>
                          </div>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={include_internal}
                            onChange={(e) => setIncludeInternal(e.target.checked)}
                            className="rounded accent-brand-500"
                          />
                          <div>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                              Internal link types
                            </span>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                              e.g. DR 30+ Internal, DR 40+ Internal
                            </p>
                          </div>
                        </label>
                      </div>

                      {!link_type_valid && (
                        <p className="text-xs text-red-500 dark:text-red-400">
                          At least one link type must be selected.
                        </p>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700" />

                    {/* Import Mode */}
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Import Mode
                      </p>
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={only_new_records}
                          onChange={(e) => setOnlyNewRecords(e.target.checked)}
                          className="mt-0.5 rounded accent-brand-500"
                        />
                        <div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                            Import new records only
                          </span>
                          <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                            Rows whose Order ID already exists are left completely untouched
                            and counted as skipped. Existing records are never updated, even
                            if their values changed in the file. New rows are still subject
                            to the Date Range and Link Type Filter above.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 dark:border-blue-900/40 dark:bg-blue-900/10">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Rows are matched by <strong>Order ID</strong>. Existing records will be updated;
                  new Order IDs will create new entries. Rows outside the selected filters will be
                  counted as <strong>skipped</strong>. The <strong>Client</strong> column is
                  automatically matched to a registered client account by company name. The{" "}
                  <strong>Link Builder</strong> column is matched to an admin user by name —
                  matched orders are automatically assigned to that user in the{" "}
                  <strong>Assigned To</strong> column. Admin-only fields (notes, checks) are never
                  overwritten by the import.
                </p>
              </div>
            </div>
          )}

          {/* ── uploading: file transfer progress ── */}
          {phase === "uploading" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/20">
                  <svg
                    className="h-7 w-7 animate-pulse text-brand-500"
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
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20">
                  <svg
                    className="h-7 w-7 animate-spin text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Processing import…
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Importing rows in batches of 500 — please wait
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

              {status && (processed_rows > 0 || status.created > 0 || status.updated > 0) && (
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                    {status.created.toLocaleString()} created
                  </span>
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
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                  <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Import complete!
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {(status.created + status.updated).toLocaleString()} rows processed successfully
                  </p>
                </div>
              </div>

              <div className={`grid gap-3 ${(status.assigned ?? 0) > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
                <StatBadge count={status.created}           label="Created"       color="green"  />
                <StatBadge count={status.updated}           label="Updated"       color="blue"   />
                <StatBadge count={status.skipped}           label="Skipped"       color="amber"  />
                {(status.assigned ?? 0) > 0 && (
                  <StatBadge count={status.assigned ?? 0}   label="Auto-assigned" color="purple" />
                )}
              </div>

              {status.errors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
                  <div className="flex items-center gap-2 border-b border-red-200 px-4 py-2.5 dark:border-red-800">
                    <svg className="h-3.5 w-3.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                      {status.errors.length} row{status.errors.length !== 1 ? "s" : ""} had errors
                    </p>
                  </div>
                  <ul className="max-h-32 divide-y divide-red-100 overflow-y-auto dark:divide-red-900/40">
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
                    <svg className="h-3.5 w-3.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {status.skipped} skipped — showing {status.skipped_records!.length} reason{status.skipped_records!.length !== 1 ? "s" : ""}
                      {status.skipped > status.skipped_records!.length && (
                        <span className="ml-1 font-normal opacity-70">
                          ({status.skipped - status.skipped_records!.length} more not shown)
                        </span>
                      )}
                    </p>
                  </div>
                  <ul className="max-h-40 divide-y divide-amber-100 overflow-y-auto dark:divide-amber-900/40">
                    {status.skipped_records!.map((r, i) => (
                      <li key={i} className="px-4 py-2 text-xs">
                        <span className="font-medium text-amber-700 dark:text-amber-400">{r.order_id}</span>
                        <span className="ml-2 text-amber-600 dark:text-amber-500">{r.reason}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-amber-200 px-4 py-2 dark:border-amber-800">
                    <p className="text-[10px] text-amber-600 dark:text-amber-500">
                      To import these records, expand <strong>Advanced Options</strong> above and adjust the <strong>Date Range</strong> or <strong>Link Type Filter</strong> to include the filtered types, then re-import.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── failed: error message ── */}
          {phase === "failed" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                  <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Import failed
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
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
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

          {/* Start import */}
          {phase === "file_selected" && (
            <button
              onClick={handleStartImport}
              disabled={!can_start}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Start Import
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
