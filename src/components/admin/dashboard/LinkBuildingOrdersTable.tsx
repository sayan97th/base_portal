"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { LinkBuildingOrderRow } from "@/types/admin/link-building-order";
import { useTableSort } from "@/hooks/useTableSort";
import { useColumnFilters, isFilterActive } from "@/hooks/useColumnFilters";
import ColumnFilterDropdown from "./ColumnFilterDropdown";
import {
  listLinkBuildingOrders,
  createLinkBuildingOrder,
  updateLinkBuildingOrder,
  deleteLinkBuildingOrder,
  buildLboPayload,
  exportLinkBuildingOrders,
  batchUpdateLinkBuildingOrders,
  listAdminUsersForSelect,
  listClientUsersForSelect,
  parseApiErrorMessage,
  type AdminUserOption,
  type ClientUserOption,
} from "@/services/admin/link-building-dashboard.service";
import LinkBuildingOrderImportModal from "./LinkBuildingOrderImportModal";
import LinkBuildingMetricsUpdateModal from "./LinkBuildingMetricsUpdateModal";
import UserSelectFilterDropdown from "./UserSelectFilterDropdown";
import ClientAssignCell from "./ClientAssignCell";
import ClientSearchableSelect from "./ClientSearchableSelect";
import AdminSearchableSelect from "./AdminSearchableSelect";
import type { LinkBuildingOrderSearchBody, ColumnFilterPayload, SortRulePayload, LinkBuildingOrderPayload } from "@/types/admin/link-building-order";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/context/AuthContext";
import { useLinkBuildingCollaboration } from "@/hooks/useLinkBuildingCollaboration";
import CollaborationBar from "./CollaborationBar";
import RowPresenceIndicator, {
  CellPresenceOverlay,
  RowPresenceFloater,
} from "./RowPresenceIndicator";
import type { CollaboratorPresence } from "@/types/admin/presence";

// ── Column types ───────────────────────────────────────────────────────────────

type ColumnGroup =
  | "order"
  | "team_link"
  | "core"
  | "internal"
  | "dates"
  | "writer"
  | "status_col"
  | "live"
  | "metrics"
  | "pricing";

interface ColumnDef {
  key: keyof LinkBuildingOrderRow;
  label: string;
  group: ColumnGroup;
  min_width: number;
  type: "text" | "select" | "date" | "url" | "number";
  options?: string[];
  locked?: boolean;
  required?: boolean;
  sort_key?: string;
  sortable?: boolean;
  sticky?: boolean;
}


// ── Column definitions ─────────────────────────────────────────────────────────

const LINK_TYPE_OPTIONS = [
  "DR 30+ External",
  "DR 40+ External",
  "DR 50+ External",
  "DR 60+ External",
  "DR 70+ External",
  "DR 30+ Internal",
  "DR 40+ Internal",
  "DR 50+ Internal",
  "DR 60+ Internal",
  "DR 70+ Internal",
];

const STATUS_OPTIONS = [
  "New Request",
  "Reviewing",
  "Ordered",
  "Pending",
  "Live",
  "Quality Control",
  "Cancelled",
  "Partnership Check",
  "Approved",
  "Not Approved",
  "Ready",
  "Rejected",
  "Scheduled",
];

const COLUMNS: ColumnDef[] = [
  { key: "order_id", label: "Order ID", group: "order", min_width: 110, type: "text", sticky: true },
  { key: "status", label: "Status", group: "status_col", min_width: 130, type: "select", options: STATUS_OPTIONS },
  { key: "team_specific_link_id", label: "Team Specific Link ID", group: "team_link", min_width: 160, type: "text" },
  { key: "link_type", label: "Link Type", group: "core", min_width: 155, type: "select", options: LINK_TYPE_OPTIONS, required: true },
  { key: "client", label: "Company", group: "core", min_width: 120, type: "text", required: true, sticky: true },
  { key: "keyword", label: "Keyword", group: "core", min_width: 200, type: "text", required: true },
  { key: "landing_page", label: "Landing Page", group: "core", min_width: 240, type: "url", required: true, sticky: true },
  { key: "exact_match", label: "Exact Match?", group: "core", min_width: 100, type: "select", options: ["Yes", "No"] },
  { key: "notes", label: "Notes (Client)", group: "core", min_width: 160, type: "text" },
  { key: "internal_notes", label: "Internal Notes", group: "internal", min_width: 200, type: "text" },
  { key: "request_date", label: "Request Date", group: "dates", min_width: 120, type: "date", locked: true },
  { key: "estimated_delivery_date", label: "Delivery Date", group: "dates", min_width: 175, type: "date", locked: true },
  { key: "pen_name", label: "Pen Name", group: "writer", min_width: 120, type: "text" },
  { key: "partnership", label: "Partnership", group: "writer", min_width: 180, type: "url" },
  { key: "article_title", label: "Article Title", group: "writer", min_width: 220, type: "text" },
  { key: "article", label: "Article", group: "writer", min_width: 120, type: "url" },
  { key: "live_link", label: "Live Link", group: "live", min_width: 220, type: "url" },
  { key: "live_link_date", label: "Live Link Date", group: "live", min_width: 120, type: "date" },
  { key: "dr_lbs", label: "DR", group: "metrics", min_width: 80, type: "number" },
  { key: "posting_fee_lbs", label: "Posting Fee", group: "metrics", min_width: 135, type: "text" },
  { key: "current_traffic", label: "Current Traffic", group: "metrics", min_width: 120, type: "number" },
  { key: "dr_formula", label: "DR Formula", group: "pricing", min_width: 100, type: "number" },
  { key: "current_poc", label: "Current POC", group: "pricing", min_width: 130, type: "text" },
  { key: "current_price", label: "Current Price", group: "pricing", min_width: 120, type: "text" },
  { key: "lb_tl_approval", label: "LB TL Approval", group: "pricing", min_width: 130, type: "text" },
  { key: "approval_date", label: "Approval Date", group: "pricing", min_width: 120, type: "date" },
  { key: "final_price", label: "Final Price", group: "pricing", min_width: 110, type: "text" },
  { key: "currency", label: "Currency", group: "pricing", min_width: 100, type: "select", options: ["USD", "EUR"] },
];

const COLUMN_LABELS: Record<string, string> = Object.fromEntries(
  COLUMNS.map((col) => [col.key, col.label])
);

// Fixed pixel width of the checkbox column, used to compute sticky left offsets.
const CHECKBOX_COL_WIDTH = 40;

// ── Group header styles ────────────────────────────────────────────────────────

const GROUP_HEADER_STYLES: Record<ColumnGroup, string> = {
  order: "bg-gray-950 text-white border-gray-800",
  team_link: "bg-pink-600 text-white border-pink-700",
  core: "bg-gray-700 text-white border-gray-600",
  internal: "bg-slate-600 text-white border-slate-700",
  dates: "bg-amber-700 text-white border-amber-800",
  writer: "bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500",
  status_col: "bg-purple-700 text-white border-purple-800",
  live: "bg-rose-400 text-white border-rose-500",
  metrics: "bg-emerald-700 text-white border-emerald-800",
  pricing: "bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500",
};

// ── Empty row factory ──────────────────────────────────────────────────────────

let _local_counter = 0;
function createTempId(): string {
  _local_counter += 1;
  return `temp_${_local_counter}_${Math.random().toString(36).slice(2, 7)}`;
}

function generateOrderId(): string {
  // Returns a visual placeholder for draft rows. The server always assigns
  // the real BL-{n} ID when the row is saved (see store() on the backend).
  return "BL-####";
}

// Matches the admin-facing order id format used to track the external BLS
// spreadsheet number, e.g. "BL-25143". Kept in sync with the backend regex in
// UpdateLinkBuildingOrderRequest.
const ORDER_ID_PATTERN = /^BL-\d+$/i;

function formatDateMMDDYYYY(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
}

const REQUIRED_FIELDS: (keyof LinkBuildingOrderRow)[] = [
  "link_type",
  "client",
  "keyword",
  "landing_page",
];

function getRowMissingRequired(row: LinkBuildingOrderRow): string[] {
  return REQUIRED_FIELDS
    .filter((key) => !row[key] || String(row[key]).trim() === "")
    .map((key) => COLUMNS.find((c) => c.key === key)?.label ?? String(key));
}

// ── Draft persistence (localStorage) ──────────────────────────────────────────

const DRAFT_STORAGE_KEY = "lbo_row_drafts_v1";
const PER_PAGE_STORAGE_KEY = "lbo_per_page_v1";
const PER_PAGE_OPTIONS = [10, 25, 50, 100, 150, 200, 250, 500] as const;
type PerPageOption = (typeof PER_PAGE_OPTIONS)[number];

type DraftRowData = Omit<LinkBuildingOrderRow, "id">;

function loadDrafts(): LinkBuildingOrderRow[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return [];
    const entries = JSON.parse(raw) as DraftRowData[];
    return entries.map((entry) => ({ ...entry, id: createTempId() }));
  } catch {
    return [];
  }
}

function saveDraftsToStorage(draft_rows: LinkBuildingOrderRow[]): void {
  try {
    if (typeof window === "undefined") return;
    if (draft_rows.length === 0) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }
    const entries: DraftRowData[] = draft_rows.map(({ id: _id, ...rest }) => rest);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage quota exceeded or unavailable
  }
}

