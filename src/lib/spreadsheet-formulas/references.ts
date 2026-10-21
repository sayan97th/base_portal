/**
 * Cell references of the formula engine, in the two spellings it understands:
 *
 * - A1 notation, what people type and read: B5, $C$2, A2:D10, A:A, A2:A, 3:3.
 * - The stored notation saved with a formula: [final_price:~0], [$dr_lbs:$12],
 *   [status]:[status]. Columns are named by their key instead of their letter and
 *   relative rows are an offset from the formula's own row, so a saved formula
 *   keeps pointing at the same data when columns are hidden or reordered, rows are
 *   sorted, or the formula is shown on another page of the table.
 *
 * A formula is converted to the stored notation when it is saved (toStoredFormula)
 * and back to A1 for the row it is displayed on (toDisplayFormula).
 */

import { toColumnLetter } from "@/lib/spreadsheet-navigation";
import { tokenizeFormula, type FormulaToken } from "./tokenizer";

export interface ColumnPart {
  /** Zero based column index, from a letter (A1 notation). */
  index?: number;
  /** Column key (stored notation). */
  key?: string;
  absolute: boolean;
}

export type RowPart =
  /** A row number as displayed in the row gutter. Relative unless `absolute`. */
  | { kind: "number"; number: number; absolute: boolean }
  /** Rows below (positive) or above (negative) the formula's own row. Stored notation only. */
  | { kind: "offset"; offset: number };

/** One corner of a reference. A null column is a whole row, a null row a whole column. */
export interface RefEndpoint {
  col: ColumnPart | null;
  row: RowPart | null;
}

export interface ReferenceSpec {
  start: RefEndpoint;
  /** Null for a single cell. */
  end: RefEndpoint | null;
}

export { columnLetterToIndex } from "./tokenizer";

// ── Notation conversion ────────────────────────────────────────────────────────

/** Maps columns between their letter index and their key, for the table being edited. */
export interface ColumnKeyMapper {
  getColumnKey(col_idx: number): string | null;
  getColumnIndex(col_key: string): number | null;
}

const REF_ERROR = "#REF!";

function endpointToStored(endpoint: RefEndpoint, row_number: number, mapper: ColumnKeyMapper): string | null {
  let col_text = "*";
  if (endpoint.col) {
    const key = endpoint.col.key ?? (endpoint.col.index !== undefined ? mapper.getColumnKey(endpoint.col.index) : null);
    if (!key) return null;
    col_text = `${endpoint.col.absolute ? "$" : ""}${key}`;
  }

  if (!endpoint.row) return `[${col_text}]`;
  if (endpoint.row.kind === "offset") return `[${col_text}:~${endpoint.row.offset}]`;
  if (endpoint.row.absolute) return `[${col_text}:$${endpoint.row.number}]`;
  return `[${col_text}:~${endpoint.row.number - row_number}]`;
}

function endpointToA1(endpoint: RefEndpoint, row_number: number, mapper: ColumnKeyMapper): string | null {
  let col_text = "";
  if (endpoint.col) {
    const index = endpoint.col.index ?? (endpoint.col.key ? mapper.getColumnIndex(endpoint.col.key) : null);
    if (index === null || index === undefined) return null;
    col_text = `${endpoint.col.absolute ? "$" : ""}${toColumnLetter(index)}`;
  }

  if (!endpoint.row) return col_text;
  if (endpoint.row.kind === "offset") {
    const number = row_number + endpoint.row.offset;
    return number < 1 ? null : `${col_text}${number}`;
  }
  return `${col_text}${endpoint.row.absolute ? "$" : ""}${endpoint.row.number}`;
}

function referenceToText(
  spec: ReferenceSpec,
  convert: (endpoint: RefEndpoint) => string | null
): string {
  const start = convert(spec.start);
  const end = spec.end ? convert(spec.end) : "";
  if (start === null || end === null) return REF_ERROR;
  return spec.end ? `${start}:${end}` : start;
}

/** Rewrites every reference token of a formula, leaving the rest of the text untouched. */
export function rewriteReferences(formula: string, rewrite: (spec: ReferenceSpec) => string): string {
  return tokenizeFormula(formula)
    .map((token: FormulaToken) => (token.type === "ref" && token.ref ? rewrite(token.ref) : token.text))
    .join("");
}

/**
 * Converts a formula typed in A1 notation on the row numbered `row_number` to the
 * stored notation. References to columns that do not exist become #REF!.
 */
export function toStoredFormula(formula: string, row_number: number, mapper: ColumnKeyMapper): string {
  return rewriteReferences(formula, (spec) =>
    referenceToText(spec, (endpoint) => endpointToStored(endpoint, row_number, mapper))
  );
}

/**
 * Converts a stored formula to A1 notation as seen from the row numbered
 * `row_number`. References to removed columns, or above the first row, become #REF!.
 */
export function toDisplayFormula(formula: string, row_number: number, mapper: ColumnKeyMapper): string {
  return rewriteReferences(formula, (spec) =>
    referenceToText(spec, (endpoint) => endpointToA1(endpoint, row_number, mapper))
  );
}

// ── Inspection ─────────────────────────────────────────────────────────────────

export interface FormulaReferenceMatch {
  spec: ReferenceSpec;
  /** Position of the reference inside the formula text. */
  start: number;
  end: number;
}

/** Every reference of a formula with its position, used to color the referenced cells while editing. */
export function findReferences(formula: string): FormulaReferenceMatch[] {
  return tokenizeFormula(formula)
    .filter((token) => token.type === "ref" && token.ref)
    .map((token) => ({ spec: token.ref!, start: token.start, end: token.end }));
}

/** A1 text of a single cell or a rectangular range, used when clicking cells while typing a formula. */
export function toA1Range(
  start: { col_idx: number; row_number: number },
  end: { col_idx: number; row_number: number } | null
): string {
  const start_text = `${toColumnLetter(start.col_idx)}${start.row_number}`;
  if (!end || (end.col_idx === start.col_idx && end.row_number === start.row_number)) return start_text;
  const min_col = Math.min(start.col_idx, end.col_idx);
  const max_col = Math.max(start.col_idx, end.col_idx);
  const min_row = Math.min(start.row_number, end.row_number);
  const max_row = Math.max(start.row_number, end.row_number);
  return `${toColumnLetter(min_col)}${min_row}:${toColumnLetter(max_col)}${max_row}`;
}
