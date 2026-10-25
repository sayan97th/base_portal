"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { flushSync } from "react-dom";
import type { LinkBuildingOrderRow, LinkBuildingRecentDomainUsage } from "@/types/admin/link-building-order";
import { useTableSort } from "@/hooks/useTableSort";
import {
  useSheetColumnFilters,
  isSheetFilterActive,
  toColumnFilterPayloads,
  describeSheetFilter,
} from "@/hooks/useSheetColumnFilters";
import SheetColumnFilterDropdown from "./SheetColumnFilterDropdown";
import ColumnHeaderFilterButton from "./ColumnHeaderFilterButton";
import { getFilteredColumns } from "@/lib/link-building-filtered-columns";
import SavedFiltersMenu from "./SavedFiltersMenu";
import AdvancedFilterPanel from "./AdvancedFilterPanel";
import LinkBuildingFilterPanel from "./LinkBuildingFilterPanel";
import QuickFilterPanel from "./QuickFilterPanel";
import LinkTypeFilterSelect from "./LinkTypeFilterSelect";
import ArticleDocPreview from "./ArticleDocPreview";
import { isGoogleDocLink } from "@/lib/article-doc-title";
import { useQuickFilterValues } from "@/hooks/useQuickFilterValues";
import {
  ASSIGNED_USER_QUICK_FILTER_KEY,
  CLIENT_ACCOUNT_QUICK_FILTER_KEY,
  buildQuickFilterFacets,
  getServerSearchColumnKeys,
  toggleQuickFilterValue,
  type QuickFilterColumn,
} from "@/lib/link-building-quick-filters";
import { useAdvancedFilters } from "@/hooks/useAdvancedFilters";
import {
  countActiveAdvancedRules,
  describeAdvancedFilters,
  describeAdvancedGroup,
  describeAdvancedRuleCondition,
  getAdvancedColumnLabel,
  hasAdvancedFilterRules,
  isAdvancedRuleActive,
  toAdvancedFiltersPayload,
  type AdvancedFilterColumn,
  type AdvancedFilterColumnKind,
} from "@/lib/link-building-advanced-filters";
import { normalizeFilterState, serializeFilterState, toRestoredViewState } from "@/lib/link-building-saved-filters";
import {
  getFilterPreference,
  saveFilterPreference,
} from "@/services/admin/link-building-saved-filters.service";
import {
  createLinkBuildingOrder,
  updateLinkBuildingOrder,
  deleteLinkBuildingOrder,
  buildLboPayload,
  exportLinkBuildingOrders,
  batchUpdateLinkBuildingOrders,
  batchUpdateLinkBuildingOrderCells,
  getLinkBuildingOrderColumnValues,
  getLinkBuildingOrderFilterValues,
  listAdminUsersForSelect,
  listClientUsersForSelect,
  listPenNamesForSelect,
  getNeedsLbTlApprovalCount,
  parseApiErrorMessage,
  type AdminUserOption,
  type ClientUserOption,
} from "@/services/admin/link-building-dashboard.service";
import { parsePastedGrid, isBulkPaste, applyPastedGridToRows, type PastedGrid } from "@/lib/pasted-grid";
import LinkBuildingOrderImportModal from "./LinkBuildingOrderImportModal";
import LinkBuildingMetricsUpdateModal from "./LinkBuildingMetricsUpdateModal";
import UserSelectFilterDropdown from "./UserSelectFilterDropdown";
import ClientAssignCell from "./ClientAssignCell";
import ClientSearchableSelect from "./ClientSearchableSelect";
import AdminSearchableSelect from "./AdminSearchableSelect";
import CellOptionsDropdown from "./CellOptionsDropdown";
import CellDatePicker from "./CellDatePicker";
import type {
  LinkBuildingOrderSearchBody,
  SortRulePayload,
  LinkBuildingOrderPayload,
  LinkBuildingOrderFilterState,
} from "@/types/admin/link-building-order";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/context/AuthContext";
import { useLinkBuildingCollaboration } from "@/hooks/useLinkBuildingCollaboration";
import CollaborationBar from "./CollaborationBar";
import RowPresenceIndicator, {
  CellPresenceOverlay,
  RowPresenceFloater,
} from "./RowPresenceIndicator";
import type { CollaboratorPresence } from "@/types/admin/presence";
import {
  computeRangeStats,
  formatDateMMDDYYYY,
  getTabPosition,
  insertTextAtSelection,
  isInsertDateShortcut,
  isPrintableKey,
  moveGridPosition,
  scrollCellIntoView,
  toCellAddress,
  toColumnLetter,
  type GridDirection,
  type GridPosition,
} from "@/lib/spreadsheet-navigation";
import { useResizableColumnWidths } from "@/hooks/useResizableColumnWidths";
import { useTableFind, type TableFindMatch, type TableFindMatchState } from "@/hooks/useTableFind";
import { useVirtualRows, VIRTUAL_ROW_ATTRIBUTE } from "@/hooks/useVirtualRows";
import { createOrderRowCache, loadAllLinkBuildingOrderRows } from "@/lib/link-building-order-rows-loader";
import { addDays, getToday, parseCellDate } from "@/lib/date-picker";
import TableFindBar from "./TableFindBar";
import KeyboardShortcutsDialog from "./KeyboardShortcutsDialog";
import LinkBuildingOrderHistoryPanel from "./LinkBuildingOrderHistoryPanel";
import type { LinkBuildingRestoreResult } from "@/services/admin/link-building-order-history.service";
import { formatShortcut } from "@/lib/keyboard-shortcuts";
import { useIsMacPlatform } from "@/hooks/useIsMacPlatform";
import NeedsApprovalToggle from "./NeedsApprovalToggle";
import ActiveFiltersBar, { type ActiveFilterChip } from "./ActiveFiltersBar";
import ColumnVisibilityPanel, { type ColumnVisibilityGroup } from "./ColumnVisibilityPanel";
import SelectionStatsBar from "./SelectionStatsBar";
import TableStatusFooter from "./TableStatusFooter";
import {
  LINK_BUILDING_ORDER_STATUSES,
  STATUS_BADGE_CLASSES,
  DEFAULT_STATUS_BADGE_CLASS,
  STATUS_DOT_CLASSES,
  DEFAULT_STATUS_DOT_CLASS,
  isSiteRemovedAlert,
} from "@/lib/link-building-order-statuses";
import FindHighlightedText from "./FindHighlightedText";
import RecentDomainUsageCard from "./RecentDomainUsageCard";
import {
  getRecentDomainUsageAlert,
  recentDomainUsageByRowId,
  withRecentDomainUsage,
} from "@/lib/link-building-domain-usage";
import {
  analyzeFormula,
  canInsertReferenceAt,
  findReferences,
  formatScalar,
  formatWithColumnFormat,
  FormulaError,
  isFormulaText,
  parseFormula,
  toA1Range,
  toDisplayFormula,
  toStoredFormula,
  tokenizeFormula,
  type FormulaColumnFormat,
  type FormulaResult,
  type SheetColumn,
  type SheetColumnKind,
} from "@/lib/spreadsheet-formulas";
import {
  buildOrdersSheet,
  collectStaleFormulaCells,
  createColumnKeyMapper,
  FORMULA_CELL_COLUMN_KEYS,
  getCellFormula,
  isFormulaColumnKey,
  SUMMARY_ROW_ID,
  toCellFieldValue,
  withCellFormula,
  type OrdersSheetConfig,
} from "@/lib/link-building-sheet";
import { PRICE_COLUMN_KEYS, withFormattedPrices } from "@/lib/link-building-prices";
import { useLinkBuildingSheetFormulas } from "@/hooks/useLinkBuildingSheetFormulas";
import type { LinkBuildingOrderSheetFormula } from "@/types/admin/link-building-order";
import FormulaInput from "./FormulaInput";
import FormulaBar, { type FormulaBarCommitDirection } from "./FormulaBar";
import FormulaColumnDialog, { type FormulaColumnDraft, type FormulaPreviewRow } from "./FormulaColumnDialog";
import FunctionsReferencePanel from "./FunctionsReferencePanel";
import { FormulaEditingContext, type ActiveFormulaEditor, type FormulaEditingContextValue } from "./FormulaEditingContext";
import styles from "./LinkBuildingOrdersTable.module.scss";

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
  | "site_pricing"
  | "pricing";

interface ColumnDef {
  key: keyof LinkBuildingOrderRow;
  label: string;
  group: ColumnGroup;
  min_width: number;
  type: "text" | "select" | "date" | "url" | "number";
  options?: string[];
  /** The options are loaded at runtime from existing data (e.g. Pen Name) rather
   *  than a preset list, so they act as suggestions and any new value is allowed. */
  dynamic_options?: boolean;
  locked?: boolean;
  required?: boolean;
  sort_key?: string;
  sortable?: boolean;
  sticky?: boolean;
}

/** Identifies a single cell by row + column key, used by the Excel-style range selection. */
type CellRef = { row_id: string; col_key: string };

/** Where keyboard focus goes after a cell edit is committed: Tab/Shift+Tab wrap
 * across rows, Enter/Shift+Enter and the arrow keys move one cell without wrapping. */
type CellNavDirection = "next" | "prev" | GridDirection;

/** How a cell entered edit mode. "type" started from a printable key press, so the
 * arrow keys commit and move like Excel's Enter mode. "edit" came from a double
 * click, Enter or F2, so the arrow keys move the caret inside the text instead. */
type CellEditEntry = "edit" | "type";

/** Cell keys after the data columns that are still part of keyboard navigation. */
const ASSIGNMENT_COLUMN_KEYS = ["user_id", "assigned_admin_user_id"] as const;

const ASSIGNMENT_COLUMN_LABELS: Record<string, string> = {
  user_id: "Client Account",
  assigned_admin_user_id: "Assigned To",
};

const ARROW_KEY_DIRECTIONS: Record<string, GridDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/** Rows moved by PageUp / PageDown. */
const PAGE_NAVIGATION_STEP = 10;

/** Stable lookup key written to each cell's data-cell-key, used to scroll it into view. */
function toCellKey(row_id: string, col_key: string): string {
  return `${row_id}:${col_key}`;
}

/** A single field's before/after value, recorded for the undo/redo history stack. */
type CellHistoryValue = string | number | null;

interface CellHistoryChange {
  row_id: string;
  col_key: keyof LinkBuildingOrderRow;
  old_value: CellHistoryValue;
  new_value: CellHistoryValue;
  /**
   * The cell's stored formula before and after, set only when the change added,
   * replaced or removed a formula, so undo brings that formula back.
   */
  old_formula?: string | null;
  new_formula?: string | null;
}

/** One undo/redo unit: every cell touched by a single user action (a cell edit, a
 * bulk paste, or a batch fill), applied and reverted together. */
interface HistoryEntry {
  changes: CellHistoryChange[];
  label: string;
}

const MAX_HISTORY_ENTRIES = 50;

/** A data cell's value and formula before an edit, to build the undo entry once it is committed. */
interface CellEditSnapshot {
  row_id: string;
  col_key: string;
  old_value: string;
  old_formula: string | null;
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

const STATUS_OPTIONS = LINK_BUILDING_ORDER_STATUSES;

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
  { key: "estimated_turnaround_days", label: "Est. Turnaround (Days)", group: "dates", min_width: 130, type: "number", locked: true },
  { key: "pen_name", label: "Pen Name", group: "writer", min_width: 120, type: "select", options: [], dynamic_options: true },
  { key: "partnership", label: "Partnership", group: "writer", min_width: 180, type: "url" },
  { key: "article_title", label: "Article Title", group: "writer", min_width: 220, type: "text" },
  { key: "article", label: "Article", group: "writer", min_width: 120, type: "url" },
  { key: "live_link", label: "Live Link", group: "live", min_width: 220, type: "url" },
  { key: "live_link_date", label: "Live Link Date", group: "live", min_width: 120, type: "date" },
  { key: "dr_lbs", label: "DR", group: "metrics", min_width: 80, type: "number" },
  { key: "posting_fee_lbs", label: "Posting Fee", group: "metrics", min_width: 135, type: "text" },
  { key: "current_traffic", label: "Current Traffic", group: "site_pricing", min_width: 120, type: "number" },
  { key: "dr_formula", label: "DR Formula", group: "site_pricing", min_width: 100, type: "number" },
  { key: "current_poc", label: "Current POC", group: "site_pricing", min_width: 130, type: "text" },
  { key: "current_price", label: "Current Price", group: "site_pricing", min_width: 120, type: "text" },
  { key: "lb_tl_approval", label: "LB TL Approval", group: "pricing", min_width: 130, type: "text" },
  { key: "approval_date", label: "Approval Date", group: "pricing", min_width: 120, type: "date" },
  { key: "final_price", label: "Final Price", group: "pricing", min_width: 110, type: "text" },
  { key: "currency", label: "Currency", group: "pricing", min_width: 100, type: "select", options: ["USD", "EUR"] },
];

/**
 * Pen Name dropdown options: the names saved on the server merged with the ones
 * on the currently loaded rows, so a name typed moments ago (by this admin or a
 * collaborator) is offered right away without refetching. Deduplicated without
 * regard to casing and sorted alphabetically.
 */
function buildPenNameOptions(saved_pen_names: string[], loaded_pen_names: string[]): string[] {
  const options_by_key = new Map<string, string>();
  [...saved_pen_names, ...loaded_pen_names].forEach((pen_name) => {
    const trimmed = pen_name.trim();
    const option_key = trimmed.toLowerCase();
    if (trimmed !== "" && !options_by_key.has(option_key)) options_by_key.set(option_key, trimmed);
  });
  return Array.from(options_by_key.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

const COLUMN_LABELS: Record<string, string> = Object.fromEntries(
  COLUMNS.map((col) => [col.key, col.label])
);

// Fixed pixel widths of the row number gutter, the checkbox column and the row
// actions column. Every other column width comes from DEFAULT_COLUMN_WIDTHS (or
// an admin's resized width), see useResizableColumnWidths.
const ROW_HEADER_WIDTH = 46;
const CHECKBOX_COL_WIDTH = 40;
const ACTIONS_COL_WIDTH = 104;

const COLUMN_WIDTHS_STORAGE_KEY = "lbo_column_widths_v1";

/**
 * Default width of a data column: its min_width, widened when needed so the
 * header label still fits next to its sort, filter and copy icons (about 7px
 * per character at the header's font size, plus padding, icons and the lock
 * icon on locked columns). The grid uses a fixed table layout, so this is the
 * column's exact width, and the frozen columns' sticky offsets are built from it.
 */
function getDefaultColumnWidth(col: ColumnDef): number {
  const header_width = Math.ceil(col.label.length * 7) + 16 + 56 + (col.locked ? 16 : 0);
  return Math.max(col.min_width, header_width);
}

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  ...Object.fromEntries(COLUMNS.map((col) => [col.key, getDefaultColumnWidth(col)])),
  user_id: 200,
  assigned_admin_user_id: 200,
};

// ── Group header styles ────────────────────────────────────────────────────────

// The colors follow the BASE links Google Sheet: DR and Posting Fee, which Link
// Builders enter themselves, share one color, and Current Traffic, DR Formula,
// Current POC and Current Price share another.

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
  site_pricing: "bg-fuchsia-800 text-white border-fuchsia-900",
  pricing: "bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500",
};

/** Names and header colors of the column groups, in table order, for the column chooser. */
const COLUMN_GROUP_META: Record<ColumnGroup, { label: string; swatch_class: string }> = {
  order: { label: "Order", swatch_class: "bg-gray-950 dark:bg-gray-400" },
  status_col: { label: "Status", swatch_class: "bg-purple-700" },
  team_link: { label: "Team Link", swatch_class: "bg-pink-600" },
  core: { label: "Order Details", swatch_class: "bg-gray-700 dark:bg-gray-500" },
  internal: { label: "Internal", swatch_class: "bg-slate-600" },
  dates: { label: "Dates", swatch_class: "bg-amber-700" },
  writer: { label: "Writer and Content", swatch_class: "bg-gray-300 dark:bg-gray-600" },
  live: { label: "Live Link", swatch_class: "bg-rose-400" },
  metrics: { label: "Link Builder Metrics", swatch_class: "bg-emerald-700" },
  site_pricing: { label: "Traffic and Pricing", swatch_class: "bg-fuchsia-800" },
  pricing: { label: "Pricing and Approval", swatch_class: "bg-gray-300 dark:bg-gray-600" },
};

const COLUMN_VISIBILITY_GROUPS: ColumnVisibilityGroup[] = COLUMNS.reduce<ColumnVisibilityGroup[]>((groups, col) => {
  let group = groups.find((g) => g.key === col.group);
  if (!group) {
    group = { key: col.group, ...COLUMN_GROUP_META[col.group], columns: [] };
    groups.push(group);
  }
  group.columns.push({ key: col.key as string, label: col.label });
  return groups;
}, []);

// ── Spreadsheet formulas ───────────────────────────────────────────────────────

/** How formulas read a column's text: price columns hold numbers such as "$150.00". */
function getSheetColumnKind(col: ColumnDef): SheetColumnKind {
  if (col.type === "date") return "date";
  if (col.type === "number" || PRICE_COLUMN_KEYS.has(col.key)) return "number";
  return "text";
}

/**
 * Columns formulas can reference, in letter order: the table columns (A to AB),
 * then Client Account and Assigned To. Formula columns follow them. A column keeps
 * its letter when others are hidden, like in Google Sheets.
 */
const BASE_SHEET_COLUMNS: SheetColumn[] = [
  ...COLUMNS.map((col) => ({ key: col.key as string, kind: getSheetColumnKind(col) })),
  ...ASSIGNMENT_COLUMN_KEYS.map((key) => ({ key, kind: "text" as const })),
];

const SHEET_KIND_BY_KEY: ReadonlyMap<string, SheetColumnKind> = new Map(
  BASE_SHEET_COLUMNS.map((column) => [column.key, column.kind])
);

const FORMULA_COLUMN_DEFAULT_WIDTH = 170;
/** Colors cycled through the references of the formula being edited, see .formula_ref_N. */
const FORMULA_REFERENCE_COLOR_COUNT = 6;
/** Highest number of cells colored for one reference, so a huge range cannot slow typing down. */
const MAX_HIGHLIGHTED_REFERENCE_CELLS = 2000;
/** How long recalculated values wait before they are saved, so a burst of edits is saved once. */
const FORMULA_SYNC_DELAY_MS = 1500;
const FORMULA_SYNC_MAX_ROWS = 100;
const SUMMARY_ROW_STORAGE_KEY = "lbo_summary_row_v1";

/** Text a formula column cell or totals cell shows for a result. */
function formatComputedResult(result: FormulaResult, format: FormulaColumnFormat, kind: SheetColumnKind): string {
  if (format === "auto" && kind === "date" && typeof result.value === "number") {
    return formatWithColumnFormat(result.value, "date", result.format);
  }
  return format === "auto" ? formatScalar(result.value, result.format) : formatWithColumnFormat(result.value, format, result.format);
}

function getAdvancedFilterKind(col: ColumnDef): AdvancedFilterColumnKind {
  if (col.type === "date") return "date";
  if (col.type === "number" || PRICE_COLUMN_KEYS.has(col.key)) return "number";
  if (col.type === "select") return "option";
  return "text";
}

/**
 * Columns offered by the Advanced filters panel. Columns with a fixed list of
 * options show it in the "is" picker, the others (Pen Name included, whose list
 * grows with the data) load their distinct values from the server.
 */
const ADVANCED_FILTER_COLUMNS: AdvancedFilterColumn[] = COLUMNS.map((col) => ({
  key: col.key as string,
  label: col.label,
  kind: getAdvancedFilterKind(col),
  options: col.dynamic_options ? undefined : col.options,
  swatch_class: COLUMN_GROUP_META[col.group].swatch_class,
  ...(col.key === "status" ? { dot_classes: STATUS_DOT_CLASSES, default_dot_class: DEFAULT_STATUS_DOT_CLASS } : {}),
}));

/**
 * Columns of the Quick filters panel, in display order. Only columns with a
 * manageable set of repeated values are listed, free text columns such as
 * Keyword or Notes are filtered from the Advanced filters view instead.
 */
const QUICK_FILTER_COLUMNS: QuickFilterColumn[] = [
  { key: "status", label: "Status", options: STATUS_OPTIONS, dot_classes: STATUS_DOT_CLASSES, default_dot_class: DEFAULT_STATUS_DOT_CLASS },
  { key: ASSIGNED_USER_QUICK_FILTER_KEY, label: "Assigned To" },
  { key: "link_type", label: "Link Type", options: LINK_TYPE_OPTIONS },
  { key: "client", label: "Company" },
  { key: CLIENT_ACCOUNT_QUICK_FILTER_KEY, label: "Client Account" },
  { key: "pen_name", label: "Pen Name" },
  { key: "current_poc", label: "Current POC" },
  { key: "lb_tl_approval", label: "LB TL Approval" },
  { key: "dr_lbs", label: "DR" },
  { key: "exact_match", label: "Exact Match?", options: ["Yes", "No"] },
  { key: "currency", label: "Currency", options: ["USD", "EUR"] },
];

const QUICK_FILTER_COLUMN_KEYS = QUICK_FILTER_COLUMNS.map((column) => column.key);

// Shared toolbar button styles, so every button in the header lines up at the same height.
// The toolbar layout and its search field live in LinkBuildingOrdersTable.module.scss.
const toolbar_button_base_class =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30";
const toolbar_button_class = `${toolbar_button_base_class} border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`;
// Frame of a split toolbar button (the Filter button and its arrow), each half pads itself.
const toolbar_split_button_base_class =
  "flex h-9 shrink-0 items-stretch overflow-hidden rounded-lg border text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-brand-500/30";
const toolbar_split_button_class = `${toolbar_split_button_base_class} border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200`;
const toolbar_split_button_active_class = `${toolbar_split_button_base_class} border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300`;

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

/** What a bulk cell write is for: a paste, Delete clearing cells, or Cmd/Ctrl+D and R filling them. */
type BulkPasteOperation = "paste" | "clear" | "fill";

const BULK_PASTE_HISTORY_LABELS: Record<BulkPasteOperation, string> = {
  paste: "bulk paste",
  clear: "clear cells",
  fill: "fill cells",
};

const BULK_PASTE_FAILURE_PREFIXES: Record<BulkPasteOperation, string> = {
  paste: "Bulk paste",
  clear: "Clearing cells",
  fill: "Filling cells",
};

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
/** How long the view must stay unchanged before it is saved to the user's account. */
const VIEW_AUTOSAVE_DELAY_MS = 800;
/** Height of a grid row, kept in sync with $row_height in LinkBuildingOrdersTable.module.scss. */
const GRID_ROW_HEIGHT = 34;
/** How long the rows of a new result set play their enter animation. */
const BODY_ENTER_ANIMATION_MS = 700;

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

/** Turnaround of a new row, matching LINK_BUILDING_TURNAROUND_DAYS on the backend (OrderDetailsService). */
const DEFAULT_TURNAROUND_DAYS = 30;

function createEmptyRow(): LinkBuildingOrderRow {
  const today = new Date();
  const delivery_date = new Date(today);
  delivery_date.setDate(delivery_date.getDate() + DEFAULT_TURNAROUND_DAYS);

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
    estimated_turnaround_days: String(DEFAULT_TURNAROUND_DAYS),
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
  is_active?: boolean;
  onSelectCell?: () => void;
  cell_key?: string;
  /** Find (Ctrl/Cmd+F) highlight for this cell, null when it does not match. */
  find_match_state?: TableFindMatchState;
  /** Normalized find terms, only passed while this cell matches. */
  find_terms?: string[];
}

