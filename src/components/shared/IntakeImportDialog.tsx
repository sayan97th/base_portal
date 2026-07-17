"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import ModalShell from "@/components/ui/modal/ModalShell";
import type { PastedGrid } from "@/lib/pasted-grid";
import {
  IMPORT_DROPZONE_ACCEPT,
  MAX_IMPORT_FILE_SIZE_BYTES,
  MAX_IMPORT_FILE_SIZE_MB,
  formatFileSize,
  isAcceptedImportFile,
  parseSpreadsheetFile,
  prepareImportGrid,
  type IntakeImportColumn,
} from "@/lib/intake-import";

interface IntakeImportDialogProps {
  is_open: boolean;
  on_close: () => void;
  /** Dialog title, e.g. "Import Link Building Keywords". */
  title: string;
  /** Accent color for the header/dropzone, matching the table's section badge. */
  accent?: "coral" | "blue" | "violet" | "emerald" | "brand";
  /** Target columns, in field order — drive the preview and header detection. */
  columns: IntakeImportColumn[];
  /** How many rows the table can hold (quantity purchased). */
  available_row_count: number;
  /** Called with the cleaned data grid (header/index removed) when confirmed. */
  on_import: (rows: PastedGrid) => void;
}

type Phase = "idle" | "parsing" | "ready" | "error";

const ACCENT_STYLES: Record<
  NonNullable<IntakeImportDialogProps["accent"]>,
  { icon_bg: string; icon_text: string; drag_border: string; drag_bg: string }
