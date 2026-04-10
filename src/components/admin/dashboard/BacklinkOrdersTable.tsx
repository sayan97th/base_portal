"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { BacklinkOrderRow } from "@/types/admin/backlink-order";
import { useTableSort } from "@/hooks/useTableSort";
import { useColumnFilters, isFilterActive } from "@/hooks/useColumnFilters";
import ColumnFilterDropdown from "./ColumnFilterDropdown";
import {
  listBacklinkOrders,
  createBacklinkOrder,
  updateBacklinkOrder,
  deleteBacklinkOrder,
  buildPayload,
  buildExportUrl,
} from "@/services/admin/backlink-order.service";

// ── Column types ───────────────────────────────────────────────────────────────

type ColumnGroup =
  | "order"
  | "team_link"
  | "core"
  | "dates"
  | "health"
  | "writer"
  | "status_col"
  | "live"
  | "metrics"
  | "pricing";

interface ColumnDef {
  key: keyof BacklinkOrderRow;
  label: string;
  group: ColumnGroup;
  min_width: number;
  type: "text" | "select" | "date" | "url" | "number";
  options?: string[];
  locked?: boolean;
}

// ── Column definitions ─────────────────────────────────────────────────────────

const LINK_TYPE_OPTIONS = [
  "DA 30+ External",
  "DA 40+ External",
  "DA 50+ External",
  "DA 30+ Internal",
  "DA 40+ Internal",
];

const STATUS_OPTIONS = [
  "New Request",
  "Reviewing",
  "Ordered",
  "Pending",
  "Live",
  "Quality Control",
  "Cancelled",
];

const COLUMNS: ColumnDef[] = [
  { key: "order_id", label: "Order ID", group: "order", min_width: 110, type: "text" },
  { key: "status", label: "Status", group: "status_col", min_width: 130, type: "select", options: STATUS_OPTIONS },
  { key: "team_specific_link_id", label: "Team Specific Link ID", group: "team_link", min_width: 160, type: "text" },
  { key: "link_type", label: "Link Type", group: "core", min_width: 155, type: "select", options: LINK_TYPE_OPTIONS },
  { key: "client", label: "Client", group: "core", min_width: 120, type: "text" },
  { key: "keyword", label: "Keyword", group: "core", min_width: 200, type: "text" },
  { key: "landing_page", label: "Landing Page", group: "core", min_width: 240, type: "url" },
  { key: "exact_match", label: "Exact Match?", group: "core", min_width: 100, type: "select", options: ["Yes", "No"] },
  { key: "notes", label: "Notes", group: "core", min_width: 160, type: "text" },
  { key: "request_date", label: "Request Date", group: "dates", min_width: 120, type: "date", locked: true },
  { key: "estimated_delivery_date", label: "Estimated Delivery Date", group: "dates", min_width: 175, type: "date", locked: true },
  { key: "estimated_turnaround_days", label: "Est. Turnaround (Days)", group: "dates", min_width: 155, type: "number", locked: true },
  { key: "days_left", label: "Days Left", group: "health", min_width: 90, type: "number" },
  { key: "projected_health", label: "Projected Health", group: "health", min_width: 130, type: "text" },
  { key: "link_builder", label: "Link Builder", group: "writer", min_width: 170, type: "text" },
  { key: "pen_name", label: "Pen Name", group: "writer", min_width: 120, type: "text" },
  { key: "partnership", label: "Partnership", group: "writer", min_width: 180, type: "url" },
  { key: "article_title", label: "Article Title", group: "writer", min_width: 220, type: "text" },
  { key: "article", label: "Article", group: "writer", min_width: 120, type: "url" },
  { key: "live_link", label: "Live Link", group: "live", min_width: 220, type: "url" },
  { key: "live_link_date", label: "Live Link Date", group: "live", min_width: 120, type: "date" },
  { key: "dr_lbs", label: "DR - LBs", group: "metrics", min_width: 80, type: "number" },
  { key: "posting_fee_lbs", label: "Posting Fee - LBs", group: "metrics", min_width: 135, type: "text" },
  { key: "current_traffic", label: "Current Traffic", group: "metrics", min_width: 120, type: "number" },
  { key: "dr_formula", label: "DR Formula", group: "pricing", min_width: 100, type: "number" },
  { key: "current_poc", label: "Current POC", group: "pricing", min_width: 130, type: "text" },
  { key: "current_price", label: "Current Price", group: "pricing", min_width: 120, type: "text" },
  { key: "lb_tl_approval", label: "LB TL Approval", group: "pricing", min_width: 130, type: "text" },
  { key: "approval_date", label: "Approval Date", group: "pricing", min_width: 120, type: "date" },
  { key: "final_price", label: "Final Price", group: "pricing", min_width: 110, type: "text" },
];

