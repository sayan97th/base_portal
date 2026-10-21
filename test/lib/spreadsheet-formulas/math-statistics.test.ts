/**
 * Math, aggregate, criteria (COUNTIF, SUMIFS ...) and statistical functions.
 * Aggregates skip text and blank cells of ranges, criteria match text without
 * regard to case, as in Google Sheets.
 */

import type { SheetColumn } from "@/lib/spreadsheet-formulas";
import { createTestSheet, errorCode } from "./sheet-fixture";

const COLUMNS: SheetColumn[] = [
  { key: "client", kind: "text" }, // A
  { key: "status", kind: "text" }, // B
  { key: "dr", kind: "number" }, // C
  { key: "price", kind: "number" }, // D
  { key: "request_date", kind: "date" }, // E
  { key: "code", kind: "text" }, // F
];

const ROWS: Array<Record<string, string>> = [
  { client: "Acme", status: "Live", dr: "45", price: "150", request_date: "10/01/2026", code: "BL-1" },
  { client: "Globex", status: "live", dr: "62", price: "1,200", request_date: "10/15/2026", code: "BL-*" },
  { client: "Acme", status: "New Request", dr: "", price: "", request_date: "", code: "n/a" },
  { client: "Initech", status: "Approved", dr: "30", price: "99.5", request_date: "09/30/2026", code: "0042" },
  { client: "acme", status: "Live", dr: "90", price: "$500", request_date: "08/01/2026", code: "" },
];

const { evaluate } = createTestSheet({ columns: COLUMNS, rows: ROWS });

describe("aggregates", () => {
  it("adds numbers and ranges, skipping text and blank cells of ranges", () => {
    expect(evaluate("=SUM(C:C)")).toBe(227);
    expect(evaluate("=SUM(C1:D2)")).toBe(45 + 150 + 62 + 1200);
    expect(evaluate("=SUM(A:A)")).toBe(0);
    expect(evaluate('=SUM(1, "2", TRUE)')).toBe(4);
  });

  it("stops at the first error", () => {
    expect(errorCode(evaluate("=SUM(C:C, 1/0)"))).toBe("#DIV/0!");
    expect(errorCode(evaluate('=SUM(1, "abc")'))).toBe("#VALUE!");
  });

  it("averages, and returns #DIV/0! without numbers", () => {
    expect(evaluate("=AVERAGE(C:C)")).toBeCloseTo(227 / 4);
    expect(errorCode(evaluate("=AVERAGE(A:A)"))).toBe("#DIV/0!");
  });

  it("returns 0 for MAX, MIN and PRODUCT without numbers", () => {
    expect(evaluate("=MAX(A:A)")).toBe(0);
    expect(evaluate("=MIN(A:A)")).toBe(0);
    expect(evaluate("=PRODUCT(A:A)")).toBe(0);
    expect(evaluate("=PRODUCT(2, 3, C1)")).toBe(270);
  });

  it("counts numbers, values, blanks and unique values", () => {
    expect(evaluate("=COUNT(C:C)")).toBe(4);
    expect(evaluate('=COUNT(1, "2", "x")')).toBe(2);
    expect(evaluate("=COUNTA(F:F)")).toBe(4);
    expect(evaluate("=COUNTBLANK(C:C)")).toBe(1);
    expect(evaluate("=COUNTUNIQUE(B:B)")).toBe(4);
  });
});

describe("criteria functions", () => {
  it("matches text without regard to case", () => {
    expect(evaluate('=COUNTIF(B:B, "live")')).toBe(3);
    expect(evaluate('=COUNTIF(A:A, "ACME")')).toBe(3);
  });

  it("supports comparison operators on numbers", () => {
    expect(evaluate('=COUNTIF(C:C, ">40")')).toBe(3);
    expect(evaluate('=COUNTIF(C:C, ">=45")')).toBe(3);
    expect(evaluate('=COUNTIF(C:C, "<45")')).toBe(1);
    expect(evaluate('=COUNTIF(C:C, "<=45")')).toBe(2);
    expect(evaluate('=COUNTIF(C:C, "=62")')).toBe(1);
    expect(evaluate("=COUNTIF(C:C, 62)")).toBe(1);
  });

  it("counts everything that differs with <>, blank cells included", () => {
    expect(evaluate('=COUNTIF(C:C, "<>45")')).toBe(4);
    expect(evaluate('=COUNTIF(B:B, "<>Live")')).toBe(2);
  });

  it("matches blank and non blank cells", () => {
    expect(evaluate('=COUNTIF(C:C, "")')).toBe(1);
    expect(evaluate('=COUNTIF(F:F, "<>")')).toBe(4);
  });

  it("supports wildcards and escapes them with ~", () => {
    expect(evaluate('=COUNTIF(F:F, "BL-*")')).toBe(2);
    expect(evaluate('=COUNTIF(F:F, "BL-~*")')).toBe(1);
    expect(evaluate('=COUNTIF(F:F, "?/?")')).toBe(1);
  });

  it("compares dates typed as text in the criterion", () => {
    expect(evaluate('=COUNTIF(E:E, ">=10/01/2026")')).toBe(2);
    expect(evaluate('=COUNTIF(E:E, "<"&DATE(2026, 10, 1))')).toBe(2);
  });

  it("compares text alphabetically with < and >", () => {
    expect(evaluate('=COUNTIF(A:A, ">B")')).toBe(2);
  });

  it("adds, averages and finds extremes of matching rows", () => {
    expect(evaluate('=SUMIF(B:B, "Live", D:D)')).toBe(150 + 1200 + 500);
    expect(evaluate('=SUMIF(C:C, ">40")')).toBe(45 + 62 + 90);
    expect(evaluate('=SUMIFS(D:D, A:A, "Acme", B:B, "Live")')).toBe(650);
    expect(evaluate('=AVERAGEIF(A:A, "Acme", C:C)')).toBe((45 + 90) / 2);
    expect(evaluate('=AVERAGEIFS(C:C, B:B, "Live", C:C, "<80")')).toBe((45 + 62) / 2);
    expect(evaluate('=MAXIFS(D:D, A:A, "acme")')).toBe(500);
    expect(evaluate('=MINIFS(C:C, B:B, "Live")')).toBe(45);
    expect(evaluate('=COUNTIFS(A:A, "Acme", C:C, ">50")')).toBe(1);
  });

  it("returns #DIV/0! when AVERAGEIF matches nothing, and 0 for MAXIFS", () => {
    expect(errorCode(evaluate('=AVERAGEIF(A:A, "Umbrella", C:C)'))).toBe("#DIV/0!");
    expect(evaluate('=MAXIFS(C:C, A:A, "Umbrella")')).toBe(0);
  });

  it("returns errors for criteria ranges of different sizes or missing criteria", () => {
    expect(errorCode(evaluate('=COUNTIFS(A1:A5, "Acme", B1:B3, "Live")'))).toBe("#VALUE!");
    expect(errorCode(evaluate('=COUNTIFS(A:A, "Acme", B:B)'))).toBe("#N/A");
  });
});

