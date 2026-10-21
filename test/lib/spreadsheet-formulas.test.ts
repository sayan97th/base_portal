import {
  FormulaError,
  analyzeFormula,
  applyFunctionSuggestion,
  canInsertReferenceAt,
  createFormulaSheet,
  dateToSerial,
  findReferences,
  formatScalar,
  formatWithPattern,
  getFormulaAssistContext,
  getFunctionCatalog,
  parseDateText,
  parseFormula,
  suggestFunctions,
  toDisplayFormula,
  toStoredFormula,
  type ColumnKeyMapper,
  type FormulaSheetOptions,
  type Scalar,
  type SheetColumn,
} from "@/lib/spreadsheet-formulas";

// A small table: A = status, B = company, C = DR (number), D = request date, E = price (text column).
const COLUMNS: SheetColumn[] = [
  { key: "status", kind: "text" },
  { key: "client", kind: "text" },
  { key: "dr_lbs", kind: "number" },
  { key: "request_date", kind: "date" },
  { key: "final_price", kind: "number" },
  { key: "score", kind: "text" },
];

const ROWS: Array<Record<string, string>> = [
  { status: "Live", client: "Acme", dr_lbs: "45", request_date: "10/01/2026", final_price: "$150.00" },
  { status: "live", client: "Globex", dr_lbs: "62", request_date: "10/15/2026", final_price: "1,200" },
  { status: "New Request", client: "Acme", dr_lbs: "", request_date: "", final_price: "" },
  { status: "Approved", client: "Initech", dr_lbs: "30", request_date: "09/30/2026", final_price: "99.5" },
];

const NOW = new Date(2026, 9, 21, 9, 30, 0);

const mapper: ColumnKeyMapper = {
  getColumnKey: (col_idx) => COLUMNS[col_idx]?.key ?? null,
  getColumnIndex: (col_key) => {
    const index = COLUMNS.findIndex((column) => column.key === col_key);
    return index === -1 ? null : index;
  },
};

function buildSheet(
  formulas: Record<string, string> = {},
  overrides: Partial<FormulaSheetOptions> = {}
) {
  return createFormulaSheet({
    columns: COLUMNS,
    row_count: ROWS.length,
    row_number_offset: 1,
    now: NOW,
    getRawValue: (row_idx, col_key) => ROWS[row_idx]?.[col_key] ?? "",
    getFormula: (row_idx, col_key) => formulas[`${row_idx}:${col_key}`] ?? formulas[`*:${col_key}`] ?? null,
    ...overrides,
  });
}

/** Evaluates an A1 formula as if typed on the given row (1 based, like the row gutter). */
function evaluate(formula: string, row_number = 1): Scalar {
  const stored = toStoredFormula(formula, row_number, mapper);
  return buildSheet().evaluate(stored, row_number - 1).value;
}

function errorCode(value: Scalar): string | null {
  return value instanceof FormulaError ? value.code : null;
}

describe("parser", () => {
  it("follows spreadsheet operator precedence", () => {
    expect(evaluate("=1+2*3")).toBe(7);
    expect(evaluate("=-2^2")).toBe(4);
    expect(evaluate("=2^3^2")).toBe(64);
    expect(evaluate('="a"&1+1')).toBe("a2");
    expect(evaluate("=50%*10")).toBe(5);
    expect(evaluate("=(1+2)*3")).toBe(9);
    expect(evaluate("=1+2>2")).toBe(true);
  });

  it("reports syntax errors as #ERROR!", () => {
    expect(errorCode(evaluate("=SUM(1,"))).toBe("#ERROR!");
    expect(errorCode(evaluate('="open'))).toBe("#ERROR!");
    expect(errorCode(evaluate("=1+"))).toBe("#ERROR!");
    expect(() => parseFormula("=1)")).toThrow();
  });

  it("parses array literals and skipped arguments", () => {
    expect(evaluate("=SUM({1,2;3,4})")).toBe(10);
    expect(evaluate('=IF(FALSE,"yes",)')).toBe(null);
  });
});

