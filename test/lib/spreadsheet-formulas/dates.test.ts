/**
 * Date functions and date arithmetic. Dates are serial numbers (days since
 * 12/30/1899) and the engine infers when a result should be shown as a date.
 */

import { dateToSerial, formatScalar, type SheetColumn } from "@/lib/spreadsheet-formulas";
import { createTestSheet, errorCode } from "./sheet-fixture";

const COLUMNS: SheetColumn[] = [
  { key: "request_date", kind: "date" }, // A
  { key: "delivery_date", kind: "date" }, // B
  { key: "dr", kind: "number" }, // C
  { key: "date_text", kind: "text" }, // D
];

const ROWS: Array<Record<string, string>> = [
  { request_date: "10/01/2026", delivery_date: "10/31/2026", dr: "45", date_text: "10/21/2026" },
  { request_date: "01/31/2026", delivery_date: "", dr: "62", date_text: "2026-02-28" },
  { request_date: "", delivery_date: "02/29/2028", dr: "", date_text: "not a date" },
  { request_date: "13/45/2026", delivery_date: "", dr: "", date_text: "" },
];

const { evaluate, evaluateResult } = createTestSheet({ columns: COLUMNS, rows: ROWS });

const serial = (year: number, month: number, day: number) => dateToSerial(new Date(year, month - 1, day));

function shown(formula: string, row_number = 1): string {
  const result = evaluateResult(formula, row_number);
  return formatScalar(result.value, result.format);
}

describe("reading dates", () => {
  it("reads date columns as serial numbers", () => {
    expect(evaluate("=A1")).toBe(serial(2026, 10, 1));
    expect(evaluate("=B3")).toBe(serial(2028, 2, 29));
  });

  it("keeps a date column cell that is not a valid date as text", () => {
    expect(evaluate("=A4")).toBe("13/45/2026");
    expect(errorCode(evaluate("=A4+1"))).toBe("#VALUE!");
  });

  it("reads dates typed into a text column when used in arithmetic", () => {
    expect(evaluate("=D1+0")).toBe(serial(2026, 10, 21));
    expect(evaluate("=D2-D1")).toBe(serial(2026, 2, 28) - serial(2026, 10, 21));
    expect(errorCode(evaluate("=D3+1"))).toBe("#VALUE!");
  });
});

describe("TODAY and NOW", () => {
  it("returns today's date and the current date and time", () => {
    expect(evaluate("=TODAY()")).toBe(serial(2026, 10, 21));
    expect(shown("=TODAY()")).toBe("10/21/2026");
    expect(shown("=NOW()")).toBe("10/21/2026 09:30:00");
  });
});

describe("building and parsing dates", () => {
  it("builds dates, rolling over out of range months and days", () => {
    expect(evaluate("=DATE(2026, 10, 21)")).toBe(serial(2026, 10, 21));
    expect(evaluate("=DATE(2026, 13, 1)")).toBe(serial(2027, 1, 1));
    expect(evaluate("=DATE(2026, 3, 0)")).toBe(serial(2026, 2, 28));
  });

  it("parses date texts", () => {
    expect(evaluate('=DATEVALUE("10/21/2026")')).toBe(serial(2026, 10, 21));
    expect(evaluate('=DATEVALUE("2026-10-21")')).toBe(serial(2026, 10, 21));
    expect(evaluate('=DATEVALUE("1/5/26")')).toBe(serial(2026, 1, 5));
    expect(evaluate('=DATEVALUE("Oct 21, 2026")')).toBe(serial(2026, 10, 21));
    expect(evaluate("=DATEVALUE(A1)")).toBe(serial(2026, 10, 1));
    expect(errorCode(evaluate('=DATEVALUE("not a date")'))).toBe("#VALUE!");
  });

  it("reads the parts of a date", () => {
    expect(evaluate("=YEAR(A1)")).toBe(2026);
    expect(evaluate("=MONTH(A1)")).toBe(10);
    expect(evaluate("=DAY(B1)")).toBe(31);
    expect(evaluate("=WEEKDAY(DATE(2026, 10, 21))")).toBe(4);
    expect(evaluate("=WEEKNUM(DATE(2026, 1, 1))")).toBe(1);
    expect(evaluate("=HOUR(NOW())")).toBe(9);
    expect(evaluate("=MINUTE(NOW())")).toBe(30);
  });
});

