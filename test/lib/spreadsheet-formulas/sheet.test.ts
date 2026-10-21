/**
 * The recalculating sheet: typed raw values, memoized formula cells, circular
 * references, the totals row, paging offsets, formula analysis, and recovery
 * from formula chains deeper than the JavaScript stack.
 */

import {
  analyzeFormula,
  coerceRawValue,
  createFormulaSheet,
  parseFormulaCached,
  toStoredFormula,
  type SheetColumn,
} from "@/lib/spreadsheet-formulas";
import { createColumnMapper, createTestSheet, errorCode, TEST_NOW } from "./sheet-fixture";

const COLUMNS: SheetColumn[] = [
  { key: "client", kind: "text" }, // A
  { key: "dr", kind: "number" }, // B
  { key: "request_date", kind: "date" }, // C
  { key: "total", kind: "text" }, // D
];

const ROWS: Array<Record<string, string>> = [
  { client: "Acme", dr: "10", request_date: "10/01/2026" },
  { client: "Globex", dr: "20", request_date: "10/02/2026" },
  { client: "Initech", dr: "30", request_date: "" },
];

describe("coerceRawValue", () => {
  it("reads blank cells as blank", () => {
    expect(coerceRawValue("", "text")).toBeNull();
    expect(coerceRawValue("   ", "number")).toBeNull();
    expect(coerceRawValue(null, "date")).toBeNull();
    expect(coerceRawValue(undefined, "text")).toBeNull();
  });

  it("reads typed numbers and dates by column kind, keeping what does not parse as text", () => {
    expect(coerceRawValue("$1,250.00", "number")).toBe(1250);
    expect(coerceRawValue("n/a", "number")).toBe("n/a");
    expect(coerceRawValue("10/21/2026", "date")).toBe(46316);
    expect(coerceRawValue("soon", "date")).toBe("soon");
  });

  it("reads plain numbers of text columns as numbers, keeping codes with leading zeros as text", () => {
    expect(coerceRawValue("45", "text")).toBe(45);
    expect(coerceRawValue("-3.5", "text")).toBe(-3.5);
    expect(coerceRawValue("1,250", "text")).toBe(1250);
    expect(coerceRawValue("0042", "text")).toBe("0042");
    expect(coerceRawValue("0.5", "text")).toBe(0.5);
    expect(coerceRawValue("10/21/2026", "text")).toBe("10/21/2026");
    expect(coerceRawValue("1e3", "text")).toBe("1e3");
  });
});