describe("references", () => {
  it("reads cells typed by their column kind", () => {
    expect(evaluate("=C1")).toBe(45);
    expect(evaluate("=E1")).toBe(150);
    expect(evaluate("=E2")).toBe(1200);
    expect(evaluate("=D1")).toBe(dateToSerial(new Date(2026, 9, 1)));
    expect(evaluate("=C3")).toBe(null);
  });

  it("supports ranges, whole columns and open ended ranges", () => {
    expect(evaluate("=SUM(C1:C4)")).toBe(137);
    expect(evaluate("=SUM(C:C)")).toBe(137);
    expect(evaluate("=SUM(C2:C)")).toBe(92);
    expect(evaluate("=COUNTA(A:A)")).toBe(4);
  });

  it("returns #REF! for columns that do not exist", () => {
    expect(errorCode(evaluate("=Z1"))).toBe("#REF!");
  });

  it("round trips formulas between A1 and the stored notation", () => {
    const stored = toStoredFormula("=IF(C3>40, E3*$C$1, SUM(C:C))", 3, mapper);
    expect(stored).toBe("=IF([dr_lbs:~0]>40, [final_price:~0]*[$dr_lbs:$1], SUM([dr_lbs]:[dr_lbs]))");
    // The same formula seen from row 7 points at row 7, the absolute reference stays on row 1.
    expect(toDisplayFormula(stored, 7, mapper)).toBe("=IF(C7>40, E7*$C$1, SUM(C:C))");
  });

  it("keeps stored formulas valid when columns move", () => {
    const stored = toStoredFormula("=C2*2", 2, mapper);
    const moved: ColumnKeyMapper = {
      getColumnKey: () => null,
      getColumnIndex: (col_key) => (col_key === "dr_lbs" ? 9 : null),
    };
    expect(toDisplayFormula(stored, 2, moved)).toBe("=J2*2");
    expect(toDisplayFormula(stored, 2, { ...moved, getColumnIndex: () => null })).toBe("=#REF!*2");
  });

  it("finds references with their positions", () => {
    const refs = findReferences("=A1+SUM(B2:C4)");
    expect(refs.map((ref) => [ref.start, ref.end])).toEqual([
      [1, 3],
      [8, 13],
    ]);
  });

  it("does not mistake function names for cells", () => {
    expect(evaluate("=LOG10(100)")).toBe(2);
    expect(evaluate("=ATAN2(1,1)")).toBeCloseTo(Math.PI / 4);
  });
});

describe("cell and column formulas", () => {
  it("evaluates a formula column on every row with relative references", () => {
    const stored = toStoredFormula('=IF(C1="", "No DR", C1*2)', 1, mapper);
    const sheet = buildSheet({ "*:score": stored });
    expect(sheet.getValue(0, "score")).toBe(90);
    expect(sheet.getValue(1, "score")).toBe(124);
    expect(sheet.getValue(2, "score")).toBe("No DR");
  });

  it("lets formulas read other formulas", () => {
    const sheet = buildSheet({
      "*:score": toStoredFormula("=C1+1", 1, mapper),
      "0:status": toStoredFormula("=SUM(F:F)", 1, mapper),
    });
    // C is blank on row 3, so its score is 1.
    expect(sheet.getValue(0, "status")).toBe(46 + 63 + 1 + 31);
  });

  it("detects circular references", () => {
    const sheet = buildSheet({
      "0:score": toStoredFormula("=F2+1", 1, mapper),
      "1:score": toStoredFormula("=F1+1", 2, mapper),
    });
    expect(errorCode(sheet.getValue(0, "score"))).toBe("#REF!");
    const self = buildSheet({ "*:score": toStoredFormula("=SUM(F:F)", 1, mapper) });
    expect(errorCode(self.getValue(0, "score"))).toBe("#REF!");
  });

  it("infers a date format for date arithmetic", () => {
    const sheet = buildSheet({ "*:score": toStoredFormula("=D1+30", 1, mapper) });
    const result = sheet.getFormulaResult(0, "score")!;
    expect(result.format).toBe("date");
    expect(formatScalar(result.value, result.format)).toBe("10/31/2026");
    const difference = buildSheet({ "*:score": toStoredFormula("=D2-D1", 1, mapper) }).getFormulaResult(0, "score")!;
    expect(difference.format).toBeNull();
    expect(difference.value).toBe(14);
  });

  it("classifies formulas that only read their own row", () => {
    expect(analyzeFormula(toStoredFormula("=C2*E2", 2, mapper)).is_row_local).toBe(true);
    expect(analyzeFormula(toStoredFormula("=C1*E2", 2, mapper)).is_row_local).toBe(false);
    expect(analyzeFormula(toStoredFormula("=SUM(C:C)", 2, mapper)).is_row_local).toBe(false);
    expect(analyzeFormula(toStoredFormula("=RAND()*C2", 2, mapper)).is_volatile).toBe(true);
    expect(analyzeFormula("=SUM(").is_valid).toBe(false);
  });
});

