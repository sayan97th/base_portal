/**
 * The formulas of the client's Google Sheet (import/BASE_links.xlsx: "Current
 * Sheet", "Capacity Threshold", "Invoicing", "Data Validation Tab" and "Current
 * Clients"), rewritten for the columns of the Link Building Orders table. They
 * are what the team will type first, so each must give the value Sheets gives.
 *
 * The other tabs of the workbook (the link type table of "Data Validation Tab")
 * become array literals here, since the table is a single sheet.
 */

import { dateToSerial, formatScalar, type SheetColumn } from "@/lib/spreadsheet-formulas";
import { LINK_BUILDING_ORDER_COLUMNS, createTestSheet, errorCode } from "./sheet-fixture";

const COLUMNS: SheetColumn[] = [...LINK_BUILDING_ORDER_COLUMNS, { key: "formula_1", kind: "text" }]; // AE

const ROWS: Array<Record<string, string>> = [
  { order_id: "BL-1", status: "Live", link_type: "DA 30+ External", client: "Acme", request_date: "10/01/2026", estimated_delivery_date: "10/31/2026", partnership: "partner-a.com", dr_lbs: "45", current_price: "150", final_price: "172.5" },
  { order_id: "BL-2", status: "Approved", link_type: "Express Link", client: "Globex", request_date: "10/15/2026", estimated_delivery_date: "10/22/2026", partnership: "partner-b.com", dr_lbs: "62", current_price: "400", final_price: "500" },
  { order_id: "BL-3", status: "New Request", link_type: "Organic External", client: "Acme", request_date: "", estimated_delivery_date: "", partnership: "", dr_lbs: "", current_price: "", final_price: "" },
  { order_id: "BL-4", status: "Live", link_type: "DA 50+ External", client: "Initech", request_date: "07/10/2026", estimated_delivery_date: "08/14/2026", partnership: "partner-a.com", dr_lbs: "55", current_price: "300", final_price: "345" },
  { order_id: "BL-5", status: "Approved", link_type: "DA 30+ External", client: "Acme", request_date: "10/20/2026", estimated_delivery_date: "11/19/2026", partnership: "partner-c.com", dr_lbs: "30", current_price: "120", final_price: "138" },
  { order_id: "BL-6", status: "Live", link_type: "Custom", client: "Umbrella", request_date: "05/01/2026", estimated_delivery_date: "05/31/2026", partnership: "partner-b.com", dr_lbs: "20", current_price: "90", final_price: "100" },
];

/** Link type, turnaround days, price multiplier, fixed fee (1) or not (0). */
const LINK_TYPES =
  '{"Organic External",30,1.15,0;"DA 30+ External",30,1.15,0;"DA 50+ External",35,1.15,0;"Express Link",7,1,1}';

const { evaluate, evaluateResult } = createTestSheet({ columns: COLUMNS, rows: ROWS });

/** Evaluates a formula written for row 1 on every row, like a column dragged down. */
function fillDown(formula: string): unknown[] {
  const { valueAt } = createTestSheet({ columns: COLUMNS, rows: ROWS, column_formulas: { AE: formula } });
  return ROWS.map((_, idx) => {
    const value = valueAt(`AE${idx + 1}`);
    return errorCode(value) ?? value;
  });
}

describe('"Current Sheet" formulas', () => {
  it("computes the delivery date from the request date and the link type turnaround", () => {
    const formula = `=IF(NOT(ISBLANK(K1)), K1+VLOOKUP(D1, ${LINK_TYPES}, 2, false), "")`;
    const result = evaluateResult(formula, 1);
    expect(result.format).toBe("date");
    expect(formatScalar(result.value, result.format)).toBe("10/31/2026");
    // An unknown link type is #N/A, exactly as the client's sheet shows it.
    expect(fillDown(formula)).toEqual([
      dateToSerial(new Date(2026, 9, 31)),
      dateToSerial(new Date(2026, 9, 22)),
      "",
      dateToSerial(new Date(2026, 7, 14)),
      dateToSerial(new Date(2026, 10, 19)),
      "#N/A",
    ]);
  });

  it("counts the days left until delivery", () => {
    expect(fillDown('=IF(NOT(ISBLANK(L1)), L1-TODAY(), "")')).toEqual([10, 1, "", -68, 29, -143]);
  });

  it("computes the share of the turnaround left", () => {
    expect(evaluate('=IF(NOT(ISBLANK(K1)), (L1-TODAY())/(L1-K1), "")', 1)).toBeCloseTo(10 / 30);
    expect(evaluate('=IF(NOT(ISBLANK(K3)), (L3-TODAY())/(L3-K3), "")', 3)).toBe("");
  });

  it("reads the request month, written in lowercase like the client's sheet", () => {
    expect(fillDown('=iferror(if(K1="","",MONTH(K1)),"")')).toEqual([10, 10, "", 7, 10, 5]);
  });

  it("looks the month name up, empty when it is missing", () => {
    const months = '{7,"July";8,"August";9,"September";10,"October"}';
    expect(fillDown(`=iferror(VLOOKUP(MONTH(K1), ${months}, 2, false), "")`)).toEqual([
      "October",
      "October",
      "",
      "July",
      "October",
      "",
    ]);
  });

  it("only marks up the price of link types without a fixed fee", () => {
    const formula = `=IF(K1<>"", IF(VLOOKUP(D1, ${LINK_TYPES}, 4, false)=1, X1, X1*VLOOKUP(D1, ${LINK_TYPES}, 3, false)), "")`;
    const values = fillDown(formula);
    expect(values[0]).toBeCloseTo(172.5);
    expect(values[1]).toBe(400);
    expect(values[2]).toBe("");
    expect(values[5]).toBe("#N/A");
  });

  it("only looks up DA link types, matched with REGEXMATCH", () => {
    expect(fillDown(`=IFERROR(IF(REGEXMATCH(D1, "DA"), VLOOKUP(D1, ${LINK_TYPES}, 2, false), ""), "")`)).toEqual([
      30,
      "",
      "",
      35,
      30,
      "",
    ]);
  });

  it("checks capacity with IFS and an approximate VLOOKUP on the DR", () => {
    const formula =
      '=IFERROR(IF(K1<>"", IFS(D1="Express Link", "Rush", REGEXMATCH(D1, "DA"), VLOOKUP(S1, {0,"Low";30,"Mid";50,"High"}, 2)), ""), "Verify Capacity w/ Teams")';
    expect(fillDown(formula)).toEqual(["Mid", "Rush", "", "High", "Mid", "Verify Capacity w/ Teams"]);
  });

  it("reads the previous price paid to the same partner", () => {
    const formula = '=IFERROR(VLOOKUP(N4, $N$1:$X$3, 11, FALSE), "New partner")';
    expect(evaluate(formula, 4)).toBe(150);
    expect(evaluate('=IFERROR(VLOOKUP(N5, $N$1:$X$4, 11, FALSE), "New partner")', 5)).toBe("New partner");
  });
});

