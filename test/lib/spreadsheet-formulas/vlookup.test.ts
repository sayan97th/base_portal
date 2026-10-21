/**
 * VLOOKUP, the most used function of the Link Building sheet (BASE_links.xlsx
 * calls it more than 17,000 times). Every case is checked against the result
 * Google Sheets gives for the same formula and data.
 */

import { dateToSerial, formatScalar, type SheetColumn } from "@/lib/spreadsheet-formulas";
import { createTestSheet, errorCode } from "./sheet-fixture";

// A pricing table (A:F) like the client's "Data Validation Tab", a DR tier table
// sorted ascending (G:H), and order data that looks the tables up (I:J).
const COLUMNS: SheetColumn[] = [
  { key: "link_type", kind: "text" }, // A
  { key: "price", kind: "number" }, // B
  { key: "turnaround_days", kind: "number" }, // C
  { key: "is_internal", kind: "text" }, // D
  { key: "start_date", kind: "date" }, // E
  { key: "note", kind: "text" }, // F
  { key: "dr_floor", kind: "number" }, // G
  { key: "tier", kind: "text" }, // H
  { key: "order_link_type", kind: "text" }, // I
  { key: "request_date", kind: "date" }, // J
  { key: "result", kind: "text" }, // K
];

const ROWS: Array<Record<string, string>> = [
  { link_type: "Organic External", price: "150", turnaround_days: "30", is_internal: "No", start_date: "01/01/2026", note: "", dr_floor: "0", tier: "Low", order_link_type: "DA 50+ External", request_date: "10/01/2026" },
  { link_type: "DA 30+ External", price: "200", turnaround_days: "25", is_internal: "No", start_date: "02/01/2026", note: "Standard", dr_floor: "30", tier: "Mid", order_link_type: "express link", request_date: "10/15/2026" },
  { link_type: "DA 50+ External", price: "400", turnaround_days: "35", is_internal: "No", start_date: "03/01/2026", note: "", dr_floor: "50", tier: "High", order_link_type: "Unknown type", request_date: "" },
  { link_type: "DA 30+ Internal", price: "120", turnaround_days: "20", is_internal: "Yes", start_date: "04/01/2026", note: "Internal only", dr_floor: "70", tier: "Top", order_link_type: "", request_date: "09/30/2026" },
  { link_type: "Express Link", price: "$500.00", turnaround_days: "7", is_internal: "No", start_date: "05/01/2026", note: "Rush", dr_floor: "", tier: "", order_link_type: "DA 30+ External", request_date: "10/20/2026" },
  { link_type: "DA 30+ External", price: "999", turnaround_days: "1", is_internal: "No", start_date: "06/01/2026", note: "Duplicate", dr_floor: "", tier: "", order_link_type: "", request_date: "" },
  { link_type: "0042", price: "42", turnaround_days: "", is_internal: "", start_date: "", note: "Code with leading zeros", dr_floor: "", tier: "", order_link_type: "", request_date: "" },
];

const { evaluate, evaluateResult } = createTestSheet({ columns: COLUMNS, rows: ROWS });

