/**
 * The lookup functions besides VLOOKUP: HLOOKUP, MATCH, INDEX, the INDEX/MATCH
 * pair, XLOOKUP and LOOKUP, with Google Sheets results.
 */

import { dateToSerial, type SheetColumn } from "@/lib/spreadsheet-formulas";
import { createTestSheet, errorCode } from "./sheet-fixture";

const COLUMNS: SheetColumn[] = [
  { key: "order_id", kind: "text" }, // A
  { key: "client", kind: "text" }, // B
  { key: "dr", kind: "number" }, // C
  { key: "request_date", kind: "date" }, // D
  { key: "final_price", kind: "number" }, // E
  { key: "status", kind: "text" }, // F
];

const ROWS: Array<Record<string, string>> = [
  { order_id: "BL-100", client: "Acme", dr: "30", request_date: "07/01/2026", final_price: "150", status: "Live" },
  { order_id: "BL-101", client: "Globex", dr: "45", request_date: "08/15/2026", final_price: "200", status: "Approved" },
  { order_id: "BL-102", client: "Acme", dr: "60", request_date: "09/01/2026", final_price: "350", status: "New Request" },
  { order_id: "BL-103", client: "Initech", dr: "75", request_date: "10/01/2026", final_price: "", status: "Live" },
  { order_id: "BL-104", client: "Acme", dr: "90", request_date: "10/20/2026", final_price: "500", status: "Approved" },
];

const { evaluate, evaluateResult } = createTestSheet({ columns: COLUMNS, rows: ROWS });

describe("HLOOKUP", () => {
  const TABLE = '{"Express","Organic","Custom";500,150,0;7,30,45}';

  it("searches the first row and returns the requested row of the matching column", () => {
    expect(evaluate(`=HLOOKUP("Organic", ${TABLE}, 2, FALSE)`)).toBe(150);
    expect(evaluate(`=HLOOKUP("custom", ${TABLE}, 3, FALSE)`)).toBe(45);
    expect(evaluate(`=HLOOKUP("Express", ${TABLE}, 1, FALSE)`)).toBe("Express");
  });

  it("finds the closest smaller value in a sorted first row", () => {
    expect(evaluate('=HLOOKUP(55, {0,50,70;"Low","High","Top"}, 2)')).toBe("High");
    expect(errorCode(evaluate('=HLOOKUP(-1, {0,50,70;"Low","High","Top"}, 2)'))).toBe("#N/A");
  });

  it("works over a range of the table", () => {
    expect(evaluate('=HLOOKUP("BL-100", A1:F2, 2, FALSE)')).toBe("BL-101");
    expect(evaluate('=HLOOKUP("Live", A1:F2, 2, FALSE)')).toBe("Approved");
    // Only the first row is searched.
    expect(errorCode(evaluate('=HLOOKUP("Globex", B1:B5, 1, FALSE)'))).toBe("#N/A");
  });

  it("returns errors for a bad index or a missing key", () => {
    expect(errorCode(evaluate(`=HLOOKUP("Organic", ${TABLE}, 0, FALSE)`))).toBe("#VALUE!");
    expect(errorCode(evaluate(`=HLOOKUP("Organic", ${TABLE}, 4, FALSE)`))).toBe("#REF!");
    expect(errorCode(evaluate(`=HLOOKUP("Paid", ${TABLE}, 2, FALSE)`))).toBe("#N/A");
  });
});

