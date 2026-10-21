/**
 * Function library of the formula engine.
 *
 * The bulk of the Excel compatible catalog (math, statistics, finance,
 * engineering, dates) comes from @formulajs/formulajs. On top of it this file
 * implements, with Google Sheets semantics, the functions where the library
 * differs from Sheets (criteria and lookup functions are case insensitive in
 * Sheets, aggregates skip blank cells) and the functions only Sheets has
 * (REGEXMATCH, SPLIT, JOIN, FILTER, UNIQUE, FLATTEN, XLOOKUP, ISURL ...).
 *
 * Functions that need the formula's references or lazy evaluation (IF, IFERROR,
 * ROW, COLUMN, INDIRECT ...) are implemented by the evaluator instead.
 */

import * as formulajs from "@formulajs/formulajs";
import { formatScalar, formatWithPattern } from "./format";
import {
  FormulaError,
  compareScalars,
  dateToSerial,
  flattenValues,
  isMatrix,
  parseDateText,
  parseNumberText,
  toBoolean,
  toFormulaError,
  toMatrix,
  toNumber,
  toText,
  type FormulaValue,
  type Matrix,
  type Scalar,
} from "./values";

export interface FunctionContext {
  /** "Now" for TODAY() and NOW(), fixed for one evaluation pass. */
  now: Date;
}

/** Arguments as written: a skipped argument is null, an omitted trailing one is not in the array. */
export type FormulaFunction = (args: FormulaValue[], context: FunctionContext) => FormulaValue;

const registry = new Map<string, FormulaFunction>();

function register(name: string, fn: FormulaFunction): void {
  registry.set(name.toUpperCase(), fn);
}

/** The function registered under a name, accepting dotted and legacy spellings (STDEV.S, STDEV). */
export function getFormulaFunction(name: string): FormulaFunction | undefined {
  const upper = name.toUpperCase();
  return registry.get(upper) ?? registry.get(upper.replace(/\./g, "")) ?? registry.get(FUNCTION_ALIASES[upper] ?? "");
}

/** Every function name the engine understands, sorted, for the function list and autocomplete. */
export function getSupportedFunctionNames(): string[] {
  return [...new Set([...registry.keys(), ...Object.keys(FUNCTION_ALIASES), ...EVALUATOR_FUNCTION_NAMES])].sort();
}

/** Functions implemented by the evaluator (they need references or lazy arguments). */
export const EVALUATOR_FUNCTION_NAMES = [
  "IF", "IFS", "IFERROR", "IFNA", "SWITCH", "CHOOSE", "ROW", "COLUMN", "ISREF", "INDIRECT", "ARRAYFORMULA",
] as const;

/** Functions whose result changes on every recalculation, never synced to the database on their own. */
export const VOLATILE_FUNCTION_NAMES: ReadonlySet<string> = new Set(["NOW", "RAND", "RANDBETWEEN", "RANDARRAY"]);

/** Functions whose result is a date, so the cell shows it as MM/DD/YYYY instead of a serial number. */
export const DATE_RESULT_FUNCTION_NAMES: ReadonlySet<string> = new Set([
  "DATE", "DATEVALUE", "TODAY", "EDATE", "EOMONTH", "WORKDAY", "WORKDAY.INTL", "WORKDAYINTL", "TO_DATE",
]);

/** Functions returning one of their arguments, so they keep that argument's date format. */
export const PASSTHROUGH_FORMAT_FUNCTION_NAMES: ReadonlySet<string> = new Set([
  "IF", "IFS", "IFERROR", "IFNA", "SWITCH", "CHOOSE", "MIN", "MAX", "MINIFS", "MAXIFS", "LARGE", "SMALL",
  "MEDIAN", "INDEX", "VLOOKUP", "HLOOKUP", "XLOOKUP", "LOOKUP", "ARRAYFORMULA", "FILTER", "SORT", "UNIQUE",
]);

const FUNCTION_ALIASES: Record<string, string> = {
  STDEV: "STDEV.S",
  VAR: "VAR.S",
  MODE: "MODE.SNGL",
  RANK: "RANK.EQ",
  PERCENTILE: "PERCENTILE.INC",
  QUARTILE: "QUARTILE.INC",
  PERCENTRANK: "PERCENTRANK.INC",
};

// ── Argument helpers ───────────────────────────────────────────────────────────

const value_error = (detail?: string) => new FormulaError("#VALUE!", detail);
const na_error = (detail?: string) => new FormulaError("#N/A", detail);

/** A scalar argument: the first value of a range, so =LEN(A1:A3) reads A1 like a spreadsheet. */
function scalarOf(value: FormulaValue | undefined): Scalar {
  if (value === undefined) return null;
  if (isMatrix(value)) return value[0]?.[0] ?? null;
  return value;
}

function numberArg(value: FormulaValue | undefined, fallback?: number): number | FormulaError {
  if (value === undefined && fallback !== undefined) return fallback;
  return toNumber(scalarOf(value));
}

function textArg(value: FormulaValue | undefined, fallback = ""): string | FormulaError {
  if (value === undefined) return fallback;
  return toText(scalarOf(value));
}

function booleanArg(value: FormulaValue | undefined, fallback: boolean): boolean | FormulaError {
  if (value === undefined || scalarOf(value) === null) return fallback;
  return toBoolean(scalarOf(value));
}

function firstError(...values: unknown[]): FormulaError | null {
  for (const value of values) if (value instanceof FormulaError) return value;
  return null;
}