describe("VLOOKUP exact match (is_sorted FALSE)", () => {
  it("returns the value of the requested column in the matching row", () => {
    expect(evaluate('=VLOOKUP("DA 50+ External", A:F, 2, FALSE)')).toBe(400);
    expect(evaluate('=VLOOKUP("DA 50+ External", A:F, 3, FALSE)')).toBe(35);
    expect(evaluate('=VLOOKUP("DA 30+ Internal", A:F, 4, FALSE)')).toBe("Yes");
    expect(evaluate('=VLOOKUP("Express Link", A:F, 6, FALSE)')).toBe("Rush");
  });

  it("returns the key column itself for index 1", () => {
    expect(evaluate('=VLOOKUP("express link", A:F, 1, FALSE)')).toBe("Express Link");
  });

  it("accepts 0, FALSE and lowercase false as the exact match flag", () => {
    expect(evaluate('=VLOOKUP("Express Link", A:B, 2, 0)')).toBe(500);
    expect(evaluate('=VLOOKUP("Express Link", A:B, 2, FALSE)')).toBe(500);
    expect(evaluate('=vlookup("Express Link", A:B, 2, false)')).toBe(500);
  });

  it("matches text without regard to case", () => {
    expect(evaluate('=VLOOKUP("da 50+ EXTERNAL", A:B, 2, FALSE)')).toBe(400);
  });

  it("returns the first match when the key appears more than once", () => {
    expect(evaluate('=VLOOKUP("DA 30+ External", A:F, 2, FALSE)')).toBe(200);
    expect(evaluate('=VLOOKUP("DA 30+ External", A:F, 6, FALSE)')).toBe("Standard");
  });

  it("reads the search key from a cell of the formula's own row", () => {
    expect(evaluate("=VLOOKUP(I1, A:B, 2, FALSE)", 1)).toBe(400);
    expect(evaluate("=VLOOKUP(I2, A:B, 2, FALSE)", 2)).toBe(500);
    expect(evaluate("=VLOOKUP(I5, A:B, 2, FALSE)", 5)).toBe(200);
  });

  it("reads currency formatted numbers of a number column as numbers", () => {
    expect(evaluate('=VLOOKUP("Express Link", A:B, 2, FALSE) + 1')).toBe(501);
  });

  it("returns #N/A with an explanation when the key is not found", () => {
    const result = evaluate('=VLOOKUP("Unknown type", A:F, 2, FALSE)');
    expect(errorCode(result)).toBe("#N/A");
    expect((result as { detail: string }).detail).toBe('Did not find value "Unknown type" in VLOOKUP evaluation.');
  });

  it("returns #N/A for a blank search key", () => {
    expect(errorCode(evaluate("=VLOOKUP(I4, A:B, 2, FALSE)", 4))).toBe("#N/A");
  });

  it("returns a blank cell as blank, shown empty", () => {
    const value = evaluate('=VLOOKUP("DA 50+ External", A:F, 6, FALSE)');
    expect(value).toBeNull();
    expect(formatScalar(value)).toBe("");
  });

  it("never matches numbers against text, like Google Sheets", () => {
    expect(evaluate('=VLOOKUP("0042", A:B, 2, FALSE)')).toBe(42);
    expect(errorCode(evaluate("=VLOOKUP(42, A:B, 2, FALSE)"))).toBe("#N/A");
    expect(evaluate("=VLOOKUP(50, G:H, 2, FALSE)")).toBe("High");
    expect(errorCode(evaluate('=VLOOKUP("50", G:H, 2, FALSE)'))).toBe("#N/A");
  });

  it("matches dates by their serial number", () => {
    expect(evaluate("=VLOOKUP(DATE(2026, 4, 1), E:F, 2, FALSE)")).toBe("Internal only");
    expect(evaluate('=VLOOKUP(DATEVALUE("05/01/2026"), E:F, 2, FALSE)')).toBe("Rush");
  });

  it("supports * and ? wildcards in a text key, and ~ to escape them", () => {
    expect(evaluate('=VLOOKUP("Express*", A:B, 2, FALSE)')).toBe(500);
    expect(evaluate('=VLOOKUP("DA ?0+ Internal", A:B, 2, FALSE)')).toBe(120);
    expect(evaluate('=VLOOKUP("*internal", A:B, 2, FALSE)')).toBe(120);
    expect(errorCode(evaluate('=VLOOKUP("Express~*", A:B, 2, FALSE)'))).toBe("#N/A");
    expect(evaluate('=VLOOKUP("BL-~*", {"BL-1",1;"BL-*",2}, 2, FALSE)')).toBe(2);
    expect(evaluate('=VLOOKUP("BL-~?", {"BL-1",1;"BL-?",2}, 2, FALSE)')).toBe(2);
  });

  it("searches the first column of the range, wherever the range starts", () => {
    expect(evaluate('=VLOOKUP("Yes", D:F, 3, FALSE)')).toBe("Internal only");
    expect(evaluate('=VLOOKUP("Top", H:H, 1, FALSE)')).toBe("Top");
  });

  it("only searches the rows of a bounded range", () => {
    expect(evaluate('=VLOOKUP("Express Link", $A$1:$C$5, 3, FALSE)')).toBe(7);
    expect(errorCode(evaluate('=VLOOKUP("0042", $A$1:$B$5, 2, FALSE)'))).toBe("#N/A");
    expect(evaluate('=VLOOKUP("DA 30+ External", A6:B7, 2, FALSE)')).toBe(999);
  });

  it("looks up an array literal", () => {
    expect(evaluate('=VLOOKUP("b", {"a",1;"b",2;"c",3}, 2, FALSE)')).toBe(2);
  });
});

