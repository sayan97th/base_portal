/**
 * Logical functions: IF, IFS, IFERROR, IFNA, SWITCH, CHOOSE, AND, OR, XOR, NOT,
 * TRUE and FALSE. IF and its family are evaluated lazily, like in a spreadsheet.
 */

import type { SheetColumn } from "@/lib/spreadsheet-formulas";
import { createTestSheet, errorCode } from "./sheet-fixture";

const COLUMNS: SheetColumn[] = [
  { key: "status", kind: "text" }, // A
  { key: "dr", kind: "number" }, // B
  { key: "flag", kind: "text" }, // C
  { key: "result", kind: "text" }, // D
];

const ROWS: Array<Record<string, string>> = [
  { status: "Live", dr: "45", flag: "TRUE" },
  { status: "Approved", dr: "", flag: "false" },
  { status: "", dr: "70", flag: "maybe" },
];

const { evaluate } = createTestSheet({ columns: COLUMNS, rows: ROWS });

describe("IF", () => {
  it("returns the branch matching the condition", () => {
    expect(evaluate('=IF(B1>40, "High", "Low")')).toBe("High");
    expect(evaluate('=IF(B3<40, "High", "Low")')).toBe("Low");
  });

  it("returns FALSE when the condition is false and there is no else value", () => {
    expect(evaluate('=IF(B1>100, "High")')).toBe(false);
  });

  it("reads numbers and TRUE / FALSE text as conditions", () => {
    expect(evaluate('=IF(1, "yes", "no")')).toBe("yes");
    expect(evaluate('=IF(0, "yes", "no")')).toBe("no");
    expect(evaluate('=IF(C1, "yes", "no")')).toBe("yes");
    expect(evaluate('=IF(C2, "yes", "no")')).toBe("no");
    expect(errorCode(evaluate('=IF(C3, "yes", "no")'))).toBe("#VALUE!");
  });

  it("treats a blank cell as false and as an empty text", () => {
    expect(evaluate('=IF(B2, "yes", "no")')).toBe("no");
    expect(evaluate('=IF(A3="", "empty", "filled")')).toBe("empty");
    expect(evaluate('=IF(B2=0, "zero", "other")')).toBe("zero");
  });

  it("only evaluates the branch it takes", () => {
    expect(evaluate("=IF(TRUE, 1, 1/0)")).toBe(1);
    expect(evaluate("=IF(FALSE, 1/0, 2)")).toBe(2);
  });

  it("passes an error in the condition through", () => {
    expect(errorCode(evaluate('=IF(1/0, "a", "b")'))).toBe("#DIV/0!");
  });

  it("returns #N/A for a wrong number of arguments", () => {
    expect(errorCode(evaluate("=IF(TRUE)"))).toBe("#N/A");
    expect(errorCode(evaluate("=IF(TRUE, 1, 2, 3)"))).toBe("#N/A");
  });

  it("spreads over a range condition inside ARRAYFORMULA", () => {
    expect(evaluate('=COUNTIF(ARRAYFORMULA(IF(B1:B3>40, "High", "Low")), "High")')).toBe(2);
  });

  it("nests", () => {
    expect(evaluate('=IF(B1>60, "Top", IF(B1>40, "Mid", "Low"))')).toBe("Mid");
  });
});

describe("IFS", () => {
  it("returns the value of the first true condition", () => {
    expect(evaluate('=IFS(B1>=60, "Top", B1>=40, "Mid", TRUE, "Low")')).toBe("Mid");
    expect(evaluate('=IFS(B3>=60, "Top", B3>=40, "Mid")', 3)).toBe("Top");
  });

  it("returns #N/A when no condition is true", () => {
    expect(errorCode(evaluate('=IFS(B1>100, "x", B1<0, "y")'))).toBe("#N/A");
  });

  it("returns #N/A when a condition has no value", () => {
    expect(errorCode(evaluate('=IFS(TRUE, "a", FALSE)'))).toBe("#N/A");
  });

  it("does not evaluate the values after the first match", () => {
    expect(evaluate("=IFS(TRUE, 1, TRUE, 1/0)")).toBe(1);
  });
});