/**
 * Numbers for an aggregate (SUM, AVERAGE, MAX ...). Inside ranges only numbers
 * count, text, booleans and blanks are skipped. Typed arguments are coerced, so
 * =SUM("3", TRUE) is 4. Any error stops the aggregate.
 */
function collectNumbers(args: FormulaValue[]): number[] | FormulaError {
  const numbers: number[] = [];
  for (const arg of args) {
    if (isMatrix(arg)) {
      for (const row of arg) {
        for (const value of row) {
          if (value instanceof FormulaError) return value;
          if (typeof value === "number") numbers.push(value);
        }
      }
      continue;
    }
    if (arg === null) continue;
    const number = toNumber(arg);
    if (number instanceof FormulaError) return number;
    numbers.push(number);
  }
  return numbers;
}

/** Applies a scalar function element by element when any argument is a range (array formula behavior). */
function broadcast(args: FormulaValue[], apply: (scalars: Scalar[]) => Scalar): FormulaValue {
  const matrices = args.filter(isMatrix);
  if (matrices.length === 0) return apply(args as Scalar[]);

  const row_count = Math.max(...matrices.map((m) => m.length));
  const col_count = Math.max(...matrices.map((m) => m[0]?.length ?? 0));
  const result: Matrix = [];
  for (let r = 0; r < row_count; r++) {
    const row: Scalar[] = [];
    for (let c = 0; c < col_count; c++) {
      const scalars = args.map((arg) => {
        if (!isMatrix(arg)) return arg;
        const source_row = arg.length === 1 ? arg[0] : arg[r];
        if (!source_row) return na_error();
        return source_row.length === 1 ? source_row[0] : (source_row[c] ?? na_error());
      });
      row.push(apply(scalars));
    }
    result.push(row);
  }
  return result;
}

/** Registers a function that works on single values and spreads over ranges. */
function registerScalar(name: string, apply: (args: Scalar[], context: FunctionContext) => Scalar): void {
  register(name, (args, context) => broadcast(args, (scalars) => apply(scalars, context)));
}

// ── Library bridge ─────────────────────────────────────────────────────────────

/** Converts whatever the function library returns to engine values. */
function fromLibraryResult(result: unknown): FormulaValue {
  if (result instanceof Date) {
    return Number.isNaN(result.getTime()) ? value_error("Invalid date.") : dateToSerial(result);
  }
  if (result instanceof Error) return toFormulaError(result);
  if (typeof result === "number") return Number.isFinite(result) ? result : new FormulaError("#NUM!");
  if (typeof result === "string" || typeof result === "boolean") return result;
  if (result === null || result === undefined) return null;
  if (Array.isArray(result)) {
    const rows = result.map((row) => (Array.isArray(row) ? row : [row]));
    return rows.map((row) => row.map((value) => scalarOf(fromLibraryResult(value))));
  }
  return String(result);
}

/** Library functions that summarize a list of numbers, they get only the numbers of their ranges. */
const NUMERIC_RANGE_LIBRARY_FUNCTIONS = new Set([
  "MEDIAN", "MODE.SNGL", "MODE.MULT", "MODESNGL", "MODEMULT", "STDEV.S", "STDEV.P", "STDEVS", "STDEVP",
  "VAR.S", "VAR.P", "VARS", "VARP", "LARGE", "SMALL", "PERCENTILE.INC", "PERCENTILE.EXC", "PERCENTILEINC",
  "PERCENTILEEXC", "QUARTILE.INC", "QUARTILE.EXC", "QUARTILEINC", "QUARTILEEXC", "RANK.EQ", "RANK.AVG",
  "RANKEQ", "RANKAVG", "GEOMEAN", "HARMEAN", "AVEDEV", "DEVSQ", "KURT", "SKEW", "SKEW.P", "SKEWP", "SUMSQ",
  "TRIMMEAN", "PERCENTRANK.INC", "PERCENTRANK.EXC", "PERCENTRANKINC", "PERCENTRANKEXC",
]);

/** Library functions of a single value, spread over ranges like Sheets does inside ARRAYFORMULA. */
const SCALAR_LIBRARY_FUNCTIONS = new Set([
  "ABS", "ACOS", "ASIN", "ATAN", "CEILING", "COS", "DEGREES", "EVEN", "EXP", "FACT", "FLOOR", "INT", "LN",
  "LOG", "LOG10", "MOD", "ODD", "POWER", "QUOTIENT", "RADIANS", "ROUND", "ROUNDDOWN", "ROUNDUP", "SIGN",
  "SIN", "SQRT", "TAN", "TRUNC", "MROUND", "YEAR", "MONTH", "DAY", "HOUR", "MINUTE", "SECOND", "WEEKDAY",
  "WEEKNUM", "ISOWEEKNUM", "EDATE", "EOMONTH", "DAYS", "DATEDIF", "DAYS360", "YEARFRAC", "CHAR", "CODE",
  "UNICHAR", "UNICODE", "ROMAN", "ARABIC", "DEC2BIN", "DEC2HEX", "BIN2DEC", "HEX2DEC", "ISEVEN", "ISODD",
  "DATE", "TIME",
]);

function toLibraryArgument(value: FormulaValue, numeric_ranges: boolean): unknown {
  if (!isMatrix(value)) return value;
  if (!numeric_ranges) return value;
  const numbers: unknown[] = [];
  for (const row of value) {
    for (const cell of row) if (typeof cell === "number" || cell instanceof FormulaError) numbers.push(cell);
  }
  return numbers;
}

