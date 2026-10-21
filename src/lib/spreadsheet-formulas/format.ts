/**
 * Turns formula results into text: the way a cell shows them, the way they are
 * saved into a typed column of the table, and the TEXT() function's format codes
 * ("$#,##0.00", "0.0%", "mm/dd/yyyy", "dddd" ...).
 */

import { FormulaError, formatGeneralNumber, serialToDate, type Scalar } from "./values";

/** Number format inferred from a formula, e.g. TODAY() or a date column plus days is a date. */
export type InferredFormat = "date" | "datetime";

/** Display format a formula column can be set to. "auto" infers it from the formula. */
export type FormulaColumnFormat = "auto" | "number" | "currency" | "percent" | "date" | "text";

export const FORMULA_COLUMN_FORMATS: ReadonlyArray<{ value: FormulaColumnFormat; label: string; example: string }> = [
  { value: "auto", label: "Automatic", example: "1250.5" },
  { value: "number", label: "Number", example: "1,250.50" },
  { value: "currency", label: "Currency", example: "$1,250.50" },
  { value: "percent", label: "Percent", example: "12.50%" },
  { value: "date", label: "Date", example: "10/21/2026" },
  { value: "text", label: "Plain text", example: "1250.5" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** MM/DD/YYYY, the date format every date column of the table uses. */
export function formatDateSerial(serial: number, with_time = false): string {
  const date = serialToDate(serial);
  const date_text = `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
  if (!with_time) return date_text;
  return `${date_text} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** How a result reads in a cell when no explicit format is set ("Automatic"). */
export function formatScalar(value: Scalar, format: InferredFormat | null = null): string {
  if (value === null) return "";
  if (value instanceof FormulaError) return value.code;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string") return value;
  if (format === "date") return formatDateSerial(value);
  if (format === "datetime") return formatDateSerial(value, true);
  return formatGeneralNumber(value);
}

/** How a formula column shows a result in the format chosen for it. */
export function formatWithColumnFormat(
  value: Scalar,
  column_format: FormulaColumnFormat,
  inferred: InferredFormat | null
): string {
  if (typeof value !== "number") return formatScalar(value, inferred);
  switch (column_format) {
    case "number":
      return value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    case "currency":
      return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
    case "percent":
      return `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`;
    case "date":
      return formatDateSerial(value);
    case "text":
      return formatGeneralNumber(value);
    default:
      return formatScalar(value, inferred);
  }
}

// ── TEXT() format codes ────────────────────────────────────────────────────────

/** Splits a format code into its ";" sections, ignoring ";" inside quotes. */
function splitSections(pattern: string): string[] {
  const sections: string[] = [];
  let current = "";
  let in_quotes = false;
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '"') in_quotes = !in_quotes;
    if (char === "\\" && i + 1 < pattern.length) {
      current += char + pattern[i + 1];
      i += 1;
      continue;
    }
    if (char === ";" && !in_quotes) {
      sections.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  sections.push(current);
  return sections;
}

/** The parts of a section outside quotes and escapes, used to tell date codes from number codes. */
function unquoted(section: string): string {
  return section.replace(/"[^"]*"/g, "").replace(/\\./g, "");
}

function isDatePattern(section: string): boolean {
  const bare = unquoted(section).toLowerCase();
  return /[dyhs]|am\/pm|a\/p/.test(bare) || (/m/.test(bare) && !/[0#?]/.test(bare));
}

function formatDatePattern(serial: number, section: string): string {
  const date = serialToDate(serial);
  const has_meridiem = /am\/pm|a\/p/i.test(unquoted(section));
  const hours = date.getHours();
  const hours_12 = hours % 12 === 0 ? 12 : hours % 12;
  let result = "";
  let previous_was_hour = false;

  for (let i = 0; i < section.length; ) {
    const rest = section.slice(i);
    const lower_rest = rest.toLowerCase();

    if (rest[0] === '"') {
      const close = rest.indexOf('"', 1);
      const literal = close === -1 ? rest.slice(1) : rest.slice(1, close);
      result += literal;
      i += close === -1 ? rest.length : close + 1;
      continue;
    }
    if (rest[0] === "\\") {
      result += rest[1] ?? "";
      i += 2;
      continue;
    }
    if (lower_rest.startsWith("am/pm")) {
      result += hours < 12 ? "AM" : "PM";
      i += 5;
      continue;
    }
    if (lower_rest.startsWith("a/p")) {
      result += hours < 12 ? "A" : "P";
      i += 3;
      continue;
    }

    const run = /^(y+|m+|d+|h+|s+)/i.exec(rest);
    if (!run) {
      result += rest[0];
      i += 1;
      continue;
    }

    const code = run[0].toLowerCase();
    const letter = code[0];
    // "m" right after an hour, or right before seconds, means minutes.
    const is_minutes =
      letter === "m" && (previous_was_hour || /^m+[^a-z]*s/i.test(rest)) && code.length <= 2;

    if (letter === "y") {
      result += code.length <= 2 ? pad(date.getFullYear() % 100) : String(date.getFullYear());
    } else if (is_minutes) {
      result += code.length === 1 ? String(date.getMinutes()) : pad(date.getMinutes());
    } else if (letter === "m") {
      const month = date.getMonth();
      if (code.length === 1) result += String(month + 1);
      else if (code.length === 2) result += pad(month + 1);
      else if (code.length === 3) result += MONTH_NAMES[month].slice(0, 3);
      else if (code.length === 4) result += MONTH_NAMES[month];
      else result += MONTH_NAMES[month][0];
    } else if (letter === "d") {
      if (code.length === 1) result += String(date.getDate());
      else if (code.length === 2) result += pad(date.getDate());
      else if (code.length === 3) result += DAY_NAMES[date.getDay()].slice(0, 3);
      else result += DAY_NAMES[date.getDay()];
    } else if (letter === "h") {
      const shown = has_meridiem ? hours_12 : hours;
      result += code.length === 1 ? String(shown) : pad(shown);
    } else {
      result += code.length === 1 ? String(date.getSeconds()) : pad(date.getSeconds());
    }

    previous_was_hour = letter === "h";
    i += run[0].length;
  }

  return result;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatNumberPattern(value: number, section: string, show_sign: boolean): string {
  let prefix = "";
  let suffix = "";
  let number_code = "";
  let has_number_code = false;
  let percent_count = 0;

  for (let i = 0; i < section.length; i++) {
    const char = section[i];
    if (char === '"') {
      const close = section.indexOf('"', i + 1);
      const literal = close === -1 ? section.slice(i + 1) : section.slice(i + 1, close);
      if (has_number_code) suffix += literal;
      else prefix += literal;
      i = close === -1 ? section.length : close;
      continue;
    }
    if (char === "\\") {
      const literal = section[i + 1] ?? "";
      if (has_number_code) suffix += literal;
      else prefix += literal;
      i += 1;
      continue;
    }
    // "_" and "*" are spacing directives in spreadsheet formats, skip them with their argument.
    if (char === "_" || char === "*") {
      i += 1;
      continue;
    }
    if ("0#?,.".includes(char) && suffix === "") {
      number_code += char;
      if (char !== "," && char !== ".") has_number_code = true;
      continue;
    }
    if (char === "%") percent_count += 1;
    if (has_number_code) suffix += char;
    else prefix += char;
  }

  if (!has_number_code) return `${show_sign && value < 0 ? "-" : ""}${prefix}${suffix}`;

  const scaled = Math.abs(value) * Math.pow(100, percent_count);
  const [int_code, decimal_code = ""] = number_code.split(".");
  const use_grouping = int_code.includes(",");
  const max_decimals = decimal_code.replace(/,/g, "").length;
  const min_decimals = (decimal_code.match(/0/g) ?? []).length;
  const min_int_digits = (int_code.match(/0/g) ?? []).length;

  const [int_digits, fraction_digits = ""] = scaled.toFixed(max_decimals).split(".");
  let fraction = fraction_digits;
  while (fraction.length > min_decimals && fraction.endsWith("0")) fraction = fraction.slice(0, -1);

  let integer = int_digits.replace(/^0+/, "");
  if (integer.length < min_int_digits) integer = integer.padStart(min_int_digits, "0");
  if (use_grouping) integer = groupThousands(integer);

  const is_negative = value < 0 && Number(`${int_digits}.${fraction_digits || 0}`) !== 0;
  const number_text = fraction ? `${integer}.${fraction}` : integer;
  return `${show_sign && is_negative ? "-" : ""}${prefix}${number_text}${suffix}`;
}

/**
 * Formats a value with a spreadsheet format code, the engine behind TEXT().
 * Supports number codes (0, #, thousands ",", decimals, %, literal text and
 * currency symbols, up to four ";" sections) and date codes (d, m, y, h, s, AM/PM).
 */
export function formatWithPattern(value: Scalar, pattern: string): string | FormulaError {
  if (value instanceof FormulaError) return value;
  const sections = splitSections(pattern);

  if (typeof value === "string" || typeof value === "boolean" || value === null) {
    const text = value === null ? "" : typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : value;
    const text_section = sections[3] ?? (sections.length === 1 && sections[0].includes("@") ? sections[0] : null);
    return text_section ? text_section.replace(/"([^"]*)"/g, "$1").replace(/@/g, text) : text;
  }

  let section = sections[0];
  let show_sign = true;
  if (value < 0 && sections.length >= 2 && sections[1] !== "") {
    section = sections[1];
    show_sign = false;
  } else if (value === 0 && sections.length >= 3 && sections[2] !== "") {
    section = sections[2];
  }

  if (section.trim().toLowerCase() === "general" || section.trim() === "") return formatGeneralNumber(value);
  if (isDatePattern(section)) return formatDatePattern(value, section);
  return formatNumberPattern(value, section, show_sign);
}
