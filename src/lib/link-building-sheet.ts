/**
 * Glue between the Link Building Orders table and the spreadsheet formula engine
 * (src/lib/spreadsheet-formulas): which cells may hold a formula, how the loaded
 * rows become a recalculating sheet, and how a formula result is written back into
 * a typed column of the table.
 */

import {
  createFormulaSheet,
  formatDateSerial,
  formatGeneralNumber,
  formatScalar,
  FormulaError,
  type ColumnKeyMapper,
  type FormulaResult,
  type FormulaSheet,
  type SheetColumn,
  type SheetColumnKind,
} from "@/lib/spreadsheet-formulas";
import type { LinkBuildingOrderRow } from "@/types/admin/link-building-order";

/**
 * Columns whose cells accept a formula, kept in sync with FORMULA_COLUMNS on the
 * backend (LinkBuildingOrderPlacement). Status, Exact Match, Currency, Order ID
 * and the URL columns only take fixed values, and a recalculated Status would
 * send client emails, so they stay plain value columns.
 */
export const FORMULA_CELL_COLUMN_KEYS: ReadonlySet<string> = new Set([
  "team_specific_link_id", "client", "keyword", "notes", "internal_notes",
  "request_date", "estimated_delivery_date", "article_title", "live_link_date",
  "dr_lbs", "posting_fee_lbs", "current_traffic", "dr_formula", "current_poc",
  "current_price", "lb_tl_approval", "approval_date", "final_price",
]);

const FORMULA_COLUMN_KEY_PATTERN = /^formula_\d+$/;

/** Formula columns are keyed "formula_{id}", in hidden columns, widths and the grid alike. */
export function isFormulaColumnKey(key: string): boolean {
  return FORMULA_COLUMN_KEY_PATTERN.test(key);
}

export const SUMMARY_ROW_ID = "__summary__";

/** The stored formula of a data cell, or null when it holds a plain value. */
export function getCellFormula(row: LinkBuildingOrderRow, col_key: string): string | null {
  if (!FORMULA_CELL_COLUMN_KEYS.has(col_key)) return null;
  return row.cell_formulas?.[col_key] ?? null;
}

/** The row's formulas map with one cell's formula set (or removed when null). Null once empty. */
export function withCellFormula(
  cell_formulas: LinkBuildingOrderRow["cell_formulas"],
  col_key: string,
  formula: string | null
): Record<string, string> | null {
  const next = { ...(cell_formulas ?? {}) };
  if (formula === null) delete next[col_key];
  else next[col_key] = formula;
  return Object.keys(next).length > 0 ? next : null;
}

/**
 * Text a formula result is saved as in a column of the given kind, which is also
 * what the cell shows: dates as MM/DD/YYYY, numbers without float noise. A date
 * column never stores an error code, it is left empty instead so date sorting and
 * filtering keep working.
 */
export function toFieldValue(result: FormulaResult, kind: SheetColumnKind): string {
  const { value, format } = result;
  if (kind === "date") {
    if (typeof value === "number") return formatDateSerial(value);
    if (value instanceof FormulaError) return "";
    return formatScalar(value);
  }
  if (kind === "number" && typeof value === "number") return formatGeneralNumber(value);
  return formatScalar(value, format);
}

/** Maps column letters to column keys and back, for the A1 / stored formula notations. */
export function createColumnKeyMapper(columns: ReadonlyArray<SheetColumn>): ColumnKeyMapper {
  const index_by_key = new Map(columns.map((column, index) => [column.key, index]));
  return {
    getColumnKey: (col_idx) => columns[col_idx]?.key ?? null,
    getColumnIndex: (col_key) => index_by_key.get(col_key) ?? null,
  };
}

export interface OrdersSheetConfig {
  /** Every addressable column in letter order: table columns, assignment columns, formula columns. */
  columns: SheetColumn[];
  /** Stored formula of each formula column, by its key. */
  column_formulas: ReadonlyMap<string, string>;
  /** Row number of the first loaded row, as shown in the row gutter. */
  row_number_offset: number;
  /** Text an assignment cell (Client Account, Assigned To) shows, so formulas read names, not ids. */
  getAssignmentText(row: LinkBuildingOrderRow, col_key: string): string | null;
}

/**
 * Builds the sheet for the loaded rows. `formula_overrides` replaces the formula
 * of some cells (key "row_id:col_key", null for a plain value), which is how a
 * formula being committed is evaluated before it is part of the row.
 */
export function buildOrdersSheet(
  rows: ReadonlyArray<LinkBuildingOrderRow>,
  config: OrdersSheetConfig,
  formula_overrides?: ReadonlyMap<string, string | null>
): FormulaSheet {
  return createFormulaSheet({
    columns: config.columns,
    row_count: rows.length,
    row_number_offset: config.row_number_offset,
    getRawValue: (row_idx, col_key) => {
      const row = rows[row_idx];
      if (!row) return "";
      const assignment_text = config.getAssignmentText(row, col_key);
      if (assignment_text !== null) return assignment_text;
      return String(row[col_key as keyof LinkBuildingOrderRow] ?? "");
    },
    getFormula: (row_idx, col_key) => {
      const column_formula = config.column_formulas.get(col_key);
      if (column_formula !== undefined) return column_formula;
      const row = rows[row_idx];
      if (!row) return null;
      const override_key = `${row.id}:${col_key}`;
      if (formula_overrides?.has(override_key)) return formula_overrides.get(override_key) ?? null;
      return getCellFormula(row, col_key);
    },
  });
}

/**
 * Every formula cell of the rows whose computed value differs from the value the
 * row holds, with the value it should hold. Used to refresh dependent formulas
 * after an edit, and to sync recalculated values to the database.
 */
export function collectStaleFormulaCells(
  rows: ReadonlyArray<LinkBuildingOrderRow>,
  sheet: FormulaSheet,
  kind_by_key: ReadonlyMap<string, SheetColumnKind>,
  shouldInclude: (row: LinkBuildingOrderRow, col_key: string, formula: string) => boolean = () => true
): Array<{ row_id: string; col_key: string; value: string }> {
  const stale: Array<{ row_id: string; col_key: string; value: string }> = [];
  rows.forEach((row, row_idx) => {
    if (!row.cell_formulas) return;
    for (const [col_key, formula] of Object.entries(row.cell_formulas)) {
      if (!FORMULA_CELL_COLUMN_KEYS.has(col_key) || !shouldInclude(row, col_key, formula)) continue;
      const result = sheet.getFormulaResult(row_idx, col_key);
      if (!result) continue;
      const value = toFieldValue(result, kind_by_key.get(col_key) ?? "text");
      if (value !== String(row[col_key as keyof LinkBuildingOrderRow] ?? "")) {
        stale.push({ row_id: row.id, col_key, value });
      }
    }
  });
  return stale;
}
