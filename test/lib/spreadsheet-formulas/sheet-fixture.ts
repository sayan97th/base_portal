/**
 * Shared helpers for the formula engine tests: builds a sheet from plain rows the
 * way the Link Building Orders table does (raw text typed by column kind, formulas
 * stored in the column key notation) and evaluates A1 formulas against it.
 */

import {
  FormulaError,
  columnLetterToIndex,
  createFormulaSheet,
  toStoredFormula,
  type ColumnKeyMapper,
  type FormulaResult,
  type FormulaSheet,
  type Scalar,
  type SheetColumn,
} from "@/lib/spreadsheet-formulas";

/** "Now" of every test sheet: Wednesday 10/21/2026 09:30. */
export const TEST_NOW = new Date(2026, 9, 21, 9, 30, 0);

/**
 * The addressable columns of the Link Building Orders table, in letter order, as
 * BASE_SHEET_COLUMNS in LinkBuildingOrdersTable builds them (A to AB the table
 * columns, AC Client Account, AD Assigned To), so formulas read the same letters.
 */
export const LINK_BUILDING_ORDER_COLUMNS: SheetColumn[] = [
  { key: "order_id", kind: "text" }, // A
  { key: "status", kind: "text" }, // B
  { key: "team_specific_link_id", kind: "text" }, // C
  { key: "link_type", kind: "text" }, // D
  { key: "client", kind: "text" }, // E
  { key: "keyword", kind: "text" }, // F
  { key: "landing_page", kind: "text" }, // G
  { key: "exact_match", kind: "text" }, // H
  { key: "notes", kind: "text" }, // I
  { key: "internal_notes", kind: "text" }, // J
  { key: "request_date", kind: "date" }, // K
  { key: "estimated_delivery_date", kind: "date" }, // L
  { key: "pen_name", kind: "text" }, // M
  { key: "partnership", kind: "text" }, // N
  { key: "article_title", kind: "text" }, // O
  { key: "article", kind: "text" }, // P
  { key: "live_link", kind: "text" }, // Q
  { key: "live_link_date", kind: "date" }, // R
  { key: "dr_lbs", kind: "number" }, // S
  { key: "posting_fee_lbs", kind: "number" }, // T
  { key: "current_traffic", kind: "number" }, // U
  { key: "dr_formula", kind: "number" }, // V
  { key: "current_poc", kind: "text" }, // W
  { key: "current_price", kind: "number" }, // X
  { key: "lb_tl_approval", kind: "text" }, // Y
  { key: "approval_date", kind: "date" }, // Z
  { key: "final_price", kind: "number" }, // AA
  { key: "currency", kind: "text" }, // AB
  { key: "user_id", kind: "text" }, // AC
  { key: "assigned_admin_user_id", kind: "text" }, // AD
];

export interface TestSheetOptions {
  /** Columns in letter order, index 0 is column A. */
  columns: SheetColumn[];
  /** Raw cell text of each row, by column key. */
  rows: Array<Record<string, string>>;
  /** Cell formulas in A1 notation, keyed by the cell address they are typed in ("D2"). */
  cell_formulas?: Record<string, string>;
  /** Formula columns in A1 notation written for row 1, keyed by column letter ("K"). */
  column_formulas?: Record<string, string>;
  now?: Date;
  row_number_offset?: number;
}

export interface TestSheet {
  sheet: FormulaSheet;
  mapper: ColumnKeyMapper;
  /** Evaluates an A1 formula as if typed on the given row (1 based, like the row gutter). */
  evaluate(formula: string, row_number?: number): Scalar;
  /** Same as evaluate, with the inferred date format. */
  evaluateResult(formula: string, row_number?: number): FormulaResult;
  /** Value of a cell by its A1 address, evaluating its formula when it has one. */
  valueAt(address: string): Scalar;
}

export function createColumnMapper(columns: SheetColumn[]): ColumnKeyMapper {
  return {
    getColumnKey: (col_idx) => columns[col_idx]?.key ?? null,
    getColumnIndex: (col_key) => {
      const index = columns.findIndex((column) => column.key === col_key);
      return index === -1 ? null : index;
    },
  };
}

function parseAddress(address: string): { col_idx: number; row_number: number } {
  const match = /^([A-Z]+)(\d+)$/.exec(address);
  if (!match) throw new Error(`"${address}" is not a cell address.`);
  return { col_idx: columnLetterToIndex(match[1]), row_number: Number(match[2]) };
}

export function createTestSheet(options: TestSheetOptions): TestSheet {
  const { columns, rows } = options;
  const row_number_offset = options.row_number_offset ?? 1;
  const mapper = createColumnMapper(columns);

  const stored_cell_formulas = new Map<string, string>();
  for (const [address, formula] of Object.entries(options.cell_formulas ?? {})) {
    const { col_idx, row_number } = parseAddress(address);
    const row_idx = row_number - row_number_offset;
    stored_cell_formulas.set(`${row_idx}:${columns[col_idx].key}`, toStoredFormula(formula, row_number, mapper));
  }

  const stored_column_formulas = new Map<string, string>();
  for (const [letter, formula] of Object.entries(options.column_formulas ?? {})) {
    const col_key = columns[columnLetterToIndex(letter)].key;
    stored_column_formulas.set(col_key, toStoredFormula(formula, row_number_offset, mapper));
  }

  const sheet = createFormulaSheet({
    columns,
    row_count: rows.length,
    row_number_offset,
    now: options.now ?? TEST_NOW,
    getRawValue: (row_idx, col_key) => rows[row_idx]?.[col_key] ?? "",
    getFormula: (row_idx, col_key) =>
      stored_column_formulas.get(col_key) ?? stored_cell_formulas.get(`${row_idx}:${col_key}`) ?? null,
  });

  const evaluateResult = (formula: string, row_number = row_number_offset): FormulaResult =>
    sheet.evaluate(toStoredFormula(formula, row_number, mapper), row_number - row_number_offset);

  return {
    sheet,
    mapper,
    evaluateResult,
    evaluate: (formula, row_number) => evaluateResult(formula, row_number).value,
    valueAt: (address) => {
      const { col_idx, row_number } = parseAddress(address);
      return sheet.getValue(row_number - row_number_offset, columns[col_idx].key);
    },
  };
}

/** The error code of a value, or null when it is not an error. */
export function errorCode(value: Scalar): string | null {
  return value instanceof FormulaError ? value.code : null;
}
