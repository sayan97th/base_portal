/**
 * Evaluates a parsed formula against a grid of cells.
 *
 * The grid is whatever the caller exposes through EvaluationContext: for the
 * Link Building Orders table, the rows loaded on the current page. Ranges are
 * read from it, operators spread over ranges element by element (array formula
 * behavior), and errors flow through as values, never as exceptions.
 */

import { parseFormula, type FormulaNode } from "./parser";
import type { ColumnPart, ReferenceSpec, RowPart } from "./references";
import {
  DATE_RESULT_FUNCTION_NAMES,
  PASSTHROUGH_FORMAT_FUNCTION_NAMES,
  getFormulaFunction,
  type FunctionContext,
} from "./functions";
import type { InferredFormat } from "./format";
import { tokenizeFormula } from "./tokenizer";
import {
  FormulaError,
  compareScalars,
  isMatrix,
  toBoolean,
  toNumber,
  toText,
  type FormulaValue,
  type Matrix,
  type Scalar,
} from "./values";

export interface EvaluationContext extends FunctionContext {
  /** Rows in the grid (row index 0 is the first loaded row). */
  row_count: number;
  /** Columns in the grid, by letter index. */
  column_count: number;
  /** Row number shown in the gutter for row index 0. */
  row_number_offset: number;
  /** Row index of the cell holding the formula. Equal to row_count for the summary row. */
  current_row_idx: number;
  resolveColumnIndex(col: ColumnPart): number | null;
  getCellValue(row_idx: number, col_idx: number): Scalar;
  /** Optional cache for ranges read many times (whole columns in a formula column). */
  getRangeValues?(range: ResolvedRange): Matrix;
}

/** Inclusive bounds of a reference, in grid indexes. Rows may lie outside the loaded page. */
export interface ResolvedRange {
  row_start: number;
  row_end: number;
  col_start: number;
  col_end: number;
}

/** Largest range read in one go, so a typo such as A1:A999999 cannot freeze the page. */
const MAX_RANGE_CELLS = 250_000;

function resolveRowIndex(part: RowPart, context: EvaluationContext): number {
  return part.kind === "offset" ? context.current_row_idx + part.offset : part.number - context.row_number_offset;
}

/** Resolves a reference to grid bounds. References to unknown columns or rows above row 1 are #REF!. */
export function resolveReference(spec: ReferenceSpec, context: EvaluationContext): ResolvedRange | FormulaError {
  const ref_error = new FormulaError("#REF!", "The formula refers to a column or row that does not exist.");
  const endpoints = spec.end ? [spec.start, spec.end] : [spec.start];

  const cols: Array<number | null> = [];
  const rows: Array<number | null> = [];
  for (const endpoint of endpoints) {
    if (endpoint.col) {
      const col_idx = context.resolveColumnIndex(endpoint.col);
      if (col_idx === null || col_idx < 0) return ref_error;
      cols.push(col_idx);
    } else {
      cols.push(null);
    }
    if (endpoint.row) {
      if (endpoint.row.kind === "number" && endpoint.row.number < 1) return ref_error;
      rows.push(resolveRowIndex(endpoint.row, context));
    } else {
      rows.push(null);
    }
  }

  const [col_a, col_b = col_a] = cols;
  const [row_a, row_b = row_a] = rows;
  const col_start = col_a ?? 0;
  const col_end = col_b ?? context.column_count - 1;
  // A missing row on the start means a whole column, on the end only "to the last row" (A2:A).
  const row_start = row_a ?? 0;
  const row_end = row_b ?? context.row_count - 1;

  return {
    row_start: Math.min(row_start, row_end),
    row_end: Math.max(row_start, row_end),
    col_start: Math.min(col_start, col_end),
    col_end: Math.max(col_start, col_end),
  };
}

export function readRange(range: ResolvedRange, context: EvaluationContext): Matrix {
  if (context.getRangeValues) return context.getRangeValues(range);
  return buildRangeValues(range, context);
}

/** Reads a range cell by cell. Rows outside the loaded page read as blank. */
export function buildRangeValues(range: ResolvedRange, context: EvaluationContext): Matrix {
  const row_count = range.row_end - range.row_start + 1;
  const col_count = range.col_end - range.col_start + 1;
  if (row_count <= 0 || col_count <= 0 || row_count * col_count > MAX_RANGE_CELLS) {
    return [[new FormulaError("#REF!", "The range is too large.")]];
  }
  const values: Matrix = [];
  for (let r = range.row_start; r <= range.row_end; r++) {
    const row: Scalar[] = [];
    for (let c = range.col_start; c <= range.col_end; c++) {
      row.push(r >= 0 && r < context.row_count && c < context.column_count ? context.getCellValue(r, c) : null);
    }
    values.push(row);
  }
  return values;
}

