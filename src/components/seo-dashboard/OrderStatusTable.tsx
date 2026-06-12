"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import type {
  DashboardTableRow,
  DisplayStatus,
  ExportFormat,
} from "@/services/client/dashboard.service";

// ── Filter types ──────────────────────────────────────────────────────────────

export interface TableFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  dr_type?: string;
}

interface Props {
  rows: DashboardTableRow[];
  is_loading: boolean;
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  search_term: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onExport: (format: ExportFormat, row_ids?: string[]) => void;
  is_exporting?: boolean;
  filters: TableFilters;
  onFiltersChange: (filters: TableFilters) => void;
}

// ── Filter options ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "Live",              label: "Live" },
  { value: "New Request",       label: "New Request" },
  { value: "Reviewing",         label: "Reviewing" },
  { value: "Ordered",           label: "Ordered" },
  { value: "Pending",           label: "Pending" },
  { value: "Quality Control",   label: "Quality Control" },
  { value: "Partnership Check", label: "Partnership Check" },
  { value: "Approved",          label: "Approved" },
  { value: "Not Approved",      label: "Not Approved" },
  { value: "Ready",             label: "Ready" },
  { value: "Rejected",          label: "Rejected" },
  { value: "Scheduled",         label: "Scheduled" },
  { value: "Cancelled",         label: "Cancelled" },
];

const DR_OPTIONS: { value: string; label: string }[] = [
  { value: "DR 30+", label: "DR 30+" },
  { value: "DR 40+", label: "DR 40+" },
  { value: "DR 50+", label: "DR 50+" },
  { value: "DR 60+", label: "DR 60+" },
  { value: "DR 70+", label: "DR 70+" },
];

const status_badge_color: Record<
  DisplayStatus,
  "success" | "error" | "warning" | "info" | "primary"
> = {
  Live: "success",
  "Pending with publisher": "error",
  "Writing article": "warning",
  "Choosing domain": "info",
  "New request": "warning",
  Cancelled: "error",
  Reviewing: "info",
  Ordered: "warning",
  Pending: "warning",
  "Quality Control": "info",
  "Partnership Check": "warning",
  Approved: "success",
  "Not Approved": "error",
  Ready: "success",
  Rejected: "error",
  Scheduled: "primary",
};

// ── Shared class strings ──────────────────────────────────────────────────────

const SELECT_CLS =
  "h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 " +
  "focus:border-brand-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500/10 " +
  "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

