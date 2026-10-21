/**
 * A recalculating sheet over a table's rows.
 *
 * Each column is addressed by its letter (its index in `columns`) and holds raw
 * text, typed by the column kind (dates and numbers are read as numbers, like a
 * spreadsheet does with typed values). A cell may instead hold a formula, either
 * its own (a cell formula) or its column's (a formula column). Formula cells are
 * evaluated on first read and memoized for the life of the sheet, so build a new
 * sheet whenever the rows change. A formula that ends up reading itself through
 * its references evaluates to a #REF! circular dependency error.
 */

import {
  evaluateNode,
  inferResultFormat,
  buildRangeValues,
  toScalar,
  type EvaluationContext,
  type ResolvedRange,
} from "./evaluator";
import type { InferredFormat } from "./format";
import { VOLATILE_FUNCTION_NAMES } from "./functions";
import { collectFunctionNames, collectReferenceSpecs, parseFormula, type FormulaNode } from "./parser";
import type { ColumnPart, ReferenceSpec } from "./references";
import { FormulaError, isStackOverflow, parseDateText, parseNumberText, type Matrix, type Scalar } from "./values";

/** How a column's raw text is read: "1,250" is a number in a number column, "10/21/2026" a date in a date column. */
export type SheetColumnKind = "text" | "number" | "date";

export interface SheetColumn {
  key: string;
  kind: SheetColumnKind;
}

export interface FormulaResult {
  value: Scalar;
  /** Date format inferred from the formula, null for a plain value. */
  format: InferredFormat | null;
}

export interface FormulaSheetOptions {
  /** Every addressable column, in letter order (index 0 is column A). */
  columns: SheetColumn[];
  row_count: number;
  /** Row number shown in the gutter for row index 0. */
  row_number_offset: number;
  now?: Date;
  /** Raw text of a cell that has no formula. */
  getRawValue(row_idx: number, col_key: string): string;
  /** Stored formula of a cell (its own or its formula column's), or null for a plain value. */
  getFormula(row_idx: number, col_key: string): string | null;
}

export interface FormulaSheet {
  readonly row_count: number;
  /** Value of a cell, evaluating its formula when it has one. */
  getValue(row_idx: number, col_key: string): Scalar;
  /** Result of a formula cell, or null when the cell holds a plain value. */
  getFormulaResult(row_idx: number, col_key: string): FormulaResult | null;
  /**
   * Evaluates a formula that is not stored in the grid, as if it sat on row
   * `row_idx` (row_count for the summary row under the last row): previews
   * while typing, and the summary row.
   */
  evaluate(formula: string, row_idx: number): FormulaResult;
}

// ── Parsing cache ──────────────────────────────────────────────────────────────

type ParsedFormula = { node: FormulaNode } | { error: FormulaError };

const MAX_PARSE_CACHE_ENTRIES = 2000;
const parse_cache = new Map<string, ParsedFormula>();

/** Parses a formula once and remembers it: a formula column shares one formula across every row. */
export function parseFormulaCached(formula: string): ParsedFormula {
  const cached = parse_cache.get(formula);
  if (cached) return cached;
  let parsed: ParsedFormula;
  try {
    parsed = { node: parseFormula(formula) };
  } catch (error) {
    // Running out of stack says nothing about the formula, it must not be cached as invalid.
    if (isStackOverflow(error)) throw error;
    parsed = { error: new FormulaError("#ERROR!", error instanceof Error ? error.message : "Formula parse error.") };
  }
  if (parse_cache.size >= MAX_PARSE_CACHE_ENTRIES) parse_cache.delete(parse_cache.keys().next().value!);
  parse_cache.set(formula, parsed);
  return parsed;
}

// ── Analysis ───────────────────────────────────────────────────────────────────

export interface FormulaAnalysis {
  is_valid: boolean;
  /** The parse error message, when invalid. */
  error_message: string | null;
  references: ReferenceSpec[];
  function_names: Set<string>;
  /** True when the result changes on every recalculation (NOW, RAND ...). */
  is_volatile: boolean;
  /**
   * True when the formula only reads cells of its own row (written with a
   * relative row, or the stored offset ~0). Its result is the same whatever page,
   * sort or filter the table shows, so it is safe to save automatically.
   */
  is_row_local: boolean;
}