// ── Operators ──────────────────────────────────────────────────────────────────

/** Applies a scalar operation to two values, element by element when either is a range. */
function combine(left: FormulaValue, right: FormulaValue, operate: (a: Scalar, b: Scalar) => Scalar): FormulaValue {
  if (!isMatrix(left) && !isMatrix(right)) return operate(left, right);
  const a = isMatrix(left) ? left : [[left]];
  const b = isMatrix(right) ? right : [[right]];
  const row_count = Math.max(a.length, b.length);
  const col_count = Math.max(a[0]?.length ?? 0, b[0]?.length ?? 0);
  const pick = (matrix: Matrix, r: number, c: number): Scalar => {
    const row = matrix.length === 1 ? matrix[0] : matrix[r];
    if (!row) return new FormulaError("#N/A", "The arrays have different sizes.");
    return row.length === 1 ? row[0] : (row[c] ?? new FormulaError("#N/A", "The arrays have different sizes."));
  };
  return Array.from({ length: row_count }, (_, r) =>
    Array.from({ length: col_count }, (_, c) => operate(pick(a, r, c), pick(b, r, c)))
  );
}

function mapValue(value: FormulaValue, operate: (a: Scalar) => Scalar): FormulaValue {
  return isMatrix(value) ? value.map((row) => row.map(operate)) : operate(value);
}

function arithmetic(operator: string, a: Scalar, b: Scalar): Scalar {
  if (a instanceof FormulaError) return a;
  if (b instanceof FormulaError) return b;
  const left = toNumber(a);
  if (left instanceof FormulaError) return left;
  const right = toNumber(b);
  if (right instanceof FormulaError) return right;

  let result: number;
  switch (operator) {
    case "+": result = left + right; break;
    case "-": result = left - right; break;
    case "*": result = left * right; break;
    case "/":
      if (right === 0) return new FormulaError("#DIV/0!", "Division by zero.");
      result = left / right;
      break;
    default:
      result = left === 0 && right === 0 ? 1 : Math.pow(left, right);
  }
  return Number.isFinite(result) ? result : new FormulaError("#NUM!", "The result is too large or not a real number.");
}

function compare(operator: string, a: Scalar, b: Scalar): Scalar {
  if (a instanceof FormulaError) return a;
  if (b instanceof FormulaError) return b;
  const comparison = compareScalars(a, b);
  switch (operator) {
    case "=": return comparison === 0;
    case "<>": return comparison !== 0;
    case "<": return comparison < 0;
    case ">": return comparison > 0;
    case "<=": return comparison <= 0;
    default: return comparison >= 0;
  }
}

function concat(a: Scalar, b: Scalar): Scalar {
  const left = toText(a);
  if (left instanceof FormulaError) return left;
  const right = toText(b);
  if (right instanceof FormulaError) return right;
  return left + right;
}

// ── Special forms ──────────────────────────────────────────────────────────────
// Functions evaluated here instead of the library: they skip the branches they do
// not take, or they need the reference itself rather than its values.

type SpecialForm = (args: FormulaNode[], context: EvaluationContext) => FormulaValue;

function evaluateOptional(node: FormulaNode | undefined, context: EvaluationContext, fallback: Scalar): FormulaValue {
  if (!node) return fallback;
  return evaluateNode(node, context);
}

/** Reads a condition, spreading over a range so ARRAYFORMULA(IF(A2:A="", ...)) works. */
function branchOn(
  condition: FormulaValue,
  pick: (is_true: boolean) => FormulaValue
): FormulaValue {
  const choose = (value: Scalar): Scalar => {
    if (value instanceof FormulaError) return value;
    const bool = toBoolean(value);
    if (bool instanceof FormulaError) return bool;
    const picked = pick(bool);
    return isMatrix(picked) ? (picked[0]?.[0] ?? null) : picked;
  };
  if (!isMatrix(condition)) {
    if (condition instanceof FormulaError) return condition;
    const bool = toBoolean(condition);
    return bool instanceof FormulaError ? bool : pick(bool);
  }
  return condition.map((row) => row.map(choose));
}