function createEmptyRow(): LinkBuildingOrderRow {
  const today = new Date();
  const delivery_date = new Date(today);
  delivery_date.setDate(delivery_date.getDate() + 30);

  return {
    id: createTempId(),
    order_id: generateOrderId(),
    team_specific_link_id: "",
    link_type: "",
    client: "",
    keyword: "",
    landing_page: "",
    exact_match: "No",
    notes: "",
    internal_notes: "",
    request_date: formatDateMMDDYYYY(today),
    estimated_delivery_date: formatDateMMDDYYYY(delivery_date),
    estimated_turnaround_days: "30",
    link_builder: "",
    pen_name: "",
    partnership: "",
    partnership_check: "",
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
    currency: "USD",
    admin_team_id: null,
    assigned_admin_user_id: null,
  };
}

// ── User assign cell ───────────────────────────────────────────────────────────

interface UserAssignCellProps {
  assigned_admin_user_id: number | null | undefined;
  admin_users: AdminUserOption[];
  is_editing: boolean;
  onStartEdit: () => void;
  onAssignUser: (value: string) => void;
  onCancelEdit: () => void;
}

function UserAssignCell({
  assigned_admin_user_id,
  admin_users,
  is_editing,
  onStartEdit,
  onAssignUser,
  onCancelEdit,
}: UserAssignCellProps) {
  const cell_ref = useRef<HTMLTableCellElement>(null);
  const selected_user = admin_users.find(
    (u) => assigned_admin_user_id != null && u.id === Number(assigned_admin_user_id)
  );

  return (
    <>
      <td
        ref={cell_ref}
        className={`cursor-pointer whitespace-nowrap px-2 py-1.5 text-xs transition-colors ${
          is_editing
            ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400 dark:bg-indigo-900/20 dark:ring-indigo-600"
            : "hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
        }`}
        style={{ minWidth: 180 }}
        onClick={!is_editing ? onStartEdit : undefined}
        title="Click to assign a team member"
      >
        {selected_user ? (
          <span className="inline-flex items-center gap-1.5">
            {selected_user.avatar_url ? (
              <img
                src={selected_user.avatar_url}
                alt={selected_user.name}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {selected_user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {selected_user.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {selected_user.email}
            </span>
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">— Unassigned —</span>
        )}
      </td>
      {is_editing && (
        <AdminSearchableSelect
          admin_users={admin_users}
          selected_user_id={assigned_admin_user_id}
          anchor_el={cell_ref.current}
          onSelect={onAssignUser}
          onClose={onCancelEdit}
        />
      )}
    </>
  );
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

// ── Editable cell ──────────────────────────────────────────────────────────────

interface EditableCellProps {
  col: ColumnDef;
  value: string;
  is_editing: boolean;
  is_draft?: boolean;
  is_first_col?: boolean;
  row_editors?: CollaboratorPresence[];
  cell_editors?: CollaboratorPresence[];
  onStartEdit: () => void;
  onUpdate: (value: string) => void;
  onStopEdit: () => void;
  onKeyNav: (direction: "next" | "prev" | "down") => void;
  /** When provided on a select column, fires immediately on change and saves without waiting for blur. */
  onSelectImmediateSave?: (value: string) => void;
  /** When provided, shows a copy-to-clipboard icon on cell hover. */
  onCopy?: (value: string) => void;
  is_sticky?: boolean;
  sticky_left?: number;
  sticky_bg_class?: string;
  show_shadow?: boolean;
}

function EditableCell({
  col,
  value,
  is_editing,
  is_draft = false,
  is_first_col = false,
  row_editors = [],
  cell_editors = [],
  onStartEdit,
  onUpdate,
  onStopEdit,
  onKeyNav,
  onSelectImmediateSave,
  onCopy,
  is_sticky = false,
  sticky_left = 0,
  sticky_bg_class = "bg-white dark:bg-gray-900",
  show_shadow = false,
}: EditableCellProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const select_ref = useRef<HTMLSelectElement>(null);
  const [just_copied, setJustCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value || !onCopy) return;
    navigator.clipboard.writeText(value).catch(() => { });
    onCopy(value);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1200);
  };

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
      const has_current_value = !value || col.options.includes(value);
      return (
        <td
          className={`p-0${is_sticky ? ` ${sticky_bg_class}` : ""}`}
          style={is_sticky ? { position: "sticky", left: sticky_left, zIndex: 1 } : undefined}
        >
          <select
            ref={select_ref}
            value={value}
            onChange={(e) => {
              if (onSelectImmediateSave) {
                onSelectImmediateSave(e.target.value);
              } else {
                onUpdate(e.target.value);
              }
            }}
            onBlur={onSelectImmediateSave ? undefined : onStopEdit}
            onKeyDown={handleKeyDown}
            className="h-full w-full border-2 border-brand-500 bg-white px-2 py-1.5 text-xs outline-none dark:bg-gray-800 dark:text-white"
            style={{ minWidth: col.min_width }}
          >
            <option value="">-- Select --</option>
            {!has_current_value && (
              <option key={value} value={value}>
                {value}
              </option>
            )}
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
      <td
        className={`p-0${is_sticky ? ` ${sticky_bg_class}` : ""}`}
        style={is_sticky ? { position: "sticky", left: sticky_left, zIndex: 1 } : undefined}
      >
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
    const is_url = /^https?:\/\//i.test(value);
    if (is_url) {
      const label = value.replace(/^https?:\/\//, "").slice(0, 28);
      display = (
        <a
          href={value}
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
    } else {
      display = <span title={value}>{value}</span>;
    }
  } else if (col.key === "estimated_delivery_date" && isDateOverdue(value)) {
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
      "Partnership Check": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      Approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      "Not Approved": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      Ready: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
      Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      Scheduled: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };
    display = (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${status_map[value] ?? "bg-gray-100 text-gray-600"
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
  } else {
    display = value ? (
      <span title={value}>{value}</span>
    ) : (
      <span className="text-gray-300 dark:text-gray-600">—</span>
    );
  }

  const is_required_error = is_draft && (col.required ?? false) && !value;
  const has_cell_editors = cell_editors.length > 0;
  const show_row_floater = is_first_col && row_editors.length > 0;

  return (
    <td
      className={`group/cell relative cursor-pointer whitespace-nowrap px-2 py-1.5 text-xs text-gray-700 transition-colors dark:text-gray-300 ${
        is_required_error
          ? "bg-red-50/80 ring-1 ring-inset ring-red-300 hover:bg-red-100/60 dark:bg-red-900/20 dark:ring-red-700"
          : `hover:bg-blue-50 dark:hover:bg-blue-900/20${is_sticky ? ` ${sticky_bg_class}` : ""}`
      }${is_sticky && show_shadow ? " shadow-[4px_0_6px_-3px_rgba(0,0,0,0.35)]" : ""}`}
      style={{
        ...(has_cell_editors
          ? { outline: `2px solid ${cell_editors[0].color}`, outlineOffset: "-2px" }
          : {}),
        ...(is_sticky ? { position: "sticky", left: sticky_left, zIndex: 1 } : {}),
      }}
      onClick={onStartEdit}
      title={is_required_error ? `Required: ${col.label} must be filled to save this row` : "Click to edit · Ctrl+C to copy cell value · Hover for copy icon"}
    >
      {show_row_floater && <RowPresenceFloater editors={row_editors} />}
      {has_cell_editors && <CellPresenceOverlay editors={cell_editors} />}
      <div className="overflow-hidden" style={{ maxWidth: col.min_width }}>
        {is_required_error ? (
          <span className="flex items-center gap-1 text-red-400 dark:text-red-500">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400 dark:bg-red-500" />
            <span className="italic">Required</span>
          </span>
        ) : (
          display
        )}
      </div>
      {onCopy && value && !is_required_error && (
        <button
          className={`absolute right-0.5 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-all group-hover:opacity-20 group-hover/cell:opacity-70 hover:!opacity-100 hover:bg-white dark:hover:bg-gray-700 ${just_copied ? "!opacity-100 text-green-500" : "text-gray-400"
            }`}
          onClick={handleCopy}
          title="Copy cell value"
        >
          {just_copied ? (
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
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

// ── Default sort ───────────────────────────────────────────────────────────────

const DEFAULT_SORT_RULES: SortRulePayload[] = [
  { key: "order_id", direction: "desc", nulls_last: true },
];

// ── Main component ─────────────────────────────────────────────────────────────

export default function LinkBuildingOrdersTable({ onOrderMutated }: { onOrderMutated?: () => void }) {
  const [rows, setRows] = useState<LinkBuildingOrderRow[]>([]);
  const [admin_users, setAdminUsers] = useState<AdminUserOption[]>([]);
  const [client_users, setClientUsers] = useState<ClientUserOption[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [save_error, setSaveError] = useState<string | null>(null);
  const [notification_banner, setNotificationBanner] = useState<string | null>(null);
  const [editing_cell, setEditingCell] = useState<{ row_id: string; col_key: string } | null>(null);
  const [selected_row_id, setSelectedRowId] = useState<string | null>(null);
  const [saving_row_ids, setSavingRowIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [status_filter, setStatusFilter] = useState<string>("");
  const [client_filter, setClientFilter] = useState<string>("");
  const [link_type_filter, setLinkTypeFilter] = useState<string>("");
  const [client_account_filter, setClientAccountFilter] = useState<number | null>(null);
  const [assigned_user_id_filter, setAssignedUserIdFilter] = useState<number | null>(null);
  const [open_special_filter, setOpenSpecialFilter] = useState<"client_account" | "assigned_to" | null>(null);
  const [special_filter_anchor_el, setSpecialFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [show_filter_panel, setShowFilterPanel] = useState(false);
  const [hidden_columns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [current_page, setCurrentPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [from_row, setFromRow] = useState<number | null>(null);
  const [to_row, setToRow] = useState<number | null>(null);
  const [per_page, setPerPage] = useState<PerPageOption>(() => {
    if (typeof window === "undefined") return 50;
    const saved = localStorage.getItem(PER_PAGE_STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10) as PerPageOption;
      if ((PER_PAGE_OPTIONS as readonly number[]).includes(parsed)) return parsed;
    }
    return 50;
  });

  // ── Batch editing ───────────────────────────────────────────────────────────
  const [selected_row_ids, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [clipboard_cell, setClipboardCell] = useState<{ value: string; col_key: string } | null>(null);
  const [batch_field, setBatchField] = useState<string>("");
  const [batch_value, setBatchValue] = useState<string>("");
  const [is_batch_saving, setIsBatchSaving] = useState(false);
  const [batch_select_anchor_el, setBatchSelectAnchorEl] = useState<HTMLElement | null>(null);

  const { sort_rules, toggleSort, clearSort } = useTableSort(DEFAULT_SORT_RULES);
  const {
    column_filters,
    setFilter,
    clearAllFilters: clearColumnFilters,
    active_filter_count,
  } = useColumnFilters();

  const [open_filter_col, setOpenFilterCol] = useState<keyof LinkBuildingOrderRow | null>(null);
  const [filter_anchor_el, setFilterAnchorEl] = useState<HTMLElement | null>(null);

  const rows_ref = useRef<LinkBuildingOrderRow[]>([]);
  rows_ref.current = rows;

  const per_page_ref = useRef<PerPageOption>(per_page);
  per_page_ref.current = per_page;

  const editing_cell_ref = useRef<{ row_id: string; col_key: string } | null>(null);
  editing_cell_ref.current = editing_cell;

  const new_row_ids_ref = useRef<Set<string>>(new Set());
  const drafts_restored_ref = useRef(false);
  const select_all_ref = useRef<HTMLInputElement>(null);

  // Refs for keyboard shortcut handler (avoids stale closures)
  const clipboard_cell_kbd_ref = useRef(clipboard_cell);
  clipboard_cell_kbd_ref.current = clipboard_cell;

  const selected_row_ids_kbd_ref = useRef(selected_row_ids);
  selected_row_ids_kbd_ref.current = selected_row_ids;

  const debounced_search = useDebounce(search, 400);
  const debounced_client_filter = useDebounce(client_filter, 400);

  const current_body_ref = useRef<LinkBuildingOrderSearchBody>({});

  const on_order_mutated_ref = useRef(onOrderMutated);
  on_order_mutated_ref.current = onOrderMutated;

  // ── Real-time collaboration ─────────────────────────────────────────────────

  const handleRemoteRowUpdated = useCallback(
    (updated_row: LinkBuildingOrderRow, by_session_id: string) => {
      if (by_session_id === local_session_id_ref.current) return;

      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== updated_row.id) return r;
          const active = editing_cell_ref.current;
          if (active?.row_id === r.id) {
            return {
              ...updated_row,
              [active.col_key]: r[active.col_key as keyof LinkBuildingOrderRow],
            };
          }
          return updated_row;
        })
      );
      on_order_mutated_ref.current?.();
    },
    []
  );

  const handleRemoteRowCreated = useCallback(
    (new_row: LinkBuildingOrderRow, by_session_id: string) => {
      if (by_session_id === local_session_id_ref.current) return;

      setRows((prev) => {
        if (prev.some((r) => r.id === new_row.id)) return prev;
        return [new_row, ...prev];
      });
      setTotal((prev) => prev + 1);
      on_order_mutated_ref.current?.();
    },
    []
  );

  const handleRemoteRowDeleted = useCallback(
    (row_id: string, by_session_id: string) => {
      if (by_session_id === local_session_id_ref.current) return;

      if (editing_cell_ref.current?.row_id === row_id) setEditingCell(null);
      if (selected_row_id_ref.current === row_id) setSelectedRowId(null);
      setRows((prev) => prev.filter((r) => r.id !== row_id));
      setTotal((prev) => Math.max(0, prev - 1));
      on_order_mutated_ref.current?.();
    },
    []
  );

  const { user } = useAuth();

  const {
    collaborators,
    row_editors,
    ready_state,
    local_session_id,
    sendRowFocus,
    sendRowBlur,
    sendRowSelect,
  } = useLinkBuildingCollaboration({
    current_user_id: user?.id ?? 0,
    current_user_name: user ? `${user.first_name} ${user.last_name}`.trim() : "Unknown",
    current_user_avatar: user?.profile_photo_url ?? null,
    onRowUpdated: handleRemoteRowUpdated,
    onRowCreated: handleRemoteRowCreated,
    onRowDeleted: handleRemoteRowDeleted,
  });

  const local_session_id_ref = useRef(local_session_id);
  local_session_id_ref.current = local_session_id;

  const selected_row_id_ref = useRef(selected_row_id);
  selected_row_id_ref.current = selected_row_id;

  // ── Unified row-activity whisper effect ──────────────────────────────────────

  const prev_activity_ref = useRef<{
    editing: { row_id: string; col_key: string } | null;
    selected: string | null;
  }>({ editing: null, selected: null });

  useEffect(() => {
    const prev = prev_activity_ref.current;

    const prev_row = prev.editing?.row_id ?? prev.selected;
    const curr_row = editing_cell?.row_id ?? selected_row_id;

    if (prev_row !== curr_row) {
      if (prev_row) sendRowBlur(prev_row);

      if (curr_row) {
        if (editing_cell) {
          sendRowFocus(editing_cell.row_id, editing_cell.col_key);
        } else {
          sendRowSelect(curr_row);
        }
      }
    } else if (curr_row) {
      if (editing_cell && editing_cell.col_key !== prev.editing?.col_key) {
        sendRowFocus(editing_cell.row_id, editing_cell.col_key);
      } else if (!editing_cell && prev.editing) {
        sendRowSelect(curr_row);
      }
    }

    prev_activity_ref.current = { editing: editing_cell, selected: selected_row_id };
  }, [editing_cell, selected_row_id, sendRowFocus, sendRowBlur, sendRowSelect]);

  // ── Fetch admin users and client users for dropdowns ───────────────────────

  useEffect(() => {
    listAdminUsersForSelect().then(setAdminUsers).catch(() => {/* non-critical */ });
    listClientUsersForSelect().then(setClientUsers).catch(() => {/* non-critical */ });
  }, []);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchRows = useCallback(async (page: number, body: LinkBuildingOrderSearchBody) => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const res = await listLinkBuildingOrders({ ...body, page, per_page: per_page_ref.current });
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
      setFromRow(res.from);
      setToRow(res.to);

      if (!drafts_restored_ref.current) {
        drafts_restored_ref.current = true;
        const saved_drafts = loadDrafts();
        const server_order_ids = new Set(res.data.map((r) => r.order_id));
        const restored = saved_drafts.filter((d) => !server_order_ids.has(d.order_id));
        restored.forEach((d) => new_row_ids_ref.current.add(d.id));
        setRows([...restored, ...res.data]);
      } else {
        setRows(res.data);
      }
    } catch {
      setSaveError("Failed to load link building orders. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const active_col_filters: ColumnFilterPayload[] = Object.entries(column_filters)
      .filter(([, f]) => f && isFilterActive(f))
      .map(([key, f]) => ({ key, ...f } as ColumnFilterPayload));

    const body: LinkBuildingOrderSearchBody = {
      search: debounced_search.trim() || undefined,
      status: status_filter || undefined,
      link_type: link_type_filter || undefined,
      client: debounced_client_filter.trim() || undefined,
      client_user_id: client_account_filter ?? undefined,
      assigned_user_id: assigned_user_id_filter ?? undefined,
      sort_rules: sort_rules.length > 0 ? sort_rules : undefined,
      column_filters: active_col_filters.length > 0 ? active_col_filters : undefined,
    };

    current_body_ref.current = body;
    fetchRows(1, body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debounced_search,
    status_filter,
    link_type_filter,
    debounced_client_filter,
    client_account_filter,
    assigned_user_id_filter,
    sort_rules,
    column_filters,
    per_page,
  ]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const visible_columns = COLUMNS.filter((col) => !hidden_columns.has(col.key));
  const filtered_rows = rows;

  // Cumulative left offsets for sticky columns (accounts for hidden sticky columns).
  // Starts after the fixed-width checkbox column.
  const sticky_left_offsets = useMemo<Record<string, number>>(() => {
    const offsets: Record<string, number> = {};
    let cumulative = CHECKBOX_COL_WIDTH;
    for (const col of visible_columns) {
      if (col.sticky) {
        offsets[col.key] = cumulative;
        cumulative += col.min_width;
      }
    }
    return offsets;
  }, [visible_columns]);

  // Key of the rightmost visible sticky column — receives the separator shadow.
  const last_sticky_col_key = useMemo(
    () => visible_columns.filter((c) => c.sticky).at(-1)?.key ?? null,
    [visible_columns]
  );

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const markSaving = (row_id: string) =>
    setSavingRowIds((prev) => new Set(prev).add(row_id));

  const unmarkSaving = (row_id: string) =>
    setSavingRowIds((prev) => {
      const next = new Set(prev);
      next.delete(row_id);
      return next;
    });

  const replaceRow = (old_id: string, new_row: LinkBuildingOrderRow) =>
    setRows((prev) =>
      prev.map((r) => (r.id === old_id ? new_row : r))
    );

  // ── Persist helpers ─────────────────────────────────────────────────────────

  const persistNewRow = useCallback(async (row: LinkBuildingOrderRow) => {
    markSaving(row.id);
    setSaveError(null);
    try {
      const res = await createLinkBuildingOrder(buildLboPayload(row));
      new_row_ids_ref.current.delete(row.id);
      // Atomic replace: remove any row that already carries the new real UUID
      // (it may have been prepended by a WebSocket broadcast that arrived before
      // this response completed) then swap the temp row for the real one.
      setRows((prev) =>
        prev
          .filter((r) => r.id !== res.data.id)
          .map((r) => (r.id === row.id ? res.data : r))
      );
      const remaining = rows_ref.current.filter(
        (r) => new_row_ids_ref.current.has(r.id) && r.id !== row.id
      );
      saveDraftsToStorage(remaining);
      on_order_mutated_ref.current?.();
    } catch (err) {
      const all_drafts = rows_ref.current.filter((r) => new_row_ids_ref.current.has(r.id));
      saveDraftsToStorage(all_drafts);
      const row_label = row.client ? `"${row.client}"` : "the new row";
      const api_message = parseApiErrorMessage(err, COLUMN_LABELS);
      setSaveError(`Could not save ${row_label}: ${api_message}`);
    } finally {
      unmarkSaving(row.id);
    }
  }, []);

  const persistRowUpdate = useCallback(async (row: LinkBuildingOrderRow, changed_col_key?: string) => {
    markSaving(row.id);
    setSaveError(null);
    try {
      const payload: Partial<LinkBuildingOrderPayload> = buildLboPayload(row);
      if (changed_col_key !== "order_id") {
        // Only send order_id when the admin explicitly edited that cell — otherwise
        // omit it so a client-purchased row's UUID-derived fallback display ID is
        // never silently persisted just because an unrelated field was edited.
        delete payload.order_id;
      }
      const res = await updateLinkBuildingOrder(row.id, payload);
      replaceRow(row.id, res.data);

      const triggers_notification =
        changed_col_key === "status" &&
        (res.data.user_id != null || res.data.parent_order_status != null);

      if (triggers_notification) {
        const order_status = res.data.parent_order_status;
        if (order_status === "completed") {
          setNotificationBanner("Order marked complete — client email notification queued.");
        } else {
          setNotificationBanner("Order status updated — client email notification queued.");
        }
      }
      on_order_mutated_ref.current?.();
    } catch (err) {
      const api_message = parseApiErrorMessage(err, COLUMN_LABELS);
      setSaveError(`Failed to save row "${row.order_id}": ${api_message}`);
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

    const is_draft_row = new_row_ids_ref.current.has(row.id);

    if (cell.col_key === "order_id" && !is_draft_row) {
      const trimmed = row.order_id.trim();
      if (trimmed !== "" && !ORDER_ID_PATTERN.test(trimmed)) {
        setSaveError(`Invalid Order ID "${trimmed}" — must follow the format BL-<number> (e.g. BL-25143).`);
        return;
      }
    }

    if (is_draft_row) {
      persistNewRow(row);
    } else {
      persistRowUpdate(row, cell.col_key);
    }
  }, [persistNewRow, persistRowUpdate]);

  const updateCell = useCallback(
    (row_id: string, col_key: keyof LinkBuildingOrderRow, value: string) => {
      setRows((prev) => {
        const updated = prev.map((row) =>
          row.id === row_id ? { ...row, [col_key]: value } : row
        );
        if (new_row_ids_ref.current.has(row_id)) {
          const drafts = updated.filter((r) => new_row_ids_ref.current.has(r.id));
          saveDraftsToStorage(drafts);
        }
        return updated;
      });
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

  const addMultipleRows = useCallback((count: number) => {
    const clamped = Math.max(1, Math.min(count, 100));
    const new_rows: LinkBuildingOrderRow[] = Array.from({ length: clamped }, () => createEmptyRow());
    new_rows.forEach((r) => new_row_ids_ref.current.add(r.id));
    setRows((prev) => {
      const updated = [...new_rows, ...prev];
      const drafts = updated.filter((r) => new_row_ids_ref.current.has(r.id));
      saveDraftsToStorage(drafts);
      return updated;
    });
    setShowAddMenu(false);
    setTimeout(() => {
      table_scroll_ref.current?.scrollTo({ top: 0, behavior: "smooth" });
      if (new_rows[0]) setEditingCell({ row_id: new_rows[0].id, col_key: "client" });
    }, 50);
  }, []);

  const addRow = useCallback(() => {
    addMultipleRows(1);
  }, [addMultipleRows]);

  const deleteRow = useCallback(async (row_id: string) => {
    if (editing_cell_ref.current?.row_id === row_id) setEditingCell(null);

    if (new_row_ids_ref.current.has(row_id)) {
      new_row_ids_ref.current.delete(row_id);
      setRows((prev) => {
        const updated = prev.filter((r) => r.id !== row_id);
        const drafts = updated.filter((r) => new_row_ids_ref.current.has(r.id));
        saveDraftsToStorage(drafts);
        return updated;
      });
      return;
    }

    markSaving(row_id);
    setSaveError(null);
    try {
      await deleteLinkBuildingOrder(row_id);
      setRows((prev) => prev.filter((r) => r.id !== row_id));
      on_order_mutated_ref.current?.();
    } catch {
      setSaveError("Failed to delete row. Please try again.");
    } finally {
      unmarkSaving(row_id);
    }
  }, []);

  // ── Assign user ─────────────────────────────────────────────────────────────

  const handleAssignUserChange = useCallback((row_id: string, str_value: string) => {
    const numeric_val: number | null = str_value === "" ? null : Number(str_value);

    const base_row = rows_ref.current.find((r) => r.id === row_id);
    if (!base_row) return;

    const updated_row: LinkBuildingOrderRow = { ...base_row, assigned_admin_user_id: numeric_val };

    setRows((prev) => prev.map((r) => (r.id === row_id ? updated_row : r)));
    setEditingCell(null);

    if (new_row_ids_ref.current.has(row_id)) {
      persistNewRow(updated_row);
    } else {
      persistRowUpdate(updated_row, "assigned_admin_user_id");
    }
  }, [persistNewRow, persistRowUpdate]);

  const cancelAssignEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  // ── Assign client ────────────────────────────────────────────────────────────

  const handleAssignClientChange = useCallback((row_id: string, str_value: string) => {
    const numeric_val: number | null = str_value === "" ? null : Number(str_value);

    const base_row = rows_ref.current.find((r) => r.id === row_id);
    if (!base_row) return;

    const updated_row: LinkBuildingOrderRow = { ...base_row, user_id: numeric_val };

    setRows((prev) => prev.map((r) => (r.id === row_id ? updated_row : r)));
    setEditingCell(null);

    if (new_row_ids_ref.current.has(row_id)) {
      persistNewRow(updated_row);
    } else {
      persistRowUpdate(updated_row, "user_id");
    }
  }, [persistNewRow, persistRowUpdate]);

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

  const sort_is_non_default =
    sort_rules.length !== DEFAULT_SORT_RULES.length ||
    sort_rules.some(
      (r, i) =>
        r.key !== DEFAULT_SORT_RULES[i]?.key ||
        r.direction !== DEFAULT_SORT_RULES[i]?.direction
    );

  const has_active_filters =
    search.trim() !== "" ||
    status_filter !== "" ||
    client_filter !== "" ||
    link_type_filter !== "" ||
    client_account_filter !== null ||
    assigned_user_id_filter !== null ||
    hidden_columns.size > 0 ||
    active_filter_count > 0 ||
    sort_is_non_default;

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setClientFilter("");
    setLinkTypeFilter("");
    setClientAccountFilter(null);
    setAssignedUserIdFilter(null);
    setHiddenColumns(new Set());
    clearColumnFilters();
    clearSort();
  }, [clearColumnFilters, clearSort]);

  const handlePerPageChange = useCallback((option: PerPageOption) => {
    setPerPage(option);
    if (typeof window !== "undefined") {
      localStorage.setItem(PER_PAGE_STORAGE_KEY, String(option));
    }
  }, []);

  // ── Batch selection ─────────────────────────────────────────────────────────

  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  const toggleRowSelection = useCallback((row_id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(row_id)) next.delete(row_id);
      else next.add(row_id);
      return next;
    });
  }, []);

  const selectAllRows = useCallback(() => {
    setSelectedRowIds(new Set(filtered_rows.map((r) => r.id)));
  }, [filtered_rows]);

  const copyCellValue = useCallback((value: string, col_key: string) => {
    setClipboardCell({ value, col_key });
  }, []);

  const handleBatchApply = useCallback(async () => {
    if (!batch_field || !batch_value || selected_row_ids.size === 0) return;

    const is_user_field = batch_field === "user_id" || batch_field === "assigned_admin_user_id";
    // "__unassign__" is a sentinel meaning explicitly clear the field (null)
    const raw_value = batch_value === "__unassign__" ? "" : batch_value;
    const api_value: string | number | null = is_user_field
      ? (raw_value ? Number(raw_value) : null)
      : (raw_value || null);

    setIsBatchSaving(true);
    setSaveError(null);
    try {
      const persisted_ids = Array.from(selected_row_ids).filter(
        (id) => !new_row_ids_ref.current.has(id)
      );

      if (persisted_ids.length > 0) {
        await batchUpdateLinkBuildingOrders(persisted_ids, {
          [batch_field]: api_value,
        });
      }

      setRows((prev) =>
        prev.map((r) =>
          selected_row_ids.has(r.id) ? { ...r, [batch_field]: api_value } : r
        )
      );

      let display_value: string;
      if (batch_value === "__unassign__") {
        display_value = "Unassigned";
      } else if (batch_field === "user_id") {
        display_value = client_users.find((u) => u.id === Number(batch_value))?.name ?? batch_value;
      } else if (batch_field === "assigned_admin_user_id") {
        display_value = admin_users.find((u) => u.id === Number(batch_value))?.name ?? batch_value;
      } else {
        display_value = batch_value;
      }

      const col_label =
        batch_field === "user_id"
          ? "Client Account"
          : batch_field === "assigned_admin_user_id"
            ? "Assigned To"
            : (COLUMNS.find((c) => c.key === batch_field)?.label ?? batch_field);

      setNotificationBanner(
        `"${col_label}" set to "${display_value}" for ${selected_row_ids.size} row${selected_row_ids.size !== 1 ? "s" : ""}.`
      );
      clearSelection();
      setBatchField("");
      setBatchValue("");
      setBatchSelectAnchorEl(null);
    } catch {
      setSaveError("Batch update failed. Please try again.");
    } finally {
      setIsBatchSaving(false);
    }
  }, [batch_field, batch_value, selected_row_ids, clearSelection, client_users, admin_users]);

  const handlePasteClipboard = useCallback(async () => {
    if (!clipboard_cell || selected_row_ids.size === 0) return;

    setIsBatchSaving(true);
    setSaveError(null);
    try {
      const persisted_ids = Array.from(selected_row_ids).filter(
        (id) => !new_row_ids_ref.current.has(id)
      );

      if (persisted_ids.length > 0) {
        await batchUpdateLinkBuildingOrders(persisted_ids, {
          [clipboard_cell.col_key]: clipboard_cell.value,
        });
      }

      setRows((prev) =>
        prev.map((r) =>
          selected_row_ids.has(r.id)
            ? { ...r, [clipboard_cell.col_key]: clipboard_cell.value }
            : r
        )
      );

      const col_label = COLUMNS.find((c) => c.key === clipboard_cell.col_key)?.label ?? clipboard_cell.col_key;
      const short_val = clipboard_cell.value.length > 30
        ? clipboard_cell.value.slice(0, 30) + "…"
        : clipboard_cell.value;
      setNotificationBanner(
        `Pasted "${short_val}" → "${col_label}" for ${selected_row_ids.size} row${selected_row_ids.size !== 1 ? "s" : ""}.`
      );
      clearSelection();
    } catch {
      setSaveError("Batch paste failed. Please try again.");
    } finally {
      setIsBatchSaving(false);
    }
  }, [clipboard_cell, selected_row_ids, clearSelection]);

  // ── Global keyboard shortcuts: Ctrl+C = copy cell, Ctrl+V = paste to selected ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();

      if (key === "c") {
        const cell = editing_cell_ref.current;
        if (!cell) return;

        // If the user has text selected inside an input, let the browser handle it
        const active_el = document.activeElement;
        if (active_el instanceof HTMLInputElement || active_el instanceof HTMLTextAreaElement) {
          const sel_len = (active_el.selectionEnd ?? 0) - (active_el.selectionStart ?? 0);
          if (sel_len > 0) return;
        }

        const row = rows_ref.current.find((r) => r.id === cell.row_id);
        if (!row) return;
        const value = String(row[cell.col_key as keyof LinkBuildingOrderRow] ?? "");
        const col_label = COLUMNS.find((c) => c.key === cell.col_key)?.label ?? cell.col_key;

        setClipboardCell({ value, col_key: cell.col_key });
        navigator.clipboard.writeText(value).catch(() => {});

        const short = value.length > 28 ? value.slice(0, 28) + "…" : value;
        const n_selected = selected_row_ids_kbd_ref.current.size;
        setNotificationBanner(
          n_selected > 0
            ? `Copied "${short}" — press Ctrl+V to paste into "${col_label}" for ${n_selected} row${n_selected > 1 ? "s" : ""}`
            : `Copied "${short}" from "${col_label}" — select rows, then press Ctrl+V to paste`
        );
        return;
      }

      if (key === "v") {
        const clip = clipboard_cell_kbd_ref.current;
        const selected = selected_row_ids_kbd_ref.current;
        if (!clip || selected.size === 0) return;

        // Do not override paste when the user is typing inside an input
        const active_el = document.activeElement;
        if (
          active_el instanceof HTMLInputElement ||
          active_el instanceof HTMLSelectElement ||
          active_el instanceof HTMLTextAreaElement
        ) return;

        e.preventDefault();
        handlePasteClipboard();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlePasteClipboard]);

  // ── Indeterminate state for select-all checkbox ─────────────────────────────

  useEffect(() => {
    if (!select_all_ref.current) return;
    const some = filtered_rows.some((r) => selected_row_ids.has(r.id));
    const all = filtered_rows.length > 0 && filtered_rows.every((r) => selected_row_ids.has(r.id));
    select_all_ref.current.indeterminate = some && !all;
  }, [filtered_rows, selected_row_ids]);

  // ── Bulk add rows ────────────────────────────────────────────────────────────

  const [show_add_menu, setShowAddMenu] = useState(false);
  const [custom_row_count, setCustomRowCount] = useState("5");
  const add_btn_ref = useRef<HTMLDivElement>(null);
  const table_scroll_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show_add_menu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (add_btn_ref.current && !add_btn_ref.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show_add_menu]);

  // ── Import modal ─────────────────────────────────────────────────────────────

  const [show_import_modal, setShowImportModal] = useState(false);
  const [show_metrics_modal, setShowMetricsModal] = useState(false);

  const handleImportComplete = useCallback(() => {
    fetchRows(1, current_body_ref.current);
  }, [fetchRows]);

  // ── Export ──────────────────────────────────────────────────────────────────

  const [show_export_menu, setShowExportMenu] = useState(false);
  const [is_exporting, setIsExporting] = useState(false);
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

  const handleExportAll = useCallback(async () => {
    setShowExportMenu(false);
    setIsExporting(true);
    try {
      await exportLinkBuildingOrders(current_body_ref.current);
    } catch {
      setSaveError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleExportSelected = useCallback(async () => {
    if (selected_row_ids.size === 0) return;
    setShowExportMenu(false);
    setIsExporting(true);
    try {
      await exportLinkBuildingOrders({}, Array.from(selected_row_ids));
    } catch {
      setSaveError("Export of selected rows failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [selected_row_ids]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Link Building Orders
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {is_loading
              ? "Loading…"
              : `${filtered_rows.length} of ${total} rows · ${visible_columns.length} columns · Click any cell to edit`}
          </p>
          <div className="mt-1.5">
            <CollaborationBar collaborators={collaborators} ready_state={ready_state} />
          </div>
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
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${show_filter_panel
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
          {/* Clipboard badge — shows when a cell value has been copied */}
          {clipboard_cell && (
            <div
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300"
              title={`Clipboard: "${clipboard_cell.value}" (${COLUMNS.find((c) => c.key === clipboard_cell.col_key)?.label ?? clipboard_cell.col_key}) — select rows then press Ctrl+V to paste`}
            >
              <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="font-semibold">{COLUMNS.find((c) => c.key === clipboard_cell.col_key)?.label ?? clipboard_cell.col_key}:</span>
              <span className="max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap opacity-80">
                {clipboard_cell.value || "—"}
              </span>
              <kbd className="rounded bg-indigo-100 px-1 py-0.5 font-mono text-[9px] text-indigo-500 dark:bg-indigo-800 dark:text-indigo-300">
                Ctrl+V
              </kbd>
              <button
                onClick={() => setClipboardCell(null)}
                className="ml-0.5 rounded p-0.5 opacity-50 transition-opacity hover:opacity-100"
                title="Clear clipboard"
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {/* Import CSV */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Import CSV
          </button>
          {/* Update Metrics (column-scoped bulk update) */}
          <button
            onClick={() => setShowMetricsModal(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
            title="Bulk-update Current Traffic, DR Formula, Current POC, Current Price and other metric columns from a reference CSV, matched by Order ID"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.5m3-3v3m3-6v6m-9 3h12a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018 4.5H6a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 006 19.5z" />
            </svg>
            Update Metrics
          </button>
          {/* Export dropdown */}
          <div ref={export_btn_ref} className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={is_exporting}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                selected_row_ids.size > 0
                  ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {is_exporting ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Export
              {selected_row_ids.size > 0 && (
                <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                  {selected_row_ids.size}
                </span>
              )}
              <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {show_export_menu && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-68 min-w-[17rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Export Data</p>
                  <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">Download records as a CSV file</p>
                </div>

                {/* Option 1 — Export all filtered */}
                <button
                  onClick={handleExportAll}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Export All Filtered</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
                      {total.toLocaleString()} row{total !== 1 ? "s" : ""} · applies current search &amp; filters
                    </p>
                    {(link_type_filter || status_filter || client_filter || search.trim()) && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {link_type_filter && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {link_type_filter}
                          </span>
                        )}
                        {status_filter && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            {status_filter}
                          </span>
                        )}
                        {client_filter && (
                          <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                            Client: {client_filter}
                          </span>
                        )}
                        {search.trim() && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            &ldquo;{search.trim()}&rdquo;
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {/* Divider */}
                <div className="mx-4 border-t border-gray-100 dark:border-gray-700" />

                {/* Option 2 — Export selected */}
                <button
                  onClick={selected_row_ids.size > 0 ? handleExportSelected : undefined}
                  disabled={selected_row_ids.size === 0}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    selected_row_ids.size > 0
                      ? "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    selected_row_ids.size > 0
                      ? "bg-violet-100 dark:bg-violet-900/30"
                      : "bg-gray-100 dark:bg-gray-700"
                  }`}>
                    <svg className={`h-4 w-4 ${selected_row_ids.size > 0 ? "text-violet-600 dark:text-violet-400" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-100">
                      Export Selected
                      {selected_row_ids.size > 0 && (
                        <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">
                          {selected_row_ids.size}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
                      {selected_row_ids.size > 0
                        ? `Export only the ${selected_row_ids.size} checked row${selected_row_ids.size !== 1 ? "s" : ""}`
                        : "Check rows in the table to enable this option"}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
          {/* Add row — split button with bulk-add dropdown */}
          <div ref={add_btn_ref} className="relative flex">
            <button
              onClick={addRow}
              className="flex h-8 items-center gap-1.5 rounded-l-lg bg-brand-500 px-3 text-xs font-medium text-white transition-colors hover:bg-brand-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Row
            </button>
            <button
              onClick={() => setShowAddMenu((v) => !v)}
              title="Add multiple rows at once"
              className="flex h-8 items-center rounded-r-lg border-l border-brand-400 bg-brand-500 px-1.5 text-white transition-colors hover:bg-brand-600"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {show_add_menu && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Add Multiple Rows</p>
                  <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">Rows are added to the top of the table</p>
                </div>
                <div className="p-3">
                  <p className="mb-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">Quick add:</p>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {[2, 5, 10, 25, 50].map((count) => (
                      <button
                        key={count}
                        onClick={() => addMultipleRows(count)}
                        className="flex h-7 items-center gap-0.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40"
                      >
                        +{count}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
                    <p className="mb-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">Custom count:</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={custom_row_count}
                        onChange={(e) => setCustomRowCount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const n = parseInt(custom_row_count, 10);
                            if (!isNaN(n) && n > 0) addMultipleRows(n);
                          }
                        }}
                        className="h-7 w-16 rounded border border-gray-200 bg-white px-2 text-center text-xs outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        onClick={() => {
                          const n = parseInt(custom_row_count, 10);
                          if (!isNaN(n) && n > 0) addMultipleRows(n);
                        }}
                        disabled={!custom_row_count || parseInt(custom_row_count, 10) < 1}
                        className="flex h-7 flex-1 items-center justify-center rounded-lg bg-brand-500 px-3 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                      >
                        Add {custom_row_count || "?"} rows
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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

      {/* Notification banner — email queued for client */}
      {notification_banner && (
        <div className="flex items-center justify-between border-b border-green-100 bg-green-50 px-4 py-2 dark:border-green-900/30 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-green-700 dark:text-green-400">{notification_banner}</p>
          </div>
          <button
            onClick={() => setNotificationBanner(null)}
            className="ml-4 rounded p-0.5 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Draft rows warning banner */}
      {rows.some((r) => new_row_ids_ref.current.has(r.id)) && (
        <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/40 dark:bg-amber-900/20">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              You have unsaved draft rows
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              Draft rows are highlighted in amber. Fill in <strong>Link Type</strong>, <strong>Company</strong>,{" "}
              <strong>Keyword</strong>, and <strong>Landing Page</strong> in each draft row, then click outside
              the cell to save it to the server. Your data is preserved locally and will not be lost on reload.
            </p>
          </div>
        </div>
      )}

      {/* Batch edit bar — slides in when rows are selected */}
      {selected_row_ids.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-indigo-200 bg-indigo-50 px-4 py-2.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          {/* Row count badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
              {selected_row_ids.size}
            </span>
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {selected_row_ids.size === 1 ? "1 row selected" : `${selected_row_ids.size} rows selected`}
            </span>
          </div>

          <div className="h-4 w-px shrink-0 bg-indigo-200 dark:bg-indigo-800" />

          {/* Clipboard paste shortcut — appears after copying a cell */}
          {clipboard_cell && (() => {
            const paste_col_label = COLUMNS.find((c) => c.key === clipboard_cell.col_key)?.label ?? clipboard_cell.col_key;
            const short_val = clipboard_cell.value.length > 22
              ? clipboard_cell.value.slice(0, 22) + "…"
              : clipboard_cell.value;
            return (
              <>
                <button
                  onClick={handlePasteClipboard}
                  disabled={is_batch_saving}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                  title={`Paste "${clipboard_cell.value}" into "${paste_col_label}" for all selected rows (Ctrl+V)`}
                >
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Paste &ldquo;{short_val}&rdquo; → {paste_col_label}
                  <kbd className="ml-1 rounded bg-indigo-500 px-1 py-0.5 font-mono text-[9px] opacity-75">Ctrl+V</kbd>
                </button>
                <div className="h-4 w-px shrink-0 bg-indigo-200 dark:bg-indigo-800" />
              </>
            );
          })()}

          {/* Copy hint — shown when no clipboard value yet */}
          {!clipboard_cell && (
            <span className="text-[11px] text-indigo-400 dark:text-indigo-500">
              Click a cell to edit, then press{" "}
              <kbd className="rounded bg-indigo-100 px-1 font-mono text-[9px] text-indigo-500 dark:bg-indigo-800 dark:text-indigo-400">Ctrl+C</kbd>{" "}
              to copy its value here.
            </span>
          )}

          {/* Manual batch fill */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-indigo-600 dark:text-indigo-400">Fill field:</span>
            <select
              value={batch_field}
              onChange={(e) => { setBatchField(e.target.value); setBatchValue(""); setBatchSelectAnchorEl(null); }}
              className="h-7 rounded border border-indigo-200 bg-white px-2 text-xs outline-none focus:border-indigo-400 dark:border-indigo-800 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">Choose column…</option>
              {COLUMNS.filter((c) => !c.locked).map((col) => (
                <option key={col.key} value={col.key}>{col.label}</option>
              ))}
              <option disabled>───────────────</option>
              <option value="user_id">Client Account</option>
              <option value="assigned_admin_user_id">Assigned To</option>
            </select>
            {batch_field && (() => {
              // ── Special: Client Account ──────────────────────────────────────
              if (batch_field === "user_id") {
                const selected_client =
                  batch_value && batch_value !== "__unassign__"
                    ? client_users.find((u) => u.id === Number(batch_value))
                    : null;
                return (
                  <>
                    <button
                      onClick={(e) => setBatchSelectAnchorEl(e.currentTarget)}
                      className="flex h-7 min-w-[11rem] items-center gap-1.5 rounded border border-teal-300 bg-white px-2 text-xs text-left outline-none transition hover:border-teal-500 dark:border-teal-700 dark:bg-gray-800"
                    >
                      {batch_value === "__unassign__" ? (
                        <span className="flex-1 text-gray-400 dark:text-gray-500">— Unassigned —</span>
                      ) : selected_client ? (
                        <>
                          {selected_client.avatar_url ? (
                            <img src={selected_client.avatar_url} alt={selected_client.name} className="h-4 w-4 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[8px] font-bold text-white">
                              {(selected_client.company || selected_client.name).charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="flex-1 truncate font-medium text-gray-700 dark:text-gray-200">{selected_client.company || selected_client.name}</span>
                        </>
                      ) : (
                        <span className="flex-1 text-gray-400 dark:text-gray-500">Choose client…</span>
                      )}
                      <svg className="h-3 w-3 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {batch_select_anchor_el && (
                      <ClientSearchableSelect
                        client_users={client_users}
                        selected_user_id={batch_value && batch_value !== "__unassign__" ? Number(batch_value) : null}
                        anchor_el={batch_select_anchor_el}
                        onSelect={(val) => { setBatchValue(val === "" ? "__unassign__" : val); setBatchSelectAnchorEl(null); }}
                        onClose={() => setBatchSelectAnchorEl(null)}
                      />
                    )}
                  </>
                );
              }

              // ── Special: Assigned To ─────────────────────────────────────────
              if (batch_field === "assigned_admin_user_id") {
                const selected_user =
                  batch_value && batch_value !== "__unassign__"
                    ? admin_users.find((u) => u.id === Number(batch_value))
                    : null;
                return (
                  <>
                    <button
                      onClick={(e) => setBatchSelectAnchorEl(e.currentTarget)}
                      className="flex h-7 min-w-[11rem] items-center gap-1.5 rounded border border-indigo-300 bg-white px-2 text-xs text-left outline-none transition hover:border-indigo-500 dark:border-indigo-700 dark:bg-gray-800"
                    >
                      {batch_value === "__unassign__" ? (
                        <span className="flex-1 text-gray-400 dark:text-gray-500">— Unassigned —</span>
                      ) : selected_user ? (
                        <>
                          {selected_user.avatar_url ? (
                            <img src={selected_user.avatar_url} alt={selected_user.name} className="h-4 w-4 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white">
                              {selected_user.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="flex-1 truncate font-medium text-gray-700 dark:text-gray-200">{selected_user.name}</span>
                        </>
                      ) : (
                        <span className="flex-1 text-gray-400 dark:text-gray-500">Choose team member…</span>
                      )}
                      <svg className="h-3 w-3 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {batch_select_anchor_el && (
                      <AdminSearchableSelect
                        admin_users={admin_users}
                        selected_user_id={batch_value && batch_value !== "__unassign__" ? Number(batch_value) : null}
                        anchor_el={batch_select_anchor_el}
                        onSelect={(val) => { setBatchValue(val === "" ? "__unassign__" : val); setBatchSelectAnchorEl(null); }}
                        onClose={() => setBatchSelectAnchorEl(null)}
                      />
                    )}
                  </>
                );
              }

              // ── Standard column types ────────────────────────────────────────
              const col_def = COLUMNS.find((c) => c.key === batch_field);
              if (!col_def) return null;
              if (col_def.type === "select" && col_def.options) {
                return (
                  <select
                    value={batch_value}
                    onChange={(e) => setBatchValue(e.target.value)}
                    className="h-7 rounded border border-indigo-200 bg-white px-2 text-xs outline-none focus:border-indigo-400 dark:border-indigo-800 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value="">-- Select --</option>
                    {col_def.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                );
              }
              return (
                <input
                  type="text"
                  placeholder={`Value for ${col_def.label}…`}
                  value={batch_value}
                  onChange={(e) => setBatchValue(e.target.value)}
                  className="h-7 rounded border border-indigo-200 bg-white px-2 text-xs outline-none focus:border-indigo-400 dark:border-indigo-800 dark:bg-gray-800 dark:text-gray-200"
                  style={{ minWidth: 140 }}
                />
              );
            })()}
            {batch_field && (
              <button
                onClick={handleBatchApply}
                disabled={is_batch_saving || !batch_value}
                className="flex h-7 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {is_batch_saving ? (
                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : null}
                Apply to {selected_row_ids.size} row{selected_row_ids.size !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Export selected shortcut */}
            <button
              onClick={handleExportSelected}
              disabled={is_exporting || is_batch_saving}
              title={`Download ${selected_row_ids.size} selected row${selected_row_ids.size !== 1 ? "s" : ""} as CSV`}
              className="flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-1 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-700 dark:bg-gray-800 dark:text-violet-400 dark:hover:bg-violet-900/20"
            >
              {is_exporting ? (
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Export {selected_row_ids.size} row{selected_row_ids.size !== 1 ? "s" : ""}
            </button>

            <div className="h-4 w-px shrink-0 bg-indigo-200 dark:bg-indigo-800" />

            <button
              onClick={clearSelection}
              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear selection
            </button>
          </div>
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
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${is_visible
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
        <div ref={table_scroll_ref} className="w-full min-w-0 overflow-auto max-h-[calc(100vh-200px)]">
          <table className="min-w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20">
              <tr>
                {/* Select-all checkbox column — sticky so it stays visible while scrolling */}
                <th
                  className="border border-gray-700/30 bg-gray-800 px-2 py-1.5 text-center sticky left-0 z-[31]"
                  style={{ width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}
                >
                  <input
                    ref={select_all_ref}
                    type="checkbox"
                    checked={
                      filtered_rows.length > 0 &&
                      filtered_rows.every((r) => selected_row_ids.has(r.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) selectAllRows();
                      else clearSelection();
                    }}
                    className="h-3.5 w-3.5 cursor-pointer rounded accent-indigo-500"
                    title="Select / deselect all visible rows"
                  />
                </th>
                {visible_columns.map((col) => {
                  const effective_sort_key = col.sort_key ?? (col.key as string);
                  const is_sortable = col.sortable !== false;
                  const sort_rule = sort_rules.find((r) => r.key === effective_sort_key);
                  const sort_priority = sort_rules.findIndex((r) => r.key === effective_sort_key);
                  const col_filter = column_filters[col.key as Parameters<typeof setFilter>[0]];
                  const filter_is_active = col_filter ? isFilterActive(col_filter) : false;

                  return (
                    <th
                      key={col.key}
                      className={`border border-gray-700/30 px-2 py-1.5 text-left font-semibold tracking-wide ${GROUP_HEADER_STYLES[col.group]}${col.sticky ? ` sticky z-[30]${col.key === last_sticky_col_key ? " shadow-[4px_0_6px_-3px_rgba(0,0,0,0.35)]" : ""}` : ""}`}
                      style={{
                        minWidth: col.min_width,
                        ...(col.sticky ? { left: sticky_left_offsets[col.key] } : {}),
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            if (!is_sortable) return;
                            toggleSort(effective_sort_key, e.shiftKey);
                          }}
                          disabled={!is_sortable}
                          title={
                            !is_sortable
                              ? "This column cannot be sorted"
                              : sort_rules.length > 0
                                ? "Click to sort · Shift+Click to add secondary sort"
                                : "Click to sort · Shift+Click for multi-column sort"
                          }
                          className={`flex flex-1 items-center gap-1 whitespace-nowrap text-left ${is_sortable ? "hover:opacity-75" : "cursor-default opacity-50"
                            }`}
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
                          className={`shrink-0 rounded p-0.5 transition-opacity ${filter_is_active
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
                <th
                  className="border border-gray-700/30 bg-teal-700 px-2 py-1.5 text-left text-xs font-semibold text-white"
                  style={{ minWidth: 200 }}
                >
                  <div className="flex items-center gap-1">
                    <span className="flex-1 whitespace-nowrap">Client Account</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (open_special_filter === "client_account") {
                          setOpenSpecialFilter(null);
                          setSpecialFilterAnchorEl(null);
                        } else {
                          setOpenSpecialFilter("client_account");
                          setSpecialFilterAnchorEl(e.currentTarget);
                        }
                      }}
                      title="Filter by client account"
                      className={`shrink-0 rounded p-0.5 transition-opacity ${
                        client_account_filter !== null
                          ? "opacity-100 text-yellow-200"
                          : "opacity-30 hover:opacity-80"
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </button>
                  </div>
                </th>
                <th
                  className="border border-gray-700/30 bg-indigo-700 px-2 py-1.5 text-left text-xs font-semibold text-white"
                  style={{ minWidth: 180 }}
                >
                  <div className="flex items-center gap-1">
                    <span className="flex-1 whitespace-nowrap">Assigned To</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (open_special_filter === "assigned_to") {
                          setOpenSpecialFilter(null);
                          setSpecialFilterAnchorEl(null);
                        } else {
                          setOpenSpecialFilter("assigned_to");
                          setSpecialFilterAnchorEl(e.currentTarget);
                        }
                      }}
                      title="Filter by assigned user"
                      className={`shrink-0 rounded p-0.5 transition-opacity ${
                        assigned_user_id_filter !== null
                          ? "opacity-100 text-yellow-200"
                          : "opacity-30 hover:opacity-80"
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </button>
                  </div>
                </th>
                <th
                  aria-label="Row actions"
                  className="w-px border border-gray-700/30 bg-gray-800 px-2 py-2 text-center text-xs font-semibold text-white"
                >
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
                    colSpan={visible_columns.length + 4}
                    className="px-6 py-14 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    {search || status_filter || link_type_filter || client_filter
                      ? "No rows match the active filters."
                      : 'No link building orders found. Click "Add Row" to create one.'}
                  </td>
                </tr>
              ) : (
                filtered_rows.map((row, row_idx) => {
                  const is_saving = saving_row_ids.has(row.id);
                  const is_new = new_row_ids_ref.current.has(row.id);
                  const is_multi_selected = selected_row_ids.has(row.id);
                  const row_collaborators = row_editors.get(row.id) ?? [];
                  const has_collaborators = !is_new && row_collaborators.length > 0;
                  const primary_editor = has_collaborators ? row_collaborators[0] : null;
                  const is_locally_selected =
                    !is_new && selected_row_id === row.id && !has_collaborators;

                  const sticky_row_bg_class = is_new
                    ? "bg-amber-50/80 dark:bg-amber-900/10"
                    : is_multi_selected
                    ? "bg-indigo-50/80 dark:bg-indigo-950/20"
                    : is_locally_selected
                    ? "bg-brand-50/80 dark:bg-brand-900/10"
                    : row_idx % 2 === 0
                    ? "bg-white dark:bg-gray-900"
                    : "bg-gray-50 dark:bg-gray-800/30";

                  return (
                    <tr
                      key={row.id}
                      onClick={() => {
                        if (!is_new) setSelectedRowId(row.id);
                      }}
                      className={`group border-b border-gray-100 transition-colors dark:border-gray-800 ${is_new
                        ? "border-l-2 border-l-amber-400 bg-amber-50/30 dark:border-l-amber-500 dark:bg-amber-900/10"
                        : has_collaborators
                          ? "border-l-[3px]"
                          : is_multi_selected
                            ? "border-l-2 border-l-indigo-400 bg-indigo-50/50 dark:border-l-indigo-500 dark:bg-indigo-950/20"
                            : is_locally_selected
                              ? "border-l-2 border-l-brand-400 bg-brand-50/30 dark:border-l-brand-500 dark:bg-brand-900/10"
                              : row_idx % 2 === 0
                                ? "bg-white dark:bg-gray-900"
                                : "bg-gray-50/60 dark:bg-gray-800/30"
                        } ${is_saving ? "opacity-60" : ""} hover:bg-blue-50/40 dark:hover:bg-blue-900/10`}
                      style={
                        primary_editor
                          ? {
                            borderLeftColor: primary_editor.color,
                            backgroundColor: `${primary_editor.color}14`,
                          }
                          : undefined
                      }
                    >
                      {/* Row checkbox — sticky so it stays aligned with the frozen column block */}
                      <td
                        className={`border-r border-gray-100 px-2 py-1.5 dark:border-gray-800 sticky left-0 z-[2] ${sticky_row_bg_class}`}
                        style={{ width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={is_multi_selected}
                          onChange={() => toggleRowSelection(row.id)}
                          className="h-3.5 w-3.5 cursor-pointer rounded accent-indigo-500"
                        />
                      </td>
                      {visible_columns.map((col, col_idx) => {
                        const is_editing =
                          editing_cell?.row_id === row.id &&
                          editing_cell?.col_key === col.key;
                        const is_first_col = col_idx === 0;
                        return (
                          <EditableCell
                            key={col.key}
                            col={col}
                            value={(row[col.key] as string) ?? ""}
                            is_editing={is_editing}
                            is_draft={is_new}
                            is_first_col={is_first_col}
                            row_editors={is_first_col ? row_collaborators : []}
                            cell_editors={row_collaborators.filter(
                              (c) => c.focused_col_key === col.key
                            )}
                            onStartEdit={() => startEditing(row.id, col.key)}
                            onUpdate={(val) => updateCell(row.id, col.key, val)}
                            onStopEdit={stopEditing}
                            onKeyNav={(dir) => navigateCell(row.id, col.key, dir)}
                            onSelectImmediateSave={undefined}
                            onCopy={(val) => copyCellValue(val, col.key)}
                            is_sticky={col.sticky}
                            sticky_left={col.sticky ? sticky_left_offsets[col.key] : undefined}
                            sticky_bg_class={col.sticky ? sticky_row_bg_class : undefined}
                            show_shadow={col.sticky && col.key === last_sticky_col_key}
                          />
                        );
                      })}
                      {/* Client account assign cell */}
                      <ClientAssignCell
                        user_id={row.user_id}
                        client_users={client_users}
                        is_editing={editing_cell?.row_id === row.id && editing_cell?.col_key === "user_id"}
                        onStartEdit={() => startEditing(row.id, "user_id")}
                        onAssignClient={(val) => handleAssignClientChange(row.id, val)}
                        onCancelEdit={cancelAssignEdit}
                      />
                      {/* Assign admin user cell */}
                      <UserAssignCell
                        assigned_admin_user_id={row.assigned_admin_user_id}
                        admin_users={admin_users}
                        is_editing={editing_cell?.row_id === row.id && editing_cell?.col_key === "assigned_admin_user_id"}
                        onStartEdit={() => startEditing(row.id, "assigned_admin_user_id")}
                        onAssignUser={(val) => handleAssignUserChange(row.id, val)}
                        onCancelEdit={cancelAssignEdit}
                      />

                      {/* Actions cell */}
                      <td className="w-px whitespace-nowrap border-l border-gray-100 px-2 py-1.5 dark:border-gray-800">
                        {is_saving ? (
                          <div className="flex items-center justify-center">
                            <svg
                              className="h-3.5 w-3.5 animate-spin text-brand-400"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {row_collaborators.length > 0 && (
                              <RowPresenceIndicator editors={row_collaborators} />
                            )}
                            {!is_new && row.parent_order_status && (() => {
                              const is_completed = row.parent_order_status === "completed";
                              return (
                                <span
                                  className={`flex cursor-default items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${is_completed
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    }`}
                                  title={`Client order — parent order is ${row.parent_order_status}`}
                                >
                                  <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  {is_completed ? "Done" : "Active"}
                                </span>
                              );
                            })()}
                            {is_new && (() => {
                              const missing = getRowMissingRequired(row);
                              return missing.length > 0 ? (
                                <span
                                  className="flex cursor-default items-center gap-0.5"
                                  title={`Draft — fill required fields to save:\n• ${missing.join("\n• ")}`}
                                >
                                  <svg className="h-3.5 w-3.5 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  <span className="min-w-[1ch] text-[10px] font-semibold leading-none text-amber-600 dark:text-amber-400">
                                    {missing.length}
                                  </span>
                                </span>
                              ) : (
                                <span
                                  className="flex cursor-default items-center"
                                  title="All required fields filled — will save on next edit"
                                >
                                  <svg className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </span>
                              );
                            })()}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRow(row.id);
                              }}
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

      {/* Import modal */}
      <LinkBuildingOrderImportModal
        is_open={show_import_modal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Metrics-only bulk update modal */}
      <LinkBuildingMetricsUpdateModal
        is_open={show_metrics_modal}
        onClose={() => setShowMetricsModal(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Per-column filter dropdown */}
      {open_filter_col && (
        <ColumnFilterDropdown
          col_key={open_filter_col}
          col_label={COLUMNS.find((c) => c.key === open_filter_col)?.label ?? open_filter_col}
          col_type={COLUMNS.find((c) => c.key === open_filter_col)?.type ?? "text"}
          col_options={COLUMNS.find((c) => c.key === open_filter_col)?.options}
          current_filter={column_filters[open_filter_col as Parameters<typeof setFilter>[0]]}
          anchor_el={filter_anchor_el}
          onSetFilter={(filter) => setFilter(open_filter_col as Parameters<typeof setFilter>[0], filter)}
          onClose={() => {
            setOpenFilterCol(null);
            setFilterAnchorEl(null);
          }}
        />
      )}

      {/* Client Account column filter dropdown */}
      {open_special_filter === "client_account" && (
        <UserSelectFilterDropdown
          label="Client Account"
          users={client_users}
          selected_user_id={client_account_filter}
          anchor_el={special_filter_anchor_el}
          onSelect={(user_id) => setClientAccountFilter(user_id)}
          onClose={() => {
            setOpenSpecialFilter(null);
            setSpecialFilterAnchorEl(null);
          }}
        />
      )}

      {/* Assigned To column filter dropdown */}
      {open_special_filter === "assigned_to" && (
        <UserSelectFilterDropdown
          label="Assigned To"
          users={admin_users}
          selected_user_id={assigned_user_id_filter}
          anchor_el={special_filter_anchor_el}
          onSelect={(user_id) => setAssignedUserIdFilter(user_id)}
          onClose={() => {
            setOpenSpecialFilter(null);
            setSpecialFilterAnchorEl(null);
          }}
        />
      )}

      {/* Footer — summary · rows-per-page · pagination */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 border-t border-gray-100 px-4 py-2 dark:border-gray-800">

        {/* Left: row range + column count */}
        <p className="text-xs text-gray-400 dark:text-gray-600">
          {is_loading ? (
            "Loading…"
          ) : total === 0 ? (
            "No rows"
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {from_row ?? 1}–{to_row ?? filtered_rows.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">{total}</span>{" "}
              rows &middot; {visible_columns.length} of {COLUMNS.length} columns visible
            </>
          )}
        </p>

        {/* Center: rows-per-page select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            Rows per page:
          </span>
          <select
            value={per_page}
            onChange={(e) => handlePerPageChange(parseInt(e.target.value, 10) as PerPageOption)}
            disabled={is_loading}
            className="h-7 rounded-lg border border-gray-200 bg-white px-2 pr-6 text-xs text-gray-600 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} rows
              </option>
            ))}
          </select>
        </div>

        {/* Right: prev / page counter / next */}
        <div className="flex items-center gap-2">
          <button
            disabled={current_page <= 1 || is_loading}
            onClick={() => fetchRows(current_page - 1, current_body_ref.current)}
            className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            title="Previous page"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {last_page <= 1 ? "1 page" : `Page ${current_page} of ${last_page}`}
          </span>
          <button
            disabled={current_page >= last_page || is_loading}
            onClick={() => fetchRows(current_page + 1, current_body_ref.current)}
            className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            title="Next page"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