> = {
  coral: {
    icon_bg: "bg-coral-100 dark:bg-coral-500/20",
    icon_text: "text-coral-500",
    drag_border: "border-coral-400 dark:border-coral-500",
    drag_bg: "bg-coral-50 dark:bg-coral-500/10",
  },
  blue: {
    icon_bg: "bg-blue-100 dark:bg-blue-500/20",
    icon_text: "text-blue-500",
    drag_border: "border-blue-400 dark:border-blue-500",
    drag_bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  violet: {
    icon_bg: "bg-violet-100 dark:bg-violet-500/20",
    icon_text: "text-violet-500",
    drag_border: "border-violet-400 dark:border-violet-500",
    drag_bg: "bg-violet-50 dark:bg-violet-500/10",
  },
  emerald: {
    icon_bg: "bg-emerald-100 dark:bg-emerald-500/20",
    icon_text: "text-emerald-500",
    drag_border: "border-emerald-400 dark:border-emerald-500",
    drag_bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  brand: {
    icon_bg: "bg-brand-100 dark:bg-brand-500/20",
    icon_text: "text-brand-500",
    drag_border: "border-brand-400 dark:border-brand-500",
    drag_bg: "bg-brand-50 dark:bg-brand-500/10",
  },
};

export default function IntakeImportDialog({
  is_open,
  on_close,
  title,
  accent = "brand",
  columns,
  available_row_count,
  on_import,
}: IntakeImportDialogProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file_name, setFileName] = useState<string | null>(null);
  const [file_size, setFileSize] = useState<number>(0);
  const [data_rows, setDataRows] = useState<PastedGrid>([]);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  const styles = ACCENT_STYLES[accent];

  const resetState = useCallback(() => {
    setPhase("idle");
    setFileName(null);
    setFileSize(0);
    setDataRows([]);
    setErrorMessage(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    on_close();
  }, [resetState, on_close]);

  const handleFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setFileSize(file.size);
      setErrorMessage(null);

      if (!isAcceptedImportFile(file)) {
        setPhase("error");
        setErrorMessage(
          "Unsupported file type. Please upload an .xlsx, .xls, or .csv file."
        );
        return;
      }
      if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
        setPhase("error");
        setErrorMessage(
          `File is too large (${formatFileSize(file.size)}). Maximum size is ${MAX_IMPORT_FILE_SIZE_MB} MB.`
        );
        return;
      }

      setPhase("parsing");
      try {
        const grid = await parseSpreadsheetFile(file);
        const { rows } = prepareImportGrid(grid, columns);
        if (rows.length === 0) {
          setPhase("error");
          setErrorMessage(
            "We couldn't find any data rows in that file. Make sure the first sheet has your keywords below the header row."
          );
          return;
        }
        setDataRows(rows);
        setPhase("ready");
      } catch {
        setPhase("error");
        setErrorMessage(
          "We couldn't read that file. Please make sure it's a valid Excel or CSV spreadsheet."
        );
      }
    },
    [columns]
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (accepted.length > 0) {
        void handleFile(accepted[0]);
        return;
      }
      if (rejections.length > 0) {
        setFileName(rejections[0].file.name);
        setFileSize(rejections[0].file.size);
        setPhase("error");
        setErrorMessage(
          "Unsupported file type. Please upload an .xlsx, .xls, or .csv file."
        );
      }
    },
    [handleFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: IMPORT_DROPZONE_ACCEPT,
    multiple: false,
    maxFiles: 1,
  });

  const total_rows = data_rows.length;
  const overflow_count = Math.max(0, total_rows - available_row_count);
  const preview_rows = useMemo(
    () => data_rows.slice(0, available_row_count),
    [data_rows, available_row_count]
  );

  const handleConfirm = useCallback(() => {
    if (phase !== "ready") return;
    on_import(data_rows);
    handleClose();
  }, [phase, data_rows, on_import, handleClose]);

  return (
    <ModalShell is_open={is_open} on_close={handleClose} max_width="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon_bg}`}>
            <svg className={`h-5 w-5 ${styles.icon_text}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Upload an Excel or CSV file to fill this table automatically.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
        {/* Expected columns hint */}
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Expected columns
          </p>
          <div className="flex flex-wrap gap-1.5">
            {columns.map((column, idx) => (
              <span
                key={column.label}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
              >
                <span className="text-gray-400 dark:text-gray-500">{idx + 1}.</span>
                {column.label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
            Match this column order. A header row and a leading “#” number column are
            detected and skipped automatically.
          </p>
        </div>

        {/* Dropzone / preview */}
        {phase === "idle" || phase === "error" ? (
          <>
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                isDragActive
                  ? `${styles.drag_border} ${styles.drag_bg}`
                  : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100/60 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-gray-600"
              }`}
            >
              <input {...getInputProps()} />
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${styles.icon_bg}`}>
                <svg className={`h-6 w-6 ${styles.icon_text}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {isDragActive ? "Drop your file here" : "Drag & drop your spreadsheet here"}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  or <span className={`font-medium ${styles.icon_text}`}>click to browse</span>
                </p>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Accepts <strong>.xlsx</strong>, <strong>.xls</strong> and <strong>.csv</strong> · Max {MAX_IMPORT_FILE_SIZE_MB} MB
              </p>
            </div>

            {phase === "error" && error_message && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-900/20">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-red-600 dark:text-red-400">{error_message}</p>
              </div>
            )}
          </>
        ) : null}

        {phase === "parsing" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <svg className={`h-8 w-8 animate-spin ${styles.icon_text}`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Reading your file…</p>
          </div>
        )}

        {phase === "ready" && (
          <div className="space-y-3">
            {/* File chip */}
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{file_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file_size)} · {total_rows} row{total_rows !== 1 ? "s" : ""} found
                </p>
              </div>
              <button
                type="button"
                onClick={resetState}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Remove file"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Overflow warning */}
            {overflow_count > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Only the first <strong>{available_row_count}</strong> row
                  {available_row_count !== 1 ? "s" : ""} will be imported to match the quantity
                  purchased — the remaining <strong>{overflow_count}</strong> row
                  {overflow_count !== 1 ? "s" : ""} will be ignored.
                </p>
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Preview</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  Showing {preview_rows.length} of {total_rows}
                </span>
              </div>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 font-medium text-gray-400 dark:text-gray-500">#</th>
                      {columns.map((column) => (
                        <th key={column.label} className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview_rows.map((row, row_idx) => (
                      <tr key={row_idx} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-1.5 text-gray-400 dark:text-gray-500">{row_idx + 1}</td>
                        {columns.map((column, col_idx) => (
                          <td key={column.label} className="max-w-[220px] truncate px-3 py-1.5 text-gray-700 dark:text-gray-200">
                            {row[col_idx] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={phase !== "ready"}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {phase === "ready"
            ? `Import ${Math.min(total_rows, available_row_count)} row${Math.min(total_rows, available_row_count) !== 1 ? "s" : ""}`
            : "Import"}
        </button>
      </div>
    </ModalShell>
  );
}