const SPECIAL_FORMS: Record<string, SpecialForm> = {
  IF: (args, context) => {
    if (args.length < 2 || args.length > 3) return new FormulaError("#N/A", "IF expects 2 or 3 arguments.");
    const condition = evaluateNode(args[0], context);
    return branchOn(condition, (is_true) =>
      is_true ? evaluateNode(args[1], context) : evaluateOptional(args[2], context, false)
    );
  },

  IFS: (args, context) => {
    if (args.length < 2 || args.length % 2 !== 0) {
      return new FormulaError("#N/A", "IFS expects pairs of condition and value.");
    }
    for (let i = 0; i < args.length; i += 2) {
      const condition = toScalar(evaluateNode(args[i], context), context);
      if (condition instanceof FormulaError) return condition;
      const bool = toBoolean(condition);
      if (bool instanceof FormulaError) return bool;
      if (bool) return evaluateNode(args[i + 1], context);
    }
    return new FormulaError("#N/A", "No condition of IFS is true.");
  },

  IFERROR: (args, context) => {
    const value = evaluateNode(args[0] ?? { type: "empty" }, context);
    const fallback = () => evaluateOptional(args[1], context, "");
    if (!isMatrix(value)) return value instanceof FormulaError ? fallback() : value;
    let fallback_value: Scalar | undefined;
    return value.map((row) =>
      row.map((cell) => {
        if (!(cell instanceof FormulaError)) return cell;
        fallback_value ??= toScalar(fallback(), context);
        return fallback_value;
      })
    );
  },

  IFNA: (args, context) => {
    const value = evaluateNode(args[0] ?? { type: "empty" }, context);
    const is_na = (cell: Scalar) => cell instanceof FormulaError && cell.code === "#N/A";
    if (!isMatrix(value)) return is_na(value) ? evaluateOptional(args[1], context, "") : value;
    const fallback = toScalar(evaluateOptional(args[1], context, ""), context);
    return value.map((row) => row.map((cell) => (is_na(cell) ? fallback : cell)));
  },

  SWITCH: (args, context) => {
    if (args.length < 3) return new FormulaError("#N/A", "SWITCH expects an expression, a case and a value.");
    const expression = toScalar(evaluateNode(args[0], context), context);
    if (expression instanceof FormulaError) return expression;
    let i = 1;
    for (; i + 1 < args.length; i += 2) {
      const candidate = toScalar(evaluateNode(args[i], context), context);
      if (candidate instanceof FormulaError) return candidate;
      if (compareScalars(expression, candidate) === 0) return evaluateNode(args[i + 1], context);
    }
    return i < args.length ? evaluateNode(args[i], context) : new FormulaError("#N/A", "No case of SWITCH matches.");
  },

  CHOOSE: (args, context) => {
    const index = toNumber(toScalar(evaluateNode(args[0] ?? { type: "empty" }, context), context));
    if (index instanceof FormulaError) return index;
    const choice = args[Math.trunc(index)];
    if (index < 1 || !choice) return new FormulaError("#VALUE!", "CHOOSE index is out of range.");
    return evaluateNode(choice, context);
  },

  ROW: (args, context) => {
    if (args.length === 0) return context.row_number_offset + context.current_row_idx;
    const range = rangeOfArgument(args[0], context);
    return range instanceof FormulaError ? range : context.row_number_offset + range.row_start;
  },

  COLUMN: (args, context) => {
    if (args.length === 0) return new FormulaError("#N/A", "COLUMN needs a reference in this table.");
    const range = rangeOfArgument(args[0], context);
    return range instanceof FormulaError ? range : range.col_start + 1;
  },

  ISREF: (args) => args[0]?.type === "ref",

  INDIRECT: (args, context) => {
    const text = toText(toScalar(evaluateNode(args[0] ?? { type: "empty" }, context), context));
    if (text instanceof FormulaError) return text;
    const tokens = tokenizeFormula(text.trim()).filter((token) => token.type !== "whitespace");
    if (tokens.length !== 1 || tokens[0].type !== "ref" || !tokens[0].ref) {
      return new FormulaError("#REF!", `"${text}" is not a valid cell reference.`);
    }
    return evaluateNode({ type: "ref", ref: tokens[0].ref }, context);
  },

  ARRAYFORMULA: (args, context) => evaluateNode(args[0] ?? { type: "empty" }, context),
};

function rangeOfArgument(node: FormulaNode, context: EvaluationContext): ResolvedRange | FormulaError {
  if (node.type !== "ref") return new FormulaError("#VALUE!", "Expected a cell reference.");
  return resolveReference(node.ref, context);
}

// ── Evaluation ─────────────────────────────────────────────────────────────────