describe('"Invoicing" formulas', () => {
  it("adds the final prices of a client", () => {
    expect(evaluate("=SUMIF(E:E, E1, AA:AA)", 1)).toBeCloseTo(310.5);
    expect(evaluate('=SUMIF(E:E, "globex", AA:AA)')).toBe(500);
  });

  it("computes the margin of a client", () => {
    expect(evaluate("=SUMIF(E:E, E1, AA:AA) - SUMIF(E:E, E1, X:X)", 1)).toBeCloseTo(40.5);
  });

  it("counts the orders of a client by link type, with mixed absolute references", () => {
    expect(evaluate("=COUNTIFS($E:$E, $E1, $D:$D, D1)", 1)).toBe(2);
    expect(evaluate("=COUNTIFS($E:$E, $E4, $D:$D, D4)", 4)).toBe(1);
  });

  it("builds the invoice summary line", () => {
    expect(evaluate('=CONCATENATE("Team ", E1, " (", D1, "-", COUNTIFS($E:$E, $E1, $D:$D, D1), ")")', 1)).toBe(
      "Team Acme (DA 30+ External-2)"
    );
  });

  it("totals a whole column and lists the clients once", () => {
    expect(evaluate("=sum(AA:AA)")).toBeCloseTo(1255.5);
    expect(evaluate("=ROWS(UNIQUE(E:E))")).toBe(4);
    expect(evaluate('=TEXTJOIN(", ", TRUE, UNIQUE(E:E))')).toBe("Acme, Globex, Initech, Umbrella");
  });
});

describe('"Capacity Threshold" and "Data Validation Tab" formulas', () => {
  it("counts the orders still to deliver", () => {
    expect(evaluate('=COUNTIF($L$1:L6, ">="&TODAY())', 6)).toBe(3);
    expect(evaluate('=IF(COUNTIF(L:L, ">="&TODAY())>2, "Over Capacity", "Within Capacity")')).toBe("Over Capacity");
  });

  it("counts the working days of the current month", () => {
    expect(evaluate("=NETWORKDAYS(eomonth(today(),-1)+1, eomonth(today(),0))")).toBe(22);
  });

  it("averages the orders per working day", () => {
    expect(evaluate("=COUNTA(A:A)/NETWORKDAYS(EOMONTH(TODAY(),-1)+1, EOMONTH(TODAY(),0))")).toBeCloseTo(6 / 22);
  });

  it("looks today up in a dated table, #N/A when today is missing", () => {
    expect(errorCode(evaluate("=VLOOKUP(TODAY(), K:S, 9, false)"))).toBe("#N/A");
    expect(evaluate("=VLOOKUP(TODAY()-1, K:S, 9, false)")).toBe(30);
  });
});

describe('"Current Clients" formulas', () => {
  it("reads the last request date of a client with a reverse XLOOKUP", () => {
    const result = evaluateResult('=XLOOKUP(E1, E:E, K:K, "", 0, -1)', 1);
    expect(result.format).toBe("date");
    expect(formatScalar(result.value, result.format)).toBe("10/20/2026");
  });

  it("lists the clients with a request in the last three months", () => {
    expect(evaluate('=TEXTJOIN(", ", TRUE, SORT(UNIQUE(FILTER(E:E, E:E<>"", K:K>=EDATE(TODAY(),-3)))))')).toBe(
      "Acme, Globex"
    );
  });
});

describe("status and pricing helpers", () => {
  it("counts orders by status", () => {
    expect(evaluate('=COUNTIF(B:B, "Live")')).toBe(3);
    expect(evaluate('=COUNTIFS(B:B, "Approved", K:K, ">=10/01/2026")')).toBe(2);
  });

  it("averages the DR of live orders", () => {
    expect(evaluate('=AVERAGEIF(B:B, "Live", S:S)')).toBeCloseTo((45 + 55 + 20) / 3);
  });

  it("rounds a marked up price", () => {
    expect(evaluate("=ROUND(X1*1.15, 2)", 1)).toBe(172.5);
    expect(evaluate("=ROUNDUP(X4*1.17, 0)", 4)).toBe(351);
  });
});