// ── Group header styles ────────────────────────────────────────────────────────

const GROUP_HEADER_STYLES: Record<ColumnGroup, string> = {
  order: "bg-gray-950 text-white border-gray-800",
  team_link: "bg-pink-600 text-white border-pink-700",
  core: "bg-gray-700 text-white border-gray-600",
  dates: "bg-amber-700 text-white border-amber-800",
  health: "bg-yellow-400 text-gray-900 border-yellow-500",
  writer: "bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500",
  status_col: "bg-purple-700 text-white border-purple-800",
  live: "bg-rose-400 text-white border-rose-500",
  metrics: "bg-red-600 text-white border-red-700",
  pricing: "bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500",
};

// ── Empty row factory ──────────────────────────────────────────────────────────

let _local_counter = 0;
function createTempId(): string {
  _local_counter += 1;
  return `temp_${_local_counter}_${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyRow(): BacklinkOrderRow {
  return {
    id: createTempId(),
    order_id: "",
    team_specific_link_id: "",
    link_type: "",
    client: "",
    keyword: "",
    landing_page: "",
    exact_match: "No",
    notes: "",
    request_date: "",
    estimated_delivery_date: "",
    estimated_turnaround_days: "30",
    days_left: "",
    projected_health: "",
    link_builder: "",
    pen_name: "",
    partnership: "",
    article_title: "",
    article: "",
    status: "New Request",
    live_link: "",
    live_link_date: "",
    dr_lbs: "",
    posting_fee_lbs: "",
    current_traffic: "",
    dr_formula: "",
    current_poc: "",
    current_price: "",
    lb_tl_approval: "",
    approval_date: "",
    final_price: "",
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isDateOverdue(date_str: string): boolean {
  if (!date_str) return false;
  const parts = date_str.split("/");
  if (parts.length !== 3) return false;
  const date = new Date(
    `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
  );
  return !isNaN(date.getTime()) && date < new Date();
}

