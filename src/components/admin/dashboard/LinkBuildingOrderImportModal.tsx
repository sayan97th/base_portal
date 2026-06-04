"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  importLinkBuildingOrders,
  getLinkBuildingImportStatus,
  type ImportStatus,
} from "@/services/admin/link-building-dashboard.service";

// ── Types ───────────────────────────────────────────────────────────────────────

type ImportPhase =
  | "idle"
  | "file_selected"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

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
  color: "green" | "blue" | "amber" | "red";
}) {
  const styles: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    blue:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    red:   "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
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
  const [phase, setPhase]                   = useState<ImportPhase>("idle");
  const [selected_file, setSelectedFile]    = useState<File | null>(null);
  const [file_error, setFileError]          = useState<string | null>(null);
  const [upload_pct, setUploadPct]          = useState(0);
  const [import_id, setImportId]            = useState<string | null>(null);
  const [status, setStatus]                 = useState<ImportStatus | null>(null);
  const [error_message, setErrorMessage]    = useState<string | null>(null);
  const [is_dragging_over, setIsDraggingOver] = useState(false);

  const file_input_ref  = useRef<HTMLInputElement>(null);
  const poll_timer_ref  = useRef<ReturnType<typeof setInterval> | null>(null);
  const completed_ref   = useRef(false);

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
      const response = await importLinkBuildingOrders(selected_file, (pct) => {
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
  }, [selected_file, startPolling]);

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
        <div className="px-6 py-5">

          {/* ── idle / file_selected: drop zone ── */}
          {(phase === "idle" || phase === "file_selected") && (
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

              {/* Info note */}
              <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 dark:border-blue-900/40 dark:bg-blue-900/10">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Rows are matched by <strong>Order ID</strong>. Existing records will be updated;
                  new Order IDs will create new entries. Admin-only fields
                  (notes, assignments, checks) are never overwritten by the import.
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

              <div className="grid grid-cols-3 gap-3">
                <StatBadge count={status.created} label="Created"  color="green" />
                <StatBadge count={status.updated} label="Updated"  color="blue"  />
                <StatBadge count={status.skipped} label="Skipped"  color="amber" />
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
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
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