/** Functions whose result depends on where the row sits in the current view. */
const POSITION_DEPENDENT_FUNCTIONS = new Set(["ROW", "ROWS", "INDIRECT", "OFFSET"]);

function isOwnRowCell(spec: ReferenceSpec): boolean {
  return !spec.end && spec.start.row?.kind === "offset" && spec.start.row.offset === 0;
}

/** Inspects a stored formula. */
export function analyzeFormula(formula: string): FormulaAnalysis {
  const parsed = parseFormulaCached(formula);
  if ("error" in parsed) {
    return {
      is_valid: false,
      error_message: parsed.error.detail,
      references: [],
      function_names: new Set(),
      is_volatile: false,
      is_row_local: false,
    };
  }
  const references = collectReferenceSpecs(parsed.node);
  const function_names = collectFunctionNames(parsed.node);
  const is_volatile = [...function_names].some((name) => VOLATILE_FUNCTION_NAMES.has(name));
  const is_row_local =
    !is_volatile &&
    references.every(isOwnRowCell) &&
    ![...function_names].some((name) => POSITION_DEPENDENT_FUNCTIONS.has(name));
  return { is_valid: true, error_message: null, references, function_names, is_volatile, is_row_local };
}

// ── Sheet ──────────────────────────────────────────────────────────────────────

/** Reads a raw cell text as the typed value a spreadsheet would hold. */
export function coerceRawValue(raw: string | null | undefined, kind: SheetColumnKind): Scalar {
  const text = raw ?? "";
  if (text.trim() === "") return null;
  if (kind === "date") return parseDateText(text) ?? text;
  if (kind === "number") return parseNumberText(text) ?? text;
  // Plain text columns still treat typed numbers as numbers ("45"), but keep codes
  // with leading zeros ("0042") as text.
  const trimmed = text.trim();
  if (/^-?(0|[1-9]\d{0,2}(,\d{3})+|[1-9]\d*)(\.\d+)?$/.test(trimmed)) return parseNumberText(trimmed) ?? text;
  return text;
}

const CIRCULAR_ERROR_DETAIL = "Circular dependency detected: the formula refers to its own result.";
const TOO_DEEP_ERROR_DETAIL = "The formula depends on a chain of other formulas too long to evaluate.";