function wrapLibraryFunction(name: string, fn: (...args: unknown[]) => unknown): FormulaFunction {
  const numeric_ranges = NUMERIC_RANGE_LIBRARY_FUNCTIONS.has(name);
  const call = (args: FormulaValue[]): FormulaValue => {
    try {
      return fromLibraryResult(fn(...args.map((arg) => toLibraryArgument(arg, numeric_ranges))));
    } catch (error) {
      return toFormulaError(error);
    }
  };
  if (!SCALAR_LIBRARY_FUNCTIONS.has(name)) return call;
  // A blank cell reads as 0 in math and date functions, as it does in a spreadsheet.
  return (args) => broadcast(args, (scalars) => scalarOf(call(scalars.map((value) => value ?? 0))));
}

/** Registers every library function, including namespaced ones such as NORM.DIST or STDEV.S. */
function registerLibrary(source: Record<string, unknown>, prefix = ""): void {
  for (const [key, value] of Object.entries(source)) {
    if (key === "utils") continue;
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "function") {
      register(name, wrapLibraryFunction(name, value as (...args: unknown[]) => unknown));
    } else if (value && typeof value === "object") {
      registerLibrary(value as Record<string, unknown>, name);
    }
  }
}

registerLibrary(formulajs as unknown as Record<string, unknown>);

// ── Logical ────────────────────────────────────────────────────────────────────

register("TRUE", () => true);
register("FALSE", () => false);
registerScalar("NOT", ([value]) => {
  const bool = toBoolean(value);
  return bool instanceof FormulaError ? bool : !bool;
});

/** Booleans of AND / OR / XOR: ranges skip text and blanks, typed text must read as TRUE or FALSE. */
function collectBooleans(args: FormulaValue[]): boolean[] | FormulaError {
  const booleans: boolean[] = [];
  for (const arg of args) {
    if (isMatrix(arg)) {
      for (const row of arg) {
        for (const value of row) {
          if (value instanceof FormulaError) return value;
          if (typeof value === "boolean") booleans.push(value);
          else if (typeof value === "number") booleans.push(value !== 0);
        }
      }
      continue;
    }
    if (arg === null) continue;
    const bool = toBoolean(arg);
    if (bool instanceof FormulaError) return bool;
    booleans.push(bool);
  }
  return booleans;
}

register("AND", (args) => {
  const booleans = collectBooleans(args);
  if (booleans instanceof FormulaError) return booleans;
  return booleans.length === 0 ? value_error() : booleans.every(Boolean);
});
register("OR", (args) => {
  const booleans = collectBooleans(args);
  if (booleans instanceof FormulaError) return booleans;
  return booleans.length === 0 ? value_error() : booleans.some(Boolean);
});
register("XOR", (args) => {
  const booleans = collectBooleans(args);
  if (booleans instanceof FormulaError) return booleans;
  return booleans.filter(Boolean).length % 2 === 1;
});

// ── Information ────────────────────────────────────────────────────────────────