function isDaysNegative(days_str: string): boolean {
  const n = parseInt(days_str, 10);
  return !isNaN(n) && n < 0;
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
    const label = value.replace(/^https?:\/\//, "").slice(0, 28);
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
        {value.replace(/^https?:\/\//, "").length > 28 ? "…" : ""}
      </a>
    );
  } else if (col.key === "estimated_delivery_date" && isDateOverdue(value)) {
    display = <span className="font-semibold text-red-500">{value}</span>;
  } else if (col.key === "days_left" && isDaysNegative(value)) {
    display = <span className="font-semibold text-red-500">{value}</span>;
  } else if (col.key === "status" && value) {
    const status_map: Record<string, string> = {
      "New Request": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      Reviewing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
      Ordered: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      Live: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      "Quality Control": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
      Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    display = (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
          status_map[value] ?? "bg-gray-100 text-gray-600"
        }`}
      >
        {value === "Live" && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
        {value}
      </span>
    );
  } else if (col.key === "exact_match") {
    if (value === "Yes") {
      display = <span className="font-medium text-green-600 dark:text-green-400">Yes</span>;
    } else if (value === "No") {
      display = <span className="text-gray-400">No</span>;
    } else {
      display = <span className="text-gray-300">—</span>;
    }
  } else if (col.key === "projected_health" && value) {
    const is_negative = value.startsWith("-");
    display = (
      <span
        className={`font-medium ${
          is_negative ? "text-red-500" : "text-green-600 dark:text-green-400"
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

export default function BacklinkOrdersTable() {
  const [rows, setRows] = useState<BacklinkOrderRow[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [save_error, setSaveError] = useState<string | null>(null);
  const [editing_cell, setEditingCell] = useState<{ row_id: string; col_key: string } | null>(null);
  const [saving_row_ids, setSavingRowIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [status_filter, setStatusFilter] = useState<string>("");
  const [client_filter, setClientFilter] = useState<string>("");
  const [link_type_filter, setLinkTypeFilter] = useState<string>("");
  const [link_builder_filter, setLinkBuilderFilter] = useState<string>("");
  const [show_filter_panel, setShowFilterPanel] = useState(false);
  const [hidden_columns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [current_page, setCurrentPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ── Sort & column-filter state ───────────────────────────────────────────────

  const { sort_rules, toggleSort, clearSort, applySorting } = useTableSort();
  const {
    column_filters,
    setFilter,
    clearAllFilters: clearColumnFilters,
    active_filter_count,
    applyFilters: applyColumnFilters,
  } = useColumnFilters();

  // Which column's filter dropdown is currently open
  const [open_filter_col, setOpenFilterCol] = useState<keyof BacklinkOrderRow | null>(null);
  const [filter_anchor_el, setFilterAnchorEl] = useState<HTMLElement | null>(null);

  // Refs for stable callbacks (avoid stale closures)
  const rows_ref = useRef<BacklinkOrderRow[]>([]);
  rows_ref.current = rows;

  const editing_cell_ref = useRef<{ row_id: string; col_key: string } | null>(null);
  editing_cell_ref.current = editing_cell;

  // Tracks rows created locally that haven't been persisted yet
  const new_row_ids_ref = useRef<Set<string>>(new Set());

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchRows = useCallback(async (page: number) => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const res = await listBacklinkOrders({ page, per_page: 50 });
      setRows(res.data);
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      setSaveError("Failed to load backlink orders. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows(1);
  }, [fetchRows]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const visible_columns = COLUMNS.filter((col) => !hidden_columns.has(col.key));

  // 1. Toolbar filters (search + quick dropdowns)
  const toolbar_filtered = rows.filter((row) => {
    if (status_filter && row.status !== status_filter) return false;
    if (link_type_filter && row.link_type !== link_type_filter) return false;
    if (client_filter && !row.client.toLowerCase().includes(client_filter.toLowerCase())) return false;
    if (link_builder_filter && !row.link_builder.toLowerCase().includes(link_builder_filter.toLowerCase())) return false;
    if (!search.trim()) return true;
    const lower = search.toLowerCase();
    return (
      row.order_id.toLowerCase().includes(lower) ||
      row.client.toLowerCase().includes(lower) ||
      row.keyword.toLowerCase().includes(lower) ||
      row.link_builder.toLowerCase().includes(lower) ||
      row.status.toLowerCase().includes(lower) ||
      row.partnership.toLowerCase().includes(lower)
    );
  });

  // 2. Per-column filters → 3. Multi-column sort
  const filtered_rows = applySorting(applyColumnFilters(toolbar_filtered));

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const markSaving = (row_id: string) =>
    setSavingRowIds((prev) => new Set(prev).add(row_id));

  const unmarkSaving = (row_id: string) =>
    setSavingRowIds((prev) => {
      const next = new Set(prev);
      next.delete(row_id);
      return next;
    });

  const replaceRow = (old_id: string, new_row: BacklinkOrderRow) =>
    setRows((prev) =>
      prev.map((r) => (r.id === old_id ? new_row : r))
    );

  // ── Persist helpers ─────────────────────────────────────────────────────────

  const persistNewRow = useCallback(async (row: BacklinkOrderRow) => {
    markSaving(row.id);
    setSaveError(null);
    try {
      const res = await createBacklinkOrder(buildPayload(row));
      // Replace temp row with server row (server assigns the real UUID)
      new_row_ids_ref.current.delete(row.id);
      replaceRow(row.id, res.data);
    } catch {
      setSaveError(`Failed to create row "${row.order_id}". Check required fields and try again.`);
    } finally {
      unmarkSaving(row.id);
    }
  }, []);

  const persistRowUpdate = useCallback(async (row: BacklinkOrderRow) => {
    markSaving(row.id);
    setSaveError(null);
    try {
      const res = await updateBacklinkOrder(row.id, buildPayload(row));
      // Sync computed fields (days_left, projected_health) from server response
      replaceRow(row.id, res.data);
    } catch {
      setSaveError(`Failed to save row "${row.order_id}". Changes may not have been saved.`);
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
      // Only persist a new row once order_id is filled
      if (row.order_id.trim()) {
        persistNewRow(row);
      }
    } else {
      persistRowUpdate(row);
    }
  }, [persistNewRow, persistRowUpdate]);

  const updateCell = useCallback(
    (row_id: string, col_key: keyof BacklinkOrderRow, value: string) => {
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
    setTimeout(() => setEditingCell({ row_id: new_row.id, col_key: "order_id" }), 50);
  }, []);

  const deleteRow = useCallback(
    async (row_id: string) => {
      if (editing_cell_ref.current?.row_id === row_id) setEditingCell(null);

      // If it's a local-only row, just remove it
      if (new_row_ids_ref.current.has(row_id)) {
        new_row_ids_ref.current.delete(row_id);
        setRows((prev) => prev.filter((r) => r.id !== row_id));
        return;
      }

      markSaving(row_id);
      setSaveError(null);
      try {
        await deleteBacklinkOrder(row_id);
        setRows((prev) => prev.filter((r) => r.id !== row_id));
      } catch {
        setSaveError("Failed to delete row. Please try again.");
      } finally {
        unmarkSaving(row_id);
      }
    },
    []
  );

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

  // ── Clear filters ───────────────────────────────────────────────────────────

  const has_active_filters =
    search.trim() !== "" ||
    status_filter !== "" ||
    client_filter !== "" ||
    link_type_filter !== "" ||
    link_builder_filter !== "" ||
    hidden_columns.size > 0 ||
    active_filter_count > 0 ||
    sort_rules.length > 0;

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setClientFilter("");
    setLinkTypeFilter("");
    setLinkBuilderFilter("");
    setHiddenColumns(new Set());
    clearColumnFilters();
    clearSort();
  }, [clearColumnFilters, clearSort]);

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
            Backlink Orders
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
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          {/* Status filter */}
          <select
            value={status_filter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {/* Link Type filter */}
          <select
            value={link_type_filter}
            onChange={(e) => setLinkTypeFilter(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">All Link Types</option>
            {LINK_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {/* Client filter */}
          <input
            type="text"
            placeholder="Client..."
            value={client_filter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          {/* Link Builder filter */}
          <input
            type="text"
            placeholder="Link Builder..."
            value={link_builder_filter}
            onChange={(e) => setLinkBuilderFilter(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          {/* Clear all filters */}
          {has_active_filters && (
            <button
              onClick={clearAllFilters}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All
            </button>
          )}
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
                {visible_columns.map((col) => {
                  const sort_rule = sort_rules.find((r) => r.key === col.key);
                  const sort_priority = sort_rules.findIndex((r) => r.key === col.key);
                  const col_filter = column_filters[col.key];
                  const filter_is_active = col_filter ? isFilterActive(col_filter) : false;

                  return (
                    <th
                      key={col.key}
                      className={`border border-gray-700/30 px-2 py-1.5 text-left font-semibold tracking-wide ${GROUP_HEADER_STYLES[col.group]}`}
                      style={{ minWidth: col.min_width }}
                    >
                      <div className="flex items-center gap-1">
                        {/* Sort button — takes up most of the header width */}
                        <button
                          onClick={(e) =>
                            toggleSort(col.key, e.shiftKey)
                          }
                          title={
                            sort_rules.length > 0
                              ? "Click to sort · Shift+Click to add secondary sort"
                              : "Click to sort · Shift+Click for multi-column sort"
                          }
                          className="flex flex-1 items-center gap-1 whitespace-nowrap text-left hover:opacity-75"
                        >
                          {col.locked && (
                            <svg
                              className="h-3 w-3 shrink-0 opacity-80"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              aria-label="Locked column"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          <span>{col.label}</span>
                          {/* Sort direction arrow */}
                          {sort_rule ? (
                            <span className="ml-0.5 flex items-center gap-0.5">
                              <svg
                                className="h-3 w-3 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                {sort_rule.direction === "asc" ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                )}
                              </svg>
                              {/* Priority badge for multi-sort */}
                              {sort_rules.length > 1 && (
                                <span className="rounded bg-white/25 px-1 text-[10px] font-bold leading-tight">
                                  {sort_priority + 1}
                                </span>
                              )}
                            </span>
                          ) : (
                            <svg
                              className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                            </svg>
                          )}
                        </button>

                        {/* Per-column filter button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (open_filter_col === col.key) {
                              setOpenFilterCol(null);
                              setFilterAnchorEl(null);
                            } else {
                              setOpenFilterCol(col.key);
                              setFilterAnchorEl(e.currentTarget);
                            }
                          }}
                          title="Filter this column"
                          className={`shrink-0 rounded p-0.5 transition-opacity ${
                            filter_is_active
                              ? "opacity-100 text-yellow-200"
                              : "opacity-30 hover:opacity-80"
                          }`}
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                        </button>
                      </div>
                    </th>
                  );
                })}
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
                    {search || status_filter || link_type_filter || client_filter || link_builder_filter
                      ? "No rows match the active filters."
                      : 'No backlink orders found. Click "Add Row" to create one.'}
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
                            {is_new && !row.order_id && (
                              <span
                                className="rounded bg-yellow-100 px-1 py-0.5 text-xs text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                                title="Fill in Order ID to save this row"
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

      {/* Per-column filter dropdown (portal — avoids overflow clipping) */}
      {open_filter_col && (
        <ColumnFilterDropdown
          col_key={open_filter_col}
          col_label={COLUMNS.find((c) => c.key === open_filter_col)?.label ?? open_filter_col}
          col_type={COLUMNS.find((c) => c.key === open_filter_col)?.type ?? "text"}
          col_options={COLUMNS.find((c) => c.key === open_filter_col)?.options}
          current_filter={column_filters[open_filter_col]}
          anchor_el={filter_anchor_el}
          onSetFilter={(filter) => setFilter(open_filter_col, filter)}
          onClose={() => {
            setOpenFilterCol(null);
            setFilterAnchorEl(null);
          }}
        />
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
      </div>
    </div>
  );
}