const DATE_INPUT_CLS =
  "h-9 w-40 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 " +
  "cursor-pointer placeholder:text-gray-400 " +
  "focus:border-brand-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500/10 " +
  "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function TableSkeleton({ rows_count }: { rows_count: number }) {
  return (
    <>
      {[...Array(rows_count)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(11)].map((__, j) => (
            <TableCell key={j} className="py-3">
              <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function buildPageButtons(current: number, last: number): (number | "...")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(last - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < last - 2) pages.push("...");
  pages.push(last);
  return pages;
}

// ── Compact flatpickr date picker for the filter panel ────────────────────────

function FilterDatePicker({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
}) {
  const input_ref = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fp_ref = useRef<any>(null);

  useEffect(() => {
    if (!input_ref.current) return;
    const instance = flatpickr(input_ref.current, {
      dateFormat: "Y-m-d",
      static: true,
      monthSelectorType: "static",
      disableMobile: true,
      onChange: (_dates: Date[], dateStr: string) => onChange(dateStr),
    });
    fp_ref.current = Array.isArray(instance) ? instance[0] : instance;
    return () => fp_ref.current?.destroy();
    // onChange identity intentionally excluded — picker is initialised once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external "clear all" resets back into the picker
  useEffect(() => {
    if (!fp_ref.current) return;
    if (value) {
      fp_ref.current.setDate(value, false);
    } else {
      fp_ref.current.clear();
    }
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={input_ref}
        id={id}
        readOnly
        placeholder={placeholder}
        className={DATE_INPUT_CLS}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="2.5" width="12" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.5 1v3M9.5 1v3M1 6h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OrderStatusTable({
  rows,
  is_loading,
  current_page,
  last_page,
  total,
  per_page,
  search_term,
  onSearchChange,
  onPageChange,
  onExport,
  is_exporting = false,
  filters,
  onFiltersChange,
}: Props) {
  const range_start = total === 0 ? 0 : (current_page - 1) * per_page + 1;
  const range_end = Math.min(current_page * per_page, total);
  const page_buttons = buildPageButtons(current_page, last_page);

  // ── Active filter count ────────────────────────────────────────────────────

  const active_filters_count = [
    filters.status,
    filters.date_from,
    filters.date_to,
    filters.dr_type,
  ].filter(Boolean).length;

  const has_active_filters = active_filters_count > 0;

  // ── Filter panel visibility ────────────────────────────────────────────────

  const [show_filters, setShowFilters] = useState(false);

  // ── Row selection ──────────────────────────────────────────────────────────

  const [selected_row_ids, setSelectedRowIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedRowIds(new Set());
  }, [rows]);

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllRows = useCallback(() => {
    setSelectedRowIds(new Set(rows.map((r) => r.id)));
  }, [rows]);

  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  const all_selected =
    rows.length > 0 && rows.every((r) => selected_row_ids.has(r.id));
  const some_selected =
    rows.some((r) => selected_row_ids.has(r.id)) && !all_selected;

  const select_all_ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (select_all_ref.current) {
      select_all_ref.current.indeterminate = some_selected;
    }
  }, [some_selected]);

  // ── Export dropdown ────────────────────────────────────────────────────────

  const [show_export_menu, setShowExportMenu] = useState(false);
  const export_btn_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show_export_menu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (export_btn_ref.current && !export_btn_ref.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show_export_menu]);

  const handleExportAll = useCallback(
    (format: ExportFormat) => {
      setShowExportMenu(false);
      onExport(format, undefined);
    },
    [onExport]
  );

  const handleExportSelected = useCallback(
    (format: ExportFormat) => {
      setShowExportMenu(false);
      onExport(format, Array.from(selected_row_ids));
    },
    [onExport, selected_row_ids]
  );

  const n_selected = selected_row_ids.size;

  // ── Filter handlers ────────────────────────────────────────────────────────

  const handleFilterChange = useCallback(
    (key: keyof TableFilters, value: string) => {
      onFiltersChange({ ...filters, [key]: value || undefined });
    },
    [filters, onFiltersChange]
  );

  const clearAllFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  // ── Active filter chips (shown when panel is collapsed) ────────────────────

  const filter_chips: { key: keyof TableFilters; label: string }[] = [];
  if (filters.status)    filter_chips.push({ key: "status",    label: `Status: ${filters.status}` });
  if (filters.dr_type)   filter_chips.push({ key: "dr_type",   label: `DR: ${filters.dr_type}` });
  if (filters.date_from) filter_chips.push({ key: "date_from", label: `From: ${filters.date_from}` });
  if (filters.date_to)   filter_chips.push({ key: "date_to",   label: `To: ${filters.date_to}` });

  const removeChip = useCallback(
    (key: keyof TableFilters) => {
      const next = { ...filters };
      delete next[key];
      onFiltersChange(next);
    },
    [filters, onFiltersChange]
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Order Status
          </h3>
          {!is_loading && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {total}
            </span>
          )}
          {n_selected > 0 && (
            <span className="rounded-full bg-coral-100 px-2.5 py-0.5 text-xs font-semibold text-coral-600 dark:bg-coral-500/20 dark:text-coral-400">
              {n_selected} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M7.25 1.5C4.075 1.5 1.5 4.075 1.5 7.25C1.5 10.425 4.075 13 7.25 13C10.425 13 13 10.425 13 7.25C13 4.075 10.425 1.5 7.25 1.5Z"
                  stroke="currentColor" strokeWidth="1.3"
                />
                <path d="M11.5 11.5L14.5 14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search keyword, order ID…"
              value={search_term}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500"
              suppressHydrationWarning
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
              show_filters || has_active_filters
                ? "border-coral-400 bg-coral-50 text-coral-600 dark:border-coral-500/50 dark:bg-coral-500/10 dark:text-coral-400"
                : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
            title="Toggle filters"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M1.5 3.75H16.5M4.5 9H13.5M7 14.25H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {has_active_filters && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[9px] font-bold text-white">
                {active_filters_count}
              </span>
            )}
          </button>

          {/* Export dropdown */}
          <div ref={export_btn_ref} className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={is_exporting}
              className="flex h-10 items-center gap-2 rounded-lg bg-coral-500 px-4 text-sm font-medium text-white hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {is_exporting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Exporting…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M4 6l3 3 3-3M1.5 10.5v1a1 1 0 001 1h9a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Export
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>

            {show_export_menu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Export All Rows
                </div>
                <button onClick={() => handleExportAll("csv")} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4 4h6M4 7h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  Download All — CSV
                </button>
                <button onClick={() => handleExportAll("xlsx")} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4 4l6 6M10 4L4 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  Download All — Excel
                </button>

                {n_selected > 0 && (
                  <>
                    <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Export Selected ({n_selected})
                    </div>
                    <button onClick={() => handleExportSelected("csv")} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4 4h6M4 7h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      Selected Rows — CSV
                    </button>
                    <button onClick={() => handleExportSelected("xlsx")} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4 4l6 6M10 4L4 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      Selected Rows — Excel
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter panel ──────────────────────────────────────────────────── */}
      {show_filters && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700/60 dark:bg-gray-800/40">
          <div className="flex flex-wrap items-end gap-4">

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
              <select
                value={filters.status ?? ""}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* DR Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">DR Type</label>
              <select
                value={filters.dr_type ?? ""}
                onChange={(e) => handleFilterChange("dr_type", e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">All DR Types</option>
                {DR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Start Date From */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Start Date From
              </label>
              <FilterDatePicker
                id="filter-date-from"
                value={filters.date_from ?? ""}
                placeholder="Pick a date…"
                onChange={(val) => handleFilterChange("date_from", val)}
              />
            </div>

            {/* Start Date To */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Start Date To
              </label>
              <FilterDatePicker
                id="filter-date-to"
                value={filters.date_to ?? ""}
                placeholder="Pick a date…"
                onChange={(val) => handleFilterChange("date_to", val)}
              />
            </div>

            {/* Clear all */}
            {has_active_filters && (
              <button
                onClick={clearAllFilters}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-500 transition-colors hover:border-coral-300 hover:bg-coral-50 hover:text-coral-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-coral-500/40 dark:hover:bg-coral-500/10 dark:hover:text-coral-400"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Active filter chips (panel closed) ────────────────────────────── */}
      {!show_filters && filter_chips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filter_chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-coral-200 bg-coral-50 px-2.5 py-0.5 text-xs font-medium text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-400"
            >
              {chip.label}
              <button
                onClick={() => removeChip(chip.key)}
                className="ml-0.5 rounded-full hover:text-coral-800 dark:hover:text-coral-200"
                aria-label={`Remove ${chip.label} filter`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-400 underline hover:text-coral-500 dark:text-gray-500 dark:hover:text-coral-400"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className="w-10 py-3 text-start">
                <input
                  ref={select_all_ref}
                  type="checkbox"
                  checked={all_selected}
                  onChange={(e) => (e.target.checked ? selectAllRows() : clearSelection())}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-coral-500 dark:border-gray-600"
                  title={all_selected ? "Deselect all" : "Select all on this page"}
                />
              </TableCell>
              {[
                "Order ID", "Start Date", "DR Type", "Keyword",
                "Landing Page", "Status", "Live Link", "Completed Date", "DR", "Actions",
              ].map((col) => (
                <TableCell key={col} isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {is_loading ? (
              <TableSkeleton rows_count={per_page} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                  {total === 0 && !search_term && !has_active_filters
                    ? "No orders yet. Place your first order to get started."
                    : "No orders match your search or filters."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => {
                const is_checked = selected_row_ids.has(row.id);
                return (
                  <TableRow
                    key={`${row.order_id}-${index}`}
                    className={is_checked ? "bg-coral-50/40 dark:bg-coral-500/5" : undefined}
                  >
                    <TableCell className="w-10 py-3">
                      <input
                        type="checkbox"
                        checked={is_checked}
                        onChange={() => toggleRowSelection(row.id)}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-coral-500 dark:border-gray-600"
                      />
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-3 font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
                      <Link
                        href={row.source === "admin_assigned" ? `/link-building/placements/${row.id}` : `/orders/${row.order_id}`}
                        className="hover:text-coral-500 hover:underline"
                      >
                        {row.display_order_id || row.order_id}
                      </Link>
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {formatDate(row.start_date)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {row.dr_type}
                      </span>
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {row.keyword ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </TableCell>

                    <TableCell className="py-3 text-theme-sm">
                      {row.landing_page ? (
                        <a href={row.landing_page} className="block max-w-[200px] truncate text-blue-light-500 hover:underline" target="_blank" rel="noopener noreferrer" title={row.landing_page}>
                          {row.landing_page}
                        </a>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-3">
                      <Badge size="sm" color={status_badge_color[row.status] ?? "info"}>
                        {row.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 text-theme-sm">
                      {row.live_link ? (
                        <a href={row.live_link} className="block max-w-[200px] truncate text-blue-light-500 hover:underline" target="_blank" rel="noopener noreferrer" title={row.live_link}>
                          {row.live_link}
                        </a>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {row.completed_date ? formatDate(row.completed_date) : "—"}
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {row.dr ?? "—"}
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-3">
                      <Link
                        href={row.source === "admin_assigned" ? `/link-building/placements/${row.id}` : `/orders/${row.order_id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-coral-200 bg-coral-50 px-3 py-1.5 text-xs font-medium text-coral-600 transition-colors hover:bg-coral-500 hover:text-white dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-400 dark:hover:bg-coral-500 dark:hover:text-white"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 2.5C3.5 2.5 1.5 6 1.5 6C1.5 6 3.5 9.5 6 9.5C8.5 9.5 10.5 6 10.5 6C10.5 6 8.5 2.5 6 2.5Z" stroke="currentColor" strokeWidth="1.2" />
                          <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {!is_loading && last_page >= 1 && total > 0 && (
        <div className="flex flex-col gap-3 border-t border-gray-200 px-1 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{range_start}–{range_end}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>{" "}
            results &nbsp;·&nbsp; Page{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{current_page}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{last_page}</span>
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(current_page - 1)}
              disabled={current_page === 1}
              className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 2.5L4.5 6L7.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Prev
            </button>

            {page_buttons.map((btn, i) =>
              btn === "..." ? (
                <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-gray-400">…</span>
              ) : (
                <button
                  key={btn}
                  onClick={() => onPageChange(btn as number)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                    btn === current_page
                      ? "border-coral-500 bg-coral-500 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {btn}
                </button>
              )
            )}

            <button
              onClick={() => onPageChange(current_page + 1)}
              disabled={current_page === last_page}
              className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Next
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