describe("functions", () => {
  it("matches criteria without regard to case, like Google Sheets", () => {
    expect(evaluate('=COUNTIF(A:A, "live")')).toBe(2);
    expect(evaluate('=COUNTIF(C:C, ">40")')).toBe(2);
    expect(evaluate('=COUNTIF(B:B, "A*")')).toBe(2);
    expect(evaluate('=COUNTIF(C:C, "")')).toBe(1);
    expect(evaluate('=COUNTIF(C:C, "<>")')).toBe(3);
    expect(evaluate('=SUMIF(A:A, "Live", E:E)')).toBe(1350);
    expect(evaluate('=COUNTIFS(B:B, "Acme", C:C, ">=40")')).toBe(1);
    expect(evaluate('=AVERAGEIF(B:B, "Acme", C:C)')).toBe(45);
    expect(evaluate('=MAXIFS(C:C, A:A, "live")')).toBe(62);
  });

  it("aggregates skip blank and text cells", () => {
    expect(evaluate("=AVERAGE(C:C)")).toBeCloseTo(137 / 3);
    expect(evaluate("=MEDIAN(C:C)")).toBe(45);
    expect(evaluate("=MAX(C:C)")).toBe(62);
    expect(evaluate("=MIN(C:C)")).toBe(30);
    expect(evaluate("=COUNT(C:C)")).toBe(3);
    expect(evaluate("=COUNTBLANK(C:C)")).toBe(1);
    expect(evaluate("=COUNTUNIQUE(B:B)")).toBe(3);
    expect(evaluate('=SUM("3", TRUE)')).toBe(4);
  });

  it("looks values up", () => {
    expect(evaluate('=VLOOKUP("globex", B:C, 2, FALSE)')).toBe(62);
    expect(errorCode(evaluate('=VLOOKUP("Nobody", B:C, 2, FALSE)'))).toBe("#N/A");
    expect(evaluate('=IFERROR(VLOOKUP("Nobody", B:C, 2, FALSE), "none")')).toBe("none");
    expect(evaluate("=VLOOKUP(50, {10,\"low\";40,\"mid\";60,\"high\"}, 2)")).toBe("mid");
    expect(evaluate('=MATCH("Initech", B:B, 0)')).toBe(4);
    expect(evaluate('=XLOOKUP("Acme", B:B, C:C)')).toBe(45);
    expect(evaluate('=XLOOKUP("Acme", B:B, C:C, "x", 0, -1)')).toBe(null);
    expect(evaluate('=XLOOKUP("Zed", B:B, C:C, "missing")')).toBe("missing");
    expect(evaluate("=INDEX(C:C, 2)")).toBe(62);
    expect(evaluate("=INDEX(A1:C4, 4, 2)")).toBe("Initech");
  });

  it("handles text functions", () => {
    expect(evaluate('=CONCATENATE(B1, " ", C1)')).toBe("Acme 45");
    expect(evaluate('=B1 & "-" & C1')).toBe("Acme-45");
    expect(evaluate("=LEN(B2)")).toBe(6);
    expect(evaluate('=LEFT("BL-25143", 2)')).toBe("BL");
    expect(evaluate('=MID("BL-25143", 4, 5)')).toBe("25143");
    expect(evaluate('=UPPER("live")')).toBe("LIVE");
    expect(evaluate('=PROPER("new request")')).toBe("New Request");
    expect(evaluate('=TRIM("  a   b ")')).toBe("a b");
    expect(evaluate('=SUBSTITUTE("https://acme.com", "https://", "")')).toBe("acme.com");
    expect(evaluate('=TEXTJOIN(", ", TRUE, B1:B4)')).toBe("Acme, Globex, Acme, Initech");
    expect(evaluate('=JOIN("|", {1,2,3})')).toBe("1|2|3");
    expect(evaluate('=FIND("e", "Acme")')).toBe(4);
    expect(errorCode(evaluate('=FIND("z", "Acme")'))).toBe("#VALUE!");
    expect(evaluate('=VALUE("$1,250.50")')).toBe(1250.5);
  });

  it("supports the Google Sheets regular expression functions", () => {
    expect(evaluate('=REGEXMATCH("DR 50+ External", "DR 5\\d")')).toBe(true);
    expect(evaluate('=REGEXEXTRACT("https://www.acme.com/page", "https?://([^/]+)")')).toBe("www.acme.com");
    expect(evaluate('=REGEXREPLACE("a1b22", "\\d+", "#")')).toBe("a#b#");
    expect(errorCode(evaluate('=REGEXEXTRACT("abc", "\\d")'))).toBe("#N/A");
  });

  it("works with dates as serial numbers", () => {
    expect(evaluate("=TODAY()")).toBe(dateToSerial(new Date(2026, 9, 21)));
    expect(evaluate("=MONTH(D1)")).toBe(10);
    expect(evaluate("=YEAR(D4)")).toBe(2026);
    expect(evaluate("=DAYS(D2, D1)")).toBe(14);
    expect(evaluate("=D2-D1")).toBe(14);
    expect(evaluate("=DATE(2026, 12, 31)")).toBe(dateToSerial(new Date(2026, 11, 31)));
    expect(evaluate("=EOMONTH(D1, 0)")).toBe(dateToSerial(new Date(2026, 9, 31)));
    expect(evaluate("=EDATE(D1, 1)")).toBe(dateToSerial(new Date(2026, 10, 1)));
    expect(evaluate('=DATEVALUE("10/21/2026")')).toBe(dateToSerial(new Date(2026, 9, 21)));
    expect(evaluate("=NETWORKDAYS(D1, D2)")).toBe(11);
    expect(evaluate('=IF(NOT(ISBLANK(D1)), D1-TODAY(), "")')).toBe(-20);
  });

  it("evaluates logical functions lazily", () => {
    expect(evaluate('=IF(C1>40, "High", "Low")')).toBe("High");
    expect(evaluate('=IFS(C4>=60, "Top", C4>=40, "Mid", TRUE, "Low")')).toBe("Low");
    expect(evaluate('=IF(TRUE, 1, 1/0)')).toBe(1);
    expect(evaluate('=SWITCH(A4, "Live", 1, "Approved", 2, 0)')).toBe(2);
    expect(evaluate('=AND(C1>40, B1="Acme")')).toBe(true);
    expect(evaluate('=OR(C1>100, B1="acme")')).toBe(true);
    expect(evaluate('=IFNA(MATCH("x", B:B, 0), "missing")')).toBe("missing");
    expect(evaluate("=CHOOSE(2, \"a\", \"b\")")).toBe("b");
  });

  it("returns errors like a spreadsheet", () => {
    expect(errorCode(evaluate("=1/0"))).toBe("#DIV/0!");
    expect(errorCode(evaluate('="a"+1'))).toBe("#VALUE!");
    expect(errorCode(evaluate("=NOSUCHFUNCTION(1)"))).toBe("#NAME?");
    expect(errorCode(evaluate("=SQRT(-1)"))).toBe("#NUM!");
    expect(evaluate("=ISERROR(1/0)")).toBe(true);
    expect(evaluate("=ISNA(NA())")).toBe(true);
  });

  it("supports array functions", () => {
    const sheet = buildSheet();
    const unique = sheet.evaluate(toStoredFormula("=ROWS(UNIQUE(B:B))", 1, mapper), 0).value;
    expect(unique).toBe(3);
    expect(evaluate('=ROWS(FILTER(B:B, C:C>40))')).toBe(2);
    expect(evaluate('=INDEX(SORT(C1:C4, 1, FALSE), 1)')).toBe(62);
    expect(evaluate("=SUM(ARRAYFORMULA(C1:C4*2))")).toBe(274);
    expect(evaluate('=INDEX(SPLIT("a,b,c", ","), 2)')).toBe("b");
    expect(evaluate("=SUMPRODUCT(C1:C2, {2;3})")).toBe(45 * 2 + 62 * 3);
  });

  it("knows the formula's own row", () => {
    expect(evaluate("=ROW()", 3)).toBe(3);
    expect(evaluate("=ROW(B4)")).toBe(4);
    expect(evaluate("=COLUMN(C1)")).toBe(3);
    expect(evaluate('=INDIRECT("B" & 2)')).toBe("Globex");
  });

  it("reads a whole column as the formula's own row where one value is expected", () => {
    const sheet = buildSheet({ "*:score": toStoredFormula("=C:C*10", 1, mapper) });
    expect(sheet.getValue(1, "score")).toBe(620);
  });

  it("includes the Excel compatible library", () => {
    expect(evaluate("=ROUND(2.345, 2)")).toBe(2.35);
    expect(evaluate("=STDEV.S(1, 2, 3, 4)")).toBeCloseTo(1.290994);
    expect(evaluate("=STDEV(1, 2, 3, 4)")).toBeCloseTo(1.290994);
    expect(evaluate("=PMT(0.05/12, 60, 10000)")).toBeCloseTo(-188.71, 2);
    expect(getFunctionCatalog().length).toBeGreaterThan(350);
  });
});