describe("math", () => {
  it("rounds", () => {
    expect(evaluate("=ROUND(2.345, 2)")).toBe(2.35);
    expect(evaluate("=ROUND(1250, -2)")).toBe(1300);
    expect(evaluate("=ROUNDUP(2.341, 2)")).toBe(2.35);
    expect(evaluate("=ROUNDDOWN(2.349, 2)")).toBe(2.34);
    expect(evaluate("=INT(-2.5)")).toBe(-3);
    expect(evaluate("=TRUNC(-2.5)")).toBe(-2);
    expect(evaluate("=MROUND(17, 5)")).toBe(15);
    expect(evaluate("=CEILING(4.2, 1)")).toBe(5);
    expect(evaluate("=FLOOR(4.8, 1)")).toBe(4);
  });

  it("computes the usual operations", () => {
    expect(evaluate("=ABS(-3)")).toBe(3);
    expect(evaluate("=MOD(10, 3)")).toBe(1);
    expect(evaluate("=POWER(2, 10)")).toBe(1024);
    expect(evaluate("=SQRT(16)")).toBe(4);
    expect(evaluate("=QUOTIENT(7, 2)")).toBe(3);
    expect(evaluate("=SIGN(-4)")).toBe(-1);
    expect(evaluate("=PI()")).toBeCloseTo(Math.PI);
    expect(evaluate("=SUMPRODUCT(C1:C2, D1:D2)")).toBe(45 * 150 + 62 * 1200);
  });

  it("returns errors like a spreadsheet", () => {
    expect(errorCode(evaluate("=MOD(1, 0)"))).toBe("#DIV/0!");
    expect(errorCode(evaluate("=SQRT(-4)"))).toBe("#NUM!");
    expect(errorCode(evaluate('=ROUND("abc", 1)'))).toBe("#VALUE!");
  });

  it("reads a blank cell as 0", () => {
    expect(evaluate("=ROUND(C3, 0)")).toBe(0);
    expect(evaluate("=C3+1")).toBe(1);
  });

  it("spreads math functions over ranges inside ARRAYFORMULA", () => {
    expect(evaluate("=SUM(ARRAYFORMULA(ROUND(C1:C2*1.1, 0)))")).toBe(50 + 68);
  });

  it("avoids float noise when shown", () => {
    expect(evaluate("=0.1+0.2")).toBeCloseTo(0.3);
  });
});

describe("statistics", () => {
  it("skips text and blank cells of ranges", () => {
    expect(evaluate("=MEDIAN(C:C)")).toBe((45 + 62) / 2);
    expect(evaluate("=LARGE(C:C, 1)")).toBe(90);
    expect(evaluate("=SMALL(C:C, 2)")).toBe(45);
    expect(evaluate("=STDEV(C:C)")).toBeCloseTo(25.734, 3);
    expect(evaluate("=VAR(1, 2, 3, 4)")).toBeCloseTo(1.6667, 4);
  });

  it("ranks and finds percentiles", () => {
    expect(evaluate("=RANK(62, C:C)")).toBe(2);
    expect(evaluate("=PERCENTILE(C:C, 0.5)")).toBe(53.5);
    expect(evaluate("=QUARTILE(C:C, 2)")).toBe(53.5);
  });

  it("returns an error, never throws, for a position past the end", () => {
    // Google Sheets says #NUM!, the function library #VALUE!. Either way IFERROR catches it.
    expect(errorCode(evaluate("=LARGE(C:C, 9)"))).not.toBeNull();
    expect(evaluate('=IFERROR(LARGE(C:C, 9), "none")')).toBe("none");
  });
});
