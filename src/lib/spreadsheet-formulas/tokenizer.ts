/**
 * Splits formula text into tokens. Never throws: unknown characters and an
 * unterminated string become "invalid" tokens, so the same tokenizer also powers
 * the live helpers of the formula editor (autocomplete, argument hints, reference
 * highlighting) while the formula is still half typed. The parser reports them.
 *
 * Whitespace is kept as tokens, so joining every token's text gives back the
 * original formula. That is what lets references be rewritten in place.
 */

import type { ColumnPart, RefEndpoint, ReferenceSpec, RowPart } from "./references";

export type FormulaTokenType =
  | "number"
  | "string"
  | "error"
  | "ref"
  /** A function name or a bare name (TRUE, FALSE, or an unknown name). */
  | "ident"
  | "operator"
  | "lparen"
  | "rparen"
  | "lbrace"
  | "rbrace"
  | "comma"
  | "semicolon"
  | "whitespace"
  | "invalid";

export interface FormulaToken {
  type: FormulaTokenType;
  text: string;
  start: number;
  end: number;
  /** Parsed reference, on "ref" tokens. */
  ref?: ReferenceSpec;
  /** Numeric value on "number" tokens, unescaped text on "string" tokens. */
  value?: number | string;
}

/** Converts a column letter (A, Z, AA) to its zero based index. */
export function columnLetterToIndex(letters: string): number {
  let index = 0;
  for (const char of letters.toUpperCase()) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

const ERROR_LITERAL = /#(?:N\/A|REF!|DIV\/0!|VALUE!|NAME\?|NUM!|NULL!|ERROR!)/iy;
const NUMBER_LITERAL = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const OPERATOR = /<>|<=|>=|[-+*/^&=<>%:]/y;

// A1 references. Columns stop at three letters (XFD in Excel), and a reference
// never runs into a following letter, digit, dot or "(" (so LOG10( is a function).
const A1_COL = String.raw`(\$?)([A-Za-z]{1,3})`;
const A1_ROW = String.raw`(\$?)(\d+)`;
const REF_END = String.raw`(?![A-Za-z0-9_.(])`;
const A1_CELL_RANGE = new RegExp(`${A1_COL}${A1_ROW}:${A1_COL}${A1_ROW}${REF_END}`, "y");
const A1_CELL_TO_COLUMN = new RegExp(`${A1_COL}${A1_ROW}:${A1_COL}${REF_END}`, "y");
const A1_COLUMN_RANGE = new RegExp(`${A1_COL}:${A1_COL}${REF_END}`, "y");
const A1_ROW_RANGE = new RegExp(`${A1_ROW}:${A1_ROW}${REF_END}`, "y");
const A1_CELL = new RegExp(`${A1_COL}${A1_ROW}${REF_END}`, "y");

// Stored references: [key], [key:~offset], [key:$row], with "$" before the key
// for an absolute column and "*" in place of the key for a whole row.
const STORED_ENDPOINT = String.raw`\[(\$?)([a-z0-9_]+|\*)(?::(~-?\d+|\$\d+))?\]`;
const STORED_REF = new RegExp(`${STORED_ENDPOINT}(?::${STORED_ENDPOINT})?`, "y");

const IDENT = /[A-Za-z_][A-Za-z0-9_.]*/y;

function matchAt(pattern: RegExp, text: string, index: number): RegExpExecArray | null {
  pattern.lastIndex = index;
  return pattern.exec(text);
}

function a1Column(absolute: string, letters: string): ColumnPart {
  return { index: columnLetterToIndex(letters), absolute: absolute === "$" };
}

function a1Row(absolute: string, digits: string): RowPart {
  return { kind: "number", number: Number(digits), absolute: absolute === "$" };
}

function storedEndpoint(absolute: string, key: string, row_text: string | undefined): RefEndpoint {
  const col: ColumnPart | null = key === "*" ? null : { key, absolute: absolute === "$" };
  let row: RowPart | null = null;
  if (row_text?.startsWith("~")) row = { kind: "offset", offset: Number(row_text.slice(1)) };
  else if (row_text?.startsWith("$")) row = { kind: "number", number: Number(row_text.slice(1)), absolute: true };
  return { col, row };
}

/** Reads a reference starting at `index`, in either notation. */
function readReference(text: string, index: number): { length: number; ref: ReferenceSpec } | null {
  let match = matchAt(STORED_REF, text, index);
  if (match) {
    const start = storedEndpoint(match[1], match[2], match[3]);
    const end = match[4] !== undefined ? storedEndpoint(match[4], match[5], match[6]) : null;
    return { length: match[0].length, ref: { start, end } };
  }

  match = matchAt(A1_CELL_RANGE, text, index);
  if (match) {
    return {
      length: match[0].length,
      ref: {
        start: { col: a1Column(match[1], match[2]), row: a1Row(match[3], match[4]) },
        end: { col: a1Column(match[5], match[6]), row: a1Row(match[7], match[8]) },
      },
    };
  }

  // "A2:A" runs from row 2 to the last row of the column.
  match = matchAt(A1_CELL_TO_COLUMN, text, index);
  if (match) {
    return {
      length: match[0].length,
      ref: {
        start: { col: a1Column(match[1], match[2]), row: a1Row(match[3], match[4]) },
        end: { col: a1Column(match[5], match[6]), row: null },
      },
    };
  }

  match = matchAt(A1_COLUMN_RANGE, text, index);
  if (match) {
    return {
      length: match[0].length,
      ref: {
        start: { col: a1Column(match[1], match[2]), row: null },
        end: { col: a1Column(match[3], match[4]), row: null },
      },
    };
  }

  match = matchAt(A1_ROW_RANGE, text, index);
  if (match) {
    return {
      length: match[0].length,
      ref: {
        start: { col: null, row: a1Row(match[1], match[2]) },
        end: { col: null, row: a1Row(match[3], match[4]) },
      },
    };
  }

  match = matchAt(A1_CELL, text, index);
  if (match) {
    return {
      length: match[0].length,
      ref: { start: { col: a1Column(match[1], match[2]), row: a1Row(match[3], match[4]) }, end: null },
    };
  }

  return null;
}

const SINGLE_CHAR_TOKENS: Record<string, FormulaTokenType> = {
  "(": "lparen",
  ")": "rparen",
  "{": "lbrace",
  "}": "rbrace",
  ",": "comma",
  ";": "semicolon",
};

export function tokenizeFormula(text: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let index = 0;

  const push = (type: FormulaTokenType, length: number, extra: Partial<FormulaToken> = {}) => {
    tokens.push({ type, text: text.slice(index, index + length), start: index, end: index + length, ...extra });
    index += length;
  };

  while (index < text.length) {
    const char = text[index];

    if (/\s/.test(char)) {
      let length = 1;
      while (index + length < text.length && /\s/.test(text[index + length])) length += 1;
      push("whitespace", length);
      continue;
    }

    if (char === '"') {
      let cursor = index + 1;
      let value = "";
      let is_closed = false;
      while (cursor < text.length) {
        if (text[cursor] === '"') {
          if (text[cursor + 1] === '"') {
            value += '"';
            cursor += 2;
            continue;
          }
          is_closed = true;
          cursor += 1;
          break;
        }
        value += text[cursor];
        cursor += 1;
      }
      push(is_closed ? "string" : "invalid", cursor - index, { value });
      continue;
    }

    if (char === "#") {
      const match = matchAt(ERROR_LITERAL, text, index);
      if (match) {
        push("error", match[0].length, { value: match[0].toUpperCase() });
        continue;
      }
      push("invalid", 1);
      continue;
    }

    const single_type = SINGLE_CHAR_TOKENS[char];
    if (single_type) {
      push(single_type, 1);
      continue;
    }

    // References come before numbers and names: "3:5" is a row range, "AB12" a cell.
    if (char === "[" || char === "$" || /[A-Za-z0-9]/.test(char)) {
      const reference = readReference(text, index);
      if (reference) {
        push("ref", reference.length, { ref: reference.ref });
        continue;
      }
    }

    if (/[0-9.]/.test(char)) {
      const match = matchAt(NUMBER_LITERAL, text, index);
      if (match) {
        push("number", match[0].length, { value: Number(match[0]) });
        continue;
      }
    }

    if (/[A-Za-z_]/.test(char)) {
      const match = matchAt(IDENT, text, index);
      if (match) {
        push("ident", match[0].length);
        continue;
      }
    }

    const operator = matchAt(OPERATOR, text, index);
    if (operator) {
      push("operator", operator[0].length);
      continue;
    }

    push("invalid", 1);
  }

  return tokens;
}