function UserAssignCell({
  assigned_admin_user_id,
  admin_users,
  is_editing,
  onStartEdit,
  onAssignUser,
  onCancelEdit,
  is_active = false,
  onSelectCell,
  cell_key,
  find_match_state = null,
  find_terms,
}: UserAssignCellProps) {
  // Kept in state (through a callback ref) rather than read from a ref during render,
  // so the dropdown re-renders with its anchor as soon as the cell mounts.
  const [cell_el, setCellEl] = useState<HTMLTableCellElement | null>(null);
  const selected_user = admin_users.find(
    (u) => assigned_admin_user_id != null && u.id === Number(assigned_admin_user_id)
  );

  return (
    <>
      <td
        ref={setCellEl}
        data-cell-key={cell_key}
        className={`${styles.cell} whitespace-nowrap text-xs transition-colors ${
          is_editing
            ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400 dark:bg-indigo-900/20 dark:ring-indigo-600"
            : is_active
              ? styles.cell_active
              : ""
        }${getFindCellClass(find_match_state)}`}
        onMouseDown={!is_editing ? onSelectCell : undefined}
        onDoubleClick={!is_editing ? onStartEdit : undefined}
        title="Double click or press Enter to assign a team member"
      >
        {selected_user ? (
          <span className="flex min-w-0 items-center gap-1.5" title={`${selected_user.name} (${selected_user.email})`}>
            {selected_user.avatar_url ? (
              <img
                src={selected_user.avatar_url}
                alt={selected_user.name}
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {selected_user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="shrink-0 font-medium text-gray-700 dark:text-gray-200">
              <FindHighlightedText text={selected_user.name} find_terms={find_terms} />
            </span>
            <span className="min-w-0 truncate text-[10px] text-gray-400 dark:text-gray-500">
              <FindHighlightedText text={selected_user.email} find_terms={find_terms} />
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
          anchor_el={cell_el}
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

/** Extra cell classes for a find (Ctrl/Cmd+F) match, prefixed with a space when present. */
function getFindCellClass(find_match_state: TableFindMatchState): string {
  if (find_match_state === "current") return ` ${styles.cell_find_current}`;
  if (find_match_state === "match") return ` ${styles.cell_find_match}`;
  return "";
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
  onUpdate: (value: string) => void;
  onStopEdit: () => void;
  /** Escape: discards the in-progress edit and restores the value the cell had before. */
  onCancelEdit: () => void;
  onKeyNav: (direction: CellNavDirection) => void;
  /** How editing started, see CellEditEntry. Only meaningful while is_editing. */
  edit_entry?: CellEditEntry;
  /** True when this is the spreadsheet's active (keyboard selected) cell. */
  is_active?: boolean;
  /** Double click on the display cell, opens it for editing. */
  onCellDoubleClick?: () => void;
  /** Opens the cell for editing from its calendar button (date cells only). */
  onStartEdit?: () => void;
  /** Gives keyboard focus back to the grid, after a date is picked with the mouse. */
  onFocusGrid?: () => void;
  /** Lookup key the table uses to scroll this cell into view during keyboard navigation. */
  cell_key?: string;
  /** When provided, shows a copy-to-clipboard icon on cell hover. */
  onCopy?: (value: string) => void;
  /** Fires when a multi-cell (tab/newline delimited) block is pasted into this cell's input. */
  onBulkPaste?: (grid: PastedGrid) => void;
  /** Mouse-down on the display cell — starts either a click-to-edit or an Excel-style drag range selection.
   *  Receives the event so a formula being typed elsewhere can keep focus and take this cell's reference. */
  onCellMouseDown?: (e: React.MouseEvent) => void;
  /** Mouse-enter while a drag is in progress — extends the active range selection to this cell. */
  onCellMouseEnter?: () => void;
  /** Mouse-up on the display cell — ends the drag, resolving it into either an edit or a finished range selection. */
  onCellMouseUp?: () => void;
  /** True when this cell falls within the active multi-cell range selection. */
  is_range_selected?: boolean;
  is_sticky?: boolean;
  sticky_left?: number;
  sticky_bg_class?: string;
  /** Find (Ctrl/Cmd+F) highlight for this cell, null when it does not match. */
  find_match_state?: TableFindMatchState;
  /** Normalized find terms, only passed while this cell matches, so its text can be marked. */
  find_terms?: string[];
  /** For a formula cell, the computed value it shows. Undefined for a plain value. */
  formula_display?: string;
  /** For a formula cell that evaluates to an error, the error (shown as a red marker with its explanation). */
  formula_error?: FormulaError | null;
  /** False for columns that cannot hold a formula, the editor then stays a plain text input. */
  formula_enabled?: boolean;
  /** Color index when the formula being edited references this cell. */
  formula_ref_color?: number;
  /**
   * Article cells only: the row's Article Title. Set, the cell previews the
   * linked doc's title on hover or when selected, falling back to this value.
   */
  article_fallback_title?: string;
  /**
   * Partnership cells only: earlier use of the domain for the row's landing page.
   * Set, the cell is highlighted in red and a warning card explains why on hover
   * or while the cell is selected.
   */
  recent_domain_usage?: LinkBuildingRecentDomainUsage | null;
  /** Partnership cells only: the row's Landing Page, named in the warning card. */
  landing_page?: string;
}

function EditableCell({
  col,
  value,
  is_editing,
  is_draft = false,
  is_first_col = false,
  row_editors = [],
  cell_editors = [],
  onUpdate,
  onStopEdit,
  onCancelEdit,
  onKeyNav,
  edit_entry = "edit",
  is_active = false,
  onCellDoubleClick,
  onStartEdit,
  onFocusGrid,
  cell_key,
  onCopy,
  onBulkPaste,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  is_range_selected = false,
  is_sticky = false,
  sticky_left = 0,
  sticky_bg_class = "bg-white dark:bg-gray-900",
  find_match_state = null,
  find_terms,
  formula_display,
  formula_error = null,
  formula_enabled = false,
  formula_ref_color,
  article_fallback_title,
  recent_domain_usage = null,
  landing_page = "",
}: EditableCellProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const is_mac = useIsMacPlatform();
  const [just_copied, setJustCopied] = useState(false);
  /** Index into the options dropdown's [custom-value row?, ...filtered options] list. */
  const [highlighted_idx, setHighlightedIdx] = useState(-1);
  // A callback ref (state, not useRef) so the dropdown's anchor_el is available the
  // very first render the <td> mounts on — reading a useRef's .current in that same
  // render would still be null, since refs only attach during the commit that just
  // happened, one render behind.
  const [combobox_anchor_el, setComboboxAnchorEl] = useState<HTMLTableCellElement | null>(null);
  // Display <td> of an Article cell, the doc preview card opens on hover over it and is placed under it.
  const [display_cell_el, setDisplayCellEl] = useState<HTMLTableCellElement | null>(null);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const copy_value = formula_display ?? value;
    if (!copy_value || !onCopy) return;
    navigator.clipboard.writeText(copy_value).catch(() => { });
    onCopy(copy_value);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1200);
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!onBulkPaste) return;
    const text = e.clipboardData.getData("text/plain");
    const grid = parsePastedGrid(text);
    // A single-cell paste falls through to the browser's native input paste behavior.
    if (!isBulkPaste(grid)) return;
    e.preventDefault();
    onBulkPaste(grid);
  };

  // Stays false until the admin's first keystroke in a select-type cell — the
  // dropdown filters by this cell's typed text, but the text starts out prefilled
  // with the current value, and filtering by it immediately would hide every other
  // preset option the moment the cell opens (unlike a native <select>, which always
  // shows the full list). Until something is actually typed, the dropdown is shown
  // unfiltered instead.
  const [has_typed, setHasTyped] = useState(false);

  // Resets the combobox's transient UI state the moment a cell starts editing.
  // Adjusted directly during render — React's documented pattern for "reset state
  // when a prop changes" (tracked via its own useState, not a ref, since a plain
  // ref read/write during render isn't allowed) — rather than in the effect below,
  // which handles focusing the input, a genuine DOM side effect, and nothing else.
  const [was_editing, setWasEditing] = useState(is_editing);
  if (was_editing !== is_editing) {
    setWasEditing(is_editing);
    if (is_editing) {
      if (highlighted_idx !== -1) setHighlightedIdx(-1);
      // Editing started by typing a character already holds typed text, so a
      // select-type cell filters its options by it right away.
      const starts_typed = edit_entry === "type";
      if (has_typed !== starts_typed) setHasTyped(starts_typed);
    }
  }

  useEffect(() => {
    if (!is_editing) return;
    const input_el = input_ref.current;
    if (!input_el) return;
    input_el.focus();
    if (edit_entry === "type") {
      // Keep the caret after the character that started the edit, so the next
      // keystroke appends to it instead of replacing it.
      const end = input_el.value.length;
      input_el.setSelectionRange(end, end);
    } else {
      input_el.select();
    }
    // edit_entry is fixed for the lifetime of one edit, it only matters on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_editing]);

  /** Arrow keys commit and move only when the edit started from typing (Excel's Enter mode).
   *  While a formula is typed they move the caret instead, so references can be edited. */
  const handleArrowCommit = (e: React.KeyboardEvent, allowed: ReadonlyArray<GridDirection>): boolean => {
    if (edit_entry !== "type" || (formula_enabled && value.trimStart().startsWith("="))) return false;
    const direction = ARROW_KEY_DIRECTIONS[e.key];
    if (!direction || !allowed.includes(direction)) return false;
    e.preventDefault();
    onStopEdit();
    onKeyNav(direction);
    return true;
  };

  /** Ctrl+; / Cmd+; puts today's date at the caret (replacing any selected text), like Google Sheets. */
  const handleInsertDateShortcut = (e: React.KeyboardEvent): boolean => {
    if (col.type === "number" || !isInsertDateShortcut(e)) return false;
    e.preventDefault();
    const input_el = input_ref.current;
    const selection_start = input_el?.selectionStart ?? value.length;
    const selection_end = input_el?.selectionEnd ?? value.length;
    const next = insertTextAtSelection(value, selection_start, selection_end, formatDateMMDDYYYY(new Date()));
    setHasTyped(true);
    onUpdate(next.text);
    // The controlled input re-renders with the new text first, then the caret is placed after the date.
    requestAnimationFrame(() => input_ref.current?.setSelectionRange(next.caret, next.caret));
    return true;
  };

  /**
   * Date cells opened with double click or Enter: Up and Down step the date by one
   * day, like a native date input, starting from today when the cell holds no date.
   */
  const handleDateStepKey = (e: React.KeyboardEvent): boolean => {
    if (col.type !== "date" || edit_entry === "type" || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return false;
    if (formula_enabled && value.trimStart().startsWith("=")) return false;
    e.preventDefault();
    const base_date = parseCellDate(value) ?? getToday();
    onUpdate(formatDateMMDDYYYY(addDays(base_date, e.key === "ArrowUp" ? 1 : -1)));
    requestAnimationFrame(() => input_ref.current?.select());
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (handleArrowCommit(e, ["up", "down", "left", "right"])) return;
    if (handleDateStepKey(e)) return;
    if (handleInsertDateShortcut(e)) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onCancelEdit();
    } else if (e.key === "Enter") {
      e.preventDefault();
      onStopEdit();
      onKeyNav(e.shiftKey ? "up" : "down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      onStopEdit();
      onKeyNav(e.shiftKey ? "prev" : "next");
    }
  };

  if (is_editing) {
    if (col.type === "select" && col.options) {
      // A select-type cell is still a free-text input under the hood — the floating
      // panel below it offers the column's preset options plus, when the typed text
      // doesn't match any of them, a "Use ..." row for keeping that text verbatim.
      // This is what lets a value pasted or typed from outside the preset list (e.g.
      // copied from the external BASE sheet) always stick, the same as any other
      // column, instead of being silently rejected like a native <select> would.
      const dropdown_query = has_typed ? value.trim() : "";
      const filtered_options =
        dropdown_query === ""
          ? col.options
          : col.options.filter((opt) => opt.toLowerCase().includes(dropdown_query.toLowerCase()));
      const has_exact_match = col.options.some((opt) => opt.toLowerCase() === dropdown_query.toLowerCase());
      const show_custom_row = dropdown_query !== "" && !has_exact_match;
      const dropdown_items = show_custom_row ? [dropdown_query, ...filtered_options] : filtered_options;

      // Committing a value picked from the dropdown updates and stops editing in the
      // same synchronous handler (a click, or Enter/Tab on a highlighted row) —
      // flushSync forces the row-state update to land before onStopEdit reads it
      // back, since onStopEdit persists whatever the latest row state holds rather
      // than taking the new value as an argument.
      const commitDropdownValue = (chosen_value: string) => {
        flushSync(() => onUpdate(chosen_value));
        onStopEdit();
      };

      const handleComboboxKeyDown = (e: React.KeyboardEvent) => {
        // Up/Down always drive the options list, Left/Right can still commit and move.
        if (handleArrowCommit(e, ["left", "right"])) return;
        if (handleInsertDateShortcut(e)) {
          setHighlightedIdx(-1);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightedIdx((prev) => Math.min(prev + 1, dropdown_items.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightedIdx((prev) => Math.max(prev - 1, -1));
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancelEdit();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (highlighted_idx >= 0 && dropdown_items[highlighted_idx] !== undefined) {
            commitDropdownValue(dropdown_items[highlighted_idx]);
          } else {
            onStopEdit();
          }
          onKeyNav(e.shiftKey ? "up" : "down");
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          if (highlighted_idx >= 0 && dropdown_items[highlighted_idx] !== undefined) {
            commitDropdownValue(dropdown_items[highlighted_idx]);
          } else {
            onStopEdit();
          }
          onKeyNav(e.shiftKey ? "prev" : "next");
        }
      };

      return (
        <td
          ref={setComboboxAnchorEl}
          data-cell-key={cell_key}
          className={`${styles.cell_editing}${is_sticky ? ` ${sticky_bg_class}` : ""}`}
          style={is_sticky ? { position: "sticky", left: sticky_left, zIndex: 3 } : undefined}
        >
          <input
            ref={input_ref}
            type="text"
            value={value}
            onChange={(e) => {
              setHighlightedIdx(-1);
              setHasTyped(true);
              onUpdate(e.target.value);
            }}
            onBlur={onStopEdit}
            onKeyDown={handleComboboxKeyDown}
            onPaste={handleInputPaste}
            className={styles.cell_input}
          />
          <CellOptionsDropdown
            options={col.options}
            query={dropdown_query}
            current_value={value}
            highlighted_idx={highlighted_idx}
            anchor_el={combobox_anchor_el}
            onHighlightChange={setHighlightedIdx}
            onSelect={commitDropdownValue}
            empty_message={col.dynamic_options ? "No saved values yet. Type to add one." : undefined}
          />
        </td>
      );
    }

    // Text, number and date cells edit through FormulaInput: typing "=" turns the
    // input into a formula editor (function suggestions, argument hints, clicked
    // cells inserted as references). The <td> anchors the helper popover.
    const is_formula_text = formula_enabled && value.trimStart().startsWith("=");
    // Date cells add a calendar under the input, hidden while a formula is typed so it
    // does not cover the formula helper.
    const shows_date_picker = col.type === "date" && !is_formula_text;

    // Same flushSync reasoning as commitDropdownValue above.
    const commitPickedDate = (picked_value: string) => {
      flushSync(() => onUpdate(picked_value));
      onStopEdit();
      onFocusGrid?.();
    };

    return (
      <td
        ref={setComboboxAnchorEl}
        data-cell-key={cell_key}
        className={`${styles.cell_editing}${is_sticky ? ` ${sticky_bg_class}` : ""}`}
        style={is_sticky ? { position: "sticky", left: sticky_left, zIndex: 3 } : undefined}
      >
        <FormulaInput
          input_ref={input_ref}
          value={value}
          onValueChange={onUpdate}
          onBlur={onStopEdit}
          onKeyDown={handleKeyDown}
          onPaste={handleInputPaste}
          formula_enabled={formula_enabled}
          anchor_el={combobox_anchor_el}
          className={`${styles.cell_input}${is_formula_text ? ` ${styles.cell_input_formula}` : ""}`}
          placeholder={shows_date_picker ? "MM/DD/YYYY" : undefined}
        />
        {shows_date_picker && (
          <CellDatePicker value={value} anchor_el={combobox_anchor_el} onSelect={commitPickedDate} />
        )}
      </td>
    );
  }

  // ── Display mode ─────────────────────────────────────────────────────────────

  // A formula cell shows its computed value. It normally equals the stored value,
  // but it is recomputed live, so it is already up to date before the sync saves it.
  const shown_value = formula_display ?? value;
  const is_formula_cell = formula_display !== undefined;
  // The Article cell previews its doc's title in a card, which replaces the cell's tooltip.
  // Read for screen readers, the card shows the same warning to sighted users.
  const alert_message = getRecentDomainUsageAlert({ partnership: value, recent_domain_usage });
  const has_article_preview =
    article_fallback_title !== undefined &&
    /^https?:\/\//i.test(value) &&
    (isGoogleDocLink(value) || article_fallback_title.trim() !== "");
  let display: React.ReactNode;

  if (col.type === "url" && value) {
    const is_url = /^https?:\/\//i.test(value);
    const label = value.replace(/^https?:\/\//, "").slice(0, 28);
    if (is_url && has_article_preview) {
      display = (
        <ArticleDocPreview
          url={value}
          fallback_title={article_fallback_title ?? ""}
          anchor_el={display_cell_el}
          is_active={is_active && !is_range_selected}
        >
          <FindHighlightedText text={label} find_terms={find_terms} />
          {value.replace(/^https?:\/\//, "").length > 28 ? "…" : ""}
        </ArticleDocPreview>
      );
    } else if (is_url) {
      display = (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className={alert_message ? "font-semibold text-red-700 hover:underline dark:text-red-300" : "text-blue-500 hover:underline"}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          title={value}
        >
          <FindHighlightedText text={label} find_terms={find_terms} />
          {value.replace(/^https?:\/\//, "").length > 28 ? "…" : ""}
        </a>
      );
    } else {
      display = (
        <span title={value}>
          <FindHighlightedText text={value} find_terms={find_terms} />
        </span>
      );
    }
  } else if (col.key === "estimated_delivery_date" && isDateOverdue(shown_value)) {
    display = (
      <span className="font-semibold text-red-500">
        <FindHighlightedText text={shown_value} find_terms={find_terms} />
      </span>
    );
  } else if (formula_error) {
    display = (
      <span className={styles.cell_error_text} title={`${formula_error.code}: ${formula_error.detail}`}>
        {shown_value || formula_error.code}
      </span>
    );
  } else if (col.key === "status" && value) {
    display = (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[value] ?? DEFAULT_STATUS_BADGE_CLASS}`}
      >
        {value === "Live" && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
        <FindHighlightedText text={value} find_terms={find_terms} />
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
    display = shown_value ? (
      <span title={shown_value}>
        <FindHighlightedText text={shown_value} find_terms={find_terms} />
      </span>
    ) : (
      <span className="text-gray-300 dark:text-gray-600">—</span>
    );
  }

  const is_required_error = is_draft && (col.required ?? false) && !shown_value;
  // Plain date cells get a calendar button, a formula's date is edited through its formula.
  const show_date_button = col.type === "date" && !is_formula_cell && !!onStartEdit;
  const has_alert = !!alert_message && !is_required_error;
  const has_cell_editors = cell_editors.length > 0;
  const show_row_floater = is_first_col && row_editors.length > 0;

  return (
    <td
      ref={has_article_preview || has_alert ? setDisplayCellEl : undefined}
      data-cell-key={cell_key}
      className={`group/cell relative select-none whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 ${styles.cell}${
        col.type === "number" ? ` ${styles.cell_numeric}` : ""
      }${is_formula_cell ? ` ${styles.cell_formula}` : ""}${formula_error ? ` ${styles.cell_formula_error}` : ""}${
        formula_ref_color !== undefined ? ` ${styles[`formula_ref_${formula_ref_color}`]}` : ""
      }${getFindCellClass(find_match_state)}${is_range_selected ? ` ${styles.cell_in_range}` : ""}${is_active ? ` ${styles.cell_active}` : ""} ${
        is_required_error
          ? "bg-red-50 ring-1 ring-inset ring-red-300 dark:bg-red-950 dark:ring-red-700"
          : has_alert
            ? "bg-red-100 text-red-700 ring-1 ring-inset ring-red-300 dark:bg-red-950 dark:text-red-300 dark:ring-red-800"
            : is_sticky
            ? sticky_bg_class
            : ""
      }`}
      style={{
        ...(has_cell_editors
          ? { outline: `2px solid ${cell_editors[0].color}`, outlineOffset: "-2px" }
          : {}),
        ...(is_sticky ? { position: "sticky", left: sticky_left, zIndex: 1 } : {}),
      }}
      onMouseDown={(e) => {
        // No preventDefault here: doing so would also suppress the browser's default
        // blur of a currently-focused input in another cell, which is what triggers
        // that cell's save-on-click-away. select-none on this cell is what stops the
        // native text-selection highlight while dragging instead. The table calls it
        // only when this click inserts a reference into a formula being typed.
        onCellMouseDown?.(e);
      }}
      onMouseEnter={onCellMouseEnter}
      onMouseUp={onCellMouseUp}
      onDoubleClick={onCellDoubleClick}
      title={
        has_article_preview || has_alert
          ? undefined
          : is_required_error
            ? `Required: ${col.label} must be filled to save this row`
            : formula_error
              ? `${formula_error.code}: ${formula_error.detail}`
              : is_formula_cell
                ? "Formula cell, its formula shows in the formula bar · Double click or Enter to edit it"
                : `Double click, Enter or start typing to edit · Type = to start a formula · ${formatShortcut(["Mod", ";"], is_mac)} inserts today's date · Arrow keys to move · Shift+Arrow or drag to select · ${formatShortcut(["Mod", "C"], is_mac)} / ${formatShortcut(["Mod", "V"], is_mac)} to copy and paste · ${formatShortcut(["Mod", "/"], is_mac)} for all shortcuts`
      }
    >
      {show_row_floater && <RowPresenceFloater editors={row_editors} />}
      {has_cell_editors && <CellPresenceOverlay editors={cell_editors} />}
      <div className="truncate">
        {is_required_error ? (
          <span className="flex items-center gap-1 text-red-400 dark:text-red-500">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400 dark:bg-red-500" />
            <span className="italic">Required</span>
          </span>
        ) : has_alert ? (
          <span className="flex min-w-0 items-center gap-1">
            <svg className="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="sr-only">{alert_message}</span>
            <span className="min-w-0 truncate">{display}</span>
          </span>
        ) : (
          display
        )}
      </div>
      {has_alert && recent_domain_usage && (
        <RecentDomainUsageCard
          usage={recent_domain_usage}
          landing_page={landing_page}
          anchor_el={display_cell_el}
          is_active={is_active && !is_range_selected}
        />
      )}
      {show_date_button && (
        <button
          type="button"
          className={`${styles.cell_date_button}${is_active ? ` ${styles.cell_date_button_active}` : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Pick a date"
          aria-label={`Pick ${col.label}`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      )}
      {onCopy && shown_value && !is_required_error && (
        <button
          className={`absolute ${show_date_button ? "right-6" : "right-0.5"} top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-all group-hover:opacity-20 group-hover/cell:opacity-70 hover:!opacity-100 hover:bg-white dark:hover:bg-gray-700 ${just_copied ? "!opacity-100 text-green-500" : "text-gray-400"
            }`}
          onClick={handleCopy}
          onMouseDown={(e) => e.stopPropagation()}
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

// ── Computed cell (formula columns and the totals row) ─────────────────────────

interface ComputedCellProps {
  /** Formatted result. */
  text: string;
  error: FormulaError | null;
  is_numeric: boolean;
  is_active: boolean;
  is_editing: boolean;
  /** Formula being typed while editing. */
  draft: string;
  onDraftChange: (text: string) => void;
  /** Saves the typed formula and moves the active cell (null keeps it in place). */
  onCommit: (direction: CellNavDirection | null) => void;
  onCancel: () => void;
  onCellMouseDown: (e: React.MouseEvent) => void;
  onCellMouseEnter?: () => void;
  onDoubleClick: () => void;
  cell_key: string;
  title: string;
  /** Faint text shown while the cell has no formula (totals row). */
  placeholder?: string;
  class_name?: string;
  find_match_state?: TableFindMatchState;
  find_terms?: string[];
  formula_ref_color?: number;
  sticky_left?: number;
  sticky_bg_class?: string;
}

/**
 * A cell whose value is computed by a formula that is not its own: a formula
 * column cell (the column's formula applied to this row) or a totals row cell.
 * Editing it edits that formula, with the same helper as any formula cell.
 */
function ComputedCell({
  text,
  error,
  is_numeric,
  is_active,
  is_editing,
  draft,
  onDraftChange,
  onCommit,
  onCancel,
  onCellMouseDown,
  onCellMouseEnter,
  onDoubleClick,
  cell_key,
  title,
  placeholder,
  class_name = "",
  find_match_state = null,
  find_terms,
  formula_ref_color,
  sticky_left,
  sticky_bg_class = "",
}: ComputedCellProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const [cell_el, setCellEl] = useState<HTMLTableCellElement | null>(null);
  const sticky_style: React.CSSProperties | undefined =
    sticky_left !== undefined ? { position: "sticky", left: sticky_left, zIndex: is_editing ? 3 : 1 } : undefined;

  useEffect(() => {
    if (!is_editing) return;
    const input = input_ref.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [is_editing]);

  if (is_editing) {
    return (
      <td
        ref={setCellEl}
        data-cell-key={cell_key}
        className={`${styles.cell_editing} ${class_name}${sticky_left !== undefined ? ` ${sticky_bg_class}` : ""}`}
        style={sticky_style}
      >
        <FormulaInput
          input_ref={input_ref}
          value={draft}
          onValueChange={onDraftChange}
          anchor_el={cell_el}
          placeholder="=SUM(AA:AA)"
          className={`${styles.cell_input} ${styles.cell_input_formula}`}
          onBlur={() => onCommit(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            } else if (e.key === "Enter") {
              e.preventDefault();
              onCommit(e.shiftKey ? "up" : "down");
            } else if (e.key === "Tab") {
              e.preventDefault();
              onCommit(e.shiftKey ? "prev" : "next");
            }
          }}
        />
      </td>
    );
  }

  return (
    <td
      data-cell-key={cell_key}
      className={`group/cell relative select-none whitespace-nowrap ${styles.cell} ${styles.computed_cell} ${class_name}${
        is_numeric ? ` ${styles.cell_numeric}` : ""
      }${error ? ` ${styles.cell_formula_error}` : ""}${
        formula_ref_color !== undefined ? ` ${styles[`formula_ref_${formula_ref_color}`]}` : ""
      }${getFindCellClass(find_match_state)}${is_active ? ` ${styles.cell_active}` : ""}${
        sticky_left !== undefined ? ` ${sticky_bg_class}` : ""
      }`}
      style={sticky_style}
      onMouseDown={onCellMouseDown}
      onMouseEnter={onCellMouseEnter}
      onDoubleClick={onDoubleClick}
      title={error ? `${error.code}: ${error.detail}` : title}
    >
      <div className="truncate">
        {text !== "" ? (
          <span className={error ? styles.cell_error_text : undefined}>
            <FindHighlightedText text={text} find_terms={find_terms} />
          </span>
        ) : placeholder ? (
          <span className={styles.computed_cell_placeholder}>{placeholder}</span>
        ) : null}
      </div>
    </td>
  );
}

// ── Table skeleton ─────────────────────────────────────────────────────────────

/** Widths (in %) cycled through the skeleton bars so the placeholder reads like real, uneven content. */
const SKELETON_BAR_WIDTHS = [72, 54, 88, 40, 66, 80, 48, 92, 60, 36];

function TableSkeleton() {
  return (
    <div className="overflow-x-auto" role="status" aria-busy="true" aria-label="Loading link building orders">
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
          {Array.from({ length: 10 }).map((_, row_idx) => (
            <tr key={row_idx} className={`border-b border-gray-100 dark:border-gray-800 ${styles.skeleton_row}`}>
              {COLUMNS.slice(0, 10).map((col, col_idx) => (
                <td key={col.key} className="h-[34px] px-2">
                  <div
                    className={styles.skeleton_bar}
                    style={{ width: `${SKELETON_BAR_WIDTHS[(row_idx + col_idx * 3) % SKELETON_BAR_WIDTHS.length]}%` }}
                  />
                </td>
              ))}
              <td className="h-[34px] px-2">
                <div className={`${styles.skeleton_bar} mx-auto`} style={{ width: 16 }} />
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

/** Column keys a saved filter may reference; anything else is dropped when it is applied. */
const KNOWN_COLUMN_KEYS: ReadonlySet<string> = new Set(COLUMNS.map((col) => col.key as string));

/** Column keys a saved view may hide: the table columns and the formula columns ("formula_{id}"). */
const VIEW_COLUMN_KEYS = { has: (key: string) => KNOWN_COLUMN_KEYS.has(key) || isFormulaColumnKey(key) };

// ── Row windowing spacer ───────────────────────────────────────────────────────

/** Empty row standing in for the rows above or below the rendered window. */
function VirtualRowsSpacer({ height, col_span }: { height: number; col_span: number }) {
  return (
    <tr aria-hidden="true" className={styles.virtual_rows_spacer}>
      <td colSpan={col_span} style={{ height }} />
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LinkBuildingOrdersTable({ onOrderMutated }: { onOrderMutated?: () => void }) {
  const [rows, setRows] = useState<LinkBuildingOrderRow[]>([]);
  const [admin_users, setAdminUsers] = useState<AdminUserOption[]>([]);
  const [client_users, setClientUsers] = useState<ClientUserOption[]>([]);
  const [saved_pen_names, setSavedPenNames] = useState<string[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  /** True once the first fetch settles. Later fetches refresh the grid in place instead of swapping it for the skeleton. */
  const [has_loaded_once, setHasLoadedOnce] = useState(false);
  /** Bumped on every successful fetch so the table body replays its enter animation for the new result set. */
  const [rows_version, setRowsVersion] = useState(0);
  /** Id of the latest fetch, so a slow response never overwrites the result of a newer filter. */
  const fetch_request_id_ref = useRef(0);
  /** A fetch that runs while rows are already on screen (filter, sort or page change). */
  const is_refreshing = is_loading && has_loaded_once;
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
  const [needs_approval_filter, setNeedsApprovalFilter] = useState(false);
  const [needs_approval_count, setNeedsApprovalCount] = useState<number | null>(null);
  const [is_fullscreen, setIsFullscreen] = useState(false);
  const [open_special_filter, setOpenSpecialFilter] = useState<"client_account" | "assigned_to" | null>(null);
  const [special_filter_anchor_el, setSpecialFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [show_filter_panel, setShowFilterPanel] = useState(false);
  const [hidden_columns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [applied_saved_filter_id, setAppliedSavedFilterId] = useState<string | null>(null);
  /** False until the user's auto saved view is loaded, rows are not fetched before that. */
  const [is_view_restored, setIsViewRestored] = useState(false);
  /** Rows matching the filters on the server, drafts not included. */
  const [total, setTotal] = useState(0);
  /**
   * True while the rest of the result set is still arriving after the first rows.
   * The grid can already be used, but totals and formulas that read other rows wait
   * for the whole set so they never show a partial result.
   */
  const [is_loading_more_rows, setIsLoadingMoreRows] = useState(false);
  /** Rows reused across loads when their version did not change, see link-building-order-rows-loader. */
  const row_cache_ref = useRef(createOrderRowCache());

  // ── Batch editing ───────────────────────────────────────────────────────────
  const [selected_row_ids, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [clipboard_cell, setClipboardCell] = useState<{ value: string; col_key: string } | null>(null);
  const [batch_field, setBatchField] = useState<string>("");
  const [batch_value, setBatchValue] = useState<string>("");
  const [is_batch_saving, setIsBatchSaving] = useState(false);
  const [batch_select_anchor_el, setBatchSelectAnchorEl] = useState<HTMLElement | null>(null);
  const [copying_column_key, setCopyingColumnKey] = useState<string | null>(null);

  // ── Excel-style multi-cell range selection ──────────────────────────────────
  const [cell_range, setCellRange] = useState<{ anchor: CellRef; focus: CellRef } | null>(null);
  /** In-memory copy of the last range copied from this table, used as a fallback for Ctrl+V when the OS clipboard can't be read. */
  const [range_clipboard, setRangeClipboard] = useState<PastedGrid | null>(null);

  // ── Spreadsheet keyboard navigation ─────────────────────────────────────────
  /** The selected cell the arrow keys move and Enter / F2 / typing opens for editing. */
  const [active_cell, setActiveCell] = useState<CellRef | null>(null);
  const [edit_entry, setEditEntry] = useState<CellEditEntry>("edit");

  // ── Spreadsheet formulas ─────────────────────────────────────────────────────
  // Team wide formula columns and totals row, plus the editing state of formulas
  // typed into the formula bar, a formula column cell or a totals cell.
  const {
    formula_columns,
    summary_formulas,
    reload: reloadSheetFormulas,
    createColumn: createFormulaColumn,
    updateColumn: updateFormulaColumn,
    deleteColumn: deleteFormulaColumn,
    saveSummary: saveSummaryFormula,
  } = useLinkBuildingSheetFormulas();
  const [formula_dialog, setFormulaDialog] = useState<
    { mode: "create" } | { mode: "edit"; column: LinkBuildingOrderSheetFormula } | null
  >(null);
  const [functions_anchor_el, setFunctionsAnchorEl] = useState<HTMLElement | null>(null);
  /** Text typed into the formula bar, null while it is not being edited. */
  const [formula_bar_draft, setFormulaBarDraft] = useState<string | null>(null);
  const formula_bar_input_ref = useRef<HTMLInputElement>(null);
  /** Formula typed into a formula column cell or a totals cell edited in place. */
  const [computed_cell_draft, setComputedCellDraft] = useState("");
  const computed_cell_draft_ref = useRef(computed_cell_draft);
  computed_cell_draft_ref.current = computed_cell_draft;
  const [is_summary_row_visible, setIsSummaryRowVisible] = useState(() => {
    try {
      return typeof window === "undefined" || localStorage.getItem(SUMMARY_ROW_STORAGE_KEY) !== "hidden";
    } catch {
      return true;
    }
  });

  const column_default_widths = useMemo(
    () => ({
      ...DEFAULT_COLUMN_WIDTHS,
      ...Object.fromEntries(formula_columns.map((column) => [column.key, FORMULA_COLUMN_DEFAULT_WIDTH])),
    }),
    [formula_columns]
  );

  const {
    getColumnWidth,
    startColumnResize,
    resetColumnWidth,
    resetAllColumnWidths,
    resizing_col_key,
    has_custom_widths,
  } = useResizableColumnWidths(COLUMN_WIDTHS_STORAGE_KEY, column_default_widths);

  // ── Undo / redo history ──────────────────────────────────────────────────────
  const [undo_stack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redo_stack, setRedoStack] = useState<HistoryEntry[]>([]);
  const [is_undo_redo_saving, setIsUndoRedoSaving] = useState(false);

  // ── Version history panel ────────────────────────────────────────────────────
  // Unlike the undo stack above, which only lives in this tab until a reload, the
  // version history is kept by the server for every change made by anyone, so a
  // mistaken paste can still be restored later. row_id null shows the whole table.
  const [history_panel, setHistoryPanel] = useState<{ row_id: string | null } | null>(null);

  const { sort_rules, toggleSort, setSort, clearSort, replaceSort } = useTableSort(DEFAULT_SORT_RULES);
  const {
    sheet_filters,
    setSheetFilter,
    clearSheetFilter,
    clearAllSheetFilters,
    replaceSheetFilters,
    active_sheet_filter_count,
  } = useSheetColumnFilters();
  const { advanced_filters, advanced_filter_actions, replaceAdvancedFilters } = useAdvancedFilters();
  const [is_filter_panel_open, setIsFilterPanelOpen] = useState(false);
  // The Filter button opens Quick filters, its arrow opens Advanced filters.
  const [is_advanced_filter_mode, setIsAdvancedFilterMode] = useState(false);

  const [open_filter_col, setOpenFilterCol] = useState<keyof LinkBuildingOrderRow | null>(null);
  const [filter_anchor_el, setFilterAnchorEl] = useState<HTMLElement | null>(null);

  const rows_ref = useRef<LinkBuildingOrderRow[]>([]);
  rows_ref.current = rows;

  const editing_cell_ref = useRef<{ row_id: string; col_key: string } | null>(null);
  editing_cell_ref.current = editing_cell;

  const new_row_ids_ref = useRef<Set<string>>(new Set());
  const drafts_restored_ref = useRef(false);
  /** Drafts restored from this browser on the first load, until checked against the server rows. */
  const restored_draft_ids_ref = useRef<Set<string>>(new Set());
  const select_all_ref = useRef<HTMLInputElement>(null);

  // Refs for keyboard shortcut handler (avoids stale closures)
  // Shortcut labels follow the viewer's platform: ⌘C on Mac, Ctrl+C elsewhere.
  const is_mac = useIsMacPlatform();
  const is_mac_ref = useRef(is_mac);
  is_mac_ref.current = is_mac;
  const [is_shortcuts_dialog_open, setIsShortcutsDialogOpen] = useState(false);
  const closeShortcutsDialog = useCallback(() => setIsShortcutsDialogOpen(false), []);

  const clipboard_cell_kbd_ref = useRef(clipboard_cell);
  clipboard_cell_kbd_ref.current = clipboard_cell;

  const selected_row_ids_kbd_ref = useRef(selected_row_ids);
  selected_row_ids_kbd_ref.current = selected_row_ids;

  const cell_range_kbd_ref = useRef(cell_range);
  cell_range_kbd_ref.current = cell_range;

  const range_clipboard_kbd_ref = useRef(range_clipboard);
  range_clipboard_kbd_ref.current = range_clipboard;

  const active_cell_kbd_ref = useRef(active_cell);
  active_cell_kbd_ref.current = active_cell;

  const undo_stack_kbd_ref = useRef(undo_stack);
  undo_stack_kbd_ref.current = undo_stack;

  const redo_stack_kbd_ref = useRef(redo_stack);
  redo_stack_kbd_ref.current = redo_stack;

  /** Snapshot of a cell's value (and formula) taken the moment it starts editing, so `stopEditing`
   * can diff against it to build an undo entry (by then `rows_ref` only holds the new value). */
  const edit_start_value_ref = useRef<CellEditSnapshot | null>(null);

  // Tracks an in-progress drag: the cell where the mouse went down, and whether
  // the pointer has since entered a different cell (i.e. an actual drag, not a click).
  const range_mouse_down_ref = useRef<CellRef | null>(null);
  const range_dragged_ref = useRef(false);

  const debounced_search = useDebounce(search, 400);
  const debounced_client_filter = useDebounce(client_filter, 400);
  // Only complete, enabled rules reach the API. Text typed into a rule waits like
  // the search box does, so the table does not refetch on every keystroke.
  const advanced_filters_key = useMemo(
    () => JSON.stringify(toAdvancedFiltersPayload(advanced_filters) ?? null),
    [advanced_filters]
  );
  const debounced_advanced_filters_key = useDebounce(advanced_filters_key, 400);

  const current_body_ref = useRef<LinkBuildingOrderSearchBody>({});

  const on_order_mutated_ref = useRef(onOrderMutated);
  on_order_mutated_ref.current = onOrderMutated;

  /** Refreshes the "Needs LB TL Approval" badge after rows change. */
  const refreshFilterCounts = useCallback(() => {
    getNeedsLbTlApprovalCount().then(setNeedsApprovalCount).catch(() => {/* non-critical */ });
  }, []);

  useEffect(() => {
    getNeedsLbTlApprovalCount().then(setNeedsApprovalCount).catch(() => {/* non-critical */ });
  }, []);

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
      refreshFilterCounts();
    },
    [refreshFilterCounts]
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
      refreshFilterCounts();
    },
    [refreshFilterCounts]
  );

  const handleRemoteRowDeleted = useCallback(
    (row_id: string, by_session_id: string) => {
      if (by_session_id === local_session_id_ref.current) return;

      if (editing_cell_ref.current?.row_id === row_id) setEditingCell(null);
      if (selected_row_id_ref.current === row_id) setSelectedRowId(null);
      setRows((prev) => prev.filter((r) => r.id !== row_id));
      setTotal((prev) => Math.max(0, prev - 1));
      on_order_mutated_ref.current?.();
      refreshFilterCounts();
    },
    [refreshFilterCounts]
  );

  // Set once fetchRows exists (it is defined after the collaboration hook below).
  const reload_rows_ref = useRef<(() => void) | null>(null);

  /** Many rows changed at once elsewhere (a large history restore): reload them all, once. */
  const handleRemoteBulkChanged = useCallback((by_session_id: string | null) => {
    if (by_session_id === local_session_id_ref.current) return;
    reload_rows_ref.current?.();
    on_order_mutated_ref.current?.();
    refreshFilterCounts();
  }, [refreshFilterCounts]);

  /** Another admin added or changed a formula column or totals cell. */
  const handleRemoteSheetFormulasChanged = useCallback(() => {
    reloadSheetFormulas().catch(() => {/* non-critical, the next change reloads them again */ });
  }, [reloadSheetFormulas]);

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
    onSheetFormulasChanged: handleRemoteSheetFormulasChanged,
    onBulkChanged: handleRemoteBulkChanged,
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

  // ── Fetch admin users, client users and pen names for dropdowns ────────────

  useEffect(() => {
    listAdminUsersForSelect().then(setAdminUsers).catch(() => {/* non-critical */ });
    listClientUsersForSelect().then(setClientUsers).catch(() => {/* non-critical */ });
    listPenNamesForSelect().then(setSavedPenNames).catch(() => {/* non-critical */ });
  }, []);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  /**
   * A draft restored from this browser whose order is already on the server (it was
   * saved, but the browser was closed before its draft was cleared) is dropped once
   * the whole result set is known, instead of showing the same order twice.
   */
  const dropAlreadySavedDrafts = useCallback(() => {
    const restored_ids = restored_draft_ids_ref.current;
    if (restored_ids.size === 0) return;
    restored_draft_ids_ref.current = new Set();

    // Read through the updater, the last appended rows may not have rendered yet.
    setRows((current_rows) => {
      const server_order_ids = new Set(
        current_rows.filter((row) => !restored_ids.has(row.id)).map((row) => row.order_id)
      );
      const saved_draft_ids = new Set(
        current_rows
          .filter((row) => restored_ids.has(row.id) && server_order_ids.has(row.order_id))
          .map((row) => row.id)
      );
      if (saved_draft_ids.size === 0) return current_rows;

      saved_draft_ids.forEach((id) => new_row_ids_ref.current.delete(id));
      const remaining_rows = current_rows.filter((row) => !saved_draft_ids.has(row.id));
      saveDraftsToStorage(remaining_rows.filter((row) => new_row_ids_ref.current.has(row.id)));
      return remaining_rows;
    });
  }, []);

  /**
   * Loads every row matching the filters into the grid. The first rows replace the
   * current result set as soon as they arrive, the rest are appended in display
   * order while the grid is already usable. Drafts not saved yet stay on top.
   */
  const fetchRows = useCallback(async (body: LinkBuildingOrderSearchBody) => {
    const request_id = ++fetch_request_id_ref.current;
    const isStale = () => request_id !== fetch_request_id_ref.current;
    let has_first_rows = false;

    setIsLoading(true);
    setIsLoadingMoreRows(false);
    setSaveError(null);
    try {
      await loadAllLinkBuildingOrderRows({
        body,
        cache: row_cache_ref.current,
        isCancelled: isStale,
        onFirstRows: (first_rows, server_total) => {
          has_first_rows = true;
          setTotal(server_total);
          setIsLoadingMoreRows(first_rows.length < server_total);

          // Drafts kept in this browser come back on the first load only.
          let restored_drafts: LinkBuildingOrderRow[] = [];
          if (!drafts_restored_ref.current) {
            drafts_restored_ref.current = true;
            restored_drafts = loadDrafts();
            restored_drafts.forEach((draft) => new_row_ids_ref.current.add(draft.id));
            restored_draft_ids_ref.current = new Set(restored_drafts.map((draft) => draft.id));
          }
          setRows((prev) => [
            ...restored_drafts,
            ...prev.filter((row) => new_row_ids_ref.current.has(row.id)),
            ...first_rows,
          ]);
          setRowsVersion((version) => version + 1);
          setIsLoading(false);
          setHasLoadedOnce(true);
          // A new result set starts from its first row, not from wherever the previous one was scrolled.
          table_scroll_ref.current?.scrollTo({ top: 0 });
        },
        onMoreRows: (more_rows) => {
          setRows((prev) => {
            // A row created by another admin meanwhile may already be on top.
            const known_ids = new Set(prev.map((row) => row.id));
            const new_rows = more_rows.filter((row) => !known_ids.has(row.id));
            return new_rows.length > 0 ? [...prev, ...new_rows] : prev;
          });
        },
      });
      if (isStale()) return;
      dropAlreadySavedDrafts();
    } catch {
      if (isStale()) return;
      setSaveError(
        has_first_rows
          ? "Some link building orders could not be loaded, the table is incomplete. Please refresh."
          : "Failed to load link building orders. Please refresh."
      );
    } finally {
      if (!isStale()) {
        setIsLoading(false);
        setIsLoadingMoreRows(false);
        setHasLoadedOnce(true);
      }
    }
  }, [dropAlreadySavedDrafts]);

  reload_rows_ref.current = () => fetchRows(current_body_ref.current);

  // Set when a restored view has text filters, so the first fetch waits for their
  // debounced copies to catch up instead of loading the unfiltered table first.
  const awaiting_restored_text_ref = useRef(false);

  /** The filters sent with every request, rebuilt only when one of them changes. */
  const search_body = useMemo<LinkBuildingOrderSearchBody>(() => {
    const active_col_filters = toColumnFilterPayloads(sheet_filters);
    return {
      search: debounced_search.trim() || undefined,
      status: status_filter || undefined,
      link_type: link_type_filter || undefined,
      client: debounced_client_filter.trim() || undefined,
      client_user_id: client_account_filter ?? undefined,
      assigned_user_id: assigned_user_id_filter ?? undefined,
      needs_lb_tl_approval: needs_approval_filter || undefined,
      sort_rules: sort_rules.length > 0 ? sort_rules : undefined,
      column_filters: active_col_filters.length > 0 ? active_col_filters : undefined,
      advanced_filters: JSON.parse(debounced_advanced_filters_key) ?? undefined,
    };
  }, [
    debounced_search,
    status_filter,
    link_type_filter,
    debounced_client_filter,
    client_account_filter,
    assigned_user_id_filter,
    needs_approval_filter,
    sort_rules,
    sheet_filters,
    debounced_advanced_filters_key,
  ]);

  useEffect(() => {
    if (!is_view_restored) return;
    if (awaiting_restored_text_ref.current) {
      if (
        debounced_search !== search ||
        debounced_client_filter !== client_filter ||
        debounced_advanced_filters_key !== advanced_filters_key
      ) {
        return;
      }
      awaiting_restored_text_ref.current = false;
    }

    current_body_ref.current = search_body;
    fetchRows(search_body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_view_restored, search_body]);

  // ── Derived state ───────────────────────────────────────────────────────────

  // The row being edited is left out so its half-typed text never shows up as an
  // option. Joined into a string so the options (and the columns built from them)
  // only change when the set of names does, not on every keystroke.
  const editing_row_id = editing_cell?.row_id ?? null;
  const loaded_pen_names_key = useMemo(
    () =>
      rows
        .filter((row) => row.id !== editing_row_id)
        .map((row) => row.pen_name ?? "")
        .join("\n"),
    [rows, editing_row_id]
  );
  const pen_name_options = useMemo(
    () => buildPenNameOptions(saved_pen_names, loaded_pen_names_key.split("\n")),
    [saved_pen_names, loaded_pen_names_key]
  );

  // COLUMNS with runtime loaded options filled in, used wherever a column's
  // options are read (cell dropdowns, paste normalization, batch edit).
  const columns = useMemo(
    () => COLUMNS.map((col) => (col.key === "pen_name" ? { ...col, options: pen_name_options } : col)),
    [pen_name_options]
  );

  const visible_columns = useMemo(
    () => columns.filter((col) => !hidden_columns.has(col.key)),
    [columns, hidden_columns]
  );
  const filtered_rows = rows;

  // Cumulative left offsets for sticky columns (accounts for hidden sticky columns).
  // Starts after the fixed-width row number gutter and checkbox column. The final
  // cumulative value is the total frozen width, which keyboard navigation keeps
  // scrolled cells clear of.
  const { sticky_left_offsets, frozen_columns_width } = useMemo(() => {
    const offsets: Record<string, number> = {};
    let cumulative = ROW_HEADER_WIDTH + CHECKBOX_COL_WIDTH;
    for (const col of visible_columns) {
      if (col.sticky) {
        offsets[col.key] = cumulative;
        cumulative += getColumnWidth(col.key);
      }
    }
    return { sticky_left_offsets: offsets, frozen_columns_width: cumulative };
  }, [visible_columns, getColumnWidth]);

  const visible_formula_columns = useMemo(
    () => formula_columns.filter((column) => !hidden_columns.has(column.key)),
    [formula_columns, hidden_columns]
  );

  /** Every column the active cell can move through, in on-screen order. */
  const grid_column_keys = useMemo<string[]>(
    () => [
      ...visible_columns.map((col) => col.key as string),
      ...ASSIGNMENT_COLUMN_KEYS,
      ...visible_formula_columns.map((column) => column.key),
    ],
    [visible_columns, visible_formula_columns]
  );

  // ── Formula sheet ───────────────────────────────────────────────────────────
  // The loaded rows as a recalculating spreadsheet. Column letters are fixed per
  // column (hiding one does not shift the others), row numbers follow the gutter.

  /** Row number shown in the gutter for the first row, every matching row is loaded so it is always 1. */
  const row_number_offset = 1;

  const sheet_columns = useMemo<SheetColumn[]>(
    () => [...BASE_SHEET_COLUMNS, ...formula_columns.map((column) => ({ key: column.key, kind: "text" as const }))],
    [formula_columns]
  );
  const column_mapper = useMemo(() => createColumnKeyMapper(sheet_columns), [sheet_columns]);
  const formula_column_by_key = useMemo(
    () => new Map(formula_columns.map((column) => [column.key, column])),
    [formula_columns]
  );

  /** Letter of a column, fixed by its position among every column, hidden ones included. */
  const getColumnLetter = useCallback(
    (col_key: string) => toColumnLetter(column_mapper.getColumnIndex(col_key) ?? 0),
    [column_mapper]
  );

  // Looked up once per cell by formulas and find, a map keeps that fast over every row.
  const client_user_by_id = useMemo(() => new Map(client_users.map((user) => [user.id, user])), [client_users]);
  const admin_user_by_id = useMemo(() => new Map(admin_users.map((user) => [user.id, user])), [admin_users]);

  /** Text an assignment cell shows, so formulas read the client or team member name, not the id. */
  const getAssignmentText = useCallback(
    (row: LinkBuildingOrderRow, col_key: string): string | null => {
      if (col_key === "user_id") {
        const client = row.user_id != null ? client_user_by_id.get(Number(row.user_id)) : undefined;
        return client ? client.company || client.name : "";
      }
      if (col_key === "assigned_admin_user_id") {
        const admin =
          row.assigned_admin_user_id != null ? admin_user_by_id.get(Number(row.assigned_admin_user_id)) : undefined;
        return admin ? admin.name : "";
      }
      return null;
    },
    [client_user_by_id, admin_user_by_id]
  );

  const sheet_config = useMemo<OrdersSheetConfig>(
    () => ({
      columns: sheet_columns,
      column_formulas: new Map(formula_columns.map((column) => [column.key, column.formula])),
      row_number_offset,
      getAssignmentText,
    }),
    [sheet_columns, formula_columns, row_number_offset, getAssignmentText]
  );
  const sheet_config_ref = useRef(sheet_config);
  sheet_config_ref.current = sheet_config;

  /** Recalculated on every change of the rows, formula cells are evaluated lazily as they render. */
  const sheet = useMemo(() => buildOrdersSheet(filtered_rows, sheet_config), [filtered_rows, sheet_config]);

  const row_index_by_id = useMemo(() => new Map(filtered_rows.map((row, idx) => [row.id, idx])), [filtered_rows]);

  /** Computed value and error of a data cell holding a formula, null for a plain value. */
  const getDataCellFormulaDisplay = useCallback(
    (row_idx: number, col_key: string): { text: string; error: FormulaError | null } | null => {
      const row = filtered_rows[row_idx];
      if (!row || !getCellFormula(row, col_key)) return null;
      const result = sheet.getFormulaResult(row_idx, col_key);
      if (!result) return null;
      return {
        text: toCellFieldValue(row, col_key, result, SHEET_KIND_BY_KEY.get(col_key) ?? "text"),
        error: result.value instanceof FormulaError ? result.value : null,
      };
    },
    [filtered_rows, sheet]
  );

  /** Result of a formula column cell, formatted with the column's format. */
  const getFormulaColumnDisplay = useCallback(
    (row_idx: number, column: LinkBuildingOrderSheetFormula): { text: string; error: FormulaError | null; is_numeric: boolean } => {
      const result = sheet.getFormulaResult(row_idx, column.key);
      if (!result) return { text: "", error: null, is_numeric: false };
      return {
        text: formatComputedResult(result, column.format, "text"),
        error: result.value instanceof FormulaError ? result.value : null,
        is_numeric: typeof result.value === "number",
      };
    },
    [sheet]
  );

  /** Totals cell under a column: the result of its formula over the loaded rows. */
  // Evaluated once per sheet rather than on every render, a total reads the whole column.
  const summary_displays = useMemo(() => {
    const displays = new Map<string, { text: string; error: FormulaError | null; is_numeric: boolean }>();
    for (const [col_key, formula] of Object.entries(summary_formulas)) {
      if (!formula) continue;
      // A total over part of the rows would look final, so it waits for the rest.
      if (is_loading_more_rows) {
        displays.set(col_key, { text: "Loading...", error: null, is_numeric: false });
        continue;
      }
      const result = sheet.evaluate(formula, filtered_rows.length);
      const format = formula_column_by_key.get(col_key)?.format ?? "auto";
      displays.set(col_key, {
        text: formatComputedResult(result, format, SHEET_KIND_BY_KEY.get(col_key) ?? "text"),
        error: result.value instanceof FormulaError ? result.value : null,
        is_numeric: typeof result.value === "number",
      });
    }
    return displays;
  }, [summary_formulas, sheet, filtered_rows.length, formula_column_by_key, is_loading_more_rows]);

  const getSummaryDisplay = useCallback(
    (col_key: string): { text: string; error: FormulaError | null; is_numeric: boolean } | null =>
      summary_displays.get(col_key) ?? null,
    [summary_displays]
  );

  /**
   * A cell's formula in A1 notation, as seen from its row, for the formula bar and
   * for editing. Null when the cell holds a plain value.
   */
  const getCellFormulaText = useCallback(
    (cell: CellRef): string | null => {
      if (cell.row_id === SUMMARY_ROW_ID) {
        const stored = summary_formulas[cell.col_key];
        return stored ? toDisplayFormula(stored, row_number_offset + filtered_rows.length, column_mapper) : null;
      }
      const row_idx = row_index_by_id.get(cell.row_id);
      if (row_idx === undefined) return null;
      const stored = formula_column_by_key.get(cell.col_key)?.formula ?? getCellFormula(filtered_rows[row_idx], cell.col_key);
      return stored ? toDisplayFormula(stored, row_number_offset + row_idx, column_mapper) : null;
    },
    [summary_formulas, row_number_offset, filtered_rows, column_mapper, row_index_by_id, formula_column_by_key]
  );
  const get_cell_formula_text_ref = useRef(getCellFormulaText);
  get_cell_formula_text_ref.current = getCellFormulaText;

  /** Text Ctrl+C copies from a cell: what it shows, computed values and names included. */
  const getCellCopyText = useCallback(
    (cell: CellRef): string | null => {
      if (cell.row_id === SUMMARY_ROW_ID) return getSummaryDisplay(cell.col_key)?.text ?? "";
      const row_idx = row_index_by_id.get(cell.row_id);
      if (row_idx === undefined) return null;
      const row = filtered_rows[row_idx];
      const formula_column = formula_column_by_key.get(cell.col_key);
      if (formula_column) return getFormulaColumnDisplay(row_idx, formula_column).text;
      const formula_display = getDataCellFormulaDisplay(row_idx, cell.col_key);
      if (formula_display) return formula_display.text;
      return getAssignmentText(row, cell.col_key) ?? String(row[cell.col_key as keyof LinkBuildingOrderRow] ?? "");
    },
    [getSummaryDisplay, row_index_by_id, filtered_rows, formula_column_by_key, getFormulaColumnDisplay, getDataCellFormulaDisplay, getAssignmentText]
  );
  const get_cell_copy_text_ref = useRef(getCellCopyText);
  get_cell_copy_text_ref.current = getCellCopyText;
  const formula_column_by_key_ref = useRef(formula_column_by_key);
  formula_column_by_key_ref.current = formula_column_by_key;

  const row_number_offset_ref = useRef(row_number_offset);
  row_number_offset_ref.current = row_number_offset;
  const column_mapper_ref = useRef(column_mapper);
  column_mapper_ref.current = column_mapper;

  /** Exact table width for the fixed layout, so columns never stretch past their set widths. */
  const table_width = useMemo(
    () =>
      ROW_HEADER_WIDTH +
      CHECKBOX_COL_WIDTH +
      grid_column_keys.reduce((sum, col_key) => sum + getColumnWidth(col_key), 0) +
      ACTIONS_COL_WIDTH,
    [grid_column_keys, getColumnWidth]
  );

  // Resolves the active anchor/focus cell range into row/column index bounds so
  // every cell in the rectangle (inclusive) can be highlighted and later copied.
  const range_bounds = useMemo(() => {
    if (!cell_range) return null;
    const anchor_row = filtered_rows.findIndex((r) => r.id === cell_range.anchor.row_id);
    const focus_row = filtered_rows.findIndex((r) => r.id === cell_range.focus.row_id);
    const anchor_col = visible_columns.findIndex((c) => c.key === cell_range.anchor.col_key);
    const focus_col = visible_columns.findIndex((c) => c.key === cell_range.focus.col_key);
    if (anchor_row === -1 || focus_row === -1 || anchor_col === -1 || focus_col === -1) return null;
    return {
      min_row: Math.min(anchor_row, focus_row),
      max_row: Math.max(anchor_row, focus_row),
      min_col: Math.min(anchor_col, focus_col),
      max_col: Math.max(anchor_col, focus_col),
    };
  }, [cell_range, filtered_rows, visible_columns]);

  const range_bounds_kbd_ref = useRef(range_bounds);
  range_bounds_kbd_ref.current = range_bounds;

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
      refreshFilterCounts();
    } catch (err) {
      const all_drafts = rows_ref.current.filter((r) => new_row_ids_ref.current.has(r.id));
      saveDraftsToStorage(all_drafts);
      const row_label = row.client ? `"${row.client}"` : "the new row";
      const api_message = parseApiErrorMessage(err, COLUMN_LABELS);
      setSaveError(`Could not save ${row_label}: ${api_message}`);
    } finally {
      unmarkSaving(row.id);
    }
  }, [refreshFilterCounts]);

  const persistRowUpdate = useCallback(async (row: LinkBuildingOrderRow, changed_col_key?: string, value_changed = true) => {
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

      // The backend only ever queues a client email when the status actually
      // changed (see update() on LinkBuildingOrdersDashboardController — it
      // compares old vs. new status before notifying). Requiring value_changed
      // here keeps this banner in sync with that: opening a Status cell and
      // closing it without picking anything else must not claim an email was
      // queued when nothing was actually saved as different.
      const triggers_notification =
        changed_col_key === "status" &&
        value_changed &&
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
      refreshFilterCounts();
    } catch (err) {
      const api_message = parseApiErrorMessage(err, COLUMN_LABELS);
      setSaveError(`Failed to save row "${row.order_id}": ${api_message}`);
    } finally {
      unmarkSaving(row.id);
    }
  }, [refreshFilterCounts]);

  // ── Undo / redo ─────────────────────────────────────────────────────────────
  // Every user action that changes one or more persisted cells (a single cell edit,
  // a bulk paste, or a batch fill) pushes one HistoryEntry here. Undo/redo replay
  // the same cell-level API call (batchUpdateLinkBuildingOrderCells) used by bulk
  // paste, so reverting a change is just another normal, broadcastable update.

  const pushHistoryEntry = useCallback((changes: CellHistoryChange[], label: string) => {
    if (changes.length === 0) return;
    setUndoStack((prev) => {
      const next = [...prev, { changes, label }];
      return next.length > MAX_HISTORY_ENTRIES ? next.slice(next.length - MAX_HISTORY_ENTRIES) : next;
    });
    setRedoStack([]);
  }, []);

  const applyCellChanges = useCallback(async (changes: CellHistoryChange[], use: "old_value" | "new_value") => {
    const touched_row_ids = new Set(changes.map((c) => c.row_id));

    // Formula maps after the change, for the rows whose formulas it touches.
    const formulas_by_row_id = new Map<string, LinkBuildingOrderRow["cell_formulas"]>();
    for (const change of changes) {
      if ((change.old_formula ?? null) === (change.new_formula ?? null)) continue;
      const base = formulas_by_row_id.has(change.row_id)
        ? formulas_by_row_id.get(change.row_id)
        : rows_ref.current.find((r) => r.id === change.row_id)?.cell_formulas;
      const formula = (use === "old_value" ? change.old_formula : change.new_formula) ?? null;
      formulas_by_row_id.set(change.row_id, withCellFormula(base, change.col_key, formula));
    }

    setRows((prev) =>
      prev.map((row) => {
        if (!touched_row_ids.has(row.id)) return row;
        let next_row = row;
        for (const change of changes) {
          if (change.row_id !== row.id) continue;
          next_row = { ...next_row, [change.col_key]: use === "old_value" ? change.old_value : change.new_value };
        }
        if (formulas_by_row_id.has(row.id)) next_row = { ...next_row, cell_formulas: formulas_by_row_id.get(row.id) ?? null };
        return next_row;
      })
    );

    const fields_by_row_id: Record<string, Partial<Record<keyof LinkBuildingOrderRow, string | null>>> = {};
    changes.forEach((change) => {
      if (new_row_ids_ref.current.has(change.row_id)) return;
      const value = use === "old_value" ? change.old_value : change.new_value;
      fields_by_row_id[change.row_id] = {
        ...(fields_by_row_id[change.row_id] ?? {}),
        [change.col_key]: value === null ? null : String(value),
      };
    });

    const persisted_row_ids = Object.keys(fields_by_row_id);
    if (persisted_row_ids.length === 0) return;

    setIsUndoRedoSaving(true);
    setSaveError(null);
    try {
      const res = await batchUpdateLinkBuildingOrderCells(
        persisted_row_ids.map((id) => ({
          id,
          fields: fields_by_row_id[id],
          ...(formulas_by_row_id.has(id) ? { cell_formulas: formulas_by_row_id.get(id) ?? null } : {}),
        })),
        use === "old_value" ? "undo" : "redo"
      );
      const updated_by_id = new Map(res.data.map((r) => [r.id, r]));
      setRows((prev) => prev.map((r) => updated_by_id.get(r.id) ?? r));
      on_order_mutated_ref.current?.();
      refreshFilterCounts();
    } catch (err) {
      const api_message = parseApiErrorMessage(err, COLUMN_LABELS);
      setSaveError(`Failed to sync the change, please try again: ${api_message}`);
    } finally {
      setIsUndoRedoSaving(false);
    }
  }, [refreshFilterCounts]);

  const undo = useCallback(() => {
    const stack = undo_stack_kbd_ref.current;
    if (stack.length === 0) return;
    const entry = stack[stack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, entry]);
    applyCellChanges(entry.changes, "old_value");
    const n = entry.changes.length;
    setNotificationBanner(`Undid ${n} cell change${n !== 1 ? "s" : ""} (${entry.label}).`);
  }, [applyCellChanges]);

  const redo = useCallback(() => {
    const stack = redo_stack_kbd_ref.current;
    if (stack.length === 0) return;
    const entry = stack[stack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, entry]);
    applyCellChanges(entry.changes, "new_value");
    const n = entry.changes.length;
    setNotificationBanner(`Redid ${n} cell change${n !== 1 ? "s" : ""} (${entry.label}).`);
  }, [applyCellChanges]);

  const openHistoryPanel = useCallback((row_id: string | null = null) => setHistoryPanel({ row_id }), []);
  const closeHistoryPanel = useCallback(() => setHistoryPanel(null), []);
  const showAllHistory = useCallback(() => setHistoryPanel({ row_id: null }), []);

  /**
   * Puts rows restored from the version history into the grid, recreated ones on
   * top. A large restore sends no rows back, the grid reloads them instead.
   */
  const handleHistoryRestored = useCallback((result: LinkBuildingRestoreResult) => {
    if (result.reload_required) {
      reload_rows_ref.current?.();
      setUndoStack([]);
      setRedoStack([]);
      on_order_mutated_ref.current?.();
      refreshFilterCounts();
      setNotificationBanner(result.message);
      return;
    }

    const restored_by_id = new Map(result.data.map((r) => [r.id, r]));
    const known_ids = new Set(rows_ref.current.map((r) => r.id));
    const recreated_rows = result.data.filter((r) => result.recreated_ids.includes(r.id) && !known_ids.has(r.id));

    setRows((prev) => [...recreated_rows, ...prev.map((r) => restored_by_id.get(r.id) ?? r)]);
    if (recreated_rows.length > 0) setTotal((prev) => prev + recreated_rows.length);

    // The undo entries were recorded against the values before the restore, so
    // replaying one now could silently undo the restore. The history keeps them.
    setUndoStack([]);
    setRedoStack([]);

    on_order_mutated_ref.current?.();
    refreshFilterCounts();
    setNotificationBanner(result.message);
  }, [refreshFilterCounts]);

  // ── Editing ─────────────────────────────────────────────────────────────────

  const startEditing = useCallback((row_id: string, col_key: string, entry: CellEditEntry = "edit") => {
    const formula_text = get_cell_formula_text_ref.current({ row_id, col_key });

    if (row_id === SUMMARY_ROW_ID || isFormulaColumnKey(col_key)) {
      // Formula column and totals cells edit their formula in a draft of their own.
      edit_start_value_ref.current = null;
      setComputedCellDraft(entry === "type" ? "" : (formula_text ?? ""));
    } else {
      const row = rows_ref.current.find((r) => r.id === row_id);
      edit_start_value_ref.current = row
        ? {
            row_id,
            col_key,
            old_value: String(row[col_key as keyof LinkBuildingOrderRow] ?? ""),
            old_formula: getCellFormula(row, col_key),
          }
        : null;
      // A formula cell opens on its formula (as seen from its row), not on its result.
      if (row && formula_text !== null && entry === "edit") {
        setRows((prev) => prev.map((r) => (r.id === row_id ? { ...r, [col_key]: formula_text } : r)));
      }
    }
    // Set eagerly so a second key press landing before the next render is not
    // treated as another "start editing" from the grid.
    editing_cell_ref.current = { row_id, col_key };
    setEditEntry(entry);
    setActiveCell({ row_id, col_key });
    setEditingCell({ row_id, col_key });
  }, []);

  /** Returns keyboard focus to the grid so the arrow keys keep working after an edit. */
  const focusGrid = useCallback(() => {
    table_scroll_ref.current?.focus({ preventScroll: true });
  }, []);

  // ── Row windowing ───────────────────────────────────────────────────────────
  // Every matching row is loaded, but only the rows around the viewport are in the
  // DOM. Spacers stand in for the others, so scrolling feels like one long sheet.

  const table_scroll_ref = useRef<HTMLDivElement | null>(null);
  /** The scroll container as state too, so the row window subscribes once it mounts. */
  const [grid_scroll_element, setGridScrollElement] = useState<HTMLDivElement | null>(null);
  const setTableScrollNode = useCallback((node: HTMLDivElement | null) => {
    table_scroll_ref.current = node;
    setGridScrollElement(node);
  }, []);

  const {
    start_index: rendered_start_index,
    end_index: rendered_end_index,
    padding_top: rows_padding_top,
    padding_bottom: rows_padding_bottom,
    scrollRowIntoView,
  } = useVirtualRows({
    scroll_element: grid_scroll_element,
    row_count: filtered_rows.length,
    row_height: GRID_ROW_HEIGHT,
  });
  const rendered_rows = useMemo(
    () => filtered_rows.slice(rendered_start_index, rendered_end_index),
    [filtered_rows, rendered_start_index, rendered_end_index]
  );

  /** Rows that came from the server, unsaved drafts left out, for the loading progress. */
  const loaded_server_row_count = useMemo(
    () => filtered_rows.reduce((count, row) => (new_row_ids_ref.current.has(row.id) ? count : count + 1), 0),
    [filtered_rows]
  );

  // A new result set fades in, but rows scrolled into the window later must not,
  // so the enter animation is only applied for a moment after each new result set.
  const [settled_rows_version, setSettledRowsVersion] = useState(-1);
  useEffect(() => {
    const timer = setTimeout(() => setSettledRowsVersion(rows_version), BODY_ENTER_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [rows_version]);
  const is_body_entering = settled_rows_version !== rows_version;

  /**
   * Scrolls a cell into view, clear of the sticky header and the frozen columns.
   * A cell of a row outside the rendered window is not in the DOM yet: its row is
   * scrolled to first, and the cell is aligned once it has rendered.
   */
  const scrollToCell = useCallback(
    (cell: CellRef) => {
      const alignCell = (attempts_left: number) => {
        const container = table_scroll_ref.current;
        if (!container) return;
        const cell_el = container.querySelector<HTMLElement>(
          `[data-cell-key="${CSS.escape(toCellKey(cell.row_id, cell.col_key))}"]`
        );
        if (!cell_el) {
          const row_idx = row_index_by_id.get(cell.row_id);
          if (row_idx === undefined || attempts_left === 0) return;
          scrollRowIntoView(row_idx);
          requestAnimationFrame(() => alignCell(attempts_left - 1));
          return;
        }
        const header_height = container.querySelector("thead")?.getBoundingClientRect().height ?? 0;
        // The totals row is pinned to the bottom, so data rows must stop above it.
        // The totals row itself is always visible and needs no inset.
        const footer_height =
          cell.row_id === SUMMARY_ROW_ID ? 0 : container.querySelector("tfoot")?.getBoundingClientRect().height ?? 0;
        const is_frozen_column = COLUMNS.some((col) => col.key === cell.col_key && col.sticky);
        scrollCellIntoView(
          container,
          cell_el,
          { top: header_height, left: frozen_columns_width, bottom: footer_height },
          is_frozen_column
        );
      };
      alignCell(3);
    },
    [row_index_by_id, scrollRowIntoView, frozen_columns_width]
  );

  /** Makes a cell the active cell, dropping any range selection, like a plain click in Sheets. */
  const selectCell = useCallback(
    (cell: CellRef, options: { scroll?: boolean } = {}) => {
      setActiveCell(cell);
      setCellRange(null);
      if (!new_row_ids_ref.current.has(cell.row_id)) setSelectedRowId(cell.row_id);
      if (options.scroll) scrollToCell(cell);
    },
    [scrollToCell]
  );

  // ── Find in table (Ctrl/Cmd+F) ───────────────────────────────────────────────
  // Highlights every matching cell of the whole result set instead of filtering
  // rows out like the server side search does, so matches can be compared in context.

  /** Text a cell shows, assignment cells resolve their ids to the displayed names. */
  const getFindCellText = useCallback(
    (row: LinkBuildingOrderRow, col_key: string): string => {
      if (col_key === "user_id") {
        const client = row.user_id != null ? client_user_by_id.get(Number(row.user_id)) : undefined;
        return client ? [client.company, client.name].filter(Boolean).join(" ") : "";
      }
      if (col_key === "assigned_admin_user_id") {
        const admin =
          row.assigned_admin_user_id != null ? admin_user_by_id.get(Number(row.assigned_admin_user_id)) : undefined;
        return admin ? `${admin.name} ${admin.email}` : "";
      }
      // Formula cells are found by the value they show.
      const row_idx = row_index_by_id.get(row.id);
      if (row_idx !== undefined) {
        const formula_column = formula_column_by_key.get(col_key);
        if (formula_column) return getFormulaColumnDisplay(row_idx, formula_column).text;
        const formula_display = getDataCellFormulaDisplay(row_idx, col_key);
        if (formula_display) return formula_display.text;
      }
      return String(row[col_key as keyof LinkBuildingOrderRow] ?? "");
    },
    [client_user_by_id, admin_user_by_id, row_index_by_id, formula_column_by_key, getFormulaColumnDisplay, getDataCellFormulaDisplay]
  );

  const getFindRowId = useCallback((row: LinkBuildingOrderRow) => row.id, []);

  const navigateToFindMatch = useCallback(
    (match: TableFindMatch) => {
      // The match becomes the active cell (so the formula bar shows its full value
      // and the arrow keys continue from it) without stealing focus from the find input.
      setActiveCell(match);
      scrollToCell(match);
    },
    [scrollToCell]
  );

  const {
    is_find_open,
    find_query,
    find_terms,
    find_input_ref,
    matches: find_matches,
    matched_row_ids: find_matched_row_ids,
    current_match_idx: find_current_match_idx,
    setFindQuery,
    openFind,
    closeFind,
    goToNextMatch,
    goToPreviousMatch,
    getCellMatchState,
  } = useTableFind({
    rows: filtered_rows,
    column_keys: grid_column_keys,
    getRowId: getFindRowId,
    getCellText: getFindCellText,
    onNavigateToMatch: navigateToFindMatch,
  });

  const handleCloseFind = useCallback(() => {
    closeFind();
    focusGrid();
  }, [closeFind, focusGrid]);

  // ── Excel-style click and drag-to-select ─────────────────────────────────────
  // Like a spreadsheet, a plain click selects the cell (it becomes the active cell
  // the arrow keys move from) and a double click, Enter, F2 or typing opens it for
  // editing. Moving the pointer to a different cell while the button is held turns
  // the gesture into a rectangular range selection anchored at the clicked cell.

  // ── Point mode: clicking cells while typing a formula ───────────────────────
  // While a formula editor has focus and its caret sits where a reference can go
  // (after "=", an operator, "(" or ","), clicking a cell inserts its address
  // instead of leaving the editor, and dragging turns it into a range, like Sheets.

  const active_formula_editor_ref = useRef<ActiveFormulaEditor | null>(null);
  /** True while a formula editor has focus, the grid then shows a crosshair cursor. */
  const [is_formula_pointing, setIsFormulaPointing] = useState(false);
  const formula_editing_context = useMemo<FormulaEditingContextValue>(
    () => ({
      setActiveEditor: (editor) => {
        active_formula_editor_ref.current = editor;
        setIsFormulaPointing(editor !== null);
      },
    }),
    []
  );
  /** The reference inserted by the last click, replaced while dragging or by the next click. */
  const point_insert_ref = useRef<{
    element: HTMLInputElement;
    start: number;
    end: number;
    text: string;
    anchor: { col_idx: number; row_number: number };
  } | null>(null);
  const point_drag_ref = useRef(false);

  /** Row number of a cell as shown in the gutter, null when its row is not loaded. */
  const getCellRowNumber = useCallback(
    (row_id: string) => {
      const row_idx = row_index_by_id.get(row_id);
      return row_idx === undefined ? null : row_number_offset + row_idx;
    },
    [row_index_by_id, row_number_offset]
  );

  /**
   * Inserts the clicked cell's reference into the formula being typed, when the
   * caret allows it. Returns true when the click was used that way.
   */
  const insertPointedReference = useCallback(
    (row_id: string, col_key: string, e: React.MouseEvent): boolean => {
      const editor = active_formula_editor_ref.current;
      if (!editor || document.activeElement !== editor.element) return false;
      const editing = editing_cell_ref.current;
      if (editing && editing.row_id === row_id && editing.col_key === col_key) return false;

      const col_idx = column_mapper.getColumnIndex(col_key);
      const row_number = getCellRowNumber(row_id);
      if (col_idx === null || row_number === null) return false;

      const text = editor.element.value;
      const caret = editor.element.selectionStart ?? text.length;
      const previous = point_insert_ref.current;
      const replaces_previous =
        !!previous &&
        previous.element === editor.element &&
        caret === previous.end &&
        text.slice(previous.start, previous.end) === previous.text;
      if (!replaces_previous && !canInsertReferenceAt(text, caret)) return false;

      // Keeps focus (and the caret) in the formula editor.
      e.preventDefault();
      const anchor = { col_idx, row_number };
      const reference = toA1Range(anchor, null);
      const start = replaces_previous ? previous!.start : caret;
      const end = replaces_previous ? previous!.end : caret;
      editor.setText(text.slice(0, start) + reference + text.slice(end), start + reference.length);
      point_insert_ref.current = { element: editor.element, start, end: start + reference.length, text: reference, anchor };
      point_drag_ref.current = true;
      return true;
    },
    [column_mapper, getCellRowNumber]
  );

  /** Dragging after a pointed click grows the inserted reference into a range. */
  const extendPointedReference = useCallback(
    (row_id: string, col_key: string): boolean => {
      const point = point_insert_ref.current;
      const editor = active_formula_editor_ref.current;
      if (!point_drag_ref.current || !point || !editor || editor.element !== point.element) return false;
      const col_idx = column_mapper.getColumnIndex(col_key);
      const row_number = getCellRowNumber(row_id);
      if (col_idx === null || row_number === null) return true;

      const reference = toA1Range(point.anchor, { col_idx, row_number });
      const text = editor.element.value;
      editor.setText(text.slice(0, point.start) + reference + text.slice(point.end), point.start + reference.length);
      point_insert_ref.current = { ...point, end: point.start + reference.length, text: reference };
      return true;
    },
    [column_mapper, getCellRowNumber]
  );

  /** Clicking a column letter while typing a formula inserts the whole column, e.g. "S:S". */
  const skip_letter_click_ref = useRef(false);
  const insertPointedColumn = useCallback(
    (col_key: string, e: React.MouseEvent): boolean => {
      const editor = active_formula_editor_ref.current;
      if (!editor || document.activeElement !== editor.element) return false;
      const text = editor.element.value;
      const caret = editor.element.selectionStart ?? text.length;
      if (!canInsertReferenceAt(text, caret)) return false;
      e.preventDefault();
      const letter = getColumnLetter(col_key);
      const reference = `${letter}:${letter}`;
      editor.setText(text.slice(0, caret) + reference + text.slice(caret), caret + reference.length);
      point_insert_ref.current = null;
      return true;
    },
    [getColumnLetter]
  );

  const handleCellMouseDown = useCallback((row_id: string, col_key: string, e: React.MouseEvent) => {
    if (insertPointedReference(row_id, col_key, e)) return;
    const shift_key = e.shiftKey;
    // Shift+Click extends the range from an existing anchor (an already active
    // range, the cell being edited, or the active cell), falling back to a fresh
    // one-cell range only when none exists yet. A discrete action, not a drag.
    if (shift_key) {
      const existing_range_anchor = cell_range_kbd_ref.current?.anchor;
      const editing_anchor = editing_cell_ref.current
        ? { row_id: editing_cell_ref.current.row_id, col_key: editing_cell_ref.current.col_key }
        : null;
      const anchor = existing_range_anchor ?? editing_anchor ?? active_cell_kbd_ref.current ?? { row_id, col_key };

      setEditingCell(null);
      setActiveCell(anchor);
      setCellRange({ anchor, focus: { row_id, col_key } });
      return;
    }
    selectCell({ row_id, col_key });
    range_mouse_down_ref.current = { row_id, col_key };
    range_dragged_ref.current = false;
  }, [selectCell, insertPointedReference]);

  const handleCellMouseEnter = useCallback((row_id: string, col_key: string) => {
    if (extendPointedReference(row_id, col_key)) return;
    const start = range_mouse_down_ref.current;
    if (!start) return;
    const is_origin_cell = start.row_id === row_id && start.col_key === col_key;
    // Ignore the very first mouseenter (re-entering the origin cell before any
    // movement) so a plain click never flashes a one-cell range. Once an actual
    // drag is underway, moving back over the origin correctly shrinks it to 1×1.
    if (is_origin_cell && !range_dragged_ref.current) return;
    range_dragged_ref.current = true;
    setCellRange({ anchor: start, focus: { row_id, col_key } });
    if (editing_cell_ref.current) setEditingCell(null);
  }, [extendPointedReference]);

  const handleCellMouseUp = useCallback(() => {
    const start = range_mouse_down_ref.current;
    range_mouse_down_ref.current = null;
    if (!start) return;
    // A click without movement already selected the cell on mouse down, so only
    // the drag bookkeeping needs resetting here.
    range_dragged_ref.current = false;
  }, []);

  /**
   * Turns the text entered into a data cell into the row to save. Text starting
   * with "=" becomes the cell's formula (stored by column key and row offset) and
   * the column gets its result. Plain text replaces the value and drops a formula
   * the cell had. The row's other formula cells are recalculated, so a formula
   * reading the edited cell is saved with its new result in the same request.
   */
  const resolveCellInput = useCallback(
    (row: LinkBuildingOrderRow, col_key: string, text: string): { row: LinkBuildingOrderRow } | { error: string } => {
      const label = COLUMN_LABELS[col_key] ?? col_key;
      const is_formula = isFormulaText(text);
      if (is_formula && !FORMULA_CELL_COLUMN_KEYS.has(col_key)) {
        return {
          error: `${label} cannot hold a formula. Formulas work in text, number and date columns, or add a formula column with the fx button.`,
        };
      }

      const rows_now = rows_ref.current;
      const row_idx = rows_now.findIndex((r) => r.id === row.id);
      let next_row: LinkBuildingOrderRow;
      if (is_formula) {
        const stored = toStoredFormula(text.trim(), row_number_offset_ref.current + row_idx, column_mapper_ref.current);
        next_row = { ...row, cell_formulas: withCellFormula(row.cell_formulas, col_key, stored) };
      } else {
        next_row = {
          ...row,
          [col_key]: text,
          cell_formulas: getCellFormula(row, col_key) ? withCellFormula(row.cell_formulas, col_key, null) : row.cell_formulas,
        };
      }

      const next_rows = rows_now.map((r) => (r.id === row.id ? next_row : r));
      const recalculated = buildOrdersSheet(next_rows, sheet_config_ref.current);
      const stale_cells = collectStaleFormulaCells(next_rows, recalculated, SHEET_KIND_BY_KEY, (r) => r.id === row.id);
      stale_cells.forEach((stale) => {
        next_row = { ...next_row, [stale.col_key]: stale.value };
      });
      // A typed price gets the currency symbol ("150" is saved as "$150.00"), and a
      // new currency updates the symbol of the row's prices.
      return { row: withFormattedPrices(next_row) };
    },
    []
  );

  /**
   * Commits text entered into a data cell (inline or in the formula bar): resolves
   * a formula, records the undo entry and saves the row. `start` is the cell as it
   * was before the edit.
   */
  const applyDataCellInput = useCallback(
    (row: LinkBuildingOrderRow, col_key: string, text: string, start: CellEditSnapshot | null) => {
      const is_draft_row = new_row_ids_ref.current.has(row.id);
      const restore = () => {
        if (!start) return;
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [col_key]: start.old_value } : r)));
      };

      const resolved = resolveCellInput(row, col_key, text);
      if ("error" in resolved) {
        setSaveError(resolved.error);
        restore();
        return;
      }

      const next_row = resolved.row;
      if (col_key === "order_id" && !is_draft_row) {
        const trimmed = next_row.order_id.trim();
        if (trimmed !== "" && !ORDER_ID_PATTERN.test(trimmed)) {
          setSaveError(`Invalid Order ID "${trimmed}" — must follow the format BL-<number> (e.g. BL-25143).`);
          return;
        }
      }

      setRows((prev) => {
        const updated = prev.map((r) => (r.id === row.id ? next_row : r));
        if (is_draft_row) saveDraftsToStorage(updated.filter((r) => new_row_ids_ref.current.has(r.id)));
        return updated;
      });

      if (is_draft_row) {
        persistNewRow(next_row);
        return;
      }

      const new_value = String(next_row[col_key as keyof LinkBuildingOrderRow] ?? "");
      const new_formula = getCellFormula(next_row, col_key);
      const is_same_cell = !!start && start.row_id === row.id && start.col_key === col_key;
      const value_changed = is_same_cell && (start!.old_value !== new_value || start!.old_formula !== new_formula);
      if (value_changed) {
        pushHistoryEntry(
          [
            {
              row_id: row.id,
              col_key: col_key as keyof LinkBuildingOrderRow,
              old_value: start!.old_value,
              new_value,
              ...(start!.old_formula !== new_formula ? { old_formula: start!.old_formula, new_formula } : {}),
            },
          ],
          new_formula ? "formula" : "cell edit"
        );
      }
      persistRowUpdate(next_row, col_key, value_changed);
    },
    [resolveCellInput, persistNewRow, persistRowUpdate, pushHistoryEntry]
  );

  const stopEditing = useCallback(() => {
    const cell = editing_cell_ref.current;
    if (!cell || cell.row_id === SUMMARY_ROW_ID || isFormulaColumnKey(cell.col_key)) return;
    // Cleared eagerly so the input's blur, which can fire while the grid takes
    // focus back in this same tick, does not persist the row a second time.
    editing_cell_ref.current = null;
    setEditingCell(null);

    const row = rows_ref.current.find((r) => r.id === cell.row_id);
    if (!row) return;

    const edit_start = edit_start_value_ref.current;
    edit_start_value_ref.current = null;
    applyDataCellInput(row, cell.col_key, String(row[cell.col_key as keyof LinkBuildingOrderRow] ?? ""), edit_start);
  }, [applyDataCellInput]);

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

  /** Escape while editing: puts the original value back and leaves the cell selected, nothing is saved. */
  const cancelEditing = useCallback(() => {
    const cell = editing_cell_ref.current;
    if (!cell) return;
    const edit_start = edit_start_value_ref.current;
    editing_cell_ref.current = null;
    edit_start_value_ref.current = null;
    setEditingCell(null);

    if (edit_start && edit_start.row_id === cell.row_id && edit_start.col_key === cell.col_key) {
      updateCell(cell.row_id, cell.col_key as keyof LinkBuildingOrderRow, edit_start.old_value);
    }
    focusGrid();
  }, [updateCell, focusGrid]);

  /** Converts a cell reference to its grid position, or null when it is not on screen. */
  const toGridPosition = useCallback(
    (cell: CellRef): GridPosition | null => {
      const row_idx = filtered_rows.findIndex((r) => r.id === cell.row_id);
      const col_idx = grid_column_keys.indexOf(cell.col_key);
      return row_idx === -1 || col_idx === -1 ? null : { row_idx, col_idx };
    },
    [filtered_rows, grid_column_keys]
  );

  const toCellRef = useCallback(
    (position: GridPosition): CellRef => ({
      row_id: filtered_rows[position.row_idx].id,
      col_key: grid_column_keys[position.col_idx],
    }),
    [filtered_rows, grid_column_keys]
  );

  /** Moves the active cell after an edit is committed with Enter, Tab or an arrow key. */
  const show_summary_row = is_summary_row_visible && filtered_rows.length > 0;

  /** Selects a cell of the totals row under the table. */
  const selectSummaryCell = useCallback(
    (col_key: string) => {
      const cell = { row_id: SUMMARY_ROW_ID, col_key };
      setActiveCell(cell);
      setCellRange(null);
      scrollToCell(cell);
    },
    [scrollToCell]
  );

  const navigateCell = useCallback(
    (row_id: string, col_key: string, direction: CellNavDirection) => {
      if (row_id === SUMMARY_ROW_ID) {
        // The totals row is a row of its own: up goes back to the last row, left and right move along it.
        const col_idx = grid_column_keys.indexOf(col_key);
        if (direction === "up" && filtered_rows.length > 0) {
          selectCell(toCellRef({ row_idx: filtered_rows.length - 1, col_idx: Math.max(0, col_idx) }), { scroll: true });
        } else if (direction !== "down") {
          const step = direction === "left" || direction === "prev" ? -1 : 1;
          const next_key = grid_column_keys[Math.min(Math.max(col_idx + step, 0), grid_column_keys.length - 1)];
          if (next_key) selectSummaryCell(next_key);
        }
        focusGrid();
        return;
      }

      const position = toGridPosition({ row_id, col_key });
      if (!position) return;
      const size = { row_count: filtered_rows.length, col_count: grid_column_keys.length };
      if (direction === "down" && show_summary_row && position.row_idx === size.row_count - 1) {
        selectSummaryCell(col_key);
        focusGrid();
        return;
      }
      const next_position =
        direction === "next" || direction === "prev"
          ? getTabPosition(position, direction === "prev", size)
          : moveGridPosition(position, direction, size);

      selectCell(toCellRef(next_position), { scroll: true });
      focusGrid();
    },
    [filtered_rows.length, grid_column_keys, toGridPosition, toCellRef, selectCell, focusGrid, show_summary_row, selectSummaryCell]
  );

  /**
   * Saves a formula typed into a formula column cell (it becomes the column's
   * formula on every row) or a totals cell (an empty text clears it).
   */
  const saveComputedCellText = useCallback(
    async (cell: CellRef, raw_text: string) => {
      const text = raw_text.trim();
      const current_text = (getCellFormulaText(cell) ?? "").trim();
      if (text === current_text) return;

      if (cell.row_id === SUMMARY_ROW_ID) {
        if (text !== "" && !isFormulaText(text)) {
          setSaveError('A totals cell holds a formula, for example =SUM(AA:AA). Start it with "=".');
          return;
        }
        const stored = text === "" ? null : toStoredFormula(text, row_number_offset + filtered_rows.length, column_mapper);
        const label = COLUMN_LABELS[cell.col_key] ?? ASSIGNMENT_COLUMN_LABELS[cell.col_key] ?? formula_column_by_key.get(cell.col_key)?.name ?? cell.col_key;
        try {
          await saveSummaryFormula(cell.col_key, stored);
          setNotificationBanner(stored ? `Totals cell under "${label}" saved for the whole team.` : `Totals cell under "${label}" cleared.`);
        } catch (err) {
          setSaveError(`The totals cell could not be saved: ${parseApiErrorMessage(err)}`);
        }
        return;
      }

      const column = formula_column_by_key.get(cell.col_key);
      const row_idx = row_index_by_id.get(cell.row_id);
      if (!column || row_idx === undefined) return;
      if (!isFormulaText(text)) {
        setSaveError(
          `"${column.name}" is a formula column, every cell shows the result of the same formula. Type a formula that starts with "=", or delete the column from its header.`
        );
        return;
      }
      const stored = toStoredFormula(text, row_number_offset + row_idx, column_mapper);
      try {
        await updateFormulaColumn(column.id, { formula: stored });
        setNotificationBanner(`"${column.name}" now uses the new formula on every row.`);
      } catch (err) {
        setSaveError(`The formula of "${column.name}" could not be saved: ${parseApiErrorMessage(err)}`);
      }
    },
    [getCellFormulaText, row_number_offset, filtered_rows.length, column_mapper, formula_column_by_key, row_index_by_id, saveSummaryFormula, updateFormulaColumn]
  );

  /** Enter, Tab or a click away on a formula column cell or totals cell being edited. */
  const commitComputedCell = useCallback(
    (direction: CellNavDirection | null) => {
      const cell = editing_cell_ref.current;
      if (!cell || !(cell.row_id === SUMMARY_ROW_ID || isFormulaColumnKey(cell.col_key))) return;
      editing_cell_ref.current = null;
      setEditingCell(null);
      saveComputedCellText(cell, computed_cell_draft_ref.current);
      if (direction) navigateCell(cell.row_id, cell.col_key, direction);
    },
    [saveComputedCellText, navigateCell]
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
      if (new_rows[0]) startEditing(new_rows[0].id, "client");
    }, 50);
  }, [startEditing]);

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
      refreshFilterCounts();
    } catch {
      setSaveError("Failed to delete row. Please try again.");
    } finally {
      unmarkSaving(row_id);
    }
  }, [refreshFilterCounts]);

  // ── Assign user ─────────────────────────────────────────────────────────────

  const handleAssignUserChange = useCallback((row_id: string, str_value: string) => {
    const numeric_val: number | null = str_value === "" ? null : Number(str_value);

    const base_row = rows_ref.current.find((r) => r.id === row_id);
    if (!base_row) return;

    const updated_row: LinkBuildingOrderRow = { ...base_row, assigned_admin_user_id: numeric_val };

    setRows((prev) => prev.map((r) => (r.id === row_id ? updated_row : r)));
    setEditingCell(null);
    focusGrid();

    if (new_row_ids_ref.current.has(row_id)) {
      persistNewRow(updated_row);
    } else {
      if (base_row.assigned_admin_user_id !== numeric_val) {
        pushHistoryEntry(
          [{ row_id, col_key: "assigned_admin_user_id", old_value: base_row.assigned_admin_user_id ?? null, new_value: numeric_val }],
          "assign to"
        );
      }
      persistRowUpdate(updated_row, "assigned_admin_user_id");
    }
  }, [persistNewRow, persistRowUpdate, pushHistoryEntry, focusGrid]);

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
    focusGrid();

    if (new_row_ids_ref.current.has(row_id)) {
      persistNewRow(updated_row);
    } else {
      if (base_row.user_id !== numeric_val) {
        pushHistoryEntry(
          [{ row_id, col_key: "user_id", old_value: base_row.user_id ?? null, new_value: numeric_val }],
          "client account assign"
        );
      }
      persistRowUpdate(updated_row, "user_id");
    }
  }, [persistNewRow, persistRowUpdate, pushHistoryEntry, focusGrid]);

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
    needs_approval_filter ||
    hidden_columns.size > 0 ||
    active_sheet_filter_count > 0 ||
    hasAdvancedFilterRules(advanced_filters) ||
    sort_is_non_default;

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setClientFilter("");
    setLinkTypeFilter("");
    setClientAccountFilter(null);
    setAssignedUserIdFilter(null);
    setNeedsApprovalFilter(false);
    setHiddenColumns(new Set());
    setAppliedSavedFilterId(null);
    clearAllSheetFilters();
    advanced_filter_actions.clearAll();
    clearSort();
  }, [clearAllSheetFilters, advanced_filter_actions, clearSort]);

  // ── Saved filters ───────────────────────────────────────────────────────────

  /** Everything that shapes the current view, in the shape saved filters store. */
  const current_filter_state = useMemo<LinkBuildingOrderFilterState>(
    () => ({
      search,
      status: status_filter,
      link_type: link_type_filter,
      client: client_filter,
      client_user_id: client_account_filter,
      assigned_user_id: assigned_user_id_filter,
      needs_lb_tl_approval: needs_approval_filter,
      sort_rules,
      sheet_filters,
      hidden_columns: Array.from(hidden_columns),
      advanced_filters,
    }),
    [
      search,
      status_filter,
      link_type_filter,
      client_filter,
      client_account_filter,
      assigned_user_id_filter,
      needs_approval_filter,
      sort_rules,
      sheet_filters,
      hidden_columns,
      advanced_filters,
    ]
  );

  /** Replaces the whole view with a saved filter, the same way "Clear All" resets it. */
  const applySavedFilter = useCallback(
    (state: LinkBuildingOrderFilterState) => {
      const next = normalizeFilterState(state, VIEW_COLUMN_KEYS);
      setSearch(next.search);
      // "Needs LB TL Approval" already implies status = Live, see toggleNeedsApprovalFilter.
      setStatusFilter(next.needs_lb_tl_approval ? "" : next.status);
      setLinkTypeFilter(next.link_type);
      setClientFilter(next.client);
      setClientAccountFilter(next.client_user_id);
      setAssignedUserIdFilter(next.assigned_user_id);
      setNeedsApprovalFilter(next.needs_lb_tl_approval);
      setHiddenColumns(new Set(next.hidden_columns));
      replaceSheetFilters(next.sheet_filters);
      replaceAdvancedFilters(next.advanced_filters);
      replaceSort(next.sort_rules);
    },
    [replaceSheetFilters, replaceAdvancedFilters, replaceSort]
  );

  // ── Auto saved view (per user) ──────────────────────────────────────────────

  /** Serialized view last stored on the server, used to skip saves that change nothing. */
  const last_saved_view_ref = useRef<string | null>(null);
  /** Sends the pending save right away, so a change made just before leaving is not lost. */
  const flush_view_save_ref = useRef<(() => void) | null>(null);

  // Restores the view this user had last time, before the first fetch.
  useEffect(() => {
    let is_cancelled = false;
    getFilterPreference()
      .then((preference) => {
        if (is_cancelled) return;
        if (preference.filters) {
          const restored = toRestoredViewState(
            normalizeFilterState(preference.filters, VIEW_COLUMN_KEYS),
            preference.applied_saved_filter_id
          );
          awaiting_restored_text_ref.current =
            restored.search !== "" ||
            restored.client !== "" ||
            toAdvancedFiltersPayload(restored.advanced_filters) !== undefined;
          applySavedFilter(restored);
          setAppliedSavedFilterId(preference.applied_saved_filter_id);
        }
        setIsViewRestored(true);
      })
      .catch(() => {
        // Non-critical, the table falls back to its default view.
        if (!is_cancelled) setIsViewRestored(true);
      });
    return () => {
      is_cancelled = true;
    };
  }, [applySavedFilter]);

  // Saves the view to the user's account a moment after it stops changing.
  useEffect(() => {
    flush_view_save_ref.current = null;
    if (!is_view_restored) return;

    const view_key = JSON.stringify([serializeFilterState(current_filter_state), applied_saved_filter_id]);
    // The first run after restoring is the restored view itself, nothing new to save.
    if (last_saved_view_ref.current === null) {
      last_saved_view_ref.current = view_key;
      return;
    }
    if (view_key === last_saved_view_ref.current) return;

    const save = () => {
      flush_view_save_ref.current = null;
      saveFilterPreference({ filters: current_filter_state, applied_saved_filter_id })
        .then(() => {
          last_saved_view_ref.current = view_key;
        })
        .catch(() => {/* non-critical, retried on the next change */ });
    };
    flush_view_save_ref.current = save;
    const timer = setTimeout(save, VIEW_AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [is_view_restored, current_filter_state, applied_saved_filter_id]);

  // Declared after the save effect so its cleanup runs last and can still flush.
  useEffect(() => () => flush_view_save_ref.current?.(), []);

  const setColumnsHidden = useCallback((col_keys: string[], is_hidden: boolean) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      col_keys.forEach((col_key) => (is_hidden ? next.add(col_key) : next.delete(col_key)));
      return next;
    });
  }, []);

  /** Clears every filter chip (toolbar and column filters) but keeps the sort and hidden columns. */
  const clearFilterChips = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setClientFilter("");
    setLinkTypeFilter("");
    setClientAccountFilter(null);
    setAssignedUserIdFilter(null);
    setNeedsApprovalFilter(false);
    clearAllSheetFilters();
    advanced_filter_actions.clearAll();
  }, [clearAllSheetFilters, advanced_filter_actions]);

  const toggleNeedsApprovalFilter = useCallback(() => {
    setNeedsApprovalFilter((prev) => {
      const next = !prev;
      // The "Needs LB TL Approval" toggle already implies status = Live, so clear
      // any conflicting status dropdown selection to avoid an impossible AND.
      if (next) setStatusFilter("");
      return next;
    });
  }, []);

  const openSpecialFilter = useCallback((filter_key: "client_account" | "assigned_to", anchor_el: HTMLElement) => {
    setOpenSpecialFilter(filter_key);
    setSpecialFilterAnchorEl(anchor_el);
  }, []);

  /** Header funnel of Client Account and Assigned To: opens its picker, or closes it when already open. */
  const toggleSpecialFilter = useCallback(
    (filter_key: "client_account" | "assigned_to", anchor_el: HTMLElement) => {
      if (open_special_filter === filter_key) {
        setOpenSpecialFilter(null);
        setSpecialFilterAnchorEl(null);
      } else {
        openSpecialFilter(filter_key, anchor_el);
      }
    },
    [open_special_filter, openSpecialFilter]
  );

  const search_input_ref = useRef<HTMLInputElement>(null);

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

  // ── Copy entire column (e.g. all domains, for pasting into Ahrefs) ─────────

  const handleCopyColumn = useCallback(async (col_key: keyof LinkBuildingOrderRow) => {
    setCopyingColumnKey(col_key);
    setSaveError(null);
    try {
      // Once every matching row is in the grid the copy reads them directly, with no
      // row limit and exactly the values on screen. While rows are still arriving the
      // server lists them instead.
      const values = is_loading_more_rows
        ? await getLinkBuildingOrderColumnValues(
            col_key,
            current_body_ref.current,
            selected_row_ids.size > 0 ? Array.from(selected_row_ids) : undefined
          )
        : rows_ref.current
            .filter(
              (row) =>
                !new_row_ids_ref.current.has(row.id) && (selected_row_ids.size === 0 || selected_row_ids.has(row.id))
            )
            .map((row) => String(row[col_key] ?? ""))
            .filter((value) => value.trim() !== "");
      await navigator.clipboard.writeText(values.join("\n"));

      const col_label = COLUMNS.find((c) => c.key === col_key)?.label ?? String(col_key);
      const scope = selected_row_ids.size > 0 ? `${selected_row_ids.size} selected row${selected_row_ids.size !== 1 ? "s" : ""}` : "the current filters";
      setNotificationBanner(
        values.length > 0
          ? `Copied ${values.length} value${values.length !== 1 ? "s" : ""} from "${col_label}" (${scope}) to the clipboard.`
          : `No values to copy from "${col_label}".`
      );
    } catch {
      setSaveError("Failed to copy column values. Please try again.");
    } finally {
      setCopyingColumnKey(null);
    }
  }, [selected_row_ids, is_loading_more_rows]);

  // ── Spreadsheet style column filter menu ───────────────────────────────────

  const open_filter_column_def = open_filter_col
    ? COLUMNS.find((c) => c.key === open_filter_col)
    : undefined;

  const toggleColumnFilter = useCallback(
    (col_key: keyof LinkBuildingOrderRow, anchor_el: HTMLElement) => {
      if (open_filter_col === col_key && filter_anchor_el === anchor_el) {
        setOpenFilterCol(null);
        setFilterAnchorEl(null);
        return;
      }
      setOpenFilterCol(col_key);
      setFilterAnchorEl(anchor_el);
    },
    [open_filter_col, filter_anchor_el]
  );

  const closeColumnFilter = useCallback(() => {
    setOpenFilterCol(null);
    setFilterAnchorEl(null);
  }, []);

  // Stable per open column so the menu only refetches when its search text changes.
  // The backend ignores this column's own filter, so its values can be re-checked.
  const loadFilterValues = useCallback(
    (value_search: string) =>
      getLinkBuildingOrderFilterValues(
        open_filter_col ?? "order_id",
        current_body_ref.current,
        value_search
      ),
    [open_filter_col]
  );

  // ── Active filter chips ─────────────────────────────────────────────────────

  // ── Quick filters ───────────────────────────────────────────────────────────

  const quick_filter_values = useQuickFilterValues(QUICK_FILTER_COLUMN_KEYS, search_body, is_filter_panel_open);

  // The panel's search filters the loaded values right away. Columns that only list
  // their top values (Company, with every client name) are also searched on the
  // server, so a client past the top ones can still be found and picked.
  const [quick_filter_query, setQuickFilterQuery] = useState("");
  const debounced_quick_filter_query = useDebounce(quick_filter_query.trim(), 300);
  const server_search_column_keys = useMemo(
    () => getServerSearchColumnKeys(QUICK_FILTER_COLUMNS, quick_filter_values.values_by_column, debounced_quick_filter_query),
    [quick_filter_values.values_by_column, debounced_quick_filter_query]
  );
  const quick_filter_search_values = useQuickFilterValues(
    server_search_column_keys,
    search_body,
    is_filter_panel_open && !is_advanced_filter_mode && server_search_column_keys.length > 0,
    debounced_quick_filter_query
  );
  // Checks the live text too, so clearing the search shows every value again without waiting for the debounce.
  const is_quick_filter_search_active = server_search_column_keys.length > 0 && quick_filter_query.trim() !== "";

  /** Values picked in the Quick filters panel, per column. */
  const quick_filter_selections = useMemo(() => {
    const selections: Partial<Record<string, string[]>> = {};
    QUICK_FILTER_COLUMNS.forEach((column) => {
      if (column.key === ASSIGNED_USER_QUICK_FILTER_KEY) {
        selections[column.key] = assigned_user_id_filter === null ? [] : [String(assigned_user_id_filter)];
        return;
      }
      if (column.key === CLIENT_ACCOUNT_QUICK_FILTER_KEY) {
        selections[column.key] = client_account_filter === null ? [] : [String(client_account_filter)];
        return;
      }
      const values = sheet_filters[column.key]?.values;
      selections[column.key] = values?.mode === "include" ? values.values : [];
    });
    return selections;
  }, [sheet_filters, assigned_user_id_filter, client_account_filter]);

  /** Client accounts as the Client Account column shows them: by company, else by contact name. */
  const quick_filter_client_users = useMemo(
    () => client_users.map((client) => ({ id: client.id, name: client.company || client.name, avatar_url: client.avatar_url })),
    [client_users]
  );

  const quick_filter_facets = useMemo(
    () =>
      buildQuickFilterFacets({
        columns: QUICK_FILTER_COLUMNS,
        values_by_column: is_quick_filter_search_active
          ? { ...quick_filter_values.values_by_column, ...quick_filter_search_values.values_by_column }
          : quick_filter_values.values_by_column,
        selections: quick_filter_selections,
        users: admin_users,
        client_users: quick_filter_client_users,
        current_user_id: typeof user?.id === "number" ? user.id : null,
      }),
    [
      quick_filter_values.values_by_column,
      quick_filter_search_values.values_by_column,
      is_quick_filter_search_active,
      quick_filter_selections,
      admin_users,
      quick_filter_client_users,
      user,
    ]
  );

  /**
   * Picks or unpicks a value. Regular columns store the picks as their "Filter by
   * values" selection (keeping any condition already set on the column), and
   * Assigned To and Client Account use their own single person filters.
   */
  const toggleQuickFilterOption = useCallback(
    (key: string, value: string) => {
      if (key === ASSIGNED_USER_QUICK_FILTER_KEY) {
        const user_id = Number(value);
        setAssignedUserIdFilter((prev) => (prev === user_id ? null : user_id));
        return;
      }
      if (key === CLIENT_ACCOUNT_QUICK_FILTER_KEY) {
        const user_id = Number(value);
        setClientAccountFilter((prev) => (prev === user_id ? null : user_id));
        return;
      }
      const current = sheet_filters[key];
      const picked = current?.values?.mode === "include" ? current.values.values : [];
      const next_values = toggleQuickFilterValue(picked, value);
      setSheetFilter(key, {
        condition: current?.condition ?? null,
        values: next_values.length > 0 ? { mode: "include", values: next_values } : null,
      });
    },
    [sheet_filters, setSheetFilter]
  );

  const clearQuickFilterColumn = useCallback(
    (key: string) => {
      if (key === ASSIGNED_USER_QUICK_FILTER_KEY) {
        setAssignedUserIdFilter(null);
        return;
      }
      if (key === CLIENT_ACCOUNT_QUICK_FILTER_KEY) {
        setClientAccountFilter(null);
        return;
      }
      const current = sheet_filters[key];
      setSheetFilter(key, { condition: current?.condition ?? null, values: null });
    },
    [sheet_filters, setSheetFilter]
  );

  // Filters set from the panel, shown on its button: column filters, Assigned To, Client Account and active advanced rules.
  const quick_pick_count =
    active_sheet_filter_count + (assigned_user_id_filter !== null ? 1 : 0) + (client_account_filter !== null ? 1 : 0);
  const advanced_rule_count = countActiveAdvancedRules(advanced_filters);
  const panel_filter_count = quick_pick_count + advanced_rule_count;
  const filter_panel_footer_note = is_advanced_filter_mode
    ? quick_pick_count > 0
      ? "Quick filters and column filters are also applied."
      : null
    : advanced_rule_count > 0
      ? `${advanced_rule_count} advanced ${advanced_rule_count === 1 ? "filter is" : "filters are"} also applied.`
      : null;

  /**
   * Values listed by the Advanced filters "is" picker. The other filters are not
   * sent, so a rule joined with "or" can still pick values they currently hide.
   */
  const loadAdvancedFilterValues = useCallback(async (key: string, value_search: string) => {
    const response = await getLinkBuildingOrderFilterValues(key as keyof LinkBuildingOrderRow, {}, value_search, 200);
    return response.data.map((item) => item.value);
  }, []);

  const active_filter_chips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (search.trim()) {
      chips.push({
        key: "search",
        label: "Search",
        description: `"${search.trim()}"`,
        remove_label: "Remove the search",
        kind: "quick",
        onEdit: () => search_input_ref.current?.focus(),
        onRemove: () => setSearch(""),
      });
    }
    if (needs_approval_filter) {
      chips.push({
        key: "needs_approval",
        label: "Status",
        description: "Live, needs LB TL Approval",
        remove_label: "Remove the Needs LB TL Approval filter",
        kind: "quick",
        onRemove: () => setNeedsApprovalFilter(false),
      });
    } else if (status_filter) {
      chips.push({
        key: "status",
        label: "Status",
        description: status_filter,
        remove_label: "Remove the Status quick filter",
        kind: "quick",
        onRemove: () => setStatusFilter(""),
      });
    }
    if (link_type_filter) {
      chips.push({
        key: "link_type",
        label: "Link Type",
        description: link_type_filter,
        remove_label: "Remove the Link Type quick filter",
        kind: "quick",
        onRemove: () => setLinkTypeFilter(""),
      });
    }
    if (client_filter.trim()) {
      chips.push({
        key: "company",
        label: "Company",
        description: `contains "${client_filter.trim()}"`,
        remove_label: "Remove the Company quick filter",
        kind: "quick",
        onRemove: () => setClientFilter(""),
      });
    }
    if (client_account_filter !== null) {
      const client_user = client_users.find((u) => u.id === client_account_filter);
      chips.push({
        key: "client_account",
        label: "Client Account",
        description: client_user ? client_user.company || client_user.name : `#${client_account_filter}`,
        remove_label: "Remove the Client Account filter",
        kind: "quick",
        onEdit: (anchor_el) => openSpecialFilter("client_account", anchor_el),
        onRemove: () => setClientAccountFilter(null),
      });
    }
    if (assigned_user_id_filter !== null) {
      const admin_user = admin_users.find((u) => u.id === assigned_user_id_filter);
      chips.push({
        key: "assigned_to",
        label: "Assigned To",
        description:
          assigned_user_id_filter === 0 ? "Unassigned" : admin_user ? admin_user.name : `#${assigned_user_id_filter}`,
        remove_label: "Remove the Assigned To filter",
        kind: "quick",
        onEdit: (anchor_el) => openSpecialFilter("assigned_to", anchor_el),
        onRemove: () => setAssignedUserIdFilter(null),
      });
    }
    // One chip per filtered column (hidden columns included), so filters spread
    // across several columns stay visible and easy to edit or remove.
    COLUMNS.filter((col) => isSheetFilterActive(sheet_filters[col.key])).forEach((col) => {
      chips.push({
        key: `column_${col.key}`,
        label: col.label,
        description: describeSheetFilter(sheet_filters[col.key]!),
        remove_label: `Remove the ${col.label} filter`,
        kind: "column",
        onEdit: (anchor_el) => toggleColumnFilter(col.key, anchor_el),
        onRemove: () => clearSheetFilter(col.key),
      });
    });
    // Advanced filters joined with "and" narrow the table one by one, so each rule
    // and group gets its own chip. Joined with "or" they only make sense together,
    // so they are summed up in a single chip.
    const openAdvancedFilters = () => {
      setIsAdvancedFilterMode(true);
      setIsFilterPanelOpen(true);
    };
    if (advanced_filters.operator === "and") {
      advanced_filters.rules.filter(isAdvancedRuleActive).forEach((rule) => {
        const label = getAdvancedColumnLabel(rule.key, ADVANCED_FILTER_COLUMNS);
        chips.push({
          key: `advanced_${rule.id}`,
          label,
          description: describeAdvancedRuleCondition(rule, ADVANCED_FILTER_COLUMNS),
          remove_label: `Remove the ${label} advanced filter`,
          kind: "advanced",
          onEdit: openAdvancedFilters,
          onRemove: () => advanced_filter_actions.removeRule(rule.id),
        });
      });
      advanced_filters.groups.forEach((group) => {
        const description = describeAdvancedGroup(group, ADVANCED_FILTER_COLUMNS);
        if (description === "") return;
        chips.push({
          key: `advanced_${group.id}`,
          label: "Group",
          description,
          remove_label: "Remove this condition group",
          kind: "advanced",
          onEdit: openAdvancedFilters,
          onRemove: () => advanced_filter_actions.removeGroup(group.id),
        });
      });
    } else {
      const description = describeAdvancedFilters(advanced_filters, ADVANCED_FILTER_COLUMNS);
      if (description !== "") {
        chips.push({
          key: "advanced_any",
          label: "Any of",
          description,
          remove_label: "Remove the advanced filters",
          kind: "advanced",
          onEdit: openAdvancedFilters,
          onRemove: advanced_filter_actions.clearAll,
        });
      }
    }
    return chips;
  }, [
    search,
    needs_approval_filter,
    status_filter,
    link_type_filter,
    client_filter,
    client_account_filter,
    assigned_user_id_filter,
    client_users,
    admin_users,
    sheet_filters,
    advanced_filters,
    advanced_filter_actions,
    setIsAdvancedFilterMode,
    openSpecialFilter,
    toggleColumnFilter,
    clearSheetFilter,
  ]);

  /** Columns that currently narrow the rows, by column key, so their headers can be marked. */
  const filtered_columns = useMemo(() => {
    const client_user = client_users.find((u) => u.id === client_account_filter);
    const admin_user = admin_users.find((u) => u.id === assigned_user_id_filter);
    return getFilteredColumns({
      sheet_filters,
      advanced_filters,
      advanced_filter_columns: ADVANCED_FILTER_COLUMNS,
      status_filter,
      link_type_filter,
      client_filter,
      needs_approval_filter,
      client_account_filter_label:
        client_account_filter === null
          ? null
          : client_user
            ? client_user.company || client_user.name
            : `#${client_account_filter}`,
      assigned_user_filter_label:
        assigned_user_id_filter === null
          ? null
          : assigned_user_id_filter === 0
            ? "Unassigned"
            : admin_user?.name ?? `#${assigned_user_id_filter}`,
    });
  }, [
    sheet_filters,
    advanced_filters,
    status_filter,
    link_type_filter,
    client_filter,
    needs_approval_filter,
    client_account_filter,
    assigned_user_id_filter,
    client_users,
    admin_users,
  ]);

  // ── Bulk grid paste: fills a rectangular block of cells from clipboard data ──

  // Delete / Backspace on a selection reuses this same path with a grid of empty
  // strings (operation "clear"), so clearing cells gets the same locked column
  // rules, batch save and undo history as a paste.
  const handleBulkPaste = useCallback(async (
    start_row_id: string,
    start_col_key: string,
    grid: PastedGrid,
    operation: BulkPasteOperation = "paste"
  ) => {
    const start_row_index = filtered_rows.findIndex((r) => r.id === start_row_id);
    const start_col_index = visible_columns.findIndex((c) => c.key === start_col_key);
    if (start_row_index === -1 || start_col_index === -1) return;

    const field_order = visible_columns.map((c) => c.key);

    const parseCellForPaste = (
      field: keyof LinkBuildingOrderRow,
      raw_value: string,
      current_value: LinkBuildingOrderRow[keyof LinkBuildingOrderRow]
    ): LinkBuildingOrderRow[keyof LinkBuildingOrderRow] => {
      const col_def = visible_columns.find((c) => c.key === field);
      // order_id must stay unique per row and is server-generated, so it is never
      // overwritten by a bulk paste — same rule the batch-update endpoint enforces.
      if (!col_def || col_def.locked || field === "order_id") return current_value;

      const trimmed = raw_value.trim();

      if (col_def.type === "select" && col_def.options) {
        // Normalize to the dropdown's canonical casing when the pasted text matches
        // one of the predefined options, but never discard a pasted value just
        // because it isn't in that list (e.g. a status copied from the external BASE
        // sheet that doesn't exist in the portal's list yet) — the cell still shows
        // and keeps that free-text value, matching how every other column pastes.
        const match = col_def.options.find((opt) => opt.toLowerCase() === trimmed.toLowerCase());
        return (match ?? trimmed) as LinkBuildingOrderRow[keyof LinkBuildingOrderRow];
      }

      if (col_def.type === "url" && trimmed !== "" && !/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}` as LinkBuildingOrderRow[keyof LinkBuildingOrderRow];
      }

      return trimmed as LinkBuildingOrderRow[keyof LinkBuildingOrderRow];
    };

    const { rows: pasted_rows, overflow_row_count } = applyPastedGridToRows(
      filtered_rows,
      start_row_index,
      start_col_index,
      field_order,
      grid,
      parseCellForPaste
    );

    // Pasted text starting with "=" becomes the cell's formula, as if it was typed
    // in, while a pasted value (or a cleared cell) replaces a formula the cell had.
    const next_rows = [...pasted_rows];
    const target_row_ids = new Set<string>();
    const formula_change_keys = new Set<string>();
    grid.forEach((grid_row, row_offset) => {
      const target_row_index = start_row_index + row_offset;
      if (target_row_index >= filtered_rows.length) return;
      target_row_ids.add(filtered_rows[target_row_index].id);
      grid_row.forEach((_raw_value, col_offset) => {
        const field = field_order[start_col_index + col_offset];
        if (!field || !FORMULA_CELL_COLUMN_KEYS.has(field)) return;
        const pasted_text = String(next_rows[target_row_index][field] ?? "");
        const old_formula = getCellFormula(filtered_rows[target_row_index], field);
        const new_formula = isFormulaText(pasted_text)
          ? toStoredFormula(pasted_text.trim(), row_number_offset + target_row_index, column_mapper)
          : null;
        if (old_formula === new_formula) return;
        const target_row = next_rows[target_row_index];
        next_rows[target_row_index] = { ...target_row, cell_formulas: withCellFormula(target_row.cell_formulas, field, new_formula) };
        formula_change_keys.add(`${target_row.id}:${field}`);
      });
    });

    // Results of the pasted formulas, and of the formulas reading the pasted cells.
    const recalculated = buildOrdersSheet(next_rows, sheet_config);
    const recalculated_cells = collectStaleFormulaCells(next_rows, recalculated, SHEET_KIND_BY_KEY, (row) =>
      target_row_ids.has(row.id)
    );
    const next_row_index_by_id = new Map(next_rows.map((row, row_idx) => [row.id, row_idx]));
    recalculated_cells.forEach((stale) => {
      const row_idx = next_row_index_by_id.get(stale.row_id);
      if (row_idx === undefined) return;
      next_rows[row_idx] = { ...next_rows[row_idx], [stale.col_key]: stale.value };
    });

    // Pasted prices get the currency symbol of their row, like typed ones.
    next_rows.forEach((row, row_idx) => {
      if (target_row_ids.has(row.id)) next_rows[row_idx] = withFormattedPrices(row);
    });

    // Diff against the previous rows to find exactly which cells changed, so only
    // the affected fields are sent to the server instead of the whole row.
    const changed_fields_by_row_id: Record<string, Partial<Record<keyof LinkBuildingOrderRow, string>>> = {};
    const formula_row_ids = new Set<string>();
    const history_changes: CellHistoryChange[] = [];
    let changed_cell_count = 0;

    grid.forEach((grid_row, row_offset) => {
      const target_row_index = start_row_index + row_offset;
      if (target_row_index >= filtered_rows.length) return;
      const row_id = filtered_rows[target_row_index].id;

      grid_row.forEach((_raw_value, col_offset) => {
        const field = field_order[start_col_index + col_offset];
        if (!field) return;
        const old_value = String(filtered_rows[target_row_index][field] ?? "");
        const new_value = String(next_rows[target_row_index][field] ?? "");
        const is_formula_change = formula_change_keys.has(`${row_id}:${field}`);
        if (old_value === new_value && !is_formula_change) return;
        changed_fields_by_row_id[row_id] = { ...(changed_fields_by_row_id[row_id] ?? {}), [field]: new_value };
        if (is_formula_change) formula_row_ids.add(row_id);
        if (!new_row_ids_ref.current.has(row_id)) {
          history_changes.push({
            row_id,
            col_key: field,
            old_value,
            new_value,
            ...(is_formula_change
              ? {
                  old_formula: getCellFormula(filtered_rows[target_row_index], field),
                  new_formula: getCellFormula(next_rows[target_row_index], field),
                }
              : {}),
          });
        }
        changed_cell_count += 1;
      });
    });

    if (changed_cell_count === 0) {
      if (overflow_row_count > 0) {
        setNotificationBanner(`Paste did not fit — ${overflow_row_count} row(s) beyond the visible table were skipped.`);
      }
      return;
    }

    // Formula cells recalculated because a cell they read was pasted over are saved too.
    recalculated_cells.forEach((stale) => {
      if (!changed_fields_by_row_id[stale.row_id]) return;
      changed_fields_by_row_id[stale.row_id] = {
        ...changed_fields_by_row_id[stale.row_id],
        [stale.col_key]: stale.value,
      };
    });

    setRows(next_rows);
    const drafts_after_paste = next_rows.filter((r) => new_row_ids_ref.current.has(r.id));
    saveDraftsToStorage(drafts_after_paste);

    const changed_row_ids = Object.keys(changed_fields_by_row_id);
    const draft_row_ids = changed_row_ids.filter((id) => new_row_ids_ref.current.has(id));
    const persisted_row_ids = changed_row_ids.filter((id) => !new_row_ids_ref.current.has(id));

    draft_row_ids.forEach((row_id) => {
      const row = next_rows.find((r) => r.id === row_id);
      if (row) persistNewRow(row);
    });

    setSaveError(null);

    if (persisted_row_ids.length > 0) {
      setIsBatchSaving(true);
      try {
        const res = await batchUpdateLinkBuildingOrderCells(
          persisted_row_ids.map((id) => ({
            id,
            fields: changed_fields_by_row_id[id],
            ...(formula_row_ids.has(id)
              ? { cell_formulas: next_rows.find((r) => r.id === id)?.cell_formulas ?? null }
              : {}),
          })),
          operation
        );
        const updated_by_id = new Map(res.data.map((r) => [r.id, r]));
        setRows((prev) => prev.map((r) => updated_by_id.get(r.id) ?? r));
        on_order_mutated_ref.current?.();
        refreshFilterCounts();
        pushHistoryEntry(history_changes, BULK_PASTE_HISTORY_LABELS[operation]);
      } catch (err) {
        const api_message = parseApiErrorMessage(err, COLUMN_LABELS);
        setSaveError(
          `${BULK_PASTE_FAILURE_PREFIXES[operation]} failed to save: ${api_message}`
        );
      } finally {
        setIsBatchSaving(false);
      }
    }

    const row_count = changed_row_ids.length;
    if (operation === "fill") {
      setNotificationBanner(
        `Filled ${changed_cell_count} cell${changed_cell_count !== 1 ? "s" : ""} across ${row_count} row${row_count !== 1 ? "s" : ""}.`
      );
      return;
    }
    if (operation === "clear") {
      setNotificationBanner(
        `Cleared ${changed_cell_count} cell${changed_cell_count !== 1 ? "s" : ""} across ${row_count} row${row_count !== 1 ? "s" : ""}.`
      );
      return;
    }
    setNotificationBanner(
      `Pasted ${changed_cell_count} cell${changed_cell_count !== 1 ? "s" : ""} across ${row_count} row${row_count !== 1 ? "s" : ""}.` +
      (overflow_row_count > 0 ? ` ${overflow_row_count} row(s) beyond the visible table were skipped.` : "")
    );
  }, [filtered_rows, visible_columns, persistNewRow, refreshFilterCounts, pushHistoryEntry, row_number_offset, column_mapper, sheet_config]);

  // ── Range copy/paste: Ctrl+C / Ctrl+V on an active multi-cell selection ──────

  const copyRangeToClipboard = useCallback(() => {
    const bounds = range_bounds_kbd_ref.current;
    if (!bounds) return;

    const lines: string[] = [];
    for (let r = bounds.min_row; r <= bounds.max_row; r++) {
      const row = filtered_rows[r];
      if (!row) continue;
      const cells: string[] = [];
      for (let c = bounds.min_col; c <= bounds.max_col; c++) {
        const col = visible_columns[c];
        cells.push(col ? String(row[col.key] ?? "") : "");
      }
      lines.push(cells.join("\t"));
    }
    const text = lines.join("\n");

    navigator.clipboard.writeText(text).catch(() => { });
    setRangeClipboard(parsePastedGrid(text));

    const n_rows = bounds.max_row - bounds.min_row + 1;
    const n_cols = bounds.max_col - bounds.min_col + 1;
    const n_cells = n_rows * n_cols;
    setNotificationBanner(
      `Copied ${n_cells} cell${n_cells !== 1 ? "s" : ""} (${n_rows}×${n_cols}), press ${formatShortcut(["Mod", "V"], is_mac_ref.current)} on a cell to paste here, or paste into Excel/Sheets`
    );
  }, [filtered_rows, visible_columns]);

  const pasteIntoRange = useCallback(async () => {
    const bounds = range_bounds_kbd_ref.current;
    if (!bounds) return;

    let grid: PastedGrid | null = null;
    try {
      // Reading the OS clipboard lets a block copied from Excel/Sheets be pasted
      // straight into a selected range, not just into one cell at a time.
      const text = await navigator.clipboard.readText();
      if (text) grid = parsePastedGrid(text);
    } catch {
      // Blocked by the browser's clipboard-read permission — fall back below.
    }
    if (!grid) grid = range_clipboard_kbd_ref.current;
    if (!grid) return;

    const range_rows = bounds.max_row - bounds.min_row + 1;
    const range_cols = bounds.max_col - bounds.min_col + 1;

    // Pasting a single copied value onto a larger selection fills the whole
    // selection with it, matching the behavior admins already expect from Excel.
    if (grid.length === 1 && grid[0].length === 1 && (range_rows > 1 || range_cols > 1)) {
      const single_value = grid[0][0];
      grid = Array.from({ length: range_rows }, () => Array.from({ length: range_cols }, () => single_value));
    }

    const start_row = filtered_rows[bounds.min_row];
    const start_col = visible_columns[bounds.min_col];
    if (!start_row || !start_col) return;

    handleBulkPaste(start_row.id, start_col.key, grid);
  }, [filtered_rows, visible_columns, handleBulkPaste]);

  /** Ctrl+V on the active cell with no range: pastes the OS clipboard starting at that cell. */
  const pasteIntoActiveCell = useCallback(async () => {
    const cell = active_cell_kbd_ref.current;
    if (!cell || !visible_columns.some((col) => col.key === cell.col_key)) return;

    let grid: PastedGrid | null = null;
    try {
      const text = await navigator.clipboard.readText();
      if (text) grid = parsePastedGrid(text);
    } catch {
      // Blocked by the browser's clipboard-read permission, fall back below.
    }
    if (!grid) grid = range_clipboard_kbd_ref.current;
    if (!grid) return;

    handleBulkPaste(cell.row_id, cell.col_key, grid);
  }, [visible_columns, handleBulkPaste]);

  /** Delete / Backspace: empties every cell of the selected range, or just the active cell. */
  const clearSelectedCells = useCallback(() => {
    const bounds = range_bounds_kbd_ref.current;
    if (bounds) {
      const start_row = filtered_rows[bounds.min_row];
      const start_col = visible_columns[bounds.min_col];
      if (!start_row || !start_col) return;
      const empty_grid = Array.from({ length: bounds.max_row - bounds.min_row + 1 }, () =>
        Array.from({ length: bounds.max_col - bounds.min_col + 1 }, () => "")
      );
      handleBulkPaste(start_row.id, start_col.key, empty_grid, "clear");
      return;
    }

    const cell = active_cell_kbd_ref.current;
    if (!cell || !visible_columns.some((col) => col.key === cell.col_key)) return;
    handleBulkPaste(cell.row_id, cell.col_key, [[""]], "clear");
  }, [filtered_rows, visible_columns, handleBulkPaste]);

  /**
   * Cmd/Ctrl+D (down) and Cmd/Ctrl+R (right), like Google Sheets: the first row (or
   * column) of the selected range is copied into the rest of it. With a single cell
   * selected, the cell above (or to the left) is copied into it. Formulas keep their
   * relative row references, so =B5*2 filled down becomes =B6*2, =B7*2 and so on.
   */
  const fillSelection = useCallback((direction: "down" | "right") => {
    let bounds = range_bounds_kbd_ref.current;
    if (!bounds) {
      const cell = active_cell_kbd_ref.current;
      if (!cell) return;
      const row_idx = row_index_by_id.get(cell.row_id);
      const col_idx = visible_columns.findIndex((col) => col.key === cell.col_key);
      if (row_idx === undefined || col_idx === -1) return;
      bounds =
        direction === "down"
          ? { min_row: row_idx - 1, max_row: row_idx, min_col: col_idx, max_col: col_idx }
          : { min_row: row_idx, max_row: row_idx, min_col: col_idx - 1, max_col: col_idx };
    }
    const { min_row, max_row, min_col, max_col } = bounds;
    if (min_row < 0 || min_col < 0) return;
    if (direction === "down" ? max_row === min_row : max_col === min_col) return;

    const fill_grid: PastedGrid = [];
    for (let r = min_row; r <= max_row; r++) {
      const source_row = filtered_rows[direction === "down" ? min_row : r];
      if (!source_row) return;
      const grid_row: string[] = [];
      for (let c = min_col; c <= max_col; c++) {
        const source_col = visible_columns[direction === "right" ? min_col : c];
        if (!source_col) return;
        const stored_formula = getCellFormula(source_row, source_col.key);
        grid_row.push(
          stored_formula
            ? toDisplayFormula(stored_formula, row_number_offset + r, column_mapper)
            : String(source_row[source_col.key] ?? "")
        );
      }
      fill_grid.push(grid_row);
    }

    const start_row = filtered_rows[min_row];
    const start_col = visible_columns[min_col];
    if (start_row && start_col) handleBulkPaste(start_row.id, start_col.key, fill_grid, "fill");
  }, [filtered_rows, visible_columns, row_index_by_id, row_number_offset, column_mapper, handleBulkPaste]);

  /** Cmd/Ctrl+A: selects every data cell on the current page. */
  const selectAllCells = useCallback(() => {
    const first_row = filtered_rows[0];
    const last_row = filtered_rows[filtered_rows.length - 1];
    const first_col = visible_columns[0];
    const last_col = visible_columns[visible_columns.length - 1];
    if (!first_row || !last_row || !first_col || !last_col) return;
    const anchor = { row_id: first_row.id, col_key: first_col.key as string };
    setEditingCell(null);
    setActiveCell(anchor);
    setCellRange({ anchor, focus: { row_id: last_row.id, col_key: last_col.key } });
  }, [filtered_rows, visible_columns]);

  /** Row number click: selects every data cell of that row, like clicking a row header in Sheets. */
  const selectEntireRow = useCallback((row_id: string) => {
    const first_col = visible_columns[0];
    const last_col = visible_columns[visible_columns.length - 1];
    if (!first_col || !last_col) return;
    const anchor = { row_id, col_key: first_col.key as string };
    setEditingCell(null);
    setActiveCell(anchor);
    setCellRange({ anchor, focus: { row_id, col_key: last_col.key } });
    if (!new_row_ids_ref.current.has(row_id)) setSelectedRowId(row_id);
    focusGrid();
  }, [visible_columns, focusGrid]);

  /** Column letter click: selects that column for every row on the current page. */
  const selectEntireColumn = useCallback((col_key: string) => {
    const first_row = filtered_rows[0];
    const last_row = filtered_rows[filtered_rows.length - 1];
    if (!first_row || !last_row) return;
    const anchor = { row_id: first_row.id, col_key };
    setEditingCell(null);
    setActiveCell(anchor);
    // The assignment columns are not part of range selection, so they only get the active cell.
    setCellRange(
      visible_columns.some((col) => col.key === col_key)
        ? { anchor, focus: { row_id: last_row.id, col_key } }
        : null
    );
    focusGrid();
  }, [filtered_rows, visible_columns, focusGrid]);

  /** Formulas the given rows hold in a column, by row id. */
  const getFieldFormulas = useCallback((row_ids: string[], field: string): Map<string, string> => {
    const formulas = new Map<string, string>();
    if (!FORMULA_CELL_COLUMN_KEYS.has(field)) return formulas;
    rows_ref.current.forEach((row) => {
      const formula = row_ids.includes(row.id) ? getCellFormula(row, field) : null;
      if (formula) formulas.set(row.id, formula);
    });
    return formulas;
  }, []);

  /**
   * A value filled into many rows replaces the formulas those cells had, like
   * pasting values over formulas in Sheets, so a recalculation never brings the
   * old result back.
   */
  const removeFieldFormulas = useCallback(async (formulas: Map<string, string>, field: string) => {
    if (formulas.size === 0) return;
    const next_maps = new Map(
      rows_ref.current
        .filter((row) => formulas.has(row.id))
        .map((row) => [row.id, withCellFormula(row.cell_formulas, field, null)] as const)
    );
    setRows((prev) => prev.map((r) => (next_maps.has(r.id) ? { ...r, cell_formulas: next_maps.get(r.id) ?? null } : r)));
    await batchUpdateLinkBuildingOrderCells(
      Array.from(next_maps, ([id, cell_formulas]) => ({ id, fields: {}, cell_formulas })),
      "fill"
    );
  }, []);

  const handleBatchApply = useCallback(async () => {
    if (!batch_field || !batch_value || selected_row_ids.size === 0) return;
    if (isFormulaText(batch_value)) {
      setSaveError(
        "Fill field sets the same plain value on every row. To use a formula, type it in a cell, or add a formula column with the fx button."
      );
      return;
    }

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

      const old_values_by_row_id = new Map(
        rows_ref.current
          .filter((r) => persisted_ids.includes(r.id))
          .map((r) => [r.id, (r[batch_field as keyof LinkBuildingOrderRow] ?? null) as CellHistoryValue] as const)
      );
      const replaced_formulas = getFieldFormulas(persisted_ids, batch_field);

      // The server recalculates the recent domain usage flag of every updated row.
      let usage_by_row_id = new Map<string, LinkBuildingOrderRow["recent_domain_usage"]>();
      if (persisted_ids.length > 0) {
        const res = await batchUpdateLinkBuildingOrders(persisted_ids, {
          [batch_field]: api_value,
        }, "fill");
        usage_by_row_id = recentDomainUsageByRowId(res.data);
        await removeFieldFormulas(replaced_formulas, batch_field);
      }

      setRows((prev) =>
        prev.map((r) =>
          selected_row_ids.has(r.id)
            ? withFormattedPrices({ ...r, [batch_field]: api_value, ...withRecentDomainUsage(usage_by_row_id, r.id) })
            : r
        )
      );

      const history_changes: CellHistoryChange[] = persisted_ids
        .map((id) => ({
          row_id: id,
          col_key: batch_field as keyof LinkBuildingOrderRow,
          old_value: old_values_by_row_id.get(id) ?? null,
          new_value: api_value,
          ...(replaced_formulas.has(id) ? { old_formula: replaced_formulas.get(id), new_formula: null } : {}),
        }))
        .filter((c) => String(c.old_value ?? "") !== String(c.new_value ?? "") || c.old_formula !== undefined);
      pushHistoryEntry(history_changes, "batch fill");

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
      if (batch_field === "status" || batch_field === "lb_tl_approval") {
        refreshFilterCounts();
      }
      clearSelection();
      setBatchField("");
      setBatchValue("");
      setBatchSelectAnchorEl(null);
    } catch {
      setSaveError("Batch update failed. Please try again.");
    } finally {
      setIsBatchSaving(false);
    }
  }, [batch_field, batch_value, selected_row_ids, clearSelection, client_users, admin_users, refreshFilterCounts, pushHistoryEntry, getFieldFormulas, removeFieldFormulas]);

  const handlePasteClipboard = useCallback(async () => {
    if (!clipboard_cell || selected_row_ids.size === 0) return;

    setIsBatchSaving(true);
    setSaveError(null);
    try {
      const persisted_ids = Array.from(selected_row_ids).filter(
        (id) => !new_row_ids_ref.current.has(id)
      );

      const old_values_by_row_id = new Map(
        rows_ref.current
          .filter((r) => persisted_ids.includes(r.id))
          .map((r) => [r.id, (r[clipboard_cell.col_key as keyof LinkBuildingOrderRow] ?? null) as CellHistoryValue] as const)
      );
      const replaced_formulas = getFieldFormulas(persisted_ids, clipboard_cell.col_key);

      // The server recalculates the recent domain usage flag of every updated row.
      let usage_by_row_id = new Map<string, LinkBuildingOrderRow["recent_domain_usage"]>();
      if (persisted_ids.length > 0) {
        const res = await batchUpdateLinkBuildingOrders(persisted_ids, {
          [clipboard_cell.col_key]: clipboard_cell.value,
        }, "paste");
        usage_by_row_id = recentDomainUsageByRowId(res.data);
        await removeFieldFormulas(replaced_formulas, clipboard_cell.col_key);
      }

      setRows((prev) =>
        prev.map((r) =>
          selected_row_ids.has(r.id)
            ? withFormattedPrices({ ...r, [clipboard_cell.col_key]: clipboard_cell.value, ...withRecentDomainUsage(usage_by_row_id, r.id) })
            : r
        )
      );

      const history_changes: CellHistoryChange[] = persisted_ids
        .map((id) => ({
          row_id: id,
          col_key: clipboard_cell.col_key as keyof LinkBuildingOrderRow,
          old_value: old_values_by_row_id.get(id) ?? null,
          new_value: clipboard_cell.value,
          ...(replaced_formulas.has(id) ? { old_formula: replaced_formulas.get(id), new_formula: null } : {}),
        }))
        .filter((c) => String(c.old_value ?? "") !== String(c.new_value ?? "") || c.old_formula !== undefined);
      pushHistoryEntry(history_changes, "paste to selection");

      const col_label = COLUMNS.find((c) => c.key === clipboard_cell.col_key)?.label ?? clipboard_cell.col_key;
      const short_val = clipboard_cell.value.length > 30
        ? clipboard_cell.value.slice(0, 30) + "…"
        : clipboard_cell.value;
      setNotificationBanner(
        `Pasted "${short_val}" → "${col_label}" for ${selected_row_ids.size} row${selected_row_ids.size !== 1 ? "s" : ""}.`
      );
      if (clipboard_cell.col_key === "status" || clipboard_cell.col_key === "lb_tl_approval") {
        refreshFilterCounts();
      }
      clearSelection();
    } catch {
      setSaveError("Batch paste failed. Please try again.");
    } finally {
      setIsBatchSaving(false);
    }
  }, [clipboard_cell, selected_row_ids, clearSelection, refreshFilterCounts, pushHistoryEntry, getFieldFormulas, removeFieldFormulas]);

  // ── Global keyboard shortcuts (Cmd on Mac, Ctrl elsewhere): C copy, X cut, V paste, D / R fill, Z undo, Y / Shift+Z redo, / help ──

  useEffect(() => {
    const isGridFocused = () =>
      !!table_scroll_ref.current && table_scroll_ref.current.contains(document.activeElement);

    /** Copies the selected range, the cell being edited or the active cell. True when something was copied. */
    const copySelection = (e: KeyboardEvent): boolean => {
      const range = cell_range_kbd_ref.current;
      const cell = editing_cell_ref.current;

      // A drag/shift-click range selection takes priority over the single-cell
      // clipboard when one is active and no cell is currently being edited.
      if (range && !cell) {
        copyRangeToClipboard();
        return true;
      }

      // Without an open editor, the active cell is copied, but only while the grid
      // has focus so copying text elsewhere on the page is never hijacked.
      const copy_cell = cell ?? (isGridFocused() ? active_cell_kbd_ref.current : null);
      if (!copy_cell) return false;

      // If the user has text selected inside an input, let the browser handle it
      const active_el = document.activeElement;
      if (active_el instanceof HTMLInputElement || active_el instanceof HTMLTextAreaElement) {
        const sel_len = (active_el.selectionEnd ?? 0) - (active_el.selectionStart ?? 0);
        if (sel_len > 0) return false;
      }

      const value = get_cell_copy_text_ref.current(copy_cell);
      if (value === null) return false;
      const col_label =
        COLUMN_LABELS[copy_cell.col_key] ??
        ASSIGNMENT_COLUMN_LABELS[copy_cell.col_key] ??
        formula_column_by_key_ref.current.get(copy_cell.col_key)?.name ??
        copy_cell.col_key;

      e.preventDefault();
      setClipboardCell({ value, col_key: copy_cell.col_key });
      navigator.clipboard.writeText(value).catch(() => {});

      const short = value.length > 28 ? value.slice(0, 28) + "…" : value;
      const n_selected = selected_row_ids_kbd_ref.current.size;
      const paste_label = formatShortcut(["Mod", "V"], is_mac_ref.current);
      setNotificationBanner(
        n_selected > 0
          ? `Copied "${short}", press ${paste_label} to paste into "${col_label}" for ${n_selected} row${n_selected > 1 ? "s" : ""}`
          : `Copied "${short}" from "${col_label}", select rows, then press ${paste_label} to paste`
      );
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape drops the active multi-cell range selection (mirrors editing's own
      // Escape handling, which is local to the cell's input and never reaches here).
      if (e.key === "Escape" && cell_range_kbd_ref.current) {
        setCellRange(null);
        return;
      }

      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();

      // Cmd/Ctrl+/ shows the keyboard shortcuts cheat sheet, like Google Sheets.
      if (e.key === "/" && !e.altKey) {
        e.preventDefault();
        setIsShortcutsDialogOpen((is_open) => !is_open);
        return;
      }

      if (key === "c") {
        copySelection(e);
        return;
      }

      // Cmd/Ctrl+X copies the selection, then clears it. While a cell is being
      // edited, the input keeps the browser's own cut of the selected text.
      if (key === "x") {
        if (editing_cell_ref.current || !isGridFocused()) return;
        if (copySelection(e)) clearSelectedCells();
        return;
      }

      // Cmd/Ctrl+D fills down and Cmd/Ctrl+R fills right, only while the grid has
      // focus, so the browser's bookmark and reload shortcuts work everywhere else.
      if ((key === "d" || key === "r") && !e.shiftKey && !e.altKey) {
        if (editing_cell_ref.current || !isGridFocused()) return;
        e.preventDefault();
        fillSelection(key === "d" ? "down" : "right");
        return;
      }

      if (key === "v") {
        const range = cell_range_kbd_ref.current;

        if (range && !editing_cell_ref.current) {
          const active_el = document.activeElement;
          if (
            active_el instanceof HTMLInputElement ||
            active_el instanceof HTMLSelectElement ||
            active_el instanceof HTMLTextAreaElement
          ) return;

          e.preventDefault();
          pasteIntoRange();
          return;
        }

        // Do not override paste when the user is typing inside an input
        const active_el = document.activeElement;
        if (
          active_el instanceof HTMLInputElement ||
          active_el instanceof HTMLSelectElement ||
          active_el instanceof HTMLTextAreaElement
        ) return;

        const clip = clipboard_cell_kbd_ref.current;
        const selected = selected_row_ids_kbd_ref.current;
        if (clip && selected.size > 0) {
          e.preventDefault();
          handlePasteClipboard();
          return;
        }

        if (isGridFocused() && active_cell_kbd_ref.current && !editing_cell_ref.current) {
          e.preventDefault();
          pasteIntoActiveCell();
        }
        return;
      }

      // Ctrl+Z undoes the last cell change; Ctrl+Shift+Z and Ctrl+Y both redo it,
      // covering both the Windows/Sheets and the Mac/Docs conventions.
      if (key === "z" || key === "y") {
        const is_redo = key === "y" || (key === "z" && e.shiftKey);

        // Let the browser handle native undo/redo while typing inside a cell.
        const active_el = document.activeElement;
        if (
          active_el instanceof HTMLInputElement ||
          active_el instanceof HTMLSelectElement ||
          active_el instanceof HTMLTextAreaElement
        ) return;

        e.preventDefault();
        if (is_redo) {
          redo();
        } else {
          undo();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlePasteClipboard, copyRangeToClipboard, pasteIntoRange, pasteIntoActiveCell, undo, redo, clearSelectedCells, fillSelection]);

  // Opening a cell for editing through any path (Client Account / Assigned To cells,
  // Tab/Enter navigation, etc. — not only the drag handlers above) always drops a
  // stale range selection, keeping "one cell is being edited" and "a range is
  // selected" mutually exclusive regardless of how editing was entered.
  useEffect(() => {
    if (editing_cell) setCellRange(null);
  }, [editing_cell]);

  // Safety net: if the mouse button is released outside any cell (e.g. dragged off
  // the table), clear the in-progress drag state so the next click isn't misread.
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      range_mouse_down_ref.current = null;
      range_dragged_ref.current = false;
      point_drag_ref.current = false;
    };
    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

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
  const [show_import_menu, setShowImportMenu] = useState(false);
  const import_btn_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show_import_menu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (import_btn_ref.current && !import_btn_ref.current.contains(e.target as Node)) {
        setShowImportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show_import_menu]);

  const handleImportComplete = useCallback(() => {
    fetchRows(current_body_ref.current);
    refreshFilterCounts();
  }, [fetchRows, refreshFilterCounts]);

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

  // ── Spreadsheet keyboard navigation ─────────────────────────────────────────
  // Handled on the scroll container (not the document), so the arrow keys only
  // drive the grid while it has focus and never hijack the toolbar inputs. Keys
  // pressed inside a cell editor or a dropdown are ignored here, those elements
  // handle their own keys and hand focus back to the grid when they commit.

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || editing_cell_ref.current) return;
    if (filtered_rows.length === 0 || grid_column_keys.length === 0) return;

    const size = { row_count: filtered_rows.length, col_count: grid_column_keys.length };
    const position = active_cell ? toGridPosition(active_cell) : null;
    const is_ctrl = e.ctrlKey || e.metaKey;
    const arrow_direction = ARROW_KEY_DIRECTIONS[e.key];

    // The totals row under the table: move along it, Enter or typing edits its formula.
    if (active_cell?.row_id === SUMMARY_ROW_ID) {
      if (arrow_direction || e.key === "Tab") {
        e.preventDefault();
        navigateCell(SUMMARY_ROW_ID, active_cell.col_key, arrow_direction ?? (e.shiftKey ? "prev" : "next"));
      } else if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        startEditing(SUMMARY_ROW_ID, active_cell.col_key);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        saveComputedCellText(active_cell, "");
      } else if (isPrintableKey(e)) {
        e.preventDefault();
        startEditing(SUMMARY_ROW_ID, active_cell.col_key, "type");
        setComputedCellDraft(e.key);
      }
      return;
    }

    // Nothing selected yet (or the active row left the page): the first
    // navigation key just lands on the top left cell.
    if (!active_cell || !position) {
      if (arrow_direction || e.key === "Tab" || e.key === "Enter" || e.key === "Home") {
        e.preventDefault();
        selectCell(toCellRef({ row_idx: 0, col_idx: 0 }), { scroll: true });
      }
      return;
    }

    const moveTo = (next_position: GridPosition) => {
      e.preventDefault();
      selectCell(toCellRef(next_position), { scroll: true });
    };

    if (arrow_direction) {
      if (e.shiftKey) {
        // Shift+Arrow grows the range from the active cell. Ranges cover the data
        // columns only, so the assignment columns cannot be range selected.
        e.preventDefault();
        if (position.col_idx >= visible_columns.length) return;
        const range_focus = cell_range ? toGridPosition(cell_range.focus) ?? position : position;
        const next_focus = moveGridPosition(
          range_focus,
          arrow_direction,
          { row_count: filtered_rows.length, col_count: visible_columns.length },
          { jump_to_edge: is_ctrl }
        );
        const focus_cell = toCellRef(next_focus);
        setCellRange({ anchor: active_cell, focus: focus_cell });
        scrollToCell(focus_cell);
        return;
      }
      if (arrow_direction === "down" && !is_ctrl && show_summary_row && position.row_idx === size.row_count - 1) {
        e.preventDefault();
        selectSummaryCell(active_cell.col_key);
        return;
      }
      moveTo(moveGridPosition(position, arrow_direction, size, { jump_to_edge: is_ctrl }));
      return;
    }

    // Google Sheets selection shortcuts: Cmd/Ctrl+A selects every cell on the page,
    // Shift+Space the active row and Ctrl+Space the active column (Ctrl on Mac too,
    // since Cmd+Space opens Spotlight).
    if (is_ctrl && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      selectAllCells();
      return;
    }
    if (e.key === " " && e.shiftKey && !is_ctrl && !e.altKey) {
      e.preventDefault();
      selectEntireRow(active_cell.row_id);
      return;
    }
    if (e.key === " " && e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      selectEntireColumn(active_cell.col_key);
      return;
    }

    switch (e.key) {
      case "Tab":
        moveTo(getTabPosition(position, e.shiftKey, size));
        return;
      case "Home":
        moveTo(is_ctrl ? { row_idx: 0, col_idx: 0 } : { row_idx: position.row_idx, col_idx: 0 });
        return;
      case "End":
        moveTo(
          is_ctrl
            ? { row_idx: size.row_count - 1, col_idx: size.col_count - 1 }
            : { row_idx: position.row_idx, col_idx: size.col_count - 1 }
        );
        return;
      case "PageUp":
        moveTo(moveGridPosition(position, "up", size, { step: PAGE_NAVIGATION_STEP }));
        return;
      case "PageDown":
        moveTo(moveGridPosition(position, "down", size, { step: PAGE_NAVIGATION_STEP }));
        return;
      case "Enter":
      case "F2":
        e.preventDefault();
        startEditing(active_cell.row_id, active_cell.col_key);
        return;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        clearSelectedCells();
        return;
    }

    // Ctrl+; / Cmd+; opens the active cell holding today's date, like Google Sheets,
    // so Enter commits it. Only table columns that accept text take it.
    if (isInsertDateShortcut(e)) {
      const col_def = visible_columns.find((col) => col.key === active_cell.col_key);
      if (!col_def || col_def.type === "number") return;
      e.preventDefault();
      startEditing(active_cell.row_id, active_cell.col_key, "type");
      updateCell(active_cell.row_id, col_def.key, formatDateMMDDYYYY(new Date()));
      return;
    }

    // Typing a character starts editing and replaces the cell's content with it,
    // exactly like Excel and Sheets. The assignment cells open their picker instead.
    if (isPrintableKey(e)) {
      e.preventDefault();
      const is_assignment_col = (ASSIGNMENT_COLUMN_KEYS as readonly string[]).includes(active_cell.col_key);
      if (is_assignment_col) {
        startEditing(active_cell.row_id, active_cell.col_key);
        return;
      }
      startEditing(active_cell.row_id, active_cell.col_key, "type");
      if (isFormulaColumnKey(active_cell.col_key)) {
        setComputedCellDraft(e.key);
      } else {
        updateCell(active_cell.row_id, active_cell.col_key as keyof LinkBuildingOrderRow, e.key);
      }
    }
  };

  /** Spreadsheet address of a cell, e.g. "C14". Row numbers follow the server's row offset. */
  const getCellAddress = (cell: CellRef): string | null => {
    const col_idx = column_mapper.getColumnIndex(cell.col_key);
    if (col_idx === null) return null;
    if (cell.row_id === SUMMARY_ROW_ID) return toCellAddress(col_idx, row_number_offset + filtered_rows.length);
    const row_idx = row_index_by_id.get(cell.row_id);
    return row_idx === undefined ? null : toCellAddress(col_idx, row_number_offset + row_idx);
  };

  const active_cell_address = active_cell ? getCellAddress(active_cell) : null;
  const range_focus_address = cell_range ? getCellAddress(cell_range.focus) : null;
  const name_box_label =
    active_cell_address && range_focus_address && range_focus_address !== active_cell_address
      ? `${active_cell_address}:${range_focus_address}`
      : active_cell_address;

  /** Full value of the active cell for the formula bar (long values are truncated in the grid). */
  const active_cell_value = useMemo(() => {
    if (!active_cell) return "";
    const row_idx = row_index_by_id.get(active_cell.row_id);
    const row = row_idx === undefined ? undefined : filtered_rows[row_idx];
    if (!row) return "";
    if (active_cell.col_key === "user_id") {
      const client = client_users.find((u) => row.user_id != null && u.id === Number(row.user_id));
      return client ? client.company || client.name : "";
    }
    if (active_cell.col_key === "assigned_admin_user_id") {
      const admin = admin_users.find(
        (u) => row.assigned_admin_user_id != null && u.id === Number(row.assigned_admin_user_id)
      );
      return admin ? admin.name : "";
    }
    return String(row[active_cell.col_key as keyof LinkBuildingOrderRow] ?? "");
  }, [active_cell, filtered_rows, row_index_by_id, client_users, admin_users]);

  const active_column_label = active_cell
    ? (COLUMN_LABELS[active_cell.col_key] ??
      ASSIGNMENT_COLUMN_LABELS[active_cell.col_key] ??
      formula_column_by_key.get(active_cell.col_key)?.name ??
      "")
    : "";

  /** Size of the active multi cell range, shown as a badge in the formula bar. */
  const range_badge = useMemo(() => {
    if (!cell_range || !range_bounds) return null;
    const n_rows = range_bounds.max_row - range_bounds.min_row + 1;
    const n_cols = range_bounds.max_col - range_bounds.min_col + 1;
    return { n_rows, n_cols, n_cells: n_rows * n_cols };
  }, [cell_range, range_bounds]);

  /**
   * Sum / Average / Min / Max / Count of a multi cell selection, for the Sheets
   * style status bar under the table. Reads what each cell shows, so formula
   * results count as their value.
   */
  const range_stats = useMemo(() => {
    if (!range_bounds) return null;
    const is_single_cell =
      range_bounds.min_row === range_bounds.max_row && range_bounds.min_col === range_bounds.max_col;
    if (is_single_cell) return null;
    const values: string[] = [];
    for (let r = range_bounds.min_row; r <= range_bounds.max_row; r++) {
      const row = filtered_rows[r];
      if (!row) continue;
      for (let c = range_bounds.min_col; c <= range_bounds.max_col; c++) {
        const col = visible_columns[c];
        if (col) values.push(getCellCopyText({ row_id: row.id, col_key: col.key }) ?? "");
      }
    }
    return computeRangeStats(values);
  }, [range_bounds, filtered_rows, visible_columns, getCellCopyText]);

  const active_position = active_cell ? toGridPosition(active_cell) : null;

  /** True when a column letter or row number should be highlighted for the current selection. */
  const isColumnHighlighted = (col_idx: number) =>
    range_bounds
      ? col_idx >= range_bounds.min_col && col_idx <= range_bounds.max_col
      : active_position?.col_idx === col_idx;
  const isRowHighlighted = (row_idx: number) =>
    range_bounds
      ? row_idx >= range_bounds.min_row && row_idx <= range_bounds.max_row
      : active_position?.row_idx === row_idx;

  // ── Recalculation sync ──────────────────────────────────────────────────────
  // A formula cell's result is stored in its column, so sorting, filtering, exports
  // and the client portal read it. When a cell it reads changes (an edit by anyone,
  // an import, a new day for TODAY()), the result shown here is recomputed at once
  // and saved a moment later. Only formulas reading their own row are saved this
  // way: their result is the same whatever page, sort or filter is shown, so two
  // admins looking at different views never overwrite each other.

  /** "row_id:col_key:value" already sent, so a value the server rejects is not retried in a loop. */
  const synced_formula_values_ref = useRef(new Set<string>());

  useEffect(() => {
    // Formulas reading other rows are only final once every row is in.
    if (!has_loaded_once || is_loading || is_loading_more_rows) return;
    const stale_cells = collectStaleFormulaCells(
      filtered_rows,
      sheet,
      SHEET_KIND_BY_KEY,
      (row, _col_key, formula) =>
        !new_row_ids_ref.current.has(row.id) &&
        editing_cell?.row_id !== row.id &&
        !saving_row_ids.has(row.id) &&
        analyzeFormula(formula).is_row_local
    ).filter((cell) => !synced_formula_values_ref.current.has(`${cell.row_id}:${cell.col_key}:${cell.value}`));
    if (stale_cells.length === 0) return;

    const timer = setTimeout(async () => {
      const fields_by_row_id = new Map<string, Partial<Record<keyof LinkBuildingOrderRow, string>>>();
      for (const cell of stale_cells) {
        if (!fields_by_row_id.has(cell.row_id) && fields_by_row_id.size >= FORMULA_SYNC_MAX_ROWS) continue;
        fields_by_row_id.set(cell.row_id, { ...(fields_by_row_id.get(cell.row_id) ?? {}), [cell.col_key]: cell.value });
        synced_formula_values_ref.current.add(`${cell.row_id}:${cell.col_key}:${cell.value}`);
      }
      try {
        const res = await batchUpdateLinkBuildingOrderCells(
          Array.from(fields_by_row_id, ([id, fields]) => ({ id, fields })),
          "formula"
        );
        const updated_by_id = new Map(res.data.map((r) => [r.id, r]));
        setRows((prev) =>
          prev.map((r) => {
            const updated = updated_by_id.get(r.id);
            if (!updated) return r;
            // A cell opened for editing in the meantime keeps what is being typed.
            const editing = editing_cell_ref.current;
            return editing?.row_id === r.id
              ? { ...updated, [editing.col_key]: r[editing.col_key as keyof LinkBuildingOrderRow] }
              : updated;
          })
        );
        on_order_mutated_ref.current?.();
      } catch (err) {
        setSaveError(`Recalculated formula results could not be saved: ${parseApiErrorMessage(err, COLUMN_LABELS)}`);
      }
    }, FORMULA_SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [has_loaded_once, is_loading, is_loading_more_rows, filtered_rows, sheet, editing_cell, saving_row_ids]);

  // ── Formula editing helpers ─────────────────────────────────────────────────

  /** The formula being typed right now, in the formula bar, a computed cell or a data cell. */
  const editing_formula_text = useMemo(() => {
    let text: string | null = null;
    if (formula_bar_draft !== null) {
      text = formula_bar_draft;
    } else if (editing_cell) {
      if (editing_cell.row_id === SUMMARY_ROW_ID || isFormulaColumnKey(editing_cell.col_key)) {
        text = computed_cell_draft;
      } else if (FORMULA_CELL_COLUMN_KEYS.has(editing_cell.col_key)) {
        const row = filtered_rows.find((r) => r.id === editing_cell.row_id);
        text = String(row?.[editing_cell.col_key as keyof LinkBuildingOrderRow] ?? "");
      }
    }
    return text !== null && text.trimStart().startsWith("=") ? text : null;
  }, [formula_bar_draft, editing_cell, computed_cell_draft, filtered_rows]);

  /**
   * Colors of the cells (and whole columns) the formula being typed refers to,
   * one color per reference like Google Sheets, so it is easy to check what a
   * formula reads.
   */
  const formula_highlights = useMemo(() => {
    const cells = new Map<string, number>();
    const columns = new Map<string, number>();
    if (!editing_formula_text) return { cells, columns };

    findReferences(editing_formula_text).forEach((match, ref_idx) => {
      const color = ref_idx % FORMULA_REFERENCE_COLOR_COUNT;
      const { start } = match.spec;
      const end = match.spec.end ?? start;
      if (start.col?.index === undefined || end.col?.index === undefined) return;
      const min_col = Math.min(start.col.index, end.col.index);
      const max_col = Math.max(start.col.index, end.col.index);
      const col_keys: string[] = [];
      for (let c = min_col; c <= max_col; c++) {
        const col_key = column_mapper.getColumnKey(c);
        if (col_key) col_keys.push(col_key);
      }

      if (!start.row) {
        col_keys.forEach((col_key) => columns.set(col_key, color));
        return;
      }
      const row_a = start.row.kind === "number" ? start.row.number - row_number_offset : 0;
      const row_b = end.row ? (end.row.kind === "number" ? end.row.number - row_number_offset : row_a) : filtered_rows.length - 1;
      const min_row = Math.max(0, Math.min(row_a, row_b));
      const max_row = Math.min(filtered_rows.length - 1, Math.max(row_a, row_b));
      for (let r = min_row; r <= max_row && cells.size < MAX_HIGHLIGHTED_REFERENCE_CELLS; r++) {
        col_keys.forEach((col_key) => cells.set(toCellKey(filtered_rows[r].id, col_key), color));
      }
    });
    return { cells, columns };
  }, [editing_formula_text, column_mapper, row_number_offset, filtered_rows]);

  // ── Formula bar ─────────────────────────────────────────────────────────────

  const is_active_cell_computed = !!active_cell && (active_cell.row_id === SUMMARY_ROW_ID || isFormulaColumnKey(active_cell.col_key));
  const is_active_cell_editable =
    !!active_cell && !(ASSIGNMENT_COLUMN_KEYS as readonly string[]).includes(active_cell.col_key);
  const is_active_cell_formula_enabled =
    !!active_cell && (is_active_cell_computed || FORMULA_CELL_COLUMN_KEYS.has(active_cell.col_key));
  const active_cell_formula_text = active_cell ? getCellFormulaText(active_cell) : null;

  /** What the formula bar shows: the text being typed in the cell, else the cell's formula, else its value. */
  const formula_bar_cell_text = (() => {
    if (!active_cell) return "";
    const is_editing_active =
      editing_cell?.row_id === active_cell.row_id && editing_cell?.col_key === active_cell.col_key;
    if (is_editing_active) {
      if (is_active_cell_computed) return computed_cell_draft;
      const row = filtered_rows.find((r) => r.id === active_cell.row_id);
      return String(row?.[active_cell.col_key as keyof LinkBuildingOrderRow] ?? "");
    }
    return active_cell_formula_text ?? (is_active_cell_computed ? "" : active_cell_value);
  })();

  /** The error a formula in the active cell evaluates to, explained in the formula bar. */
  const active_cell_error = (() => {
    if (!active_cell) return null;
    let error: FormulaError | null = null;
    if (active_cell.row_id === SUMMARY_ROW_ID) {
      error = getSummaryDisplay(active_cell.col_key)?.error ?? null;
    } else {
      const row_idx = row_index_by_id.get(active_cell.row_id);
      const formula_column = formula_column_by_key.get(active_cell.col_key);
      if (row_idx !== undefined) {
        error = formula_column
          ? getFormulaColumnDisplay(row_idx, formula_column).error
          : (getDataCellFormulaDisplay(row_idx, active_cell.col_key)?.error ?? null);
      }
    }
    return error ? { code: error.code, detail: error.detail } : null;
  })();

  const formula_bar_scope_label = !active_cell
    ? null
    : active_cell.row_id === SUMMARY_ROW_ID
      ? "Totals row"
      : isFormulaColumnKey(active_cell.col_key)
        ? "Fills every row"
        : null;

  /**
   * The cell the formula bar is editing, captured when the edit starts. Clicking
   * another cell selects it before the bar's blur commits, so the commit must not
   * read the active cell at that point.
   */
  const formula_bar_target_ref = useRef<CellRef | null>(null);

  const startFormulaBarEdit = (text: string) => {
    formula_bar_target_ref.current = active_cell;
    setFormulaBarDraft(text);
  };

  const commitFormulaBar = (direction: FormulaBarCommitDirection) => {
    const text = formula_bar_draft;
    const cell = formula_bar_target_ref.current;
    formula_bar_target_ref.current = null;
    setFormulaBarDraft(null);
    if (text === null || !cell) return;

    if (cell.row_id === SUMMARY_ROW_ID || isFormulaColumnKey(cell.col_key)) {
      saveComputedCellText(cell, text);
    } else {
      const row = rows_ref.current.find((r) => r.id === cell.row_id);
      if (row) {
        const old_value = String(row[cell.col_key as keyof LinkBuildingOrderRow] ?? "");
        const current_text = getCellFormulaText(cell) ?? old_value;
        if (text !== current_text) {
          applyDataCellInput(row, cell.col_key, text, {
            row_id: cell.row_id,
            col_key: cell.col_key,
            old_value,
            old_formula: getCellFormula(row, cell.col_key),
          });
        }
      }
    }
    if (direction) navigateCell(cell.row_id, cell.col_key, direction === "down" ? "down" : "next");
  };

  const cancelFormulaBar = () => {
    formula_bar_target_ref.current = null;
    setFormulaBarDraft(null);
    focusGrid();
  };

  /** Name box: jumps to an address such as "S14", selects a range ("B2:D9") or a column ("S:S"). */
  const handleNameBoxSubmit = (address: string): boolean => {
    const tokens = tokenizeFormula(address).filter((token) => token.type !== "whitespace");
    const spec = tokens.length === 1 && tokens[0].type === "ref" ? tokens[0].ref : undefined;
    if (!spec || spec.start.col?.index === undefined) return false;
    const col_key = column_mapper.getColumnKey(spec.start.col.index);
    if (!col_key || !grid_column_keys.includes(col_key)) return false;

    if (!spec.start.row) {
      selectEntireColumn(col_key);
      return true;
    }
    if (spec.start.row.kind !== "number") return false;
    const row_idx = spec.start.row.number - row_number_offset;
    if (row_idx === filtered_rows.length && show_summary_row) {
      selectSummaryCell(col_key);
      focusGrid();
      return true;
    }
    const row = filtered_rows[row_idx];
    if (!row) return false;
    const anchor = { row_id: row.id, col_key };
    selectCell(anchor, { scroll: true });

    const end = spec.end;
    if (end?.col?.index !== undefined && end.row?.kind === "number") {
      const end_col_key = column_mapper.getColumnKey(end.col.index);
      const end_row = filtered_rows[end.row.number - row_number_offset];
      const is_data_range =
        !!end_col_key &&
        !!end_row &&
        visible_columns.some((col) => col.key === col_key) &&
        visible_columns.some((col) => col.key === end_col_key);
      if (is_data_range) setCellRange({ anchor, focus: { row_id: end_row.id, col_key: end_col_key } });
    }
    focusGrid();
    return true;
  };

  // ── Functions reference ─────────────────────────────────────────────────────

  /** Inserts a function into the formula being typed, or starts a formula in the active cell. */
  const insertFunction = (function_name: string) => {
    setFunctionsAnchorEl(null);
    const insert = `${function_name}(`;
    const editor = active_formula_editor_ref.current;
    if (editor && document.activeElement === editor.element) {
      const text = editor.element.value;
      const caret = editor.element.selectionStart ?? text.length;
      editor.setText(text.slice(0, caret) + insert + text.slice(caret), caret + insert.length);
      return;
    }
    if (!is_active_cell_editable || !is_active_cell_formula_enabled) {
      setNotificationBanner(
        `Select a cell in a text, number or date column (or a formula column), then pick ${function_name} to start a formula.`
      );
      return;
    }
    const base = formula_bar_cell_text.trimStart().startsWith("=") ? formula_bar_cell_text : "=";
    const draft = `${base}${insert}`;
    startFormulaBarEdit(draft);
    requestAnimationFrame(() => {
      const input = formula_bar_input_ref.current;
      input?.focus();
      input?.setSelectionRange(draft.length, draft.length);
    });
  };

  // ── Formula columns ─────────────────────────────────────────────────────────

  /** Every referenceable column with its letter, for the "Insert column" picker of the dialog. */
  const formula_reference_columns = useMemo(
    () =>
      sheet_columns
        .map((column, idx) => ({
          key: column.key,
          letter: toColumnLetter(idx),
          label:
            COLUMN_LABELS[column.key] ?? ASSIGNMENT_COLUMN_LABELS[column.key] ?? formula_column_by_key.get(column.key)?.name ?? column.key,
        }))
        .filter((column) => formula_dialog?.mode !== "edit" || column.key !== formula_dialog.column.key),
    [sheet_columns, formula_column_by_key, formula_dialog]
  );

  /** Result of a formula column formula on the first rows, for the dialog's live preview. */
  const getFormulaPreview = useCallback(
    (formula: string, format: FormulaColumnFormat): FormulaPreviewRow[] => {
      const stored = toStoredFormula(formula, row_number_offset, column_mapper);
      return filtered_rows.slice(0, 5).map((row, idx) => {
        const result = sheet.evaluate(stored, idx);
        const is_error = result.value instanceof FormulaError;
        return {
          row_number: row_number_offset + idx,
          label: `${row.order_id} · ${row.client || "No company"}`,
          text: formatComputedResult(result, format, "text"),
          is_error,
          title: result.value instanceof FormulaError ? result.value.detail : undefined,
        };
      });
    },
    [row_number_offset, column_mapper, filtered_rows, sheet]
  );

  const submitFormulaColumn = async (draft: FormulaColumnDraft) => {
    if (!formula_dialog) return;
    const formula = toStoredFormula(draft.formula, row_number_offset, column_mapper);
    try {
      if (formula_dialog.mode === "create") {
        const column = await createFormulaColumn({ name: draft.name, formula, format: draft.format });
        setNotificationBanner(
          `Formula column "${column.name}" added as column ${toColumnLetter(sheet_columns.length)}, the whole team sees it.`
        );
      } else {
        await updateFormulaColumn(formula_dialog.column.id, { name: draft.name, formula, format: draft.format });
        setNotificationBanner(`Formula column "${draft.name}" updated on every row.`);
      }
      setFormulaDialog(null);
    } catch (err) {
      throw new Error(parseApiErrorMessage(err));
    }
  };

  const removeFormulaColumn = async () => {
    if (formula_dialog?.mode !== "edit") return;
    const { column } = formula_dialog;
    await deleteFormulaColumn(column.id);
    if (active_cell?.col_key === column.key) setActiveCell(null);
    setHiddenColumns((prev) => {
      if (!prev.has(column.key)) return prev;
      const next = new Set(prev);
      next.delete(column.key);
      return next;
    });
    setNotificationBanner(`Formula column "${column.name}" deleted.`);
    setFormulaDialog(null);
  };

  const toggleSummaryRow = () => {
    setIsSummaryRowVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SUMMARY_ROW_STORAGE_KEY, next ? "visible" : "hidden");
      } catch {
        // Storage unavailable, the choice just won't survive a reload.
      }
      return next;
    });
  };

  /** The column chooser lists the formula columns in a group of their own. */
  const column_visibility_groups = useMemo<ColumnVisibilityGroup[]>(
    () =>
      formula_columns.length === 0
        ? COLUMN_VISIBILITY_GROUPS
        : [
            ...COLUMN_VISIBILITY_GROUPS,
            {
              key: "formula_columns",
              label: "Formula columns",
              swatch_class: "bg-emerald-600",
              columns: formula_columns.map((column) => ({ key: column.key, label: column.name ?? column.key })),
            },
          ],
    [formula_columns]
  );

  // ── Full screen ─────────────────────────────────────────────────────────────

  const table_root_ref = useRef<HTMLDivElement>(null);

  // Locks the page scroll behind the full screen table, and lets Escape leave full
  // screen when nothing inside the grid (an edit, a range, a menu) is using the key.
  useEffect(() => {
    if (!is_fullscreen) return;
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[role="grid"], [role="dialog"], [role="search"], input, textarea, select')) return;
      setIsFullscreen(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previous_overflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [is_fullscreen]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <FormulaEditingContext.Provider value={formula_editing_context}>
    <div
      ref={table_root_ref}
      className={`${styles.table_root} ${
        is_fullscreen
          ? "fixed inset-0 z-[100000] flex flex-col bg-white dark:bg-gray-900"
          : // No overflow-hidden here: it would clip the toolbar popovers (Filter, Saved Filters, Import...)
            // when the table only has a few rows. The grid scrolls inside its own frame instead.
            "rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
      }`}
    >
      {/* Header: title, live collaborators and the table's main actions */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-gray-100 px-4 py-4 sm:px-5 dark:border-gray-800">
        <div className="flex min-w-0 flex-1 basis-80 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold leading-tight text-gray-900 dark:text-white">
                Link Building Orders
              </h2>
              <CollaborationBar collaborators={collaborators} ready_state={ready_state} />
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {!has_loaded_once ? (
                "Loading orders..."
              ) : (
                <span className={`transition-opacity duration-300 ${is_refreshing ? "opacity-50" : "opacity-100"}`}>
                  <span className="font-medium text-gray-700 tabular-nums dark:text-gray-200">{total.toLocaleString()}</span>{" "}
                  {total === 1 ? "order" : "orders"} &middot; {visible_columns.length} of {COLUMNS.length} columns
                  <span className="hidden md:inline"> &middot; Arrow keys to move, Enter or type to edit</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Undo / redo, Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z, reverts or replays the last cell edit, bulk paste, or batch fill */}
          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={undo}
              disabled={undo_stack.length === 0 || is_undo_redo_saving}
              title={
                undo_stack.length > 0
                  ? `Undo: ${undo_stack[undo_stack.length - 1].label} (${formatShortcut(["Mod", "Z"], is_mac)})`
                  : "Nothing to undo"
              }
              className="flex h-9 items-center gap-1 border-r border-gray-200 px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              {undo_stack.length > 0 && (
                <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                  {undo_stack.length}
                </span>
              )}
            </button>
            <button
              onClick={redo}
              disabled={redo_stack.length === 0 || is_undo_redo_saving}
              title={
                redo_stack.length > 0
                  ? `Redo: ${redo_stack[redo_stack.length - 1].label} (${formatShortcut(["Mod", "Shift", "Z"], is_mac)})`
                  : "Nothing to redo"
              }
              className="flex h-9 items-center gap-1 px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
              {redo_stack.length > 0 && (
                <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                  {redo_stack.length}
                </span>
              )}
            </button>
          </div>

          {/* Version history: every change kept by the server, restorable after a reload or by another admin */}
          <button
            onClick={() => openHistoryPanel(null)}
            className={toolbar_button_class}
            title="Version history: see who changed what and restore any change"
          >
            <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </button>

          <span className="hidden h-6 w-px bg-gray-200 sm:block dark:bg-gray-700" aria-hidden="true" />

          {/* Import dropdown */}
          <div ref={import_btn_ref} className="relative">
            <button
              onClick={() => setShowImportMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={show_import_menu}
              className={toolbar_button_class}
            >
              <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Import
              <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {show_import_menu && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-72 min-w-[18rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 xl:left-auto xl:right-0 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Import data</p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Upload a CSV file to create or update records</p>
                </div>

                {/* Option 1, full order import */}
                <button
                  onClick={() => {
                    setShowImportMenu(false);
                    setShowImportModal(true);
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Import Link Building Orders</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
                      Full order CSV, creates and updates rows matched by Order ID
                    </p>
                  </div>
                </button>

                <div className="mx-4 border-t border-gray-100 dark:border-gray-700" />

                {/* Option 2, metrics only update */}
                <button
                  onClick={() => {
                    setShowImportMenu(false);
                    setShowMetricsModal(true);
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.5m3-3v3m3-6v6m-9 3h12a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018 4.5H6a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 006 19.5z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Update Metrics</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
                      Bulk update DR Formula, Current Traffic, Current POC and Current Price,
                      matched by Partnership or Order ID
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Export dropdown */}
          <div ref={export_btn_ref} className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={is_exporting}
              aria-haspopup="menu"
              aria-expanded={show_export_menu}
              className={`${toolbar_button_class} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {is_exporting ? (
                <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <div className="absolute left-0 top-full z-50 mt-1.5 w-68 min-w-[17rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 sm:left-auto sm:right-0 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Export data</p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Download records as a CSV file</p>
                </div>

                {/* Option 1, export all filtered */}
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
                      {total.toLocaleString()} row{total !== 1 ? "s" : ""} &middot; applies current search &amp; filters
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
                            Company: {client_filter}
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

                <div className="mx-4 border-t border-gray-100 dark:border-gray-700" />

                {/* Option 2, export selected */}
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

          {/* Full screen, gives the grid the whole window so wide screens show as many columns as possible */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            title={is_fullscreen ? "Exit full screen (Esc)" : "Full screen, show as many columns as your screen allows"}
            aria-label={is_fullscreen ? "Exit full screen" : "Enter full screen"}
            aria-pressed={is_fullscreen}
            className={`${toolbar_button_class} w-9 justify-center px-0`}
          >
            {is_fullscreen ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>

          {/* Add row, split button with a bulk add dropdown */}
          <div ref={add_btn_ref} className="relative flex shadow-theme-xs">
            <button
              onClick={addRow}
              className="flex h-9 items-center gap-1.5 rounded-l-lg bg-brand-500 px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Row
            </button>
            <button
              onClick={() => setShowAddMenu((v) => !v)}
              title="Add multiple rows at once"
              aria-label="Add multiple rows at once"
              aria-haspopup="menu"
              aria-expanded={show_add_menu}
              className="flex h-9 items-center rounded-r-lg border-l border-brand-400 bg-brand-500 px-2 text-white transition-colors hover:bg-brand-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {show_add_menu && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/30">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Add multiple rows</p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Rows are added to the top of the table</p>
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

      {/* Toolbar: search, Company and Link type on the left, the approval view and the
          table tools on the right. Per status filtering lives in the Filter menu. */}
      <div className={styles.toolbar}>
        <div className={styles.search_group} role="search" aria-label="Search and narrow orders">
          <div className={`${styles.search_field} ${styles.search_field_main}`}>
            <svg className={styles.search_icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={search_input_ref}
              type="text"
              placeholder="Search order ID, keyword, company, status..."
              aria-label="Search orders"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.search_input}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className={styles.search_clear}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className={`${styles.search_field}${client_filter ? ` ${styles.search_field_active}` : ""}`}>
            <svg className={styles.search_icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            <input
              type="text"
              placeholder="Company..."
              aria-label="Filter by company"
              value={client_filter}
              onChange={(e) => setClientFilter(e.target.value)}
              className={styles.search_input}
            />
          </div>
          <LinkTypeFilterSelect
            value={link_type_filter}
            options={LINK_TYPE_OPTIONS}
            onChange={setLinkTypeFilter}
          />
        </div>

        <div className={styles.toolbar_actions}>
          {/* The client's most used view, kept one click away on the toolbar */}
          <NeedsApprovalToggle
            is_active={needs_approval_filter}
            pending_count={needs_approval_count}
            onToggle={toggleNeedsApprovalFilter}
          />
          <span className={styles.toolbar_divider} aria-hidden="true" />
          {/* Filter panel, monday style: Quick filters (click values) or Advanced filters (And / Or rules) */}
          <LinkBuildingFilterPanel
            is_open={is_filter_panel_open}
            onOpenChange={setIsFilterPanelOpen}
            is_advanced_mode={is_advanced_filter_mode}
            onModeChange={setIsAdvancedFilterMode}
            active_filter_count={panel_filter_count}
            result_count={total}
            total_count={quick_filter_values.total_count}
            is_loading={is_loading || quick_filter_values.is_loading}
            can_clear={active_filter_chips.length > 0 || hasAdvancedFilterRules(advanced_filters)}
            onClearAll={clearFilterChips}
            footer_note={filter_panel_footer_note}
            button_class={toolbar_split_button_class}
            active_button_class={toolbar_split_button_active_class}
          >
            {is_advanced_filter_mode ? (
              <AdvancedFilterPanel
                columns={ADVANCED_FILTER_COLUMNS}
                advanced_filters={advanced_filters}
                actions={advanced_filter_actions}
                loadValues={loadAdvancedFilterValues}
              />
            ) : (
              <QuickFilterPanel
                facets={quick_filter_facets}
                is_loading={quick_filter_values.is_loading || (is_quick_filter_search_active && quick_filter_search_values.is_loading)}
                has_error={quick_filter_values.has_error || (is_quick_filter_search_active && quick_filter_search_values.has_error)}
                query={quick_filter_query}
                onQueryChange={setQuickFilterQuery}
                onToggle={toggleQuickFilterOption}
                onClearFacet={clearQuickFilterColumn}
              />
            )}
          </LinkBuildingFilterPanel>
          {/* Saved filters, save the current view or reapply one in a single click */}
          <SavedFiltersMenu
            current_state={current_filter_state}
            has_active_filters={has_active_filters}
            applied_filter_id={applied_saved_filter_id}
            onAppliedFilterChange={setAppliedSavedFilterId}
            onApply={applySavedFilter}
            onNotify={setNotificationBanner}
          />
          {/* Column chooser */}
          <button
            onClick={() => setShowFilterPanel((v) => !v)}
            aria-expanded={show_filter_panel}
            className={
              show_filter_panel
                ? `${toolbar_button_base_class} border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300`
                : toolbar_button_class
            }
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Columns
            {hidden_columns.size > 0 && (
              <span className="rounded-full bg-brand-500 px-1.5 py-px text-[10px] font-semibold text-white">
                {hidden_columns.size} hidden
              </span>
            )}
          </button>
          {/* Spreadsheet formulas: add a formula column, show or hide the totals row */}
          <button
            onClick={() => setFormulaDialog({ mode: "create" })}
            title="Add a formula column, computed from the other columns on every row"
            aria-label="Add formula column"
            className={`${styles.icon_button} ${styles.icon_button_formula}`}
          >
            <span className={styles.fx_glyph} aria-hidden="true">fx</span>
          </button>
          <button
            onClick={toggleSummaryRow}
            title={is_summary_row_visible ? "Hide the totals row under the table" : "Show the totals row under the table, e.g. =SUM(AA:AA)"}
            aria-label="Totals row"
            aria-pressed={is_summary_row_visible}
            className={`${styles.icon_button}${is_summary_row_visible ? ` ${styles.icon_button_summary_active}` : ""}`}
          >
            <span className={styles.sigma_glyph} aria-hidden="true">Σ</span>
          </button>
          <span className={styles.toolbar_divider} aria-hidden="true" />
          {/* Find in table, highlights matches without filtering (Ctrl/Cmd+F) */}
          <button
            onClick={is_find_open ? handleCloseFind : openFind}
            title={`Find in table (${formatShortcut(["Mod", "F"], is_mac)}), highlights matches without hiding other rows`}
            aria-label="Find"
            aria-pressed={is_find_open}
            className={`${styles.icon_button}${is_find_open ? ` ${styles.icon_button_find_active}` : ""}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0zM8 10.5h5" />
            </svg>
          </button>
          {/* Keyboard shortcuts cheat sheet (Cmd/Ctrl+/) */}
          <button
            onClick={() => setIsShortcutsDialogOpen(true)}
            title={`Keyboard shortcuts (${formatShortcut(["Mod", "/"], is_mac)})`}
            aria-label="Keyboard shortcuts"
            className={styles.icon_button}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16.5v-9zM7 10h.01M11 10h.01M15 10h.01M7 14h10" />
            </svg>
          </button>
          {/* Reset filters, sort and hidden columns in one go */}
          {has_active_filters && (
            <button
              onClick={clearAllFilters}
              title="Clear every filter, sort and hidden column and show the table as usual"
              aria-label="Clear filters"
              className={`${styles.icon_button} ${styles.icon_button_danger}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Every active filter, from the toolbar and from the column menus, in one place */}
      <ActiveFiltersBar chips={active_filter_chips} onClearAll={clearFilterChips} />

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
                  title={`Paste "${clipboard_cell.value}" into "${paste_col_label}" for all selected rows (${formatShortcut(["Mod", "V"], is_mac)})`}
                >
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Paste &ldquo;{short_val}&rdquo; → {paste_col_label}
                  <kbd className="ml-1 rounded bg-indigo-500 px-1 py-0.5 font-mono text-[9px] opacity-75">{formatShortcut(["Mod", "V"], is_mac)}</kbd>
                </button>
                <div className="h-4 w-px shrink-0 bg-indigo-200 dark:bg-indigo-800" />
              </>
            );
          })()}

          {/* Copy hint — shown when no clipboard value yet */}
          {!clipboard_cell && (
            <span className="text-[11px] text-indigo-400 dark:text-indigo-500">
              Click a cell to edit, then press{" "}
              <kbd className="rounded bg-indigo-100 px-1 font-mono text-[9px] text-indigo-500 dark:bg-indigo-800 dark:text-indigo-400">{formatShortcut(["Mod", "C"], is_mac)}</kbd>{" "}
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
              const col_def = columns.find((c) => c.key === batch_field);
              if (!col_def) return null;
              if (col_def.dynamic_options && col_def.options) {
                // Runtime loaded options are suggestions only, so a free-text input
                // backed by a datalist lets the admin pick an existing value or type a new one.
                const datalist_id = `batch-options-${col_def.key}`;
                return (
                  <>
                    <input
                      type="text"
                      list={datalist_id}
                      placeholder={`Select or type ${col_def.label}…`}
                      value={batch_value}
                      onChange={(e) => setBatchValue(e.target.value)}
                      className="h-7 rounded border border-indigo-200 bg-white px-2 text-xs outline-none focus:border-indigo-400 dark:border-indigo-800 dark:bg-gray-800 dark:text-gray-200"
                      style={{ minWidth: 160 }}
                    />
                    <datalist id={datalist_id}>
                      {col_def.options.map((opt) => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                  </>
                );
              }
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

      {/* Column chooser, grouped the same way as the colored column headers */}
      {show_filter_panel && (
        <ColumnVisibilityPanel
          groups={column_visibility_groups}
          hidden_columns={hidden_columns}
          has_custom_widths={has_custom_widths}
          onToggleColumn={toggleColumn}
          onSetGroupHidden={setColumnsHidden}
          onShowAll={() => setHiddenColumns(new Set())}
          onResetWidths={resetAllColumnWidths}
        />
      )}

      {/* Formula bar: the active cell's address (type one to jump to it), the fx
          function reference, and its formula or full value, editable in place */}
      {has_loaded_once && (
        <FormulaBar
          name_box_label={name_box_label}
          onNameBoxSubmit={handleNameBoxSubmit}
          cell_text={formula_bar_cell_text}
          draft={formula_bar_draft}
          onDraftChange={setFormulaBarDraft}
          onStartEdit={() => startFormulaBarEdit(formula_bar_cell_text)}
          onCommit={commitFormulaBar}
          onCancel={cancelFormulaBar}
          is_editable={is_active_cell_editable && !editing_cell}
          is_formula={active_cell_formula_text !== null}
          formula_enabled={is_active_cell_formula_enabled}
          placeholder={
            !active_cell
              ? "Select a cell to see its full value. Type = in a cell to start a formula."
              : is_active_cell_editable
                ? `${active_column_label} is empty. Type a value, or = to start a formula.`
                : `${active_column_label} is empty`
          }
          error={active_cell_error}
          scope_label={formula_bar_scope_label}
          onOpenFunctions={(anchor_el) => setFunctionsAnchorEl((current) => (current ? null : anchor_el))}
          input_ref={formula_bar_input_ref}
        >
          {(range_badge || clipboard_cell) && (
            <div className={styles.formula_badges}>
              {/* Range selection badge, shows while a drag or Shift+Click multi cell range is active */}
              {range_badge && (
                <div
                  className="flex items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-300"
                  title={`Click and drag across cells (or Shift+Click) to select a range, then ${formatShortcut(["Mod", "C"], is_mac)} to copy or ${formatShortcut(["Mod", "V"], is_mac)} to paste`}
                >
                  <span className="font-semibold">
                    {range_badge.n_cells} cell{range_badge.n_cells !== 1 ? "s" : ""} selected
                  </span>
                  <span className="opacity-70">({range_badge.n_rows}×{range_badge.n_cols})</span>
                  <button
                    onClick={() => setCellRange(null)}
                    className="rounded p-0.5 opacity-50 transition-opacity hover:opacity-100"
                    title="Clear selection"
                    aria-label="Clear selection"
                  >
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              {/* Clipboard badge, shows when a cell value has been copied */}
              {clipboard_cell && (
                <div
                  className="flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300"
                  title={`Clipboard: "${clipboard_cell.value}" (${COLUMN_LABELS[clipboard_cell.col_key] ?? clipboard_cell.col_key}). Select rows then press ${formatShortcut(["Mod", "V"], is_mac)} to paste`}
                >
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-semibold">{COLUMN_LABELS[clipboard_cell.col_key] ?? clipboard_cell.col_key}:</span>
                  <span className="max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap opacity-80">
                    {clipboard_cell.value || "(empty)"}
                  </span>
                  <button
                    onClick={() => setClipboardCell(null)}
                    className="rounded p-0.5 opacity-50 transition-opacity hover:opacity-100"
                    title="Clear clipboard"
                    aria-label="Clear clipboard"
                  >
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </FormulaBar>
      )}

      {/* Function reference, opened from the fx button of the formula bar */}
      {functions_anchor_el && (
        <FunctionsReferencePanel
          anchor_el={functions_anchor_el}
          autofocus_search={!is_formula_pointing}
          onInsert={insertFunction}
          onClose={() => setFunctionsAnchorEl(null)}
        />
      )}

      <KeyboardShortcutsDialog
        is_open={is_shortcuts_dialog_open}
        is_mac={is_mac}
        onClose={closeShortcutsDialog}
      />

      <LinkBuildingOrderHistoryPanel
        is_open={history_panel !== null}
        row_id={history_panel?.row_id ?? null}
        column_labels={COLUMN_LABELS}
        onClose={closeHistoryPanel}
        onShowAllChanges={showAllHistory}
        onRestored={handleHistoryRestored}
      />

      {/* Find bar (Ctrl/Cmd+F) */}
      {is_find_open && (
        <TableFindBar
          query={find_query}
          find_terms={find_terms}
          match_count={find_matches.length}
          current_match_idx={find_current_match_idx}
          input_ref={find_input_ref}
          matched_row_count={find_matched_row_ids.size}
          is_loading_more_rows={is_loading_more_rows}
          onQueryChange={setFindQuery}
          onNext={goToNextMatch}
          onPrevious={goToPreviousMatch}
          onClose={handleCloseFind}
        />
      )}

      {/* Table body */}
      {!has_loaded_once ? (
        <TableSkeleton />
      ) : (
        <div
          className={`${styles.grid_frame} ${is_fullscreen ? "flex min-h-0 flex-1 flex-col" : ""}${is_refreshing ? ` ${styles.grid_refreshing}` : ""}`}
        >
        {/* Indeterminate bar shown over the grid while a filter, sort or page change loads */}
        <div className={styles.refresh_bar} aria-hidden="true" />
        <div
          ref={setTableScrollNode}
          tabIndex={0}
          role="grid"
          aria-label="Link building orders spreadsheet"
          aria-rowcount={filtered_rows.length}
          aria-busy={is_refreshing}
          onKeyDown={handleGridKeyDown}
          className={`w-full min-w-0 overflow-auto ${is_fullscreen ? "min-h-0 flex-1" : "max-h-[calc(100vh-200px)]"} ${styles.grid_container}${is_formula_pointing ? ` ${styles.grid_pointing}` : ""}`}
        >
          <table className={`text-xs ${styles.grid_table}`} style={{ width: table_width }}>
            {/* Exact column widths for the fixed table layout. The frozen columns'
                sticky offsets are computed from these same widths, so they always line up. */}
            <colgroup>
              <col style={{ width: ROW_HEADER_WIDTH }} />
              <col style={{ width: CHECKBOX_COL_WIDTH }} />
              {grid_column_keys.map((col_key) => (
                <col key={col_key} style={{ width: getColumnWidth(col_key) }} />
              ))}
              <col style={{ width: ACTIONS_COL_WIDTH }} />
            </colgroup>
            <thead className="sticky top-0 z-20">
              {/* Column letters, like the A, B, C header of a spreadsheet. Click one to select the column. */}
              <tr className={styles.letter_row}>
                <th
                  className={`sticky left-0 z-[32] ${styles.corner_header}`}
                  style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }}
                  aria-hidden="true"
                />
                <th
                  className={`sticky z-[31] ${styles.corner_header}`}
                  style={{ left: ROW_HEADER_WIDTH, width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}
                  aria-hidden="true"
                />
                {grid_column_keys.map((col_key, col_idx) => {
                  const col_def = visible_columns[col_idx];
                  const is_sticky_col = !!col_def?.sticky;
                  const is_filtered_col = filtered_columns[col_key] !== undefined;
                  const column_letter = getColumnLetter(col_key);
                  const ref_color = formula_highlights.columns.get(col_key);
                  return (
                    <th
                      key={col_key}
                      onMouseDown={(e) => {
                        skip_letter_click_ref.current = insertPointedColumn(col_key, e);
                      }}
                      onClick={() => {
                        if (skip_letter_click_ref.current) {
                          skip_letter_click_ref.current = false;
                          return;
                        }
                        selectEntireColumn(col_key);
                      }}
                      title={`Select column ${column_letter}${is_filtered_col ? ", filtered" : ""}`}
                      className={`${is_sticky_col ? "sticky z-[30]" : ""}${is_filtered_col ? ` ${styles.letter_filtered}` : ""}${isColumnHighlighted(col_idx) ? ` ${styles.header_highlighted}` : ""}${
                        ref_color !== undefined ? ` ${styles[`formula_ref_letter_${ref_color}`]}` : ""
                      }${isFormulaColumnKey(col_key) ? ` ${styles.letter_formula_column}` : ""}`}
                      style={is_sticky_col ? { left: sticky_left_offsets[col_key] } : undefined}
                    >
                      <div className={styles.letter_cell}>
                        {column_letter}
                        {is_filtered_col && (
                          <svg className={styles.letter_filter_icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                        )}
                        {/* Drag to resize the column, double click to reset it */}
                        <span
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Resize column ${column_letter}`}
                          title="Drag to resize · Double click to reset"
                          className={`${styles.resize_handle}${resizing_col_key === col_key ? ` ${styles.resize_handle_active}` : ""}`}
                          onMouseDown={(e) => startColumnResize(col_key, e)}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            resetColumnWidth(col_key);
                          }}
                        />
                      </div>
                    </th>
                  );
                })}
                <th className={styles.corner_header} aria-hidden="true" />
              </tr>
              <tr>
                {/* Row number gutter header */}
                <th
                  className="border border-gray-700/30 bg-gray-800 px-1 py-1.5 text-center text-[10px] font-semibold text-gray-300 sticky left-0 z-[32]"
                  style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }}
                >
                  #
                </th>
                {/* Select-all checkbox column, sticky so it stays visible while scrolling */}
                <th
                  className="border border-gray-700/30 bg-gray-800 px-2 py-1.5 text-center sticky z-[31]"
                  style={{ left: ROW_HEADER_WIDTH, width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}
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
                  const filter_indicator = filtered_columns[col.key];

                  return (
                    <th
                      key={col.key}
                      className={`${styles.column_header} text-left font-semibold tracking-wide ${GROUP_HEADER_STYLES[col.group]}${col.sticky ? " sticky z-[30]" : ""}${filter_indicator ? ` ${styles.column_header_filtered}` : ""}`}
                      style={col.sticky ? { left: sticky_left_offsets[col.key] } : undefined}
                      title={col.label}
                    >
                      <div className="flex min-w-0 items-center gap-1">
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
                          className={`flex min-w-0 flex-1 items-center gap-1 whitespace-nowrap text-left ${is_sortable ? "hover:opacity-75" : "cursor-default opacity-50"
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
                          <span className="truncate">{col.label}</span>
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

                        <ColumnHeaderFilterButton
                          column_label={col.label}
                          indicator={filter_indicator}
                          idle_title="Sort or filter this column"
                          onClick={(e) => toggleColumnFilter(col.key, e.currentTarget)}
                        />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyColumn(col.key);
                          }}
                          disabled={copying_column_key === col.key}
                          title={
                            selected_row_ids.size > 0
                              ? `Copy all "${col.label}" values from the ${selected_row_ids.size} selected row${selected_row_ids.size !== 1 ? "s" : ""} to the clipboard`
                              : `Copy all "${col.label}" values matching the current filters to the clipboard`
                          }
                          className="shrink-0 rounded p-0.5 opacity-30 transition-opacity hover:opacity-80 disabled:opacity-100"
                        >
                          {copying_column_key === col.key ? (
                            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </th>
                  );
                })}
                <th
                  className={`${styles.column_header} bg-teal-700 text-left text-xs font-semibold text-white${filtered_columns.user_id ? ` ${styles.column_header_filtered}` : ""}`}
                >
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="min-w-0 flex-1 truncate">Client Account</span>
                    <ColumnHeaderFilterButton
                      column_label="Client Account"
                      indicator={filtered_columns.user_id}
                      idle_title="Filter by client account"
                      onClick={(e) => toggleSpecialFilter("client_account", e.currentTarget)}
                    />
                  </div>
                </th>
                <th
                  className={`${styles.column_header} bg-indigo-700 text-left text-xs font-semibold text-white${filtered_columns.assigned_admin_user_id ? ` ${styles.column_header_filtered}` : ""}`}
                >
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="min-w-0 flex-1 truncate">Assigned To</span>
                    <ColumnHeaderFilterButton
                      column_label="Assigned To"
                      indicator={filtered_columns.assigned_admin_user_id}
                      idle_title="Filter by assigned user"
                      onClick={(e) => toggleSpecialFilter("assigned_to", e.currentTarget)}
                    />
                  </div>
                </th>
                {/* Formula columns: computed in the browser from the other columns, shared by the team */}
                {visible_formula_columns.map((column) => (
                  <th key={column.key} className={`${styles.column_header} ${styles.formula_column_header}`}>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className={styles.formula_column_badge} aria-hidden="true">fx</span>
                      <button
                        type="button"
                        onClick={() => setFormulaDialog({ mode: "edit", column })}
                        title={`${column.name}: ${getCellFormulaText({ row_id: filtered_rows[0]?.id ?? "", col_key: column.key }) ?? ""}\nClick to edit the formula, the name or the format`}
                        className="min-w-0 flex-1 truncate text-left hover:opacity-80"
                      >
                        {column.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormulaDialog({ mode: "edit", column })}
                        aria-label={`Edit formula column ${column.name}`}
                        className={styles.formula_column_edit}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                    </div>
                  </th>
                ))}
                <th
                  aria-label="Row actions"
                  className={`${styles.column_header} bg-gray-800 text-center text-xs font-semibold text-white`}
                >
                  <button
                    type="button"
                    onClick={() => setFormulaDialog({ mode: "create" })}
                    title="Add a formula column to the right of the table"
                    className={styles.add_formula_column}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>fx</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody key={rows_version} className={is_body_entering ? styles.grid_body_enter : undefined}>
              {filtered_rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={grid_column_keys.length + 3}
                    className="px-6 py-14 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    {search || status_filter || link_type_filter || client_filter
                      ? "No rows match the active filters."
                      : 'No link building orders found. Click "Add Row" to create one.'}
                  </td>
                </tr>
              ) : (
                <>
                {rows_padding_top > 0 && <VirtualRowsSpacer height={rows_padding_top} col_span={grid_column_keys.length + 3} />}
                {rendered_rows.map((row, rendered_idx) => {
                  const row_idx = rendered_start_index + rendered_idx;
                  const is_saving = saving_row_ids.has(row.id);
                  const is_new = new_row_ids_ref.current.has(row.id);
                  const is_multi_selected = selected_row_ids.has(row.id);
                  const row_collaborators = row_editors.get(row.id) ?? [];
                  const has_collaborators = !is_new && row_collaborators.length > 0;
                  const primary_editor = has_collaborators ? row_collaborators[0] : null;
                  const is_locally_selected =
                    !is_new && selected_row_id === row.id && !has_collaborators;
                  // In progress order whose partnership left the partner list (SITE REMOVED).
                  const is_site_removed = !is_new && isSiteRemovedAlert(row);

                  // Frozen cells sit on top of the columns scrolling underneath them,
                  // so their background must be fully opaque (no /opacity modifiers).
                  const sticky_row_bg_class = is_new
                    ? "bg-amber-50 dark:bg-amber-950"
                    : is_multi_selected
                    ? "bg-indigo-50 dark:bg-indigo-950"
                    : is_locally_selected
                    ? "bg-brand-50 dark:bg-brand-950"
                    : is_site_removed
                    ? "bg-red-50 dark:bg-red-950"
                    : "bg-white dark:bg-gray-900";

                  return (
                    <tr
                      key={row.id}
                      {...{ [VIRTUAL_ROW_ATTRIBUTE]: row_idx }}
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
                              : is_site_removed
                                ? "border-l-2 border-l-red-500 bg-red-50 dark:border-l-red-500 dark:bg-red-950/40"
                                : "bg-white dark:bg-gray-900"
                        } ${is_saving ? "opacity-60" : ""}`}
                      style={
                        primary_editor
                          ? {
                            borderLeftColor: primary_editor.color,
                            backgroundColor: `${primary_editor.color}14`,
                          }
                          : undefined
                      }
                    >
                      {/* Row number, click it to select the whole row */}
                      <td
                        className={`sticky left-0 z-[2] ${styles.row_header}${isRowHighlighted(row_idx) ? ` ${styles.header_highlighted}` : ""}${find_matched_row_ids.has(row.id) ? ` ${styles.row_header_find_match}` : ""}`}
                        style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectEntireRow(row.id);
                        }}
                        title={
                          is_site_removed
                            ? `Select row ${row_number_offset + row_idx}. Site removed, this partnership is no longer in the partner list, choose a different site.`
                            : `Select row ${row_number_offset + row_idx}`
                        }
                      >
                        {is_new ? "new" : row_number_offset + row_idx}
                      </td>
                      {/* Row checkbox, sticky so it stays aligned with the frozen column block */}
                      <td
                        className={`px-2 sticky z-[2] ${sticky_row_bg_class}`}
                        style={{ left: ROW_HEADER_WIDTH, width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}
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
                        const is_range_selected =
                          !!range_bounds &&
                          row_idx >= range_bounds.min_row && row_idx <= range_bounds.max_row &&
                          col_idx >= range_bounds.min_col && col_idx <= range_bounds.max_col;
                        const is_active =
                          active_cell?.row_id === row.id && active_cell?.col_key === col.key;
                        const find_match_state = getCellMatchState(row.id, col.key);
                        const formula_display = is_editing ? null : getDataCellFormulaDisplay(row_idx, col.key);
                        return (
                          <EditableCell
                            key={col.key}
                            col={col}
                            value={(row[col.key] as string) ?? ""}
                            formula_display={formula_display?.text}
                            formula_error={formula_display?.error}
                            formula_enabled={FORMULA_CELL_COLUMN_KEYS.has(col.key)}
                            formula_ref_color={formula_highlights.cells.get(toCellKey(row.id, col.key))}
                            is_editing={is_editing}
                            edit_entry={is_editing ? edit_entry : "edit"}
                            is_active={is_active}
                            cell_key={toCellKey(row.id, col.key)}
                            onCellDoubleClick={() => startEditing(row.id, col.key)}
                            onStartEdit={col.type === "date" ? () => startEditing(row.id, col.key) : undefined}
                            onFocusGrid={focusGrid}
                            onCancelEdit={cancelEditing}
                            is_draft={is_new}
                            is_first_col={is_first_col}
                            row_editors={is_first_col ? row_collaborators : []}
                            cell_editors={row_collaborators.filter(
                              (c) => c.focused_col_key === col.key
                            )}
                            onUpdate={(val) => updateCell(row.id, col.key, val)}
                            onStopEdit={stopEditing}
                            onKeyNav={(dir) => navigateCell(row.id, col.key, dir)}
                            onCopy={(val) => copyCellValue(val, col.key)}
                            onBulkPaste={(grid) => handleBulkPaste(row.id, col.key, grid)}
                            onCellMouseDown={(e) => handleCellMouseDown(row.id, col.key, e)}
                            onCellMouseEnter={() => handleCellMouseEnter(row.id, col.key)}
                            onCellMouseUp={handleCellMouseUp}
                            is_range_selected={is_range_selected}
                            is_sticky={col.sticky}
                            sticky_left={col.sticky ? sticky_left_offsets[col.key] : undefined}
                            sticky_bg_class={col.sticky ? sticky_row_bg_class : undefined}
                            find_match_state={find_match_state}
                            find_terms={find_match_state ? find_terms : undefined}
                            article_fallback_title={col.key === "article" ? row.article_title ?? "" : undefined}
                            recent_domain_usage={col.key === "partnership" && !is_new ? row.recent_domain_usage : null}
                            landing_page={col.key === "partnership" ? row.landing_page : undefined}
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
                        is_active={active_cell?.row_id === row.id && active_cell?.col_key === "user_id"}
                        onSelectCell={() => selectCell({ row_id: row.id, col_key: "user_id" })}
                        cell_key={toCellKey(row.id, "user_id")}
                        find_match_state={getCellMatchState(row.id, "user_id")}
                        find_terms={getCellMatchState(row.id, "user_id") ? find_terms : undefined}
                      />
                      {/* Assign admin user cell */}
                      <UserAssignCell
                        assigned_admin_user_id={row.assigned_admin_user_id}
                        admin_users={admin_users}
                        is_editing={editing_cell?.row_id === row.id && editing_cell?.col_key === "assigned_admin_user_id"}
                        onStartEdit={() => startEditing(row.id, "assigned_admin_user_id")}
                        onAssignUser={(val) => handleAssignUserChange(row.id, val)}
                        onCancelEdit={cancelAssignEdit}
                        is_active={active_cell?.row_id === row.id && active_cell?.col_key === "assigned_admin_user_id"}
                        onSelectCell={() => selectCell({ row_id: row.id, col_key: "assigned_admin_user_id" })}
                        cell_key={toCellKey(row.id, "assigned_admin_user_id")}
                        find_match_state={getCellMatchState(row.id, "assigned_admin_user_id")}
                        find_terms={getCellMatchState(row.id, "assigned_admin_user_id") ? find_terms : undefined}
                      />
                      {/* Formula column cells: the column's formula evaluated on this row */}
                      {visible_formula_columns.map((column) => {
                        const cell_key = toCellKey(row.id, column.key);
                        const display = getFormulaColumnDisplay(row_idx, column);
                        const find_match_state = getCellMatchState(row.id, column.key);
                        return (
                          <ComputedCell
                            key={column.key}
                            text={display.text}
                            error={display.error}
                            is_numeric={display.is_numeric}
                            is_active={active_cell?.row_id === row.id && active_cell?.col_key === column.key}
                            is_editing={editing_cell?.row_id === row.id && editing_cell?.col_key === column.key}
                            draft={computed_cell_draft}
                            onDraftChange={setComputedCellDraft}
                            onCommit={commitComputedCell}
                            onCancel={cancelEditing}
                            onCellMouseDown={(e) => {
                              if (!insertPointedReference(row.id, column.key, e)) selectCell({ row_id: row.id, col_key: column.key });
                            }}
                            onCellMouseEnter={() => extendPointedReference(row.id, column.key)}
                            onDoubleClick={() => startEditing(row.id, column.key)}
                            cell_key={cell_key}
                            title={`${column.name} · Double click or Enter to edit the column formula, it applies to every row`}
                            class_name={styles.formula_column_cell}
                            find_match_state={find_match_state}
                            find_terms={find_match_state ? find_terms : undefined}
                            formula_ref_color={formula_highlights.cells.get(cell_key)}
                          />
                        );
                      })}

                      {/* Actions cell */}
                      <td className="w-px whitespace-nowrap px-2">
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
                            {!is_new && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openHistoryPanel(row.id);
                                }}
                                className="rounded p-1 text-gray-300 opacity-0 transition-all hover:bg-brand-50 hover:text-brand-600 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                title="Edit history of this row"
                                aria-label={`Edit history of ${row.order_id || "this row"}`}
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
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
                })}
                {rows_padding_bottom > 0 && <VirtualRowsSpacer height={rows_padding_bottom} col_span={grid_column_keys.length + 3} />}
                </>
              )}
            </tbody>
            {/* Totals row: one formula per column over every row matching the filters, e.g.
                =SUM(AA:AA) under Final Price. Shared by the whole team. */}
            {show_summary_row && (
              <tfoot className={styles.summary_footer}>
                <tr className={styles.summary_row}>
                  <td
                    className={`sticky left-0 z-[3] ${styles.row_header} ${styles.summary_row_header}`}
                    title="Totals row: double click a cell (or select it and type =) to add a formula such as =SUM(AA:AA)"
                  >
                    Σ
                  </td>
                  <td className={`sticky z-[3] ${styles.summary_spacer}`} style={{ left: ROW_HEADER_WIDTH }} />
                  {grid_column_keys.map((col_key) => {
                    const display = getSummaryDisplay(col_key);
                    const cell = { row_id: SUMMARY_ROW_ID, col_key };
                    const is_sticky_col = !!visible_columns.find((col) => col.key === col_key)?.sticky;
                    return (
                      <ComputedCell
                        key={col_key}
                        text={display?.text ?? ""}
                        error={display?.error ?? null}
                        is_numeric={display?.is_numeric ?? false}
                        is_active={active_cell?.row_id === SUMMARY_ROW_ID && active_cell?.col_key === col_key}
                        is_editing={editing_cell?.row_id === SUMMARY_ROW_ID && editing_cell?.col_key === col_key}
                        draft={computed_cell_draft}
                        onDraftChange={setComputedCellDraft}
                        onCommit={commitComputedCell}
                        onCancel={cancelEditing}
                        onCellMouseDown={() => selectSummaryCell(col_key)}
                        onDoubleClick={() => startEditing(SUMMARY_ROW_ID, col_key)}
                        cell_key={toCellKey(cell.row_id, col_key)}
                        title={
                          display
                            ? `${getCellFormulaText(cell) ?? ""} · Double click to edit`
                            : "Double click to add a formula, e.g. =SUM, =AVERAGE or =COUNTIF over this column"
                        }
                        placeholder="fx"
                        class_name={styles.summary_cell}
                        sticky_left={is_sticky_col ? sticky_left_offsets[col_key] : undefined}
                        sticky_bg_class={styles.summary_sticky_bg}
                      />
                    );
                  })}
                  <td className={styles.summary_spacer} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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

      {/* Add or edit a formula column. Keyed so its fields reset for each column. */}
      {formula_dialog && (
        <FormulaColumnDialog
          key={formula_dialog.mode === "edit" ? formula_dialog.column.key : "create"}
          mode={formula_dialog.mode}
          initial={
            formula_dialog.mode === "edit"
              ? {
                  name: formula_dialog.column.name ?? "",
                  formula: toDisplayFormula(formula_dialog.column.formula, row_number_offset, column_mapper),
                  format: formula_dialog.column.format,
                }
              : { name: "", formula: "=", format: "auto" }
          }
          first_row_number={row_number_offset}
          reference_columns={formula_reference_columns}
          getPreview={getFormulaPreview}
          onSubmit={submitFormulaColumn}
          onDelete={formula_dialog.mode === "edit" ? removeFormulaColumn : undefined}
          onClose={() => setFormulaDialog(null)}
        />
      )}

      {/* Per-column spreadsheet style sort and filter menu. Keyed by column so its
          staged selections reset when another column's menu is opened. */}
      {open_filter_col && open_filter_column_def && (
        <SheetColumnFilterDropdown
          key={open_filter_col}
          col_label={open_filter_column_def.label}
          is_sortable={open_filter_column_def.sortable !== false}
          sort_direction={
            sort_rules.length === 1 && sort_rules[0].key === (open_filter_column_def.sort_key ?? open_filter_col)
              ? sort_rules[0].direction
              : null
          }
          current_filter={sheet_filters[open_filter_col]}
          anchor_el={filter_anchor_el}
          loadValues={loadFilterValues}
          onSort={(direction) => setSort(open_filter_column_def.sort_key ?? open_filter_col, direction)}
          onApply={(filter) => setSheetFilter(open_filter_col, filter)}
          onClose={closeColumnFilter}
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

      {/* Footer: rows loaded out of the matching ones, columns shown and the selection summary */}
      <TableStatusFooter
        is_loading={is_loading}
        has_loaded_once={has_loaded_once}
        total={total}
        loaded_row_count={loaded_server_row_count}
        is_loading_more_rows={is_loading_more_rows}
        visible_column_count={visible_columns.length}
        total_column_count={COLUMNS.length}
        selection_summary={<SelectionStatsBar stats={range_stats} cell_count={range_badge?.n_cells ?? 0} />}
      />
    </div>
    </FormulaEditingContext.Provider>
  );
}
