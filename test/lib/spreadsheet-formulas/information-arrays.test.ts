/**
 * Information functions (ISBLANK, ISNUMBER, ISERROR ...), references as values
 * (ROW, COLUMN, INDIRECT) and the array functions of Google Sheets (FILTER,
 * SORT, UNIQUE, SEQUENCE, TRANSPOSE ...).
 */

import type { SheetColumn } from "@/lib/spreadsheet-formulas";
import { createTestSheet, errorCode } from "./sheet-fixture";

const COLUMNS: SheetColumn[] = [
  { key: "client", kind: "text" }, // A
  { key: "dr", kind: "number" }, // B
  { key: "code", kind: "text" }, // C
  { key: "url", kind: "text" }, // D
];

const ROWS: Array<Record<string, string>> = [
  { client: "Acme", dr: "45", code: "45", url: "https://acme.com/page" },
  { client: "Globex", dr: "", code: "0042", url: "team@globex.com" },
  { client: "Acme", dr: "90", code: "", url: "not a url" },
  { client: "", dr: "30", code: "TRUE", url: "" },
];

const { evaluate } = createTestSheet({ columns: COLUMNS, rows: ROWS });

describe("information functions", () => {
  it("tells blank cells and value types apart", () => {
    expect(evaluate("=ISBLANK(B2)")).toBe(true);
    expect(evaluate("=ISBLANK(B1)")).toBe(false);
    expect(evaluate('=ISBLANK("")')).toBe(false);
    expect(evaluate("=ISNUMBER(B1)")).toBe(true);
    expect(evaluate("=ISNUMBER(C1)")).toBe(true);
    expect(evaluate("=ISNUMBER(C2)")).toBe(false);
    expect(evaluate("=ISTEXT(C2)")).toBe(true);
    expect(evaluate("=ISNONTEXT(B1)")).toBe(true);
    expect(evaluate("=ISLOGICAL(TRUE)")).toBe(true);
    expect(evaluate("=ISLOGICAL(C4)")).toBe(false);
  });

  it("tells errors apart", () => {
    expect(evaluate("=ISERROR(1/0)")).toBe(true);
    expect(evaluate("=ISERR(1/0)")).toBe(true);
    expect(evaluate("=ISERR(NA())")).toBe(false);
    expect(evaluate("=ISNA(NA())")).toBe(true);
    expect(evaluate("=ISNA(1/0)")).toBe(false);
    expect(evaluate("=ISERROR(B1)")).toBe(false);
  });

  it("recognizes URLs, emails and dates", () => {
    expect(evaluate("=ISURL(D1)")).toBe(true);
    expect(evaluate('=ISURL("acme.com")')).toBe(true);
    expect(evaluate("=ISURL(D3)")).toBe(false);
    expect(evaluate("=ISEMAIL(D2)")).toBe(true);
    expect(evaluate("=ISEMAIL(D1)")).toBe(false);
    expect(evaluate('=ISDATE("10/21/2026")')).toBe(true);
    expect(evaluate('=ISDATE("10/45/2026")')).toBe(false);
  });

  it("converts values with N and T", () => {
    expect(evaluate("=N(B1)")).toBe(45);
    expect(evaluate("=N(TRUE)")).toBe(1);
    expect(evaluate('=N("abc")')).toBe(0);
    expect(evaluate("=T(A1)")).toBe("Acme");
    expect(evaluate("=T(B1)")).toBe("");
  });

  it("checks references and parity", () => {
    expect(evaluate("=ISREF(A1)")).toBe(true);
    expect(evaluate('=ISREF("A1")')).toBe(false);
    expect(evaluate("=ISEVEN(B4)")).toBe(true);
    expect(evaluate("=ISODD(B1)")).toBe(true);
  });
});

