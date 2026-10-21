/**
 * The tokenizer (which also powers the live helpers of the formula editor, so it
 * must never throw) and the parser (operator precedence, arguments, arrays and
 * the error messages shown for invalid formulas).
 */

import {
  FormulaParseError,
  columnLetterToIndex,
  isFormulaText,
  parseFormula,
  tokenizeFormula,
} from "@/lib/spreadsheet-formulas";
import { collectFunctionNames, collectReferenceSpecs } from "@/lib/spreadsheet-formulas/parser";

function tokenTypes(text: string): string[] {
  return tokenizeFormula(text)
    .filter((token) => token.type !== "whitespace")
    .map((token) => `${token.type}:${token.text}`);
}

function parseErrorOf(formula: string): string {
  try {
    parseFormula(formula);
  } catch (error) {
    expect(error).toBeInstanceOf(FormulaParseError);
    return (error as Error).message;
  }
  throw new Error(`"${formula}" parsed without an error.`);
}

describe("tokenizeFormula", () => {
  it("gives the original text back when its tokens are joined", () => {
    for (const formula of [
      '=IF(A1 > 2,  "a ""quoted"" text" , {1,2;3,4})',
      "=SUM([dr_lbs]:[dr_lbs]) + [$final_price:$3]*2%",
      "=@#weird ~ text",
      '="unterminated',
    ]) {
      expect(tokenizeFormula(formula).map((token) => token.text).join("")).toBe(formula);
    }
  });

  it("never throws, marking unknown characters and open strings as invalid", () => {
    expect(tokenTypes("@")).toEqual(["invalid:@"]);
    expect(tokenTypes('"open')).toEqual(['invalid:"open']);
    expect(tokenTypes("#WHAT")).toEqual(["invalid:#", "ident:WHAT"]);
  });

  it("reads strings with doubled quotes", () => {
    const [token] = tokenizeFormula('"say ""hi"""');
    expect(token.type).toBe("string");
    expect(token.value).toBe('say "hi"');
  });

  it("reads numbers and error literals", () => {
    expect(tokenizeFormula("1.5e3")[0].value).toBe(1500);
    expect(tokenizeFormula(".5")[0].value).toBe(0.5);
    expect(tokenizeFormula("#n/a")[0]).toMatchObject({ type: "error", value: "#N/A" });
    expect(tokenizeFormula("#DIV/0!")[0]).toMatchObject({ type: "error", value: "#DIV/0!" });
  });

  it("tells references from function names", () => {
    expect(tokenTypes("LOG10(A1)")).toEqual(["ident:LOG10", "lparen:(", "ref:A1", "rparen:)"]);
    expect(tokenTypes("AB12+$C$3")).toEqual(["ref:AB12", "operator:+", "ref:$C$3"]);
    expect(tokenTypes("ABCD1")).toEqual(["ident:ABCD1"]);
    expect(tokenTypes("STDEV.S(A:A)")).toEqual(["ident:STDEV.S", "lparen:(", "ref:A:A", "rparen:)"]);
  });

  it("reads every kind of A1 reference", () => {
    expect(tokenTypes("A1:B2")).toEqual(["ref:A1:B2"]);
    expect(tokenTypes("A:C")).toEqual(["ref:A:C"]);
    expect(tokenTypes("3:5")).toEqual(["ref:3:5"]);
    expect(tokenTypes("A2:A")).toEqual(["ref:A2:A"]);
    expect(tokenizeFormula("A2:A")[0].ref).toEqual({
      start: { col: { index: 0, absolute: false }, row: { kind: "number", number: 2, absolute: false } },
      end: { col: { index: 0, absolute: false }, row: null },
    });
  });

  it("reads stored references", () => {
    expect(tokenizeFormula("[final_price:~-2]")[0].ref).toEqual({
      start: { col: { key: "final_price", absolute: false }, row: { kind: "offset", offset: -2 } },
      end: null,
    });
    expect(tokenizeFormula("[$dr_lbs:$12]")[0].ref?.start).toEqual({
      col: { key: "dr_lbs", absolute: true },
      row: { kind: "number", number: 12, absolute: true },
    });
    expect(tokenizeFormula("[*:~0]")[0].ref?.start).toEqual({ col: null, row: { kind: "offset", offset: 0 } });
    expect(tokenTypes("[status]:[status]")).toEqual(["ref:[status]:[status]"]);
  });

  it("reads multi character operators", () => {
    expect(tokenTypes("A1<>B1<=C1>=D1")).toEqual([
      "ref:A1",
      "operator:<>",
      "ref:B1",
      "operator:<=",
      "ref:C1",
      "operator:>=",
      "ref:D1",
    ]);
  });
});