export function evaluateNode(node: FormulaNode, context: EvaluationContext): FormulaValue {
  switch (node.type) {
    case "number":
    case "string":
    case "boolean":
      return node.value;
    case "error":
      return new FormulaError(node.code);
    case "empty":
      return null;
    case "name":
      return new FormulaError("#NAME?", `Unknown range name: "${node.name}".`);
    case "ref": {
      const range = resolveReference(node.ref, context);
      if (range instanceof FormulaError) return range;
      if (!node.ref.end) {
        const { row_start, col_start } = range;
        if (row_start < 0 || row_start >= context.row_count || col_start >= context.column_count) return null;
        return context.getCellValue(row_start, col_start);
      }
      return readRange(range, context);
    }
    case "unary": {
      const operand = evaluateNode(node.operand, context);
      return node.operator === "+" ? operand : mapValue(operand, (value) => arithmetic("-", 0, value));
    }
    case "percent":
      return mapValue(evaluateNode(node.operand, context), (value) => arithmetic("/", value, 100));
    case "binary": {
      const left = evaluateNode(node.left, context);
      const right = evaluateNode(node.right, context);
      if (node.operator === "&") return combine(left, right, concat);
      if (["+", "-", "*", "/", "^"].includes(node.operator)) {
        return combine(left, right, (a, b) => arithmetic(node.operator, a, b));
      }
      return combine(left, right, (a, b) => compare(node.operator, a, b));
    }
    case "array":
      return node.rows.map((row) => row.map((cell) => toScalar(evaluateNode(cell, context), context)));
    case "call": {
      const special = SPECIAL_FORMS[node.name];
      if (special) return special(node.args, context);
      const fn = getFormulaFunction(node.name);
      if (!fn) return new FormulaError("#NAME?", `Unknown function: ${node.name}.`);
      return fn(
        node.args.map((arg) => evaluateNode(arg, context)),
        context
      );
    }
  }
}

/**
 * Value a single cell shows for a result. A range used where one value is
 * expected reads the cell on the formula's own row when it is one column wide
 * (implicit intersection, so =B:B*2 in a formula column doubles that row's B),
 * otherwise its first cell.
 */
export function toScalar(value: FormulaValue, context: EvaluationContext): Scalar {
  if (!isMatrix(value)) return value;
  if (value.length === 0) return null;
  if (value.length === context.row_count && value[0].length === 1) {
    return value[context.current_row_idx]?.[0] ?? value[0][0];
  }
  return value[0]?.[0] ?? null;
}

/** Parses and evaluates a formula in one step. Syntax errors come back as #ERROR!. */
export function evaluateFormulaText(formula: string, context: EvaluationContext): FormulaValue {
  let node: FormulaNode;
  try {
    node = parseFormula(formula);
  } catch (error) {
    return new FormulaError("#ERROR!", error instanceof Error ? error.message : "Formula parse error.");
  }
  return evaluateNode(node, context);
}

// ── Format inference ───────────────────────────────────────────────────────────

export interface FormatInferenceContext {
  /** Number format of a referenced column, so =A2+30 on a date column is a date too. */
  getColumnFormat(col: ColumnPart): InferredFormat | null;
}

/**
 * Infers whether a formula's result is a date, the way Sheets picks a cell's
 * number format: date functions return dates, a date plus or minus days is a
 * date, and the difference of two dates is a plain number of days.
 */
export function inferResultFormat(node: FormulaNode, context: FormatInferenceContext): InferredFormat | null {
  switch (node.type) {
    case "ref":
      return node.ref.start.col ? context.getColumnFormat(node.ref.start.col) : null;
    case "unary":
      return inferResultFormat(node.operand, context);
    case "binary": {
      if (node.operator !== "+" && node.operator !== "-") return null;
      const left = inferResultFormat(node.left, context);
      const right = inferResultFormat(node.right, context);
      if (node.operator === "-" && left && right) return null;
      return left ?? (node.operator === "+" ? right : null);
    }
    case "call": {
      if (node.name === "NOW") return "datetime";
      if (DATE_RESULT_FUNCTION_NAMES.has(node.name)) return "date";
      if (!PASSTHROUGH_FORMAT_FUNCTION_NAMES.has(node.name)) return null;
      // IF and friends: the first argument is the condition, not a possible result.
      const value_args = ["IF", "IFS", "SWITCH", "CHOOSE"].includes(node.name) ? node.args.slice(1) : node.args;
      for (const arg of value_args) {
        const format = inferResultFormat(arg, context);
        if (format) return format;
      }
      return null;
    }
    default:
      return null;
  }
}
