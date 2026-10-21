/**
 * Helpers for the formula editor (the cell input and the formula bar): which
 * function name is being typed (for autocomplete), which function and argument
 * the caret is in (for the argument hint), and whether clicking a cell should
 * insert its reference at the caret, like Google Sheets does while typing a formula.
 */

import { tokenizeFormula, type FormulaToken } from "./tokenizer";

export interface FunctionNameToken {
  /** The letters typed so far. */
  text: string;
  start: number;
  end: number;
}

export interface FunctionCallContext {
  name: string;
  /** Zero based index of the argument the caret is in. */
  arg_index: number;
}

export interface FormulaAssistContext {
  /** The function name being typed right before the caret, if any. */
  name_token: FunctionNameToken | null;
  /** Innermost function call surrounding the caret, if any. */
  call: FunctionCallContext | null;
}

const EMPTY_CONTEXT: FormulaAssistContext = { name_token: null, call: null };

/** Token types after which a function name may start. */
function startsExpression(previous: FormulaToken | undefined): boolean {
  if (!previous) return true;
  return ["operator", "lparen", "comma", "semicolon", "lbrace"].includes(previous.type);
}

export function getFormulaAssistContext(text: string, caret: number): FormulaAssistContext {
  if (!text.trimStart().startsWith("=")) return EMPTY_CONTEXT;
  const offset = text.indexOf("=") + 1;
  const body = text.slice(offset, caret);
  const tokens = tokenizeFormula(body).filter((token) => token.type !== "whitespace");

  let name_token: FunctionNameToken | null = null;
  const last = tokens[tokens.length - 1];
  const before_last = tokens[tokens.length - 2];
  // A name being typed may still look like a cell reference ("LOG1"), so letters
  // with optional digits right at the caret count as a name prefix too.
  const is_name_like = last && (last.type === "ident" || (last.type === "ref" && /^[A-Za-z]+\d*$/.test(last.text)));
  if (is_name_like && last.end === body.length && startsExpression(before_last)) {
    name_token = { text: last.text, start: offset + last.start, end: offset + last.end };
  }

  const stack: FunctionCallContext[] = [];
  tokens.forEach((token, index) => {
    if (token.type === "lparen") {
      const previous = tokens[index - 1];
      stack.push({ name: previous?.type === "ident" ? previous.text.toUpperCase() : "", arg_index: 0 });
    } else if ((token.type === "comma" || token.type === "semicolon") && stack.length > 0) {
      stack[stack.length - 1].arg_index += 1;
    } else if (token.type === "rparen") {
      stack.pop();
    }
  });
  const open_calls = stack.filter((call) => call.name !== "");
  const call = open_calls.length > 0 ? open_calls[open_calls.length - 1] : null;

  return { name_token, call };
}

/** Replaces the typed name prefix with a full function name followed by "(". */
export function applyFunctionSuggestion(
  text: string,
  name_token: FunctionNameToken,
  function_name: string
): { text: string; caret: number } {
  const after = text.slice(name_token.end);
  const has_paren = after.trimStart().startsWith("(");
  const insert = has_paren ? function_name : `${function_name}(`;
  const next_text = text.slice(0, name_token.start) + insert + after;
  return { text: next_text, caret: name_token.start + insert.length };
}

/**
 * True when the caret sits where a cell reference can go: right after "=", an
 * operator, "(" or a separator. Clicking a cell then inserts its reference
 * instead of leaving the editor.
 */
export function canInsertReferenceAt(text: string, caret: number): boolean {
  if (!text.trimStart().startsWith("=")) return false;
  const before = text.slice(0, caret).trimEnd();
  return before !== "" && /[(,;+\-*/^&<>=:{]$/.test(before);
}