describe("createFormulaSheet", () => {
  it("evaluates each formula cell once and remembers the result", () => {
    const mapper = createColumnMapper(COLUMNS);
    const getFormula = jest.fn((row_idx: number, col_key: string) =>
      col_key === "total" ? toStoredFormula("=B1*2", 1, mapper) : null
    );
    const sheet = createFormulaSheet({
      columns: COLUMNS,
      row_count: ROWS.length,
      row_number_offset: 1,
      now: TEST_NOW,
      getRawValue: (row_idx, col_key) => ROWS[row_idx]?.[col_key] ?? "",
      getFormula,
    });

    expect(sheet.getValue(1, "total")).toBe(40);
    expect(sheet.getValue(1, "total")).toBe(40);
    expect(sheet.getFormulaResult(1, "total")).toEqual({ value: 40, format: null });
    expect(getFormula.mock.calls.filter(([row_idx, col_key]) => row_idx === 1 && col_key === "total")).toHaveLength(1);
  });

  it("returns null for unknown columns, plain cells and rows out of range", () => {
    const { sheet } = createTestSheet({ columns: COLUMNS, rows: ROWS, column_formulas: { D: "=B1" } });
    expect(sheet.getValue(0, "nope")).toBeNull();
    expect(sheet.getFormulaResult(0, "client")).toBeNull();
    expect(sheet.getFormulaResult(99, "total")).toBeNull();
    expect(sheet.getFormulaResult(-1, "total")).toBeNull();
    expect(sheet.getValue(99, "client")).toBeNull();
  });

  it("returns syntax errors as #ERROR! with the parse message", () => {
    const { sheet } = createTestSheet({ columns: COLUMNS, rows: ROWS, cell_formulas: { D1: "=SUM(B1" } });
    const result = sheet.getFormulaResult(0, "total");
    expect(errorCode(result!.value)).toBe("#ERROR!");
    expect((result!.value as { detail: string }).detail).toBe('Missing ")".');
  });

  it("evaluates the totals row under the last row", () => {
    const { sheet, mapper } = createTestSheet({ columns: COLUMNS, rows: ROWS });
    const summary = (formula: string) => sheet.evaluate(toStoredFormula(formula, 4, mapper), ROWS.length).value;
    expect(summary("=SUM(B:B)")).toBe(60);
    expect(summary("=ROW()")).toBe(4);
    expect(summary("=B4")).toBeNull();
  });

  it("numbers rows from the page offset", () => {
    const { evaluate } = createTestSheet({ columns: COLUMNS, rows: ROWS, row_number_offset: 51 });
    expect(evaluate("=B52", 51)).toBe(20);
    expect(evaluate("=ROW()", 53)).toBe(53);
    // Rows of other pages are not loaded, they read as blank.
    expect(evaluate("=B1", 51)).toBeNull();
    expect(evaluate("=SUM(B:B)", 51)).toBe(60);
  });

  describe("circular references", () => {
    it("detects a formula reading itself", () => {
      const { valueAt } = createTestSheet({ columns: COLUMNS, rows: ROWS, cell_formulas: { D1: "=D1+1" } });
      expect(errorCode(valueAt("D1"))).toBe("#REF!");
    });

    it("detects loops through other cells", () => {
      const { valueAt } = createTestSheet({
        columns: COLUMNS,
        rows: ROWS,
        cell_formulas: { D1: "=D2", D2: "=D3", D3: "=D1" },
      });
      expect(errorCode(valueAt("D1"))).toBe("#REF!");
      expect(errorCode(valueAt("D2"))).toBe("#REF!");
    });

    it("detects a formula column summing its own column", () => {
      const { valueAt } = createTestSheet({ columns: COLUMNS, rows: ROWS, column_formulas: { D: "=SUM(D:D)" } });
      expect(errorCode(valueAt("D2"))).toBe("#REF!");
    });

    it("leaves the other cells of the sheet working", () => {
      const { valueAt, evaluate } = createTestSheet({
        columns: COLUMNS,
        rows: ROWS,
        cell_formulas: { D1: "=D1+1", D2: "=B2*3" },
      });
      expect(errorCode(valueAt("D1"))).toBe("#REF!");
      expect(valueAt("D2")).toBe(60);
      expect(evaluate("=SUM(B:B)")).toBe(60);
    });
  });

  describe("long chains of formulas", () => {
    function runningTotalSheet(row_count: number) {
      const rows = Array.from({ length: row_count }, () => ({ dr: "1" }));
      const cell_formulas: Record<string, string> = { D1: "=B1" };
      for (let row_number = 2; row_number <= row_count; row_number++) {
        cell_formulas[`D${row_number}`] = `=D${row_number - 1}+B${row_number}`;
      }
      return createTestSheet({ columns: COLUMNS, rows, cell_formulas });
    }

    it("computes a running total read from its last row, deeper than the stack", () => {
      const { valueAt } = runningTotalSheet(5000);
      expect(valueAt("D5000")).toBe(5000);
      expect(valueAt("D2500")).toBe(2500);
    });

    it("computes the totals row of a long running total", () => {
      const { evaluate } = runningTotalSheet(5000);
      expect(evaluate("=MAX(D:D)", 1)).toBe(5000);
    });
  });
});

describe("analyzeFormula", () => {
  const mapper = createColumnMapper(COLUMNS);
  const analyze = (formula: string, row_number = 2) => analyzeFormula(toStoredFormula(formula, row_number, mapper));

  it("knows formulas that only read their own row", () => {
    expect(analyze("=B2*2").is_row_local).toBe(true);
    expect(analyze('=IF(A2="", "", VLOOKUP(A2, {"Acme",1}, 2, FALSE))').is_row_local).toBe(true);
    expect(analyze("=B1*2").is_row_local).toBe(false);
    expect(analyze("=$B$2").is_row_local).toBe(false);
    expect(analyze("=VLOOKUP(A2, A:B, 2, FALSE)").is_row_local).toBe(false);
    expect(analyze("=ROW()").is_row_local).toBe(false);
    expect(analyze('=INDIRECT("B2")').is_row_local).toBe(false);
  });

  it("knows volatile formulas", () => {
    expect(analyze("=TODAY()").is_volatile).toBe(false);
    expect(analyze("=NOW()").is_volatile).toBe(true);
    expect(analyze("=RANDBETWEEN(1, 9)").is_volatile).toBe(true);
    expect(analyze("=NOW()").is_row_local).toBe(false);
  });

  it("lists functions and references, and flags invalid formulas", () => {
    const analysis = analyze("=iferror(VLOOKUP(A2, A:B, 2, FALSE), 0)");
    expect([...analysis.function_names].sort()).toEqual(["IFERROR", "VLOOKUP"]);
    expect(analysis.references).toHaveLength(2);
    expect(analyze("=SUM(")).toMatchObject({ is_valid: false, error_message: "The formula ends unexpectedly." });
  });

  it("parses each formula text once", () => {
    expect(parseFormulaCached("=1+1")).toBe(parseFormulaCached("=1+1"));
  });
});