describe("VLOOKUP approximate match (is_sorted TRUE or omitted)", () => {
  it("returns the row of the largest value less than or equal to the key", () => {
    expect(evaluate("=VLOOKUP(45, G1:H4, 2)")).toBe("Mid");
    expect(evaluate("=VLOOKUP(45, G1:H4, 2, TRUE)")).toBe("Mid");
    expect(evaluate("=VLOOKUP(50, G1:H4, 2, TRUE)")).toBe("High");
    expect(evaluate("=VLOOKUP(0, G:H, 2)")).toBe("Low");
  });

  it("skips the blank cells at the end of a whole column", () => {
    expect(evaluate("=VLOOKUP(99, G:H, 2)")).toBe("Top");
  });

  it("returns #N/A when the key is smaller than every value", () => {
    expect(errorCode(evaluate("=VLOOKUP(-5, G:H, 2)"))).toBe("#N/A");
  });

  it("works with sorted dates", () => {
    expect(evaluate("=VLOOKUP(DATE(2026, 5, 20), E1:F5, 2)")).toBe("Rush");
    expect(evaluate("=VLOOKUP(DATE(2026, 4, 15), E1:F5, 2)")).toBe("Internal only");
  });

  it("works with sorted text, without regard to case", () => {
    expect(evaluate('=VLOOKUP("m", {"a","first";"K","second";"t","third"}, 2)')).toBe("second");
  });

  it("ignores values of another type than the key", () => {
    expect(evaluate('=VLOOKUP(45, {"x","text";10,"ten";40,"forty"}, 2)')).toBe("forty");
  });
});

describe("VLOOKUP argument errors", () => {
  it("returns #VALUE! for an index below 1", () => {
    expect(errorCode(evaluate('=VLOOKUP("Express Link", A:B, 0, FALSE)'))).toBe("#VALUE!");
    expect(errorCode(evaluate('=VLOOKUP("Express Link", A:B, -1, FALSE)'))).toBe("#VALUE!");
  });

  it("returns #REF! for an index past the last column of the range", () => {
    expect(errorCode(evaluate('=VLOOKUP("Express Link", A:B, 3, FALSE)'))).toBe("#REF!");
  });

  it("truncates a decimal index and reads a numeric text index", () => {
    expect(evaluate('=VLOOKUP("Express Link", A:C, 2.9, FALSE)')).toBe(500);
    expect(evaluate('=VLOOKUP("Express Link", A:C, "3", FALSE)')).toBe(7);
    expect(errorCode(evaluate('=VLOOKUP("Express Link", A:C, "three", FALSE)'))).toBe("#VALUE!");
  });

  it("passes an error in the search key through", () => {
    expect(errorCode(evaluate("=VLOOKUP(1/0, A:B, 2, FALSE)"))).toBe("#DIV/0!");
    expect(errorCode(evaluate("=VLOOKUP(NA(), A:B, 2, FALSE)"))).toBe("#N/A");
  });

  it("returns an error, never throws, when arguments are missing", () => {
    expect(errorCode(evaluate('=VLOOKUP("Express Link")'))).not.toBeNull();
    expect(errorCode(evaluate('=VLOOKUP("Express Link", A:B)'))).not.toBeNull();
    expect(errorCode(evaluate("=VLOOKUP()"))).not.toBeNull();
  });

  it("returns a reference error for a column that does not exist", () => {
    expect(errorCode(evaluate('=VLOOKUP("Express Link", A:ZZ, 2, FALSE)'))).toBe("#REF!");
  });
});

