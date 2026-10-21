/**
 * Value model of the spreadsheet formula engine: the error values a formula can
 * produce (#N/A, #DIV/0! ...), and the coercion and comparison rules Google Sheets
 * and Excel apply when a formula mixes numbers, text, booleans and blank cells.
 *
 * Dates follow the spreadsheet convention: they are plain numbers counting days
 * since 12/30/1899 (the "serial number"), so `=B2 - TODAY()` is just a subtraction.
 */

export type FormulaErrorCode =
  | "#NULL!"
  | "#DIV/0!"
  | "#VALUE!"
  | "#REF!"
  | "#NAME?"
  | "#NUM!"
  | "#N/A"
  | "#ERROR!";

export const FORMULA_ERROR_CODES: readonly FormulaErrorCode[] = [
  "#NULL!",
  "#DIV/0!",
  "#VALUE!",
  "#REF!",
  "#NAME?",
  "#NUM!",
  "#N/A",
  "#ERROR!",
];

const DEFAULT_ERROR_DETAILS: Record<FormulaErrorCode, string> = {
  "#NULL!": "The ranges do not intersect.",
  "#DIV/0!": "Division by zero.",
  "#VALUE!": "A value has the wrong type for this operation.",
  "#REF!": "The formula refers to a cell that does not exist.",
  "#NAME?": "Unknown function or name.",
  "#NUM!": "The result is not a valid number.",
  "#N/A": "No value is available.",
  "#ERROR!": "Formula parse error.",
};

/**
 * An error value. It extends Error on purpose: the function library
 * (@formulajs/formulajs) recognizes errors passed as arguments with
 * `instanceof Error`, so engine errors flow through it unchanged.
 */
export class FormulaError extends Error {
  readonly code: FormulaErrorCode;
  readonly detail: string;

  constructor(code: FormulaErrorCode, detail?: string) {
    super(code);
    Object.setPrototypeOf(this, FormulaError.prototype);
    this.name = "FormulaError";
    this.code = code;
    this.detail = detail ?? DEFAULT_ERROR_DETAILS[code];
  }
}

/** A single cell value. `null` is a blank cell. */
export type Scalar = number | string | boolean | null | FormulaError;

/** A rectangular block of values, row by row (a range or an array result). */
export type Matrix = Scalar[][];

/** Anything an expression can evaluate to. */
export type FormulaValue = Scalar | Matrix;

export function isFormulaError(value: unknown): value is FormulaError {
  return value instanceof FormulaError;
}

export function isMatrix(value: FormulaValue | undefined): value is Matrix {
  return Array.isArray(value);
}

/**
 * True for the error a JavaScript engine throws when recursion runs out of stack
 * (RangeError in Chrome and Safari, InternalError in Firefox). The sheet handles it
 * itself, so code that turns exceptions into error values lets it through.
 */
export function isStackOverflow(error: unknown): boolean {
  if (error instanceof RangeError) return /call stack/i.test(error.message);
  return error instanceof Error && error.name === "InternalError" && /recursion/i.test(error.message);
}

/** Converts any Error (for example one returned by the function library) to a FormulaError. */
export function toFormulaError(error: unknown): FormulaError {
  if (error instanceof FormulaError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const code = FORMULA_ERROR_CODES.find((candidate) => candidate === message);
  return code ? new FormulaError(code) : new FormulaError("#VALUE!", message || undefined);
}

// ── Dates ──────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
/** Day zero of spreadsheet serial numbers. */
const SERIAL_EPOCH_UTC = Date.UTC(1899, 11, 30);

/** Local calendar date (and time) of a Date as a spreadsheet serial number. */
export function dateToSerial(date: Date): number {
  const utc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
  return (utc - SERIAL_EPOCH_UTC) / MS_PER_DAY;
}

/** Serial number back to a local Date. */
export function serialToDate(serial: number): Date {
  const utc = new Date(SERIAL_EPOCH_UTC + Math.round(serial * MS_PER_DAY));
  return new Date(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate(),
    utc.getUTCHours(),
    utc.getUTCMinutes(),
    utc.getUTCSeconds()
  );
}

function buildSerial(year: number, month: number, day: number): number | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  // Rejects dates that roll over, such as 02/31.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return dateToSerial(date);
}

/**
 * Reads the date formats used by the table (MM/DD/YYYY, also M/D/YY) and ISO
 * dates (YYYY-MM-DD). Returns the serial number, or null when the text is not a date.
 */