describe("date arithmetic", () => {
  it("adds days to a date and shows a date", () => {
    expect(shown("=A1+30")).toBe("10/31/2026");
    expect(shown("=30+A1")).toBe("10/31/2026");
    expect(shown("=TODAY()+7")).toBe("10/28/2026");
    expect(shown("=A1-1")).toBe("09/30/2026");
  });

  it("subtracts dates and shows a number of days", () => {
    expect(evaluate("=B1-A1")).toBe(30);
    expect(shown("=B1-A1")).toBe("30");
    expect(evaluate("=DAYS(B1, A1)")).toBe(30);
    expect(evaluate("=B1-TODAY()")).toBe(10);
  });

  it("moves by months to the same day or the end of the month", () => {
    expect(shown("=EDATE(A1, 1)")).toBe("11/01/2026");
    expect(shown("=EDATE(A2, 1)", 2)).toBe("02/28/2026");
    expect(shown("=EDATE(A1, -3)")).toBe("07/01/2026");
    expect(shown("=EOMONTH(A1, 0)")).toBe("10/31/2026");
    expect(shown("=EOMONTH(DATE(2028, 1, 15), 1)")).toBe("02/29/2028");
  });

  it("counts working days and moves by working days", () => {
    expect(evaluate("=NETWORKDAYS(A1, B1)")).toBe(22);
    expect(evaluate('=NETWORKDAYS(A1, B1, DATEVALUE("10/12/2026"))')).toBe(21);
    expect(shown("=WORKDAY(A1, 5)")).toBe("10/08/2026");
  });

  it("measures the time between dates", () => {
    expect(evaluate('=DATEDIF(A2, A1, "M")')).toBe(8);
    expect(evaluate('=DATEDIF(A2, A1, "D")')).toBe(serial(2026, 10, 1) - serial(2026, 1, 31));
    expect(evaluate('=DATEDIF(DATE(2020, 1, 1), A1, "Y")')).toBe(6);
    expect(evaluate("=YEARFRAC(DATE(2026, 1, 1), DATE(2026, 7, 1))")).toBeCloseTo(0.5);
  });

  it("compares dates", () => {
    expect(evaluate("=A1<B1")).toBe(true);
    expect(evaluate("=A1=DATE(2026, 10, 1)")).toBe(true);
    expect(evaluate('=IF(B1<TODAY(), "Late", "On time")')).toBe("On time");
  });
});

describe("date format of results", () => {
  it("shows the result of date functions as a date", () => {
    expect(shown("=DATE(2026, 12, 25)")).toBe("12/25/2026");
    expect(shown('=DATEVALUE("2026-12-25")')).toBe("12/25/2026");
    expect(shown("=WORKDAY(A1, 1)")).toBe("10/02/2026");
  });

  it("keeps the date format through IF, IFERROR, MIN, MAX and lookups", () => {
    expect(shown('=IF(A1="", "", A1+30)')).toBe("10/31/2026");
    expect(shown('=IFERROR(A1+30, "")')).toBe("10/31/2026");
    expect(shown("=MAX(A:A)")).toBe("10/01/2026");
    expect(shown("=MIN(A1:B2)")).toBe("01/31/2026");
  });

  it("does not show a date for a condition, a key or a criteria range that is a date", () => {
    expect(shown('=IF(A1>DATE(2026, 1, 1), C1, 0)')).toBe("45");
    expect(shown('=MAXIFS(C:C, A:A, ">=01/01/2026")')).toBe("62");
    expect(shown("=SWITCH(A1, DATE(2026, 10, 1), C1, 0)")).toBe("45");
  });

  it("shows functions that return numbers as numbers", () => {
    expect(shown("=MONTH(A1)")).toBe("10");
    expect(shown("=NETWORKDAYS(A1, B1)")).toBe("22");
    expect(shown("=COUNT(A:A)")).toBe("2");
  });

  it("formats a date with TEXT", () => {
    expect(evaluate('=TEXT(A1, "dddd, mmmm d, yyyy")')).toBe("Thursday, October 1, 2026");
    expect(evaluate('=TEXT(A1, "yyyy-mm-dd")')).toBe("2026-10-01");
  });
});
