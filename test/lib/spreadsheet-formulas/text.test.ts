/**
 * Text functions, the Google Sheets regular expression functions and the
 * conversion functions (VALUE, TEXT, TO_TEXT ...).
 */

import type { SheetColumn } from "@/lib/spreadsheet-formulas";
import { createTestSheet, errorCode } from "./sheet-fixture";

const COLUMNS: SheetColumn[] = [
  { key: "keyword", kind: "text" }, // A
  { key: "landing_page", kind: "text" }, // B
  { key: "dr", kind: "number" }, // C
  { key: "notes", kind: "text" }, // D
];

const ROWS: Array<Record<string, string>> = [
  { keyword: "seo tools", landing_page: "https://www.acme.com/tools?ref=lb", dr: "45", notes: "" },
  { keyword: "  link   building ", landing_page: "acme.com", dr: "62", notes: "Use anchor" },
  { keyword: "o'neil law", landing_page: "", dr: "", notes: "" },
];

const { evaluate } = createTestSheet({ columns: COLUMNS, rows: ROWS });

describe("text functions", () => {
  it("extracts parts of a text", () => {
    expect(evaluate("=LEFT(A1)")).toBe("s");
    expect(evaluate("=LEFT(A1, 3)")).toBe("seo");
    expect(evaluate("=RIGHT(A1, 5)")).toBe("tools");
    expect(evaluate("=RIGHT(A1, 0)")).toBe("");
    expect(evaluate("=MID(A1, 5, 100)")).toBe("tools");
    expect(evaluate("=LEN(A1)")).toBe(9);
    expect(evaluate("=LEN(C1)")).toBe(2);
    expect(evaluate("=LEN(D1)")).toBe(0);
  });

  it("returns #VALUE! for negative counts and positions below 1", () => {
    expect(errorCode(evaluate("=LEFT(A1, -1)"))).toBe("#VALUE!");
    expect(errorCode(evaluate("=MID(A1, 0, 2)"))).toBe("#VALUE!");
    expect(errorCode(evaluate('=REPT("a", -1)'))).toBe("#VALUE!");
  });

  it("changes case and spacing", () => {
    expect(evaluate("=UPPER(A1)")).toBe("SEO TOOLS");
    expect(evaluate('=LOWER("ACME")')).toBe("acme");
    expect(evaluate("=PROPER(A1)")).toBe("Seo Tools");
    expect(evaluate("=PROPER(A3)")).toBe("O'Neil Law");
    expect(evaluate("=TRIM(A2)")).toBe("link building");
    expect(evaluate('=CLEAN("a" & CHAR(10) & "b")')).toBe("ab");
  });

  it("finds and replaces", () => {
    expect(evaluate('=FIND("o", A1)')).toBe(3);
    expect(evaluate('=FIND("o", A1, 4)')).toBe(6);
    expect(errorCode(evaluate('=FIND("T", A1)'))).toBe("#VALUE!");
    expect(evaluate('=SEARCH("T", A1)')).toBe(5);
    expect(evaluate('=SUBSTITUTE("a-b-c", "-", "/")')).toBe("a/b/c");
    expect(evaluate('=SUBSTITUTE("a-b-c", "-", "/", 2)')).toBe("a-b/c");
    expect(evaluate('=SUBSTITUTE("abc", "", "x")')).toBe("abc");
    expect(evaluate('=REPLACE("BL-1234", 1, 2, "LB")')).toBe("LB-1234");
    expect(evaluate('=REPT("ab", 3)')).toBe("ababab");
  });

  it("compares texts exactly", () => {
    expect(evaluate('=EXACT("Acme", "Acme")')).toBe(true);
    expect(evaluate('=EXACT("Acme", "acme")')).toBe(false);
    expect(evaluate('="Acme"="acme"')).toBe(true);
  });

  it("joins texts", () => {
    expect(evaluate('=CONCATENATE(A1, " / ", C1)')).toBe("seo tools / 45");
    expect(evaluate("=CONCAT(C1, C2)")).toBe("4562");
    expect(evaluate('=TEXTJOIN(", ", TRUE, D1:D3)')).toBe("Use anchor");
    expect(evaluate('=TEXTJOIN("|", FALSE, D1:D2)')).toBe("|Use anchor");
    expect(evaluate('=JOIN("-", C1:C2)')).toBe("45-62");
    expect(evaluate('="DR " & C1 & "+"')).toBe("DR 45+");
  });

  it("splits a text into numbers and texts", () => {
    expect(evaluate('=INDEX(SPLIT("a,1,b", ","), 2)')).toBe(1);
    expect(evaluate('=COLUMNS(SPLIT("a, b;c", ", ;"))')).toBe(3);
    expect(evaluate('=COLUMNS(SPLIT("a, b;c", ", ", FALSE))')).toBe(2);
    expect(evaluate('=COLUMNS(SPLIT("a,,b", ",", TRUE, FALSE))')).toBe(3);
  });

  it("converts between numbers and texts", () => {
    expect(evaluate('=VALUE("1,250.50")')).toBe(1250.5);
    expect(evaluate('=VALUE("45%")')).toBe(0.45);
    expect(evaluate("=VALUE(C3)")).toBe(0);
    expect(errorCode(evaluate('=VALUE("abc")'))).toBe("#VALUE!");
    expect(evaluate("=TO_TEXT(C1)")).toBe("45");
    expect(evaluate("=TO_DOLLARS(1250.5)")).toBe("$1,250.50");
    expect(evaluate("=TO_PERCENT(0.256)")).toBe("25.6%");
    expect(evaluate('=TO_PURE_NUMBER("$1,000")')).toBe(1000);
    expect(evaluate('=TEXT(1250.5, "$#,##0.00")')).toBe("$1,250.50");
    expect(evaluate('=TEXT(DATE(2026, 10, 21), "mmm d")')).toBe("Oct 21");
    expect(evaluate('=CHAR(65) & CODE("B")')).toBe("A66");
  });
});