describe("formatting", () => {
  it("formats numbers without float noise", () => {
    expect(formatScalar(0.1 + 0.2)).toBe("0.3");
    expect(formatScalar(true)).toBe("TRUE");
    expect(formatScalar(new FormulaError("#N/A"))).toBe("#N/A");
  });

  it("implements TEXT() format codes", () => {
    const serial = dateToSerial(new Date(2026, 9, 21, 14, 5, 9));
    expect(formatWithPattern(1250.5, "$#,##0.00")).toBe("$1,250.50");
    expect(formatWithPattern(0.256, "0.0%")).toBe("25.6%");
    expect(formatWithPattern(3.14159, "0.00")).toBe("3.14");
    expect(formatWithPattern(7, "000")).toBe("007");
    expect(formatWithPattern(-5, "0;(0)")).toBe("(5)");
    expect(formatWithPattern(1234567, "#,##0")).toBe("1,234,567");
    expect(formatWithPattern(12, '0 "days"')).toBe("12 days");
    expect(formatWithPattern(serial, "mm/dd/yyyy")).toBe("10/21/2026");
    expect(formatWithPattern(serial, "mmm d, yyyy")).toBe("Oct 21, 2026");
    expect(formatWithPattern(serial, "dddd")).toBe("Wednesday");
    expect(formatWithPattern(serial, "hh:mm:ss")).toBe("14:05:09");
    expect(formatWithPattern(serial, "h:mm AM/PM")).toBe("2:05 PM");
    expect(formatWithPattern(serial, "yyyy-mm-dd")).toBe("2026-10-21");
  });

  it("parses the table date format", () => {
    expect(parseDateText("10/21/2026")).toBe(dateToSerial(new Date(2026, 9, 21)));
    expect(parseDateText("2026-10-21")).toBe(dateToSerial(new Date(2026, 9, 21)));
    expect(parseDateText("02/31/2026")).toBeNull();
    expect(parseDateText("Acme")).toBeNull();
  });
});