registerScalar("ISBLANK", ([value]) => value === null);
registerScalar("ISNUMBER", ([value]) => typeof value === "number");
registerScalar("ISTEXT", ([value]) => typeof value === "string");
registerScalar("ISNONTEXT", ([value]) => typeof value !== "string");
registerScalar("ISLOGICAL", ([value]) => typeof value === "boolean");
registerScalar("ISERROR", ([value]) => value instanceof FormulaError);
registerScalar("ISERR", ([value]) => value instanceof FormulaError && value.code !== "#N/A");
registerScalar("ISNA", ([value]) => value instanceof FormulaError && value.code === "#N/A");
registerScalar("ISURL", ([value]) => typeof value === "string" && /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value.trim()));
registerScalar("ISEMAIL", ([value]) => typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
registerScalar("ISDATE", ([value]) => typeof value === "string" && parseDateText(value) !== null);
registerScalar("N", ([value]) => {
  if (value instanceof FormulaError) return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return 0;
});
registerScalar("T", ([value]) => (value instanceof FormulaError ? value : typeof value === "string" ? value : ""));
register("NA", () => na_error("Value not available."));

// ── Aggregates ─────────────────────────────────────────────────────────────────

function registerAggregate(name: string, summarize: (numbers: number[]) => Scalar): void {
  register(name, (args) => {
    const numbers = collectNumbers(args);
    return numbers instanceof FormulaError ? numbers : summarize(numbers);
  });
}

registerAggregate("SUM", (numbers) => numbers.reduce((sum, n) => sum + n, 0));
registerAggregate("PRODUCT", (numbers) => (numbers.length === 0 ? 0 : numbers.reduce((product, n) => product * n, 1)));
registerAggregate("AVERAGE", (numbers) =>
  numbers.length === 0
    ? new FormulaError("#DIV/0!", "AVERAGE has no numbers to average.")
    : numbers.reduce((sum, n) => sum + n, 0) / numbers.length
);
registerAggregate("MAX", (numbers) => (numbers.length === 0 ? 0 : Math.max(...numbers)));
registerAggregate("MIN", (numbers) => (numbers.length === 0 ? 0 : Math.min(...numbers)));

register("COUNT", (args) => {
  let count = 0;
  for (const arg of args) {
    if (isMatrix(arg)) {
      for (const row of arg) for (const value of row) if (typeof value === "number") count += 1;
    } else if (typeof arg === "number" || (typeof arg === "string" && parseNumberText(arg) !== null)) {
      count += 1;
    }
  }
  return count;
});
register("COUNTA", (args) => flattenValues(args).filter((value) => value !== null && value !== "").length);
register("COUNTBLANK", (args) => flattenValues(args).filter((value) => value === null || value === "").length);
register("COUNTUNIQUE", (args) => {
  const keys = new Set(
    flattenValues(args)
      .filter((value) => value !== null && value !== "")
      .map((value) => uniqueKey(value))
  );
  return keys.size;
});

// ── Criteria (COUNTIF, SUMIF ...) ──────────────────────────────────────────────

/** Converts a "*" and "?" pattern ("~" escapes them) to a case insensitive RegExp. */
function wildcardToRegExp(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "~" && i + 1 < pattern.length) {
      source += pattern[i + 1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i += 1;
    } else if (char === "*") {
      source += ".*";
    } else if (char === "?") {
      source += ".";
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`, "i");
}

function hasWildcard(text: string): boolean {
  return /(^|[^~])[*?]/.test(text);
}

/** Builds the test for a criterion such as 5, "Live", ">10", "<>", "=", "BL-*" or ">=01/01/2026". */
export function createCriteriaMatcher(criterion: Scalar): (value: Scalar) => boolean {
  if (criterion instanceof FormulaError) return () => false;
  if (typeof criterion === "number" || typeof criterion === "boolean") {
    return (value) => value !== null && compareScalars(value, criterion) === 0 && typeof value === typeof criterion;
  }

  const text = criterion ?? "";
  const operator_match = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(text)!;
  const operator = operator_match[1] ?? "=";
  const operand_text = operator_match[2];
  const is_blank = (value: Scalar) => value === null || value === "";

  if (operand_text === "") {
    return operator === "<>" ? (value) => !is_blank(value) : is_blank;
  }

  const operand_number = parseNumberText(operand_text) ?? parseDateText(operand_text);
  if (operand_number !== null) {
    return (value) => {
      const number = typeof value === "number" ? value : typeof value === "string" ? parseNumberText(value) : null;
      if (number === null) return operator === "<>";
      switch (operator) {
        case "<": return number < operand_number;
        case ">": return number > operand_number;
        case "<=": return number <= operand_number;
        case ">=": return number >= operand_number;
        case "<>": return number !== operand_number;
        default: return number === operand_number;
      }
    };
  }

  if (operator === "=" || operator === "<>") {
    const pattern = hasWildcard(operand_text) ? wildcardToRegExp(operand_text) : null;
    const lower = operand_text.toLowerCase();
    const matches = (value: Scalar) => {
      if (typeof value !== "string") return false;
      return pattern ? pattern.test(value) : value.toLowerCase() === lower;
    };
    return operator === "=" ? matches : (value) => !matches(value);
  }

  return (value) => {
    if (typeof value !== "string") return false;
    const comparison = compareScalars(value, operand_text);
    switch (operator) {
      case "<": return comparison < 0;
      case ">": return comparison > 0;
      case "<=": return comparison <= 0;
      default: return comparison >= 0;
    }
  };
}

/** Indexes (row major) of the cells matching every (range, criterion) pair. */
function matchingIndexes(pairs: Array<[FormulaValue, FormulaValue]>): number[] | FormulaError {
  const ranges = pairs.map(([range]) => toMatrix(range).flat());
  const size = ranges[0]?.length ?? 0;
  if (ranges.some((range) => range.length !== size)) {
    return value_error("Every criteria range must have the same size.");
  }
  const matchers = pairs.map(([, criterion]) => createCriteriaMatcher(scalarOf(criterion)));
  const indexes: number[] = [];
  for (let i = 0; i < size; i++) {
    if (matchers.every((matches, pair_idx) => matches(ranges[pair_idx][i]))) indexes.push(i);
  }
  return indexes;
}

function pairsFrom(args: FormulaValue[], start: number): Array<[FormulaValue, FormulaValue]> | FormulaError {
  if ((args.length - start) % 2 !== 0 || args.length - start < 2) {
    return na_error("Expected pairs of criteria range and criterion.");
  }
  const pairs: Array<[FormulaValue, FormulaValue]> = [];
  for (let i = start; i < args.length; i += 2) pairs.push([args[i], args[i + 1]]);
  return pairs;
}

function numbersAt(range: FormulaValue, indexes: number[]): number[] | FormulaError {
  const flat = toMatrix(range).flat();
  const numbers: number[] = [];
  for (const index of indexes) {
    const value = flat[index];
    if (value instanceof FormulaError) return value;
    if (typeof value === "number") numbers.push(value);
  }
  return numbers;
}

function registerCriteriaAggregate(
  name: string,
  value_range_position: "first" | "last" | "none",
  summarize: (numbers: number[], count: number) => Scalar
): void {
  register(name, (args) => {
    let pairs: Array<[FormulaValue, FormulaValue]> | FormulaError;
    let value_range: FormulaValue | undefined;
    const is_multi = name.endsWith("IFS");

    if (is_multi) {
      if (value_range_position === "first") {
        value_range = args[0];
        pairs = pairsFrom(args, 1);
      } else {
        pairs = pairsFrom(args, 0);
      }
    } else {
      pairs = [[args[0], args[1]]];
      value_range = value_range_position === "none" ? undefined : (args[2] ?? args[0]);
    }
    if (pairs instanceof FormulaError) return pairs;

    const indexes = matchingIndexes(pairs);
    if (indexes instanceof FormulaError) return indexes;
    if (value_range === undefined) return summarize([], indexes.length);

    const numbers = numbersAt(value_range, indexes);
    return numbers instanceof FormulaError ? numbers : summarize(numbers, indexes.length);
  });
}

const sumOf = (numbers: number[]) => numbers.reduce((sum, n) => sum + n, 0);
const averageOf = (numbers: number[]) =>
  numbers.length === 0 ? new FormulaError("#DIV/0!", "No cells match the criteria.") : sumOf(numbers) / numbers.length;

registerCriteriaAggregate("COUNTIF", "none", (_numbers, count) => count);
registerCriteriaAggregate("COUNTIFS", "none", (_numbers, count) => count);
registerCriteriaAggregate("SUMIF", "last", sumOf);
registerCriteriaAggregate("SUMIFS", "first", sumOf);
registerCriteriaAggregate("AVERAGEIF", "last", averageOf);
registerCriteriaAggregate("AVERAGEIFS", "first", averageOf);
registerCriteriaAggregate("MAXIFS", "first", (numbers) => (numbers.length === 0 ? 0 : Math.max(...numbers)));
registerCriteriaAggregate("MINIFS", "first", (numbers) => (numbers.length === 0 ? 0 : Math.min(...numbers)));

// ── Lookup ─────────────────────────────────────────────────────────────────────

/** Exact lookup equality: same type, text without regard to case, wildcards when the key has them. */
function createEqualityMatcher(key: Scalar, allow_wildcards: boolean): (value: Scalar) => boolean {
  if (typeof key === "string" && allow_wildcards && hasWildcard(key)) {
    const pattern = wildcardToRegExp(key);
    return (value) => typeof value === "string" && pattern.test(value);
  }
  return (value) => {
    if (value === null || value instanceof FormulaError) return false;
    if (typeof value !== typeof key) return false;
    return compareScalars(value, key) === 0;
  };
}

/**
 * Position of a key in a list. Mode 0 is an exact match, 1 the largest value
 * less than or equal to the key (sorted ascending), -1 the smallest value greater
 * than or equal to it (sorted descending). Returns -1 when nothing matches.
 */
function lookupIndex(values: Scalar[], key: Scalar, mode: 0 | 1 | -1, reverse = false): number {
  if (mode === 0) {
    const matches = createEqualityMatcher(key, true);
    if (reverse) {
      for (let i = values.length - 1; i >= 0; i--) if (matches(values[i])) return i;
      return -1;
    }
    return values.findIndex(matches);
  }

  let found = -1;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value === null || value instanceof FormulaError || typeof value !== typeof key) continue;
    const comparison = compareScalars(value, key);
    if (comparison === 0) return i;
    if (mode === 1 && comparison < 0) found = i;
    else if (mode === -1 && comparison > 0) found = i;
    else if (found !== -1) break;
  }
  return found;
}

function lookupKey(args: FormulaValue[]): Scalar {
  return scalarOf(args[0]);
}

register("VLOOKUP", (args) => {
  const key = lookupKey(args);
  if (key instanceof FormulaError) return key;
  const table = toMatrix(args[1] ?? null);
  const column = numberArg(args[2]);
  const is_sorted = booleanArg(args[3], true);
  const error = firstError(column, is_sorted);
  if (error) return error;
  const col_idx = Math.trunc(column as number) - 1;
  if (col_idx < 0) return value_error("VLOOKUP index must be at least 1.");
  if (col_idx >= (table[0]?.length ?? 0)) return new FormulaError("#REF!", "VLOOKUP index is outside the range.");

  const row_idx = lookupIndex(table.map((row) => row[0]), key, is_sorted ? 1 : 0);
  if (row_idx === -1) return na_error(`Did not find value "${formatScalar(key)}" in VLOOKUP evaluation.`);
  return table[row_idx][col_idx];
});

register("HLOOKUP", (args) => {
  const key = lookupKey(args);
  if (key instanceof FormulaError) return key;
  const table = toMatrix(args[1] ?? null);
  const row = numberArg(args[2]);
  const is_sorted = booleanArg(args[3], true);
  const error = firstError(row, is_sorted);
  if (error) return error;
  const row_idx = Math.trunc(row as number) - 1;
  if (row_idx < 0) return value_error("HLOOKUP index must be at least 1.");
  if (row_idx >= table.length) return new FormulaError("#REF!", "HLOOKUP index is outside the range.");

  const col_idx = lookupIndex(table[0] ?? [], key, is_sorted ? 1 : 0);
  if (col_idx === -1) return na_error(`Did not find value "${formatScalar(key)}" in HLOOKUP evaluation.`);
  return table[row_idx][col_idx];
});

register("MATCH", (args) => {
  const key = lookupKey(args);
  if (key instanceof FormulaError) return key;
  const values = toMatrix(args[1] ?? null).flat();
  const type = numberArg(args[2], 1);
  if (type instanceof FormulaError) return type;
  const mode = (type > 0 ? 1 : type < 0 ? -1 : 0) as 0 | 1 | -1;
  const index = lookupIndex(values, key, mode);
  return index === -1 ? na_error(`Did not find value "${formatScalar(key)}" in MATCH evaluation.`) : index + 1;
});

register("XLOOKUP", (args) => {
  const key = lookupKey(args);
  if (key instanceof FormulaError) return key;
  const lookup = toMatrix(args[1] ?? null);
  const results = toMatrix(args[2] ?? null);
  const match_mode = numberArg(args[4], 0);
  const search_mode = numberArg(args[5], 1);
  const error = firstError(match_mode, search_mode);
  if (error) return error;

  const is_vertical = lookup[0]?.length === 1;
  const values = is_vertical ? lookup.map((row) => row[0]) : (lookup[0] ?? []);
  const reverse = (search_mode as number) < 0;

  let index: number;
  if (match_mode === 0 || match_mode === 2) {
    index = lookupIndex(values, key, 0, reverse);
  } else {
    // Exact match first, otherwise the closest smaller (-1) or larger (1) value.
    index = lookupIndex(values, key, 0, reverse);
    if (index === -1) {
      let best = -1;
      values.forEach((value, i) => {
        if (value === null || value instanceof FormulaError || typeof value !== typeof key) return;
        const comparison = compareScalars(value, key);
        const is_candidate = match_mode === -1 ? comparison < 0 : comparison > 0;
        if (!is_candidate) return;
        if (best === -1) {
          best = i;
          return;
        }
        const closer = compareScalars(value, values[best]);
        if ((match_mode === -1 && closer > 0) || (match_mode === 1 && closer < 0)) best = i;
      });
      index = best;
    }
  }

  if (index === -1) {
    return args[3] !== undefined && args[3] !== null
      ? args[3]
      : na_error(`Did not find value "${formatScalar(key)}" in XLOOKUP evaluation.`);
  }
  if (is_vertical) {
    const row = results[index];
    if (!row) return new FormulaError("#REF!", "XLOOKUP result range is smaller than the lookup range.");
    return row.length === 1 ? row[0] : [row];
  }
  const column = results.map((row) => [row[index] ?? null]);
  return column.length === 1 ? column[0][0] : column;
});

register("INDEX", (args) => {
  const range = toMatrix(args[0] ?? null);
  const row_arg = numberArg(args[1], 0);
  const col_arg = numberArg(args[2], 0);
  const error = firstError(row_arg, col_arg);
  if (error) return error;
  let row = Math.trunc(row_arg as number);
  let col = Math.trunc(col_arg as number);
  // A single row range indexed with one number reads that number as the column.
  if (range.length === 1 && args[2] === undefined) {
    col = row;
    row = 1;
  }
  if (row < 0 || col < 0 || row > range.length || col > (range[0]?.length ?? 0)) {
    return new FormulaError("#REF!", "INDEX is outside the range.");
  }
  if (row === 0 && col === 0) return range;
  if (row === 0) return range.map((r) => [r[col - 1]]);
  if (col === 0) return [range[row - 1]];
  return range[row - 1][col - 1];
});

// ── Arrays ─────────────────────────────────────────────────────────────────────

function uniqueKey(value: Scalar): string {
  if (value === null) return "blank";
  if (value instanceof FormulaError) return `error:${value.code}`;
  return `${typeof value}:${String(value)}`;
}

register("UNIQUE", (args) => {
  const range = toMatrix(args[0] ?? null);
  const by_column = booleanArg(args[1], false);
  const exactly_once = booleanArg(args[2], false);
  const error = firstError(by_column, exactly_once);
  if (error) return error;

  const lines = by_column ? transpose(range) : range;
  const counts = new Map<string, number>();
  lines.forEach((line) => {
    const key = line.map(uniqueKey).join("|");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const seen = new Set<string>();
  const unique_lines = lines.filter((line) => {
    const key = line.map(uniqueKey).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return !exactly_once || counts.get(key) === 1;
  });
  // Blank rows of a whole column range are not results.
  const result = unique_lines.filter((line) => line.some((value) => value !== null));
  if (result.length === 0) return na_error("No unique values found.");
  return by_column ? transpose(result) : result;
});

function transpose(matrix: Matrix): Matrix {
  const row_count = matrix.length;
  const col_count = matrix[0]?.length ?? 0;
  return Array.from({ length: col_count }, (_, c) => Array.from({ length: row_count }, (_, r) => matrix[r][c]));
}

register("TRANSPOSE", (args) => transpose(toMatrix(args[0] ?? null)));

register("FLATTEN", (args) => {
  const values = flattenValues(args);
  return values.length === 0 ? [[null]] : values.map((value) => [value]);
});

register("FILTER", (args) => {
  const range = toMatrix(args[0] ?? null);
  const conditions = args.slice(1).map((condition) => toMatrix(condition).flat());
  if (conditions.length === 0) return na_error("FILTER needs at least one condition.");

  const by_rows = conditions.every((condition) => condition.length === range.length);
  const by_columns = !by_rows && conditions.every((condition) => condition.length === (range[0]?.length ?? 0));
  if (!by_rows && !by_columns) return value_error("FILTER conditions must match the height or width of the range.");

  const keep = (index: number): boolean | FormulaError => {
    for (const condition of conditions) {
      const bool = toBoolean(condition[index]);
      if (bool instanceof FormulaError) return bool;
      if (!bool) return false;
    }
    return true;
  };

  const lines = by_rows ? range : transpose(range);
  const kept: Matrix = [];
  for (let i = 0; i < lines.length; i++) {
    const result = keep(i);
    if (result instanceof FormulaError) return result;
    if (result) kept.push(lines[i]);
  }
  if (kept.length === 0) return na_error("No matches are found in FILTER evaluation.");
  return by_rows ? kept : transpose(kept);
});

register("SORT", (args) => {
  const range = toMatrix(args[0] ?? null);
  const rules: Array<{ col_idx: number; ascending: boolean }> = [];
  for (let i = 1; i < args.length; i += 2) {
    const column = numberArg(args[i]);
    const ascending = booleanArg(args[i + 1], true);
    const error = firstError(column, ascending);
    if (error) return error;
    rules.push({ col_idx: Math.trunc(column as number) - 1, ascending: ascending as boolean });
  }
  if (rules.length === 0) rules.push({ col_idx: 0, ascending: true });

  const rows = range.filter((row) => row.some((value) => value !== null));
  return [...rows].sort((a, b) => {
    for (const { col_idx, ascending } of rules) {
      const left = a[col_idx] ?? null;
      const right = b[col_idx] ?? null;
      // Blank cells always go last, like Sheets.
      if (left === null && right === null) continue;
      if (left === null) return 1;
      if (right === null) return -1;
      const comparison = compareScalars(left, right);
      if (comparison !== 0) return ascending ? comparison : -comparison;
    }
    return 0;
  });
});

register("SEQUENCE", (args) => {
  const rows = numberArg(args[0]);
  const columns = numberArg(args[1], 1);
  const start = numberArg(args[2], 1);
  const step = numberArg(args[3], 1);
  const error = firstError(rows, columns, start, step);
  if (error) return error;
  const row_count = Math.trunc(rows as number);
  const col_count = Math.trunc(columns as number);
  if (row_count < 1 || col_count < 1 || row_count * col_count > 10_000) {
    return new FormulaError("#NUM!", "SEQUENCE size must be between 1 and 10000 cells.");
  }
  return Array.from({ length: row_count }, (_, r) =>
    Array.from({ length: col_count }, (_, c) => (start as number) + (r * col_count + c) * (step as number))
  );
});

register("ARRAY_CONSTRAIN", (args) => {
  const range = toMatrix(args[0] ?? null);
  const rows = numberArg(args[1]);
  const columns = numberArg(args[2]);
  const error = firstError(rows, columns);
  if (error) return error;
  return range.slice(0, Math.trunc(rows as number)).map((row) => row.slice(0, Math.trunc(columns as number)));
});

// ── Text ───────────────────────────────────────────────────────────────────────

/** Registers a text function whose first argument is read as text, spread over ranges. */
function registerText(name: string, apply: (text: string, args: Scalar[]) => Scalar): void {
  registerScalar(name, (args) => {
    const text = toText(args[0] ?? null);
    if (text instanceof FormulaError) return text;
    return apply(text, args);
  });
}

function optionalNumber(value: Scalar | undefined, fallback: number): number | FormulaError {
  return value === undefined ? fallback : toNumber(value);
}

registerText("LEN", (text) => text.length);
registerText("UPPER", (text) => text.toUpperCase());
registerText("LOWER", (text) => text.toLowerCase());
registerText("PROPER", (text) => text.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_, before, letter) => before + letter.toUpperCase()));
registerText("TRIM", (text) => text.trim().replace(/ {2,}/g, " "));
registerText("CLEAN", (text) => text.replace(/[\x00-\x1f]/g, ""));
registerText("LEFT", (text, args) => {
  const count = optionalNumber(args[1], 1);
  if (count instanceof FormulaError) return count;
  return count < 0 ? value_error("LEFT count must be 0 or more.") : text.slice(0, Math.trunc(count));
});
registerText("RIGHT", (text, args) => {
  const count = optionalNumber(args[1], 1);
  if (count instanceof FormulaError) return count;
  if (count < 0) return value_error("RIGHT count must be 0 or more.");
  return Math.trunc(count) === 0 ? "" : text.slice(-Math.trunc(count));
});
registerText("MID", (text, args) => {
  const start = toNumber(args[1] ?? null);
  const length = toNumber(args[2] ?? null);
  const error = firstError(start, length);
  if (error) return error;
  if ((start as number) < 1 || (length as number) < 0) return value_error("MID start must be 1 or more.");
  const from = Math.trunc(start as number) - 1;
  return text.slice(from, from + Math.trunc(length as number));
});
registerText("REPT", (text, args) => {
  const count = toNumber(args[1] ?? null);
  if (count instanceof FormulaError) return count;
  return count < 0 ? value_error() : text.repeat(Math.trunc(count));
});
registerText("SUBSTITUTE", (text, args) => {
  const search = toText(args[1] ?? null);
  const replacement = toText(args[2] ?? null);
  const occurrence = args[3] === undefined ? null : toNumber(args[3]);
  const error = firstError(search, replacement, occurrence);
  if (error) return error;
  if (search === "") return text;
  if (occurrence === null) return text.split(search as string).join(replacement as string);
  let seen = 0;
  let index = text.indexOf(search as string);
  while (index !== -1) {
    seen += 1;
    if (seen === occurrence) {
      return text.slice(0, index) + replacement + text.slice(index + (search as string).length);
    }
    index = text.indexOf(search as string, index + 1);
  }
  return text;
});
registerText("REPLACE", (text, args) => {
  const start = toNumber(args[1] ?? null);
  const length = toNumber(args[2] ?? null);
  const replacement = toText(args[3] ?? null);
  const error = firstError(start, length, replacement);
  if (error) return error;
  const from = Math.trunc(start as number) - 1;
  if (from < 0) return value_error();
  return text.slice(0, from) + replacement + text.slice(from + Math.trunc(length as number));
});

function registerFind(name: string, case_sensitive: boolean): void {
  registerScalar(name, (args) => {
    const search = toText(args[0] ?? null);
    const text = toText(args[1] ?? null);
    const start = optionalNumber(args[2], 1);
    const error = firstError(search, text, start);
    if (error) return error;
    const haystack = case_sensitive ? (text as string) : (text as string).toLowerCase();
    const needle = case_sensitive ? (search as string) : (search as string).toLowerCase();
    const index = haystack.indexOf(needle, Math.max(0, Math.trunc(start as number) - 1));
    return index === -1 ? value_error(`${name} did not find "${search}".`) : index + 1;
  });
}
registerFind("FIND", true);
registerFind("SEARCH", false);

registerScalar("EXACT", ([left, right]) => {
  const a = toText(left ?? null);
  const b = toText(right ?? null);
  return firstError(a, b) ?? a === b;
});

/** Text of every value, ranges included, for CONCATENATE, JOIN and TEXTJOIN. */
function collectTexts(args: FormulaValue[], skip_empty: boolean): string[] | FormulaError {
  const texts: string[] = [];
  for (const value of flattenValues(args)) {
    const text = toText(value);
    if (text instanceof FormulaError) return text;
    if (skip_empty && text === "") continue;
    texts.push(text);
  }
  return texts;
}

const concatenate: FormulaFunction = (args) => {
  const texts = collectTexts(args, false);
  return texts instanceof FormulaError ? texts : texts.join("");
};
register("CONCATENATE", concatenate);
register("CONCAT", concatenate);
register("JOIN", (args) => {
  const delimiter = textArg(args[0]);
  if (delimiter instanceof FormulaError) return delimiter;
  const texts = collectTexts(args.slice(1), false);
  return texts instanceof FormulaError ? texts : texts.join(delimiter);
});
register("TEXTJOIN", (args) => {
  const delimiter = textArg(args[0]);
  const ignore_empty = booleanArg(args[1], true);
  const error = firstError(delimiter, ignore_empty);
  if (error) return error;
  const texts = collectTexts(args.slice(2), ignore_empty as boolean);
  return texts instanceof FormulaError ? texts : texts.join(delimiter as string);
});

register("SPLIT", (args) => {
  const text = textArg(args[0]);
  const delimiter = textArg(args[1]);
  const split_by_each = booleanArg(args[2], true);
  const remove_empty = booleanArg(args[3], true);
  const error = firstError(text, delimiter, split_by_each, remove_empty);
  if (error) return error;
  if (delimiter === "") return text as string;

  const pattern = split_by_each
    ? new RegExp(`[${(delimiter as string).replace(/[\]\\^-]/g, "\\$&")}]`)
    : (delimiter as string);
  let parts = (text as string).split(pattern);
  if (remove_empty) parts = parts.filter((part) => part !== "");
  if (parts.length === 0) return null;
  return [parts.map((part) => parseNumberText(part) ?? part)];
});

register("TEXT", (args) => {
  const pattern = textArg(args[1]);
  if (pattern instanceof FormulaError) return pattern;
  return broadcast([args[0] ?? null], ([value]) => formatWithPattern(value, pattern));
});

registerScalar("VALUE", ([value]) => {
  if (value instanceof FormulaError || typeof value === "number") return value;
  if (value === null) return 0;
  if (typeof value === "boolean") return value_error();
  const number = parseNumberText(value) ?? parseDateText(value);
  return number ?? value_error(`VALUE cannot read "${value}" as a number.`);
});

registerScalar("TO_TEXT", ([value]) => (value instanceof FormulaError ? value : formatScalar(value)));
registerScalar("TO_PURE_NUMBER", ([value]) => toNumber(value ?? null));
registerScalar("TO_DATE", ([value]) => toNumber(value ?? null));
registerScalar("TO_PERCENT", ([value]) => {
  const number = toNumber(value ?? null);
  return number instanceof FormulaError ? number : `${formatScalar(number * 100)}%`;
});
registerScalar("TO_DOLLARS", ([value]) => {
  const number = toNumber(value ?? null);
  return number instanceof FormulaError ? number : number.toLocaleString("en-US", { style: "currency", currency: "USD" });
});

// ── Regular expressions (Google Sheets) ────────────────────────────────────────

function compileRegExp(source: Scalar, flags = ""): RegExp | FormulaError {
  const text = toText(source);
  if (text instanceof FormulaError) return text;
  try {
    return new RegExp(text, flags);
  } catch {
    return value_error(`"${text}" is not a valid regular expression.`);
  }
}

registerScalar("REGEXMATCH", ([value, pattern]) => {
  const text = toText(value ?? null);
  const regexp = compileRegExp(pattern ?? null);
  return firstError(text, regexp) ?? (regexp as RegExp).test(text as string);
});

registerScalar("REGEXEXTRACT", ([value, pattern]) => {
  const text = toText(value ?? null);
  const regexp = compileRegExp(pattern ?? null);
  const error = firstError(text, regexp);
  if (error) return error;
  const match = (regexp as RegExp).exec(text as string);
  if (!match) return na_error("REGEXEXTRACT found no match.");
  return match[1] ?? match[0];
});

registerScalar("REGEXREPLACE", ([value, pattern, replacement]) => {
  const text = toText(value ?? null);
  const regexp = compileRegExp(pattern ?? null, "g");
  const new_text = toText(replacement ?? null);
  const error = firstError(text, regexp, new_text);
  if (error) return error;
  return (text as string).replace(regexp as RegExp, new_text as string);
});

// ── Dates ──────────────────────────────────────────────────────────────────────

register("TODAY", (_args, context) => {
  const now = context.now;
  return dateToSerial(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
});
register("NOW", (_args, context) => dateToSerial(context.now));
registerScalar("DATEVALUE", ([value]) => {
  if (value instanceof FormulaError) return value;
  if (typeof value === "number") return Math.trunc(value);
  const text = toText(value ?? null);
  if (text instanceof FormulaError) return text;
  const serial = parseDateText(text);
  if (serial !== null) return serial;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? value_error(`DATEVALUE cannot read "${text}" as a date.`)
    : Math.trunc(dateToSerial(parsed));
});

// ── Web ────────────────────────────────────────────────────────────────────────

register("HYPERLINK", (args) => {
  const url = scalarOf(args[0]);
  const label = args[1] === undefined ? null : scalarOf(args[1]);
  return label ?? url;
});
registerScalar("ENCODEURL", ([value]) => {
  const text = toText(value ?? null);
  return text instanceof FormulaError ? text : encodeURIComponent(text);
});
