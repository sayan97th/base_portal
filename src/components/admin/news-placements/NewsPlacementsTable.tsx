"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { NewsPlacementRow } from "@/types/admin/news-placement";
import {
  listNewsPlacements,
  createNewsPlacement,
  updateNewsPlacement,
  deleteNewsPlacement,
  buildPayload,
  buildExportUrl,
} from "@/services/admin/news-placement.service";

// ── Column types ───────────────────────────────────────────────────────────────

type ColumnGroup =
  | "domain_info"
  | "site_details"
  | "publisher"
  | "contacts"
  | "classification";

interface ColumnDef {
  key: keyof NewsPlacementRow;
  label: string;
  group: ColumnGroup;
  min_width: number;
  type: "text" | "select" | "number" | "url";
  options?: string[];
}

// ── Column definitions ─────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  "General",
  "Business",
  "Finance",
  "Tech",
  "News",
  "Health",
  "Lifestyle",
  "Sports",
  "Entertainment",
];

const CONTENT_TYPE_OPTIONS = [
  "Press Release",
  "Branded Article",
  "Guest Post",
  "Sponsored Post",
];

const DO_FOLLOW_OPTIONS = ["Do-Follow", "No-Follow"];

const YES_NO_OPTIONS = ["Yes", "No"];

const WELL_KNOWN_OPTIONS = ["Yes - globally", "Yes - industry wide", "No"];

const TIER_OPTIONS = ["Exclusive Placement", "Standard", "Premium"];

const COLUMNS: ColumnDef[] = [
  { key: "domain",            label: "Domain",                  group: "domain_info",    min_width: 200, type: "url" },
  { key: "dr",                label: "DR",                      group: "domain_info",    min_width: 60,  type: "number" },
  { key: "traffic",           label: "Traffic",                 group: "domain_info",    min_width: 100, type: "number" },
  { key: "category",          label: "Category",                group: "domain_info",    min_width: 140, type: "select", options: CATEGORY_OPTIONS },
  { key: "price",             label: "Price",                   group: "site_details",   min_width: 90,  type: "text" },
  { key: "types_of_content",  label: "Types of Content",        group: "site_details",   min_width: 160, type: "select", options: CONTENT_TYPE_OPTIONS },
  { key: "do_follow_no_follow", label: "DoFollow/NoFollow",     group: "site_details",   min_width: 130, type: "select", options: DO_FOLLOW_OPTIONS },
  { key: "indexable",         label: "Indexable?",              group: "site_details",   min_width: 90,  type: "select", options: YES_NO_OPTIONS },
  { key: "well_known_site",   label: "Well Known Site?",        group: "site_details",   min_width: 155, type: "select", options: WELL_KNOWN_OPTIONS },
  { key: "links_allowed",     label: "# of Links Allowed",      group: "publisher",      min_width: 130, type: "number" },
  { key: "additional_notes",  label: "Additional Notes",        group: "publisher",      min_width: 200, type: "text" },
  { key: "price_1",           label: "Price 1 (BASE's cost)",   group: "publisher",      min_width: 150, type: "text" },
  { key: "poc_1",             label: "POC 1",                   group: "contacts",       min_width: 120, type: "text" },
  { key: "price_2",           label: "Price 2",                 group: "contacts",       min_width: 90,  type: "text" },
  { key: "poc_2",             label: "POC 2",                   group: "contacts",       min_width: 120, type: "text" },
  { key: "tier",              label: "Tier",                    group: "classification", min_width: 160, type: "select", options: TIER_OPTIONS },
  { key: "pbn_check",         label: "PBN Check",               group: "classification", min_width: 90,  type: "number" },
  { key: "used_domain",       label: "Used Domain in 2025/26?", group: "classification", min_width: 170, type: "select", options: YES_NO_OPTIONS },
  { key: "within_budget",     label: "Within Budget?",          group: "classification", min_width: 110, type: "select", options: YES_NO_OPTIONS },
  { key: "ref_domains",       label: "Ref Domains",             group: "classification", min_width: 110, type: "number" },
];

// ── Group header styles ────────────────────────────────────────────────────────

const GROUP_HEADER_STYLES: Record<ColumnGroup, string> = {
  domain_info:    "bg-pink-600 text-white border-pink-700",
  site_details:   "bg-gray-700 text-white border-gray-600",
  publisher:      "bg-amber-700 text-white border-amber-800",
  contacts:       "bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500",
  classification: "bg-emerald-700 text-white border-emerald-800",
};