describe("regular expressions", () => {
  it("tests, extracts and replaces with a pattern", () => {
    expect(evaluate('=REGEXMATCH(B1, "^https://")')).toBe(true);
    expect(evaluate('=REGEXMATCH(B2, "^https://")')).toBe(false);
    expect(evaluate('=REGEXEXTRACT(B1, "https?://(?:www\\.)?([^/]+)")')).toBe("acme.com");
    expect(evaluate('=REGEXEXTRACT("BL-25143", "\\d+")')).toBe("25143");
    expect(evaluate('=REGEXREPLACE(B1, "\\?.*$", "")')).toBe("https://www.acme.com/tools");
    expect(evaluate('=REGEXREPLACE("2026-10-21", "(\\d+)-(\\d+)-(\\d+)", "$2/$3/$1")')).toBe("10/21/2026");
  });

  it("is case sensitive, like Google Sheets", () => {
    expect(evaluate('=REGEXMATCH("DA 30+", "da")')).toBe(false);
  });

  it('accepts the "(?i)" flag group of Google Sheets for case insensitive patterns', () => {
    expect(evaluate('=REGEXMATCH("DA 30+", "(?i)da")')).toBe(true);
    expect(evaluate('=REGEXEXTRACT("Order BL-77", "(?i)bl-(\\d+)")')).toBe("77");
    expect(evaluate('=REGEXREPLACE("Live LIVE live", "(?i)live", "ok")')).toBe("ok ok ok");
  });

  it("returns #N/A when nothing is extracted and #VALUE! for an invalid pattern", () => {
    expect(errorCode(evaluate('=REGEXEXTRACT("abc", "\\d")'))).toBe("#N/A");
    expect(errorCode(evaluate('=REGEXMATCH("abc", "(")'))).toBe("#VALUE!");
  });
});

describe("web functions", () => {
  it("shows a link label and encodes URL parts", () => {
    expect(evaluate('=HYPERLINK(B1, "Open")')).toBe("Open");
    expect(evaluate("=HYPERLINK(B1)")).toBe("https://www.acme.com/tools?ref=lb");
    expect(evaluate('=ENCODEURL("seo tools & more")')).toBe("seo%20tools%20%26%20more");
  });
});