describe("MATCH", () => {
  it("returns the 1 based position of an exact match", () => {
    expect(evaluate('=MATCH("BL-103", A:A, 0)')).toBe(4);
    expect(evaluate('=MATCH("globex", B:B, 0)')).toBe(2);
    expect(evaluate('=MATCH("Acme", B:B, 0)')).toBe(1);
    expect(evaluate("=MATCH(60, C:C, 0)")).toBe(3);
  });

  it("supports wildcards in an exact match", () => {
    expect(evaluate('=MATCH("Init*", B:B, 0)')).toBe(4);
    expect(evaluate('=MATCH("BL-10?", A2:A5, 0)')).toBe(1);
  });

  it("finds the largest value less than or equal to the key by default", () => {
    expect(evaluate("=MATCH(50, C:C)")).toBe(2);
    expect(evaluate("=MATCH(50, C:C, 1)")).toBe(2);
    expect(evaluate("=MATCH(90, C:C, 1)")).toBe(5);
    expect(errorCode(evaluate("=MATCH(10, C:C, 1)"))).toBe("#N/A");
  });

  it("finds the smallest value greater than or equal to the key in a descending list", () => {
    expect(evaluate("=MATCH(50, {90,75,60,45,30}, -1)")).toBe(3);
    expect(evaluate("=MATCH(75, {90,75,60,45,30}, -1)")).toBe(2);
    expect(errorCode(evaluate("=MATCH(95, {90,75,60,45,30}, -1)"))).toBe("#N/A");
  });

  it("works across a row", () => {
    expect(evaluate('=MATCH("Globex", A2:F2, 0)')).toBe(2);
  });

  it("returns #N/A when the key is missing", () => {
    expect(errorCode(evaluate('=MATCH("Umbrella", B:B, 0)'))).toBe("#N/A");
  });

  it("returns one position per key for a range of keys", () => {
    expect(evaluate('=SUM(ARRAYFORMULA(MATCH({"BL-101";"BL-104"}, A:A, 0)))')).toBe(2 + 5);
  });
});

describe("INDEX", () => {
  it("reads a cell of a column, a row or a block", () => {
    expect(evaluate("=INDEX(C:C, 3)")).toBe(60);
    expect(evaluate("=INDEX(A1:F5, 2, 2)")).toBe("Globex");
    expect(evaluate("=INDEX(A2:F2, 3)")).toBe(45);
    expect(evaluate("=INDEX({10,20,30}, 2)")).toBe(20);
  });

  it("returns a whole row or column for index 0", () => {
    expect(evaluate("=SUM(INDEX(A1:E5, 0, 3))")).toBe(30 + 45 + 60 + 75 + 90);
    expect(evaluate("=COUNTA(INDEX(A1:F5, 2, 0))")).toBe(6);
  });

  it("returns #REF! outside the range", () => {
    expect(errorCode(evaluate("=INDEX(C1:C5, 6)"))).toBe("#REF!");
    expect(errorCode(evaluate("=INDEX(A1:B5, 1, 3)"))).toBe("#REF!");
    expect(errorCode(evaluate("=INDEX(C1:C5, -1)"))).toBe("#REF!");
  });

  it("keeps the date format of a date column", () => {
    const result = evaluateResult("=INDEX(D:D, 2)");
    expect(result.value).toBe(dateToSerial(new Date(2026, 7, 15)));
    expect(result.format).toBe("date");
    expect(evaluateResult("=INDEX(A1:F5, 2, 4)").format).toBe("date");
    expect(evaluateResult("=INDEX(A1:F5, 2, 3)").format).toBeNull();
  });
});

describe("INDEX and MATCH together", () => {
  it("looks a value up to the left of the key, which VLOOKUP cannot do", () => {
    expect(evaluate('=INDEX(A:A, MATCH("Initech", B:B, 0))')).toBe("BL-103");
    expect(evaluate('=INDEX(E:E, MATCH("BL-102", A:A, 0))')).toBe(350);
  });

  it("returns #N/A when the key is missing", () => {
    expect(errorCode(evaluate('=INDEX(E:E, MATCH("BL-999", A:A, 0))'))).toBe("#N/A");
    expect(evaluate('=IFERROR(INDEX(E:E, MATCH("BL-999", A:A, 0)), 0)')).toBe(0);
  });

  it("finds the row and the column of a block", () => {
    expect(evaluate('=INDEX(A1:F5, MATCH("BL-104", A1:A5, 0), MATCH("Live", {"x","x","x","x","x","Live"}, 0))')).toBe(
      "Approved"
    );
  });
});