describe("formula assist", () => {
  it("finds the function name being typed", () => {
    const context = getFormulaAssistContext("=SUM(A1, VLO", 12);
    expect(context.name_token).toEqual({ text: "VLO", start: 9, end: 12 });
    expect(context.call).toEqual({ name: "SUM", arg_index: 1 });
    expect(getFormulaAssistContext("=A1+B", 5).name_token?.text).toBe("B");
    expect(getFormulaAssistContext("plain text", 5).name_token).toBeNull();
  });

  it("tracks the argument the caret is in", () => {
    expect(getFormulaAssistContext('=IF(A1>2, "a", ', 15).call).toEqual({ name: "IF", arg_index: 2 });
    expect(getFormulaAssistContext("=ROUND(SUM(A1:A3), ", 19).call).toEqual({ name: "ROUND", arg_index: 1 });
    expect(getFormulaAssistContext("=ROUND(1, 2)", 12).call).toBeNull();
  });

  it("completes a function name", () => {
    const token = getFormulaAssistContext("=vlo", 4).name_token!;
    expect(applyFunctionSuggestion("=vlo", token, "VLOOKUP")).toEqual({ text: "=VLOOKUP(", caret: 9 });
  });

  it("suggests documented functions first", () => {
    expect(suggestFunctions("cou").map((info) => info.name)[0]).toBe("COUNT");
    expect(suggestFunctions("regex").map((info) => info.name)).toEqual(
      expect.arrayContaining(["REGEXMATCH", "REGEXEXTRACT", "REGEXREPLACE"])
    );
  });

  it("knows where a clicked cell reference can be inserted", () => {
    expect(canInsertReferenceAt("=", 1)).toBe(true);
    expect(canInsertReferenceAt("=SUM(", 5)).toBe(true);
    expect(canInsertReferenceAt("=A1+", 4)).toBe(true);
    expect(canInsertReferenceAt("=A1", 3)).toBe(false);
    expect(canInsertReferenceAt("Acme", 4)).toBe(false);
  });
});
