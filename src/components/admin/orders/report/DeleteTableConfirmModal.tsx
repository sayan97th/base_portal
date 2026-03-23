"use client";

import { useEffect, useCallback } from "react";
import type { ReportTable } from "@/types/admin/order-report";

interface DeleteTableConfirmModalProps {
  is_open: boolean;
  is_deleting: boolean;
  table: ReportTable | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteTableConfirmModal({
  is_open,
  is_deleting,
  table,
  onConfirm,
  onClose,
}: DeleteTableConfirmModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !is_deleting) onClose();
    },
    [onClose, is_deleting]
  );

  useEffect(() => {
    if (is_open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [is_open, handleKeyDown]);

  if (!is_open || !table) return null;

  const row_count = table.rows.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!is_deleting ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <svg
              className="h-5 w-5 text-error-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Delete Table
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={is_deleting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Table preview card */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-gray-700 dark:bg-gray-800/60">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{table.title}</p>
            {table.description && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {table.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {row_count} {row_count === 1 ? "row" : "rows"}
              </span>
              {row_count > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">will be permanently deleted</span>
              )}
            </div>
          </div>

          {/* Warning message */}
          {row_count > 0 && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 dark:border-error-500/20 dark:bg-error-500/10">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-error-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <p className="text-xs text-error-600 dark:text-error-400">
                Deleting this table will permanently remove all{" "}
                <strong>{row_count}</strong> {row_count === 1 ? "row" : "rows"} inside it.{" "}
                This data cannot be recovered.
              </p>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete{" "}
            <strong className="text-gray-900 dark:text-white">&ldquo;{table.title}&rdquo;</strong>?
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={is_deleting}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={is_deleting}
            className="flex-1 rounded-xl bg-error-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-error-600 dark:hover:bg-error-500"
          >
            {is_deleting ? "Deleting..." : "Delete Table"}
          </button>
        </div>
      </div>
    </div>
  );
}