describe("columnLetterToIndex", () => {
  it("converts column letters to zero based indexes", () => {
    expect(columnLetterToIndex("A")).toBe(0);
    expect(columnLetterToIndex("z")).toBe(25);
    expect(columnLetterToIndex("AA")).toBe(26);
    expect(columnLetterToIndex("AD")).toBe(29);
    expect(columnLetterToIndex("XFD")).toBe(16383);
  });
});

describe("parseFormula", () => {
  it("builds the tree with spreadsheet precedence", () => {
    expect(parseFormula("=1+2*3")).toEqual({
      type: "binary",
      operator: "+",
      left: { type: "number", value: 1 },
      right: {
        type: "binary",
        operator: "*",
        left: { type: "number", value: 2 },
        right: { type: "number", value: 3 },
      },
    });
    expect(parseFormula("=-A1%")).toMatchObject({ type: "unary", operator: "-", operand: { type: "percent" } });
    expect(parseFormula('=A1&"x"=B1')).toMatchObject({ type: "binary", operator: "=", left: { operator: "&" } });
  });

  it("parses with or without the leading equals sign", () => {
    expect(parseFormula("1+1")).toEqual(parseFormula("  =1+1"));
  });

  it("reads TRUE and FALSE as values and unknown names as names", () => {
    expect(parseFormula("=true")).toEqual({ type: "boolean", value: true });
    expect(parseFormula("=Revenue")).toEqual({ type: "name", name: "Revenue" });
  });

  it("upper cases function names and keeps skipped arguments", () => {
    expect(parseFormula("=if(A1,,2)")).toMatchObject({
      type: "call",
      name: "IF",
      args: [{ type: "ref" }, { type: "empty" }, { type: "number", value: 2 }],
    });
    expect(parseFormula("=NOW()")).toEqual({ type: "call", name: "NOW", args: [] });
  });

  it("accepts semicolons between arguments, like some Sheets locales", () => {
    expect(parseFormula("=SUM(1;2)")).toEqual(parseFormula("=SUM(1,2)"));
  });

  it("parses array literals row by row", () => {
    expect(parseFormula("={1,2;3,4}")).toMatchObject({
      type: "array",
      rows: [
        [{ value: 1 }, { value: 2 }],
        [{ value: 3 }, { value: 4 }],
      ],
    });
  });

  it("explains what is wrong with an invalid formula", () => {
    expect(parseErrorOf("=")).toBe("The formula is empty.");
    expect(parseErrorOf("=SUM(1, 2")).toBe('Missing ")".');
    expect(parseErrorOf("=(1+2")).toBe('Missing ")".');
    expect(parseErrorOf("=1+")).toBe("The formula ends unexpectedly.");
    expect(parseErrorOf("=1 2")).toBe('Unexpected "2".');
    expect(parseErrorOf('="open')).toBe("A text value is missing its closing quote.");
    expect(parseErrorOf("={1,2;3}")).toBe("Every row of an array must have the same number of values.");
    expect(parseErrorOf("={1,2")).toBe('Missing "}".');
    expect(parseErrorOf("=@A1")).toBe('Unexpected "@".');
  });

  it("parses the long formulas of the client's sheet", () => {
    const formula =
      '=IFERROR(IF(J2<>"",IFS(C2="Express Link",VLOOKUP(K2,A:P,6),C2="DA 30+ External",VLOOKUP(K2,A:P,10),REGEXMATCH(C2, "DA"),VLOOKUP(K2,A:P,8)),""),"Verify Capacity w/ Teams")';
    expect(() => parseFormula(formula)).not.toThrow();
    expect([...collectFunctionNames(parseFormula(formula))].sort()).toEqual([
      "IF",
      "IFERROR",
      "IFS",
      "REGEXMATCH",
      "VLOOKUP",
    ]);
  });
});

describe("parser helpers", () => {
  it("tells formula text from plain text", () => {
    expect(isFormulaText("=A1")).toBe(true);
    expect(isFormulaText("  =A1")).toBe(true);
    expect(isFormulaText("=")).toBe(false);
    expect(isFormulaText("a=1")).toBe(false);
    expect(isFormulaText("")).toBe(false);
  });

  it("collects every reference of a formula", () => {
    const specs = collectReferenceSpecs(parseFormula("=SUM(A1:B2, -C3%, {D4}) & E5"));
    expect(specs).toHaveLength(4);
  });
});