describe("VLOOKUP inside other formulas", () => {
  it("falls back with IFERROR and IFNA", () => {
    expect(evaluate('=IFERROR(VLOOKUP(I3, A:B, 2, FALSE), "Not found")', 3)).toBe("Not found");
    expect(evaluate('=IFNA(VLOOKUP(I3, A:B, 2, FALSE), "Not found")', 3)).toBe("Not found");
    expect(evaluate('=IFERROR(VLOOKUP(I1, A:B, 2, FALSE), "Not found")', 1)).toBe(400);
    // IFNA only catches #N/A.
    expect(errorCode(evaluate('=IFNA(VLOOKUP(I1, A:B, 0, FALSE), "x")', 1))).toBe("#VALUE!");
  });

  it("only looks up rows that have a request date", () => {
    expect(evaluate('=IF(NOT(ISBLANK(J1)), VLOOKUP(I1, A:C, 3, FALSE), "")', 1)).toBe(35);
    // Row 3 has no request date, so its unknown link type is never looked up.
    expect(evaluate('=IF(NOT(ISBLANK(J3)), VLOOKUP(I3, A:C, 3, FALSE), "")', 3)).toBe("");
  });

  it("computes a delivery date from the request date and the turnaround days", () => {
    const result = evaluateResult("=J1 + VLOOKUP(I1, A:C, 3, FALSE)", 1);
    expect(result.value).toBe(dateToSerial(new Date(2026, 9, 1)) + 35);
    expect(result.format).toBe("date");
    expect(formatScalar(result.value, result.format)).toBe("11/05/2026");
  });

  it("does arithmetic and comparisons on the result", () => {
    expect(evaluate("=VLOOKUP(I1, A:B, 2, FALSE) * 1.15", 1)).toBeCloseTo(460);
    expect(evaluate('=VLOOKUP(I1, A:D, 4, FALSE) = "No"', 1)).toBe(true);
    expect(evaluate('=IF(VLOOKUP(I5, A:D, 4, FALSE) = "Yes", "Internal", "External")', 5)).toBe("External");
  });

  it("nests lookups", () => {
    expect(evaluate('=VLOOKUP(VLOOKUP("Rush", {"Rush","Express Link"}, 2, FALSE), A:C, 3, FALSE)')).toBe(7);
  });

  it("builds text with the result", () => {
    expect(evaluate('=I1 & " costs $" & VLOOKUP(I1, A:B, 2, FALSE)', 1)).toBe("DA 50+ External costs $400");
  });
});

describe("VLOOKUP result format", () => {
  it("shows a date looked up from a date column as a date", () => {
    const result = evaluateResult('=VLOOKUP("Express Link", A:F, 5, FALSE)');
    expect(result.value).toBe(dateToSerial(new Date(2026, 4, 1)));
    expect(result.format).toBe("date");
    expect(formatScalar(result.value, result.format)).toBe("05/01/2026");
  });

  it("shows a number looked up with a date key as a number, not a date", () => {
    const result = evaluateResult("=VLOOKUP(DATE(2026, 2, 1), E1:G6, 3, FALSE)");
    expect(result.value).toBe(30);
    expect(result.format).toBeNull();
    expect(formatScalar(result.value, result.format)).toBe("30");
  });

  it("shows a number looked up with a key from a date column as a number", () => {
    const result = evaluateResult("=VLOOKUP(J5, E1:G4, 3, TRUE)", 5);
    expect(result.value).toBe(70);
    expect(result.format).toBeNull();
  });
});