describe("XLOOKUP", () => {
  it("returns the matching item of the result range", () => {
    expect(evaluate('=XLOOKUP("BL-102", A:A, E:E)')).toBe(350);
    expect(evaluate('=XLOOKUP("globex", B:B, A:A)')).toBe("BL-101");
  });

  it("returns the first match by default and the last one with search mode -1", () => {
    expect(evaluate('=XLOOKUP("Acme", B:B, A:A)')).toBe("BL-100");
    expect(evaluate('=XLOOKUP("Acme", B:B, A:A, "", 0, -1)')).toBe("BL-104");
  });

  it("returns the missing value, or #N/A, when nothing matches", () => {
    expect(evaluate('=XLOOKUP("Umbrella", B:B, A:A, "Not found")')).toBe("Not found");
    expect(evaluate('=XLOOKUP("Umbrella", B:B, A:A, 0)')).toBe(0);
    expect(errorCode(evaluate('=XLOOKUP("Umbrella", B:B, A:A)'))).toBe("#N/A");
  });

  it("finds the next smaller (-1) or next larger (1) item when there is no exact match", () => {
    expect(evaluate("=XLOOKUP(50, C:C, A:A, , -1)")).toBe("BL-101");
    expect(evaluate("=XLOOKUP(50, C:C, A:A, , 1)")).toBe("BL-102");
    expect(evaluate("=XLOOKUP(60, C:C, A:A, , 1)")).toBe("BL-102");
    expect(errorCode(evaluate("=XLOOKUP(100, C:C, A:A, , 1)"))).toBe("#N/A");
  });

  it("finds the next item without the list being sorted", () => {
    expect(evaluate("=XLOOKUP(50, {90;30;60;45}, {\"a\";\"b\";\"c\";\"d\"}, , 1)")).toBe("c");
    expect(evaluate("=XLOOKUP(50, {90;30;60;45}, {\"a\";\"b\";\"c\";\"d\"}, , -1)")).toBe("d");
  });

  it("supports wildcards with match mode 2", () => {
    expect(evaluate('=XLOOKUP("Glo*", B:B, A:A, , 2)')).toBe("BL-101");
  });

  it("looks up across a row", () => {
    expect(evaluate('=XLOOKUP("Organic", {"Express","Organic"}, {500,150})')).toBe(150);
  });

  it("returns a whole row of results", () => {
    expect(evaluate('=COUNTA(XLOOKUP("BL-101", A:A, A1:F5))')).toBe(6);
  });

  it("returns #REF! when the result range is shorter than the lookup range", () => {
    expect(errorCode(evaluate('=XLOOKUP("BL-104", A:A, E1:E2)'))).toBe("#REF!");
  });

  it("keeps the date format of the result range, not of the key", () => {
    const result = evaluateResult('=XLOOKUP("BL-101", A:A, D:D)');
    expect(result.value).toBe(dateToSerial(new Date(2026, 7, 15)));
    expect(result.format).toBe("date");
    expect(evaluateResult("=XLOOKUP(D2, D:D, C:C)").format).toBeNull();
  });
});

describe("LOOKUP", () => {
  it("returns the matching item of the result range for a sorted search range", () => {
    expect(evaluate('=LOOKUP("BL-102", A1:A5, E1:E5)')).toBe(350);
    expect(evaluate("=LOOKUP(60, C1:C5, A1:A5)")).toBe("BL-102");
  });

  it("returns the closest smaller value's item when there is no exact match", () => {
    expect(evaluate("=LOOKUP(50, C1:C5, A1:A5)")).toBe("BL-101");
  });

  it("returns an error, never throws, when the key is smaller than every value", () => {
    expect(errorCode(evaluate("=LOOKUP(1, C1:C5, A1:A5)"))).not.toBeNull();
  });
});