describe("references as values", () => {
  it("returns row and column numbers", () => {
    expect(evaluate("=ROW()", 3)).toBe(3);
    expect(evaluate("=ROW(A4)")).toBe(4);
    expect(evaluate("=ROW(B2:B4)")).toBe(2);
    expect(evaluate("=COLUMN(D1)")).toBe(4);
    expect(errorCode(evaluate("=COLUMN()"))).toBe("#N/A");
  });

  it("counts the rows and columns of a range", () => {
    expect(evaluate("=ROWS(A1:A3)")).toBe(3);
    expect(evaluate("=COLUMNS(A1:D1)")).toBe(4);
  });

  it("reads the cell named by a text", () => {
    expect(evaluate('=INDIRECT("A" & 2)')).toBe("Globex");
    expect(evaluate('=SUM(INDIRECT("B1:B4"))')).toBe(165);
    expect(errorCode(evaluate('=INDIRECT("not a ref")'))).toBe("#REF!");
  });

  it("reads rows past the loaded ones as blank", () => {
    expect(evaluate("=A99")).toBeNull();
    expect(evaluate("=SUM(B1:B99)")).toBe(165);
  });

  it("rejects references above the first row and ranges that are too large", () => {
    expect(errorCode(evaluate("=A0"))).toBe("#REF!");
    expect(errorCode(evaluate("=SUM(A0:A3)"))).toBe("#REF!");
    expect(errorCode(evaluate("=SUM(A1:D999999)"))).toBe("#REF!");
  });
});

describe("array functions", () => {
  it("filters rows by one or more conditions", () => {
    expect(evaluate('=TEXTJOIN(",", TRUE, FILTER(A:A, B:B>40))')).toBe("Acme,Acme");
    expect(evaluate('=ROWS(FILTER(A:B, A:A="Acme", B:B>50))')).toBe(1);
    expect(errorCode(evaluate("=FILTER(A:A, B:B>100)"))).toBe("#N/A");
    expect(errorCode(evaluate("=FILTER(A1:A4, B1:B2>0)"))).toBe("#VALUE!");
    expect(errorCode(evaluate("=FILTER(A1:A4)"))).toBe("#N/A");
  });

  it("filters the columns of a row", () => {
    expect(evaluate("=COLUMNS(FILTER({1,2,3,4}, {1,0,1,0}))")).toBe(2);
  });

  it("sorts rows, blank cells last", () => {
    expect(evaluate('=TEXTJOIN(",", TRUE, SORT(B:B))')).toBe("30,45,90");
    expect(evaluate('=TEXTJOIN(",", TRUE, SORT(B:B, 1, FALSE))')).toBe("90,45,30");
    expect(evaluate("=INDEX(SORT(A1:B4, 1, TRUE, 2, FALSE), 1, 2)")).toBe(90);
  });

  it("keeps unique rows or columns", () => {
    expect(evaluate('=TEXTJOIN(",", TRUE, UNIQUE(A:A))')).toBe("Acme,Globex");
    expect(evaluate('=TEXTJOIN(",", TRUE, UNIQUE(A:A, FALSE, TRUE))')).toBe("Globex");
    expect(evaluate("=COLUMNS(UNIQUE({1,1,2}, TRUE))")).toBe(2);
    expect(errorCode(evaluate("=UNIQUE(A99:A100)"))).toBe("#N/A");
  });

  it("generates and reshapes arrays", () => {
    expect(evaluate("=SUM(SEQUENCE(4))")).toBe(10);
    expect(evaluate("=INDEX(SEQUENCE(2, 3, 10, 5), 2, 3)")).toBe(35);
    expect(errorCode(evaluate("=SEQUENCE(0)"))).toBe("#NUM!");
    expect(errorCode(evaluate("=SEQUENCE(1000, 1000)"))).toBe("#NUM!");
    expect(evaluate("=ROWS(TRANSPOSE({1,2,3}))")).toBe(3);
    expect(evaluate("=ROWS(FLATTEN(A1:B2))")).toBe(4);
    expect(evaluate("=COLUMNS(ARRAY_CONSTRAIN(A1:D4, 2, 2))")).toBe(2);
    expect(evaluate("=ROWS(RANDARRAY(3, 2))")).toBe(3);
    expect(evaluate("=AND(ARRAYFORMULA(RANDARRAY(4)>=0), ARRAYFORMULA(RANDARRAY(4)<1))")).toBe(true);
    expect(errorCode(evaluate("=RANDARRAY(0)"))).toBe("#NUM!");
  });

  it("applies operators element by element", () => {
    expect(evaluate("=SUM(ARRAYFORMULA(B1:B4*2))")).toBe(330);
    expect(evaluate('=COUNTIF(ARRAYFORMULA(A1:A4&"!"), "Acme!")')).toBe(2);
    expect(evaluate("=SUM({1,2,3}*{2,2,2})")).toBe(12);
    expect(evaluate("=SUM({1;2;3}+10)")).toBe(36);
  });

  it("marks the cells of arrays of different sizes as #N/A", () => {
    expect(errorCode(evaluate("=SUM({1,2,3}+{1,2})"))).toBe("#N/A");
  });
});