export function createFormulaSheet(options: FormulaSheetOptions): FormulaSheet {
  const { columns, row_count, row_number_offset } = options;
  const now = options.now ?? new Date();
  const column_index_by_key = new Map(columns.map((column, index) => [column.key, index]));
  const value_cache = new Map<number, Scalar>();
  const result_cache = new Map<number, FormulaResult | null>();
  const range_cache = new Map<string, Matrix>();
  const in_progress = new Set<number>();
  const column_count = columns.length;

  const cellId = (row_idx: number, col_idx: number) => row_idx * column_count + col_idx;

  const resolveColumnIndex = (col: ColumnPart): number | null => {
    if (col.key !== undefined) return column_index_by_key.get(col.key) ?? null;
    if (col.index !== undefined && col.index < column_count) return col.index;
    return null;
  };

  const getColumnFormat = (col: ColumnPart, offset = 0): InferredFormat | null => {
    const index = resolveColumnIndex(col);
    return index !== null && columns[index + offset]?.kind === "date" ? "date" : null;
  };

  const makeContext = (current_row_idx: number): EvaluationContext => ({
    row_count,
    column_count,
    row_number_offset,
    current_row_idx,
    now,
    resolveColumnIndex,
    getCellValue,
    getRangeValues,
  });

  function evaluateStored(formula: string, row_idx: number): FormulaResult {
    const parsed = parseFormulaCached(formula);
    if ("error" in parsed) return { value: parsed.error, format: null };
    const context = makeContext(row_idx);
    const value = toScalar(evaluateNode(parsed.node, context), context);
    return { value, format: inferResultFormat(parsed.node, { getColumnFormat }) };
  }

  function getResultAt(row_idx: number, col_idx: number): FormulaResult | null {
    const id = cellId(row_idx, col_idx);
    if (result_cache.has(id)) return result_cache.get(id)!;

    const formula = options.getFormula(row_idx, columns[col_idx].key);
    if (formula === null) {
      result_cache.set(id, null);
      return null;
    }
    if (in_progress.has(id)) return { value: new FormulaError("#REF!", CIRCULAR_ERROR_DETAIL), format: null };

    in_progress.add(id);
    let result: FormulaResult;
    try {
      result = evaluateStored(formula, row_idx);
    } finally {
      in_progress.delete(id);
    }
    result_cache.set(id, result);
    return result;
  }

  function getCellValue(row_idx: number, col_idx: number): Scalar {
    if (row_idx < 0 || row_idx >= row_count || col_idx < 0 || col_idx >= column_count) return null;
    const id = cellId(row_idx, col_idx);
    if (value_cache.has(id)) return value_cache.get(id)!;

    if (in_progress.has(id)) return new FormulaError("#REF!", CIRCULAR_ERROR_DETAIL);
    const result = getResultAt(row_idx, col_idx);
    const column = columns[col_idx];
    const value = result ? result.value : coerceRawValue(options.getRawValue(row_idx, column.key), column.kind);
    value_cache.set(id, value);
    return value;
  }

  function getRangeValues(range: ResolvedRange): Matrix {
    const key = `${range.row_start}:${range.row_end}:${range.col_start}:${range.col_end}`;
    const cached = range_cache.get(key);
    if (cached) return cached;
    const values = buildRangeValues(range, makeContext(0));
    // A range read while one of its own cells is still being evaluated holds a
    // circular error for that cell, so it is not reused by anyone else.
    const overlaps_pending_cell = [...in_progress].some((id) => {
      const row_idx = Math.floor(id / column_count);
      const col_idx = id % column_count;
      return (
        row_idx >= range.row_start && row_idx <= range.row_end && col_idx >= range.col_start && col_idx <= range.col_end
      );
    });
    if (!overlaps_pending_cell) range_cache.set(key, values);
    return values;
  }

  let is_warmed_up = false;

  /** Evaluates every cell in row order, so each formula of a long chain only reads cells already known. */
  function warmUp(): void {
    is_warmed_up = true;
    for (let row_idx = 0; row_idx < row_count; row_idx++) {
      for (let col_idx = 0; col_idx < column_count; col_idx++) {
        try {
          getCellValue(row_idx, col_idx);
        } catch (error) {
          if (!isStackOverflow(error)) throw error;
        }
      }
    }
  }

  /**
   * Runs a read from outside the sheet. Evaluation is recursive, so a chain of
   * formulas deeper than the JavaScript stack (a running total read from its last
   * row) throws. Nothing is cached while the stack unwinds, so the sheet then
   * evaluates every cell in row order and reads again. A chain still too deep
   * reads as an error instead of breaking the page.
   */
  function readSafely<T>(read: () => T, onTooDeep: (error: FormulaError) => T): T {
    try {
      return read();
    } catch (error) {
      if (!isStackOverflow(error)) throw error;
    }
    if (!is_warmed_up) {
      warmUp();
      try {
        return read();
      } catch (error) {
        if (!isStackOverflow(error)) throw error;
      }
    }
    return onTooDeep(new FormulaError("#REF!", TOO_DEEP_ERROR_DETAIL));
  }

  const toErrorResult = (error: FormulaError): FormulaResult => ({ value: error, format: null });

  return {
    row_count,
    getValue(row_idx, col_key) {
      const col_idx = column_index_by_key.get(col_key);
      if (col_idx === undefined) return null;
      return readSafely<Scalar>(() => getCellValue(row_idx, col_idx), (error) => error);
    },
    getFormulaResult(row_idx, col_key) {
      const col_idx = column_index_by_key.get(col_key);
      if (col_idx === undefined || row_idx < 0 || row_idx >= row_count) return null;
      return readSafely(() => getResultAt(row_idx, col_idx), toErrorResult);
    },
    evaluate: (formula, row_idx) => readSafely(() => evaluateStored(formula, row_idx), toErrorResult),
  };
}