// ── Empty row factory ──────────────────────────────────────────────────────────

let _local_counter = 0;
function createTempId(): string {
  _local_counter += 1;
  return `temp_${_local_counter}_${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyRow(): NewsPlacementRow {
  return {
    id: createTempId(),
    domain: "",
    dr: "",
    traffic: "",
    category: "",
    price: "",
    types_of_content: "",
    do_follow_no_follow: "",
    indexable: "",
    well_known_site: "",
    links_allowed: "",
    additional_notes: "",
    price_1: "",
    poc_1: "",
    price_2: "",
    poc_2: "",
    tier: "Exclusive Placement",
    pbn_check: "",
    used_domain: "",
    within_budget: "",
    ref_domains: "",
  };
}

// ── Editable cell ──────────────────────────────────────────────────────────────

interface EditableCellProps {
  col: ColumnDef;
  value: string;
  is_editing: boolean;
  onStartEdit: () => void;
  onUpdate: (value: string) => void;
  onStopEdit: () => void;
  onKeyNav: (direction: "next" | "prev" | "down") => void;
}

function EditableCell({
  col,
  value,
  is_editing,
  onStartEdit,
  onUpdate,
  onStopEdit,
  onKeyNav,
}: EditableCellProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const select_ref = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (is_editing) {
      input_ref.current?.focus();
      input_ref.current?.select();
      select_ref.current?.focus();
    }
  }, [is_editing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onStopEdit();
    } else if (e.key === "Enter") {
      onStopEdit();
      onKeyNav("down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      onStopEdit();
      onKeyNav(e.shiftKey ? "prev" : "next");
    }
  };

  if (is_editing) {
    if (col.type === "select" && col.options) {
      return (
        <td className="p-0">
          <select
            ref={select_ref}
            value={value}
            onChange={(e) => onUpdate(e.target.value)}
            onBlur={onStopEdit}
            onKeyDown={handleKeyDown}
            className="h-full w-full border-2 border-brand-500 bg-white px-2 py-1.5 text-xs outline-none dark:bg-gray-800 dark:text-white"
            style={{ minWidth: col.min_width }}
          >
            <option value="">-- Select --</option>
            {col.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </td>
      );
    }

    return (
      <td className="p-0">
        <input
          ref={input_ref}
          type="text"
          value={value}
          onChange={(e) => onUpdate(e.target.value)}
          onBlur={onStopEdit}
          onKeyDown={handleKeyDown}
          className="h-full w-full border-2 border-brand-500 bg-white px-2 py-1.5 text-xs outline-none dark:bg-gray-800 dark:text-white"
          style={{ minWidth: col.min_width }}
        />
      </td>
    );
  }

  // ── Display mode ─────────────────────────────────────────────────────────────

  let display: React.ReactNode;

  if (col.type === "url" && value) {
    const label = value.replace(/^https?:\/\//, "").slice(0, 30);
    display = (
      <a
        href={value.startsWith("http") ? value : `https://${value}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline"
        onClick={(e) => e.stopPropagation()}
        title={value}
      >
        {label}
        {value.replace(/^https?:\/\//, "").length > 30 ? "…" : ""}
      </a>
    );
  } else if (col.key === "do_follow_no_follow" && value) {
    const is_dofollow = value === "Do-Follow";
    display = (
      <span
        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
          is_dofollow
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
        }`}
      >
        {value}
      </span>
    );
  } else if (col.key === "tier" && value) {
    display = (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        {value}
      </span>
    );
  } else if ((col.key === "indexable" || col.key === "used_domain" || col.key === "within_budget") && value) {
    const is_yes = value === "Yes";
    display = (
      <span
        className={`font-medium ${
          is_yes
            ? "text-green-600 dark:text-green-400"
            : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {value}
      </span>
    );
  } else if (col.key === "types_of_content" && value) {
    const is_press = value === "Press Release";
    display = (
      <span
        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
          is_press
            ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        }`}
      >
        {value}
      </span>
    );
  } else if (col.key === "category" && value) {
    const category_colors: Record<string, string> = {
      General:       "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
      Business:      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      Finance:       "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      Tech:          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      News:          "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      Health:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      Lifestyle:     "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
      Sports:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      Entertainment: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    };
    display = (
      <span
        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
          category_colors[value] ?? "bg-gray-100 text-gray-600"
        }`}
      >
        {value}
      </span>
    );
  } else if ((col.key === "price" || col.key === "price_1" || col.key === "price_2") && value) {
    const is_highlighted =
      value.startsWith("$") && parseInt(value.replace(/\D/g, ""), 10) >= 1000;
    display = (
      <span
        className={`font-medium ${
          is_highlighted
            ? "text-rose-600 dark:text-rose-400"
            : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {value}
      </span>
    );
  } else if (col.key === "well_known_site" && value) {
    const is_global = value.includes("globally");
    const is_industry = value.includes("industry");
    display = (
      <span
        className={`text-xs font-medium ${
          is_global
            ? "text-green-600 dark:text-green-400"
            : is_industry
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-400"
        }`}
      >
        {value}
      </span>
    );
  } else {
    display = value ? (
      <span title={value}>{value}</span>
    ) : (
      <span className="text-gray-300 dark:text-gray-600">—</span>
    );
  }

  return (
    <td
      className="cursor-pointer whitespace-nowrap px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20"
      onClick={onStartEdit}
      title="Click to edit"
    >
      <div className="overflow-hidden" style={{ maxWidth: col.min_width }}>
        {display}
      </div>
    </td>
  );
}

// ── Table skeleton ─────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            {COLUMNS.slice(0, 10).map((col) => (
              <th
                key={col.key}
                className={`border border-gray-700/30 px-2 py-2 text-left font-semibold ${GROUP_HEADER_STYLES[col.group]}`}
                style={{ minWidth: col.min_width }}
              >
                {col.label}
              </th>
            ))}
            <th className="border border-gray-700/30 bg-gray-800 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
              {COLUMNS.slice(0, 10).map((col) => (
                <td key={col.key} className="px-2 py-2">
                  <div className="h-3.5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </td>
              ))}
              <td className="px-2 py-2">
                <div className="h-3.5 w-6 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NewsPlacementsTable() {
  const [rows, setRows] = useState<NewsPlacementRow[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [save_error, setSaveError] = useState<string | null>(null);
  const [editing_cell, setEditingCell] = useState<{ row_id: string; col_key: string } | null>(null);
  const [saving_row_ids, setSavingRowIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [show_filter_panel, setShowFilterPanel] = useState(false);
  const [hidden_columns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [current_page, setCurrentPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const rows_ref = useRef<NewsPlacementRow[]>([]);
  rows_ref.current = rows;

  const editing_cell_ref = useRef<{ row_id: string; col_key: string } | null>(null);
  editing_cell_ref.current = editing_cell;

  const new_row_ids_ref = useRef<Set<string>>(new Set());

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchRows = useCallback(async (page: number) => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const res = await listNewsPlacements({ page, per_page: 50 });
      setRows(res.data);
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      setSaveError("Failed to load news placements. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows(1);
  }, [fetchRows]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const visible_columns = COLUMNS.filter((col) => !hidden_columns.has(col.key));

  const filtered_rows = rows.filter((row) => {
    if (!search.trim()) return true;
    const lower = search.toLowerCase();
    return (
      row.domain.toLowerCase().includes(lower) ||
      row.category.toLowerCase().includes(lower) ||
      row.types_of_content.toLowerCase().includes(lower) ||
      row.poc_1.toLowerCase().includes(lower) ||
      row.tier.toLowerCase().includes(lower) ||
      row.additional_notes.toLowerCase().includes(lower)
    );
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const markSaving = (row_id: string) =>
    setSavingRowIds((prev) => new Set(prev).add(row_id));

  const unmarkSaving = (row_id: string) =>
    setSavingRowIds((prev) => {
      const next = new Set(prev);
      next.delete(row_id);
      return next;
    });

  const replaceRow = (old_id: string, new_row: NewsPlacementRow) =>
    setRows((prev) => prev.map((r) => (r.id === old_id ? new_row : r)));

  // ── Persist helpers ─────────────────────────────────────────────────────────

  const persistNewRow = useCallback(async (row: NewsPlacementRow) => {
    markSaving(row.id);
    setSaveError(null);
    try {
      const res = await createNewsPlacement(buildPayload(row));
      new_row_ids_ref.current.delete(row.id);
      replaceRow(row.id, res.data);
    } catch {
      setSaveError(`Failed to create row "${row.domain}". Check required fields and try again.`);
    } finally {
      unmarkSaving(row.id);
    }
  }, []);

  const persistRowUpdate = useCallback(async (row: NewsPlacementRow) => {
    markSaving(row.id);
    setSaveError(null);
    try {
      const res = await updateNewsPlacement(row.id, buildPayload(row));
      replaceRow(row.id, res.data);
    } catch {
      setSaveError(`Failed to save row "${row.domain}". Changes may not have been saved.`);
    } finally {
      unmarkSaving(row.id);
    }
  }, []);

  // ── Editing ─────────────────────────────────────────────────────────────────

  const startEditing = useCallback((row_id: string, col_key: string) => {
    setEditingCell({ row_id, col_key });
  }, []);

  const stopEditing = useCallback(() => {
    const cell = editing_cell_ref.current;
    if (!cell) return;
    setEditingCell(null);

    const row = rows_ref.current.find((r) => r.id === cell.row_id);
    if (!row) return;

    if (new_row_ids_ref.current.has(row.id)) {
      if (row.domain.trim()) {
        persistNewRow(row);
      }
    } else {
      persistRowUpdate(row);
    }
  }, [persistNewRow, persistRowUpdate]);

  const updateCell = useCallback(
    (row_id: string, col_key: keyof NewsPlacementRow, value: string) => {
      setRows((prev) =>
        prev.map((row) => (row.id === row_id ? { ...row, [col_key]: value } : row))
      );
    },
    []
  );

  const navigateCell = useCallback(
    (row_id: string, col_key: string, direction: "next" | "prev" | "down") => {
      const col_idx = visible_columns.findIndex((c) => c.key === col_key);
      const row_idx = filtered_rows.findIndex((r) => r.id === row_id);

      if (direction === "next") {
        const next_col = visible_columns[col_idx + 1];
        if (next_col) {
          setEditingCell({ row_id, col_key: next_col.key });
        } else if (filtered_rows[row_idx + 1]) {
          setEditingCell({
            row_id: filtered_rows[row_idx + 1].id,
            col_key: visible_columns[0].key,
          });
        }
      } else if (direction === "prev") {
        const prev_col = visible_columns[col_idx - 1];
        if (prev_col) setEditingCell({ row_id, col_key: prev_col.key });
      } else if (direction === "down") {
        if (filtered_rows[row_idx + 1]) {
          setEditingCell({ row_id: filtered_rows[row_idx + 1].id, col_key });
        }
      }
    },
    [visible_columns, filtered_rows]
  );

  // ── Add / Delete ────────────────────────────────────────────────────────────

  const addRow = useCallback(() => {
    const new_row = createEmptyRow();
    new_row_ids_ref.current.add(new_row.id);
    setRows((prev) => [...prev, new_row]);
    setTimeout(() => setEditingCell({ row_id: new_row.id, col_key: "domain" }), 50);
  }, []);

  const deleteRow = useCallback(async (row_id: string) => {
    if (editing_cell_ref.current?.row_id === row_id) setEditingCell(null);

    if (new_row_ids_ref.current.has(row_id)) {
      new_row_ids_ref.current.delete(row_id);
      setRows((prev) => prev.filter((r) => r.id !== row_id));
      return;
    }

    markSaving(row_id);
    setSaveError(null);
    try {
      await deleteNewsPlacement(row_id);
      setRows((prev) => prev.filter((r) => r.id !== row_id));
    } catch {
      setSaveError("Failed to delete row. Please try again.");
    } finally {
      unmarkSaving(row_id);
    }
  }, []);

  // ── Column visibility ───────────────────────────────────────────────────────

  const toggleColumn = useCallback((col_key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col_key)) {
        next.delete(col_key);
      } else {
        next.add(col_key);
      }
      return next;
    });
  }, []);

  // ── Export ──────────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const url = buildExportUrl({ search: search || undefined });
    window.open(url, "_blank");
  }, [search]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Premium News Placements Database
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {is_loading
              ? "Loading…"
              : `${filtered_rows.length} of ${total} rows · ${visible_columns.length} columns · Click any cell to edit`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search domains, categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          {/* Column filter toggle */}
          <button
            onClick={() => setShowFilterPanel((v) => !v)}
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
              show_filter_panel
                ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Columns
            {hidden_columns.size > 0 && (
              <span className="ml-0.5 rounded-full bg-brand-500 px-1.5 py-0.5 text-xs text-white">
                {hidden_columns.size}
              </span>
            )}
          </button>
          {/* Export */}
          <button
            onClick={handleExport}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          {/* Add row */}
          <button
            onClick={addRow}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-medium text-white transition-colors hover:bg-brand-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Row
          </button>
        </div>
      </div>

      {/* Error banner */}
      {save_error && (
        <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-4 py-2 dark:border-red-900/30 dark:bg-red-900/20">
          <p className="text-xs text-red-600 dark:text-red-400">{save_error}</p>
          <button
            onClick={() => setSaveError(null)}
            className="ml-4 rounded p-0.5 text-red-400 hover:text-red-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Column visibility panel */}
      {show_filter_panel && (
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Toggle column visibility
            </p>
            <button
              onClick={() => setHiddenColumns(new Set())}
              className="text-xs text-brand-500 hover:underline dark:text-brand-400"
            >
              Show all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COLUMNS.map((col) => {
              const is_visible = !hidden_columns.has(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                    is_visible
                      ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      : "border-dashed border-gray-300 bg-transparent text-gray-400 line-through dark:border-gray-600 dark:text-gray-500"
                  }`}
                >
                  {is_visible ? (
                    <svg className="h-2.5 w-2.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Table body */}
      {is_loading ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                {visible_columns.map((col) => (
                  <th
                    key={col.key}
                    className={`border border-gray-700/30 px-2 py-2 text-left font-semibold tracking-wide ${GROUP_HEADER_STYLES[col.group]}`}
                    style={{ minWidth: col.min_width }}
                  >
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      {col.label}
                    </span>
                  </th>
                ))}
                <th className="border border-gray-700/30 bg-gray-800 px-2 py-2 text-center text-xs font-semibold text-white">
                  <span className="sr-only">Row actions</span>
                  <svg className="mx-auto h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered_rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visible_columns.length + 1}
                    className="px-6 py-14 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    {search
                      ? `No rows match "${search}".`
                      : 'No placements found. Click "Add Row" to create one.'}
                  </td>
                </tr>
              ) : (
                filtered_rows.map((row, row_idx) => {
                  const is_saving = saving_row_ids.has(row.id);
                  const is_new = new_row_ids_ref.current.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`group border-b border-gray-100 transition-colors dark:border-gray-800 ${
                        row_idx % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-gray-50/60 dark:bg-gray-800/30"
                      } ${is_saving ? "opacity-60" : ""} hover:bg-blue-50/40 dark:hover:bg-blue-900/10`}
                    >
                      {visible_columns.map((col) => {
                        const is_editing =
                          editing_cell?.row_id === row.id &&
                          editing_cell?.col_key === col.key;
                        return (
                          <EditableCell
                            key={col.key}
                            col={col}
                            value={(row[col.key] as string) ?? ""}
                            is_editing={is_editing}
                            onStartEdit={() => startEditing(row.id, col.key)}
                            onUpdate={(val) => updateCell(row.id, col.key, val)}
                            onStopEdit={stopEditing}
                            onKeyNav={(dir) => navigateCell(row.id, col.key, dir)}
                          />
                        );
                      })}
                      {/* Actions cell */}
                      <td className="border-l border-gray-100 px-2 py-1.5 text-center dark:border-gray-800">
                        {is_saving ? (
                          <svg
                            className="mx-auto h-3.5 w-3.5 animate-spin text-brand-400"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            {is_new && !row.domain && (
                              <span
                                className="rounded bg-yellow-100 px-1 py-0.5 text-xs text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                                title="Fill in the domain to save this row"
                              >
                                unsaved
                              </span>
                            )}
                            <button
                              onClick={() => deleteRow(row.id)}
                              className="rounded p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                              title="Delete row"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer — pagination + summary */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          {total} total rows &middot; {visible_columns.length} of {COLUMNS.length} columns visible
        </p>
        {last_page > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={current_page <= 1 || is_loading}
              onClick={() => fetchRows(current_page - 1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {current_page} of {last_page}
            </span>
            <button
              disabled={current_page >= last_page || is_loading}
              onClick={() => fetchRows(current_page + 1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}
        <p className="text-xs text-gray-300 dark:text-gray-700">
          Tab · Enter · Esc to navigate
        </p>
      </div>
    </div>
  );
}
