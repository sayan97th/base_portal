/**
 * Helpers of the formula editor: the function name being typed (autocomplete),
 * the function and argument around the caret (argument hint), and where a
 * clicked cell's reference can be inserted.
 */

import { applyFunctionSuggestion, canInsertReferenceAt, getFormulaAssistContext } from "@/lib/spreadsheet-formulas";

describe("getFormulaAssistContext", () => {
  it("does nothing for plain text", () => {
    expect(getFormulaAssistContext("vlookup", 7)).toEqual({ name_token: null, call: null });
  });

  it("finds the name typed right before the caret, after an operator, paren or separator", () => {
    expect(getFormulaAssistContext("=vl", 3).name_token).toEqual({ text: "vl", start: 1, end: 3 });
    expect(getFormulaAssistContext("=1+SU", 5).name_token?.text).toBe("SU");
    expect(getFormulaAssistContext("={1,IF", 6).name_token?.text).toBe("IF");
    expect(getFormulaAssistContext("=SUM(1;CO", 9).name_token?.text).toBe("CO");
  });

  it("finds a name that still looks like a cell reference", () => {
    expect(getFormulaAssistContext("=LOG1", 5).name_token?.text).toBe("LOG1");
  });

  it("does not suggest after a value or inside a text", () => {
    expect(getFormulaAssistContext("=A1 SU", 6).name_token).toBeNull();
    expect(getFormulaAssistContext('="VL', 4).name_token).toBeNull();
  });

  it("suggests from the letters before the caret when it sits inside a name", () => {
    expect(getFormulaAssistContext("=VLOOKUP", 4).name_token).toEqual({ text: "VLO", start: 1, end: 4 });
  });

  it("accounts for spaces before the equals sign", () => {
    expect(getFormulaAssistContext("  =VL", 5).name_token).toEqual({ text: "VL", start: 3, end: 5 });
  });

  it("tracks the innermost open call and the argument of the caret", () => {
    const text = '=IFERROR(VLOOKUP(A2, A:B, ';
    expect(getFormulaAssistContext(text, text.length).call).toEqual({ name: "VLOOKUP", arg_index: 2 });
    const closed = '=IFERROR(VLOOKUP(A2, A:B, 2, FALSE), ';
    expect(getFormulaAssistContext(closed, closed.length).call).toEqual({ name: "IFERROR", arg_index: 1 });
  });

  it("ignores commas inside array literals and strings", () => {
    const text = '=VLOOKUP("a,b", {1,2;3,4}, ';
    expect(getFormulaAssistContext(text, text.length).call).toEqual({ name: "VLOOKUP", arg_index: 2 });
  });

  it("ignores plain parentheses around an expression", () => {
    expect(getFormulaAssistContext("=SUM((1+2), ", 12).call).toEqual({ name: "SUM", arg_index: 1 });
    expect(getFormulaAssistContext("=(1+", 4).call).toBeNull();
  });

  it("reads the context at a caret placed before the end", () => {
    expect(getFormulaAssistContext("=ROUND(SUM(A1:A3), 2)", 11).call).toEqual({ name: "SUM", arg_index: 0 });
  });
});

describe("applyFunctionSuggestion", () => {
  it("completes the name and opens the call", () => {
    const token = getFormulaAssistContext("=IFERROR(vlo", 12).name_token!;
    expect(applyFunctionSuggestion("=IFERROR(vlo", token, "VLOOKUP")).toEqual({ text: "=IFERROR(VLOOKUP(", caret: 17 });
  });

  it("does not add a second parenthesis", () => {
    const token = getFormulaAssistContext("=VL(A1", 3).name_token!;
    expect(applyFunctionSuggestion("=VL(A1", token, "VLOOKUP")).toEqual({ text: "=VLOOKUP(A1", caret: 8 });
  });
});

describe("canInsertReferenceAt", () => {
  it("allows a reference where a value is expected", () => {
    for (const text of ["=", "=SUM(", "=A1+", "=A1:", "={", "=SUM(1;", '="a"&', "=1>=", "=SUM( "]) {
      expect(canInsertReferenceAt(text, text.length)).toBe(true);
    }
  });

  it("refuses after a value and in plain text", () => {
    expect(canInsertReferenceAt("=A1", 3)).toBe(false);
    expect(canInsertReferenceAt("=SUM(A1)", 8)).toBe(false);
    expect(canInsertReferenceAt("Acme", 4)).toBe(false);
    expect(canInsertReferenceAt("", 0)).toBe(false);
  });

  it("looks at the text before the caret only", () => {
    expect(canInsertReferenceAt("=SUM(A1)", 5)).toBe(true);
  });
});