export function parseDateText(text: string): number | null {
  const trimmed = text.trim();

  const us_match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed);
  if (us_match) {
    let year = Number(us_match[3]);
    if (us_match[3].length === 2) year += year < 50 ? 2000 : 1900;
    return buildSerial(year, Number(us_match[1]), Number(us_match[2]));
  }

  const iso_match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso_match) return buildSerial(Number(iso_match[1]), Number(iso_match[2]), Number(iso_match[3]));

  return null;
}

// ── Numbers ────────────────────────────────────────────────────────────────────

/**
 * Reads a number typed the way people type them in a sheet: "1250", "-3.5",
 * "1,250.00", "$150", "€99" or "45%". Returns null when the text is not numeric.
 */
export function parseNumberText(text: string): number | null {
  let cleaned = text.trim();
  if (cleaned === "") return null;

  let divisor = 1;
  if (cleaned.endsWith("%")) {
    divisor = 100;
    cleaned = cleaned.slice(0, -1).trim();
  }

  let sign = 1;
  if (cleaned.startsWith("-")) {
    sign = -1;
    cleaned = cleaned.slice(1).trim();
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1).trim();
  }

  cleaned = cleaned.replace(/^[$€£]\s*/, "");
  // Thousands separators only count when they group digits by three.
  if (/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(cleaned)) cleaned = cleaned.replace(/,/g, "");

  if (!/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(cleaned)) return null;
  const parsed = (sign * Number(cleaned)) / divisor;
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Formats a number the way a spreadsheet's "Automatic" format does: no float
 * noise (0.1 + 0.2 shows 0.3) and no thousands separators.
 */
export function formatGeneralNumber(value: number): string {
  if (!Number.isFinite(value)) return "#NUM!";
  if (Object.is(value, -0)) return "0";
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  return String(Number.parseFloat(value.toPrecision(15)));
}

// ── Coercion ───────────────────────────────────────────────────────────────────

/** Number value of a scalar for arithmetic. Text that does not read as a number is a #VALUE! error. */
export function toNumber(value: Scalar): number | FormulaError {
  if (value === null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof FormulaError) return value;
  if (value.trim() === "") return 0;
  const parsed = parseNumberText(value) ?? parseDateText(value);
  return parsed ?? new FormulaError("#VALUE!", `"${value}" is text and cannot be used as a number.`);
}

/** Text value of a scalar, used by "&" and the text functions. */
export function toText(value: Scalar): string | FormulaError {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof FormulaError) return value;
  return formatGeneralNumber(value);
}

/** Boolean value of a scalar, used by IF, AND, OR and NOT. */
export function toBoolean(value: Scalar): boolean | FormulaError {
  if (value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (value instanceof FormulaError) return value;
  const upper = value.trim().toUpperCase();
  if (upper === "TRUE") return true;
  if (upper === "FALSE" || upper === "") return false;
  return new FormulaError("#VALUE!", `"${value}" cannot be read as TRUE or FALSE.`);
}

/** Ordering used by comparisons: numbers sort before text, text before booleans. */
function typeRank(value: Exclude<Scalar, null | FormulaError>): number {
  if (typeof value === "number") return 0;
  if (typeof value === "string") return 1;
  return 2;
}

/**
 * Compares two non error scalars like a spreadsheet: text without regard to
 * case, a blank cell as 0, "" or FALSE depending on the other side.
 * Returns a negative number, zero or a positive number.
 */
export function compareScalars(left: Scalar, right: Scalar): number {
  const a = left === null ? blankFor(right) : left;
  const b = right === null ? blankFor(left) : right;
  if (a instanceof FormulaError || b instanceof FormulaError) return 0;

  const rank_diff = typeRank(a) - typeRank(b);
  if (rank_diff !== 0) return rank_diff;

  if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);

  const a_text = String(a).toLowerCase();
  const b_text = String(b).toLowerCase();
  return a_text === b_text ? 0 : a_text < b_text ? -1 : 1;
}

function blankFor(other: Scalar): Exclude<Scalar, null> {
  if (typeof other === "string") return "";
  if (typeof other === "boolean") return false;
  return 0;
}

/** Every value of a scalar or matrix, row by row. */
export function flattenValues(values: ReadonlyArray<FormulaValue | undefined>): Scalar[] {
  const flat: Scalar[] = [];
  for (const value of values) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const row of value) flat.push(...row);
    } else {
      flat.push(value);
    }
  }
  return flat;
}

/** Wraps a scalar as a 1x1 matrix, leaves matrices as they are. */
export function toMatrix(value: FormulaValue): Matrix {
  return Array.isArray(value) ? value : [[value]];
}