describe("VLOOKUP in a formula column and over computed cells", () => {
  it("fills a formula column, each row looking up its own key", () => {
    const { valueAt } = createTestSheet({
      columns: COLUMNS,
      rows: ROWS,
      column_formulas: { K: '=IFERROR(VLOOKUP(I1, A:B, 2, FALSE), "")' },
    });
    expect([1, 2, 3, 4, 5].map((row_number) => valueAt(`K${row_number}`))).toEqual([400, 500, "", "", 200]);
  });

  it("looks up each row's key when the key is a whole column", () => {
    const { valueAt } = createTestSheet({
      columns: COLUMNS,
      rows: ROWS,
      column_formulas: { K: "=IFERROR(VLOOKUP(I:I, A:B, 2, FALSE), 0)" },
    });
    expect([1, 2, 3, 5].map((row_number) => valueAt(`K${row_number}`))).toEqual([400, 500, 0, 200]);
  });

  it("looks a range of keys up inside ARRAYFORMULA", () => {
    expect(evaluate("=SUM(ARRAYFORMULA(IFERROR(VLOOKUP(I1:I5, A:B, 2, FALSE), 0)))")).toBe(400 + 500 + 200);
    expect(evaluate("=ROWS(ARRAYFORMULA(VLOOKUP(I1:I2, A:B, 2, FALSE)))")).toBe(2);
  });

  it("returns the computed value of a formula cell in the table", () => {
    const { evaluate: evaluateComputed } = createTestSheet({
      columns: COLUMNS,
      rows: ROWS,
      column_formulas: { K: "=B1*2" },
    });
    expect(evaluateComputed('=VLOOKUP("Express Link", A:K, 11, FALSE)')).toBe(1000);
  });

  it("returns the error of the matched cell", () => {
    const { evaluate: evaluateWithError } = createTestSheet({
      columns: COLUMNS,
      rows: ROWS,
      cell_formulas: { K3: "=1/0" },
    });
    expect(errorCode(evaluateWithError('=VLOOKUP("DA 50+ External", A:K, 11, FALSE)'))).toBe("#DIV/0!");
    // An error in another row does not stop the search.
    expect(evaluateWithError('=VLOOKUP("Express Link", A:K, 2, FALSE)')).toBe(500);
  });

  it("skips error cells of the key column", () => {
    const { evaluate: evaluateWithError } = createTestSheet({
      columns: COLUMNS,
      rows: ROWS,
      cell_formulas: { A2: "=1/0" },
    });
    expect(evaluateWithError('=VLOOKUP("Express Link", A:B, 2, FALSE)')).toBe(500);
  });

  it("reports an error, never hangs, when the lookup reads its own cell", () => {
    const { valueAt } = createTestSheet({
      columns: COLUMNS,
      rows: ROWS,
      cell_formulas: { K1: '=VLOOKUP("Organic External", A:K, 11, FALSE)' },
    });
    expect(errorCode(valueAt("K1"))).toBe("#REF!");
  });

  it("evaluates a lookup formula column over 1,000 rows quickly", () => {
    const row_count = 1000;
    const rows = Array.from({ length: row_count }, (_, idx) => ({
      link_type: `Type ${idx}`,
      price: String(idx * 10),
      order_link_type: `Type ${row_count - 1 - idx}`,
    }));
    const { sheet } = createTestSheet({
      columns: COLUMNS,
      rows,
      column_formulas: { K: "=VLOOKUP(I1, A:B, 2, FALSE)" },
    });

    const started_at = Date.now();
    const values = Array.from({ length: row_count }, (_, row_idx) => sheet.getValue(row_idx, "result"));
    const elapsed_ms = Date.now() - started_at;

    expect(values[0]).toBe((row_count - 1) * 10);
    expect(values[row_count - 1]).toBe(0);
    expect(elapsed_ms).toBeLessThan(3000);
  });

  it("evaluates a whole column key over 1,000 rows quickly", () => {
    const row_count = 1000;
    const rows = Array.from({ length: row_count }, (_, idx) => ({
      link_type: `Type ${idx}`,
      price: String(idx * 10),
      order_link_type: `type ${(idx * 7) % row_count}`,
    }));
    const { sheet } = createTestSheet({
      columns: COLUMNS,
      rows,
      column_formulas: { K: "=VLOOKUP(I:I, A:B, 2, FALSE)" },
    });

    const started_at = Date.now();
    const values = Array.from({ length: row_count }, (_, row_idx) => sheet.getValue(row_idx, "result"));
    const elapsed_ms = Date.now() - started_at;

    expect(values[3]).toBe(210);
    expect(values[row_count - 1]).toBe(((row_count - 1) * 7) % row_count * 10);
    expect(elapsed_ms).toBeLessThan(5000);
  });
});