describe("IFERROR and IFNA", () => {
  it("returns the value when it is not an error", () => {
    expect(evaluate('=IFERROR(B1*2, "x")')).toBe(90);
    expect(evaluate('=IFNA(B1*2, "x")')).toBe(90);
  });

  it("returns the fallback for any error, or an empty text without one", () => {
    expect(evaluate('=IFERROR(1/0, "x")')).toBe("x");
    expect(evaluate('=IFERROR(NA(), "x")')).toBe("x");
    expect(evaluate("=IFERROR(1/0)")).toBe("");
  });

  it("only catches #N/A with IFNA", () => {
    expect(evaluate('=IFNA(NA(), "x")')).toBe("x");
    expect(errorCode(evaluate('=IFNA(1/0, "x")'))).toBe("#DIV/0!");
  });

  it("replaces the errors of an array one by one", () => {
    expect(evaluate("=SUM(IFERROR({1,0,4}/{1,0,2}, 10))")).toBe(1 + 10 + 2);
    expect(evaluate('=COUNTIF(IFNA({1,"x"}, 0), 0)')).toBe(0);
  });
});

describe("SWITCH and CHOOSE", () => {
  it("returns the value of the matching case, text without regard to case", () => {
    expect(evaluate('=SWITCH(A2, "Live", 1, "approved", 2, 0)')).toBe(2);
    expect(evaluate('=SWITCH(B1, 45, "forty five", "other")')).toBe("forty five");
  });

  it("returns the default, or #N/A without one", () => {
    expect(evaluate('=SWITCH("x", "a", 1, "fallback")')).toBe("fallback");
    expect(errorCode(evaluate('=SWITCH("x", "a", 1)'))).toBe("#N/A");
  });

  it("picks the choice at an index", () => {
    expect(evaluate('=CHOOSE(3, "a", "b", "c")')).toBe("c");
    expect(evaluate('=CHOOSE(2.7, "a", "b", "c")')).toBe("b");
  });

  it("returns #VALUE! for an index out of range", () => {
    expect(errorCode(evaluate('=CHOOSE(0, "a")'))).toBe("#VALUE!");
    expect(errorCode(evaluate('=CHOOSE(4, "a", "b", "c")'))).toBe("#VALUE!");
  });
});

describe("AND, OR, XOR and NOT", () => {
  it("combines conditions", () => {
    expect(evaluate('=AND(B1>40, A1="live")')).toBe(true);
    expect(evaluate("=AND(B1>40, B3<40)")).toBe(false);
    expect(evaluate("=OR(B1>100, B3>60)")).toBe(true);
    expect(evaluate("=OR(FALSE, 0)")).toBe(false);
    expect(evaluate("=XOR(TRUE, TRUE, TRUE)")).toBe(true);
    expect(evaluate("=XOR(TRUE, TRUE)")).toBe(false);
  });

  it("skips text and blank cells of a range", () => {
    expect(evaluate("=AND(B1:B3)")).toBe(true);
    expect(evaluate("=OR(A1:A3, FALSE)")).toBe(false);
  });

  it("returns #VALUE! without any logical value", () => {
    expect(errorCode(evaluate("=AND(A1:A3)"))).toBe("#VALUE!");
    expect(errorCode(evaluate('=OR("maybe")'))).toBe("#VALUE!");
  });

  it("reverses a logical value", () => {
    expect(evaluate("=NOT(ISBLANK(A1))")).toBe(true);
    expect(evaluate("=NOT(0)")).toBe(true);
    expect(errorCode(evaluate('=NOT("maybe")'))).toBe("#VALUE!");
  });

  it("knows TRUE and FALSE as values and as functions", () => {
    expect(evaluate("=TRUE")).toBe(true);
    expect(evaluate("=TRUE()")).toBe(true);
    expect(evaluate("=false()")).toBe(false);
    expect(evaluate("=TRUE+1")).toBe(2);
  });
});
