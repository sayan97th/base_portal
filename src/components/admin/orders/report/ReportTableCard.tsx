"use client";

import React, { useState } from "react";
import type { ReportTable, ReportRow, ReportRowStatus, CreateReportRowPayload } from "@/types/admin/order-report";
import RowEditorModal from "./RowEditorModal";

interface ReportTableCardProps {
  table: ReportTable;
  order_id: string;
  onAddRow: (table_id: string, payload: CreateReportRowPayload) => Promise<void>;
  onEditRow: (table_id: string, row_id: string, payload: CreateReportRowPayload) => Promise<void>;
  onDeleteRow: (table_id: string, row_id: string) => Promise<void>;
  onDeleteTable: (table_id: string) => Promise<void>;
}

const STATUS_CONFIG: Record<
  ReportRowStatus,
  { label: string; classes: string; dot: string }
> = {
  pending: {
    label: "Pending",
    classes: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
    dot: "bg-warning-500",
  },
  live: {
    label: "Live",
    classes: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    dot: "bg-success-500",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    dot: "bg-error-500",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateUrl(url: string, max = 40): string {
  try {
    const parsed = new URL(url);
    const full = parsed.hostname + parsed.pathname;
    return full.length > max ? full.slice(0, max) + "…" : full;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  is_deleting: boolean;
}

function RowActions({ onEdit, onDelete, is_deleting }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={onEdit}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
        title="Edit row"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
        </svg>
      </button>
      <button
        onClick={onDelete}
        disabled={is_deleting}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-error-50 hover:text-error-600 disabled:opacity-40 dark:hover:bg-error-500/10 dark:hover:text-error-400"
        title="Delete row"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  );
}

export default function ReportTableCard({
  table,
  onAddRow,
  onEditRow,
  onDeleteRow,
  onDeleteTable,
}: ReportTableCardProps) {
  const [is_row_modal_open, setIsRowModalOpen] = useState(false);
  const [editing_row, setEditingRow] = useState<ReportRow | null>(null);
  const [is_saving_row, setIsSavingRow] = useState(false);
  const [deleting_row_id, setDeletingRowId] = useState<string | null>(null);
  const [is_deleting_table, setIsDeletingTable] = useState(false);
  const [confirm_delete_table, setConfirmDeleteTable] = useState(false);
  const [is_collapsed, setIsCollapsed] = useState(false);

  function openAddRow() {
    setEditingRow(null);
    setIsRowModalOpen(true);
  }

  function openEditRow(row: ReportRow) {
    setEditingRow(row);
    setIsRowModalOpen(true);
  }

  async function handleSaveRow(payload: CreateReportRowPayload) {
    setIsSavingRow(true);
    try {
      if (editing_row) {
        await onEditRow(table.id, editing_row.id, payload);
      } else {
        await onAddRow(table.id, payload);
      }
      setIsRowModalOpen(false);
    } finally {
      setIsSavingRow(false);
    }
  }

  async function handleDeleteRow(row_id: string) {
    setDeletingRowId(row_id);
    try {
      await onDeleteRow(table.id, row_id);
    } finally {
      setDeletingRowId(null);
    }
  }

  async function handleDeleteTable() {
    setIsDeletingTable(true);
    try {
      await onDeleteTable(table.id);
    } finally {
      setIsDeletingTable(false);
      setConfirmDeleteTable(false);
    }
  }

  const rows_count = table.rows.length;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Table Header */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-gray-50/70 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/40">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={() => setIsCollapsed((v) => !v)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              title={is_collapsed ? "Expand" : "Collapse"}
            >
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${is_collapsed ? "-rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {table.title}
                </h3>
                <span className="inline-flex shrink-0 items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  {rows_count} {rows_count === 1 ? "row" : "rows"}
                </span>
              </div>
              {table.description && (
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                  {table.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={openAddRow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Row
            </button>

            {confirm_delete_table ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">Delete table?</span>
                <button
                  onClick={handleDeleteTable}
                  disabled={is_deleting_table}
                  className="rounded-lg bg-error-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-error-600 disabled:opacity-60"
                >
                  {is_deleting_table ? "Deleting..." : "Yes"}
                </button>
                <button
                  onClick={() => setConfirmDeleteTable(false)}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteTable(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-error-200 hover:bg-error-50 hover:text-error-600 dark:border-gray-700 dark:hover:border-error-500/30 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                title="Delete table"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {!is_collapsed && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Link Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Keyword
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Landing Page
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Exact Match
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Request Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Live Link
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Live Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    DR
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {table.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-10 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 12H6m0 0v1.5m0-1.5C6 12.504 6.504 13.125 7.125 13.125m-3 0h1.5m-1.5 0C3.996 13.125 3.375 13.629 3.375 14.25v1.5c0 .621.504 1.125 1.125 1.125h1.5" />
                        </svg>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                          No rows yet. Click <strong>Add Row</strong> to get started.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row) => {
                    const status = STATUS_CONFIG[row.status];
                    return (
                      <tr
                        key={row.id}
                        className="group transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {row.order_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {row.link_type}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-800 dark:text-white/90">
                          {row.keyword}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={row.landing_page}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="max-w-[160px] truncate text-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400 block"
                            title={row.landing_page}
                          >
                            {truncateUrl(row.landing_page)}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.exact_match ? (
                            <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(row.request_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${status.classes}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.live_link ? (
                            <a
                              href={row.live_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="max-w-[160px] truncate text-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400 block"
                              title={row.live_link}
                            >
                              {truncateUrl(row.live_link)}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {row.live_link_date ? formatDate(row.live_link_date) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.dr !== null && row.dr !== undefined ? (
                            <span className="inline-flex items-center justify-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                              {row.dr}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <RowActions
                            onEdit={() => openEditRow(row)}
                            onDelete={() => handleDeleteRow(row.id)}
                            is_deleting={deleting_row_id === row.id}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Collapsed summary */}
        {is_collapsed && rows_count > 0 && (
          <div className="px-5 py-3 text-xs text-gray-400 dark:text-gray-500">
            {rows_count} row{rows_count !== 1 ? "s" : ""} hidden — click to expand
          </div>
        )}
      </div>

      <RowEditorModal
        is_open={is_row_modal_open}
        is_saving={is_saving_row}
        row={editing_row}
        onClose={() => setIsRowModalOpen(false)}
        onSave={handleSaveRow}
      />
    </>
  );
}
