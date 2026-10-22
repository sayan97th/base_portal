/**
 * The glue between the Link Building Orders table and the formula engine: which
 * cells may hold a formula, how the loaded rows become a sheet, how results are
 * written back into typed columns, and which formula cells need saving again.
 */

import * as fs from "fs";
import * as path from "path";
import {
  FORMULA_CELL_COLUMN_KEYS,
  SUMMARY_ROW_ID,
  buildOrdersSheet,
  collectStaleFormulaCells,
  createColumnKeyMapper,
  getCellFormula,
  isFormulaColumnKey,
  toFieldValue,
  withCellFormula,
  type OrdersSheetConfig,
} from "@/lib/link-building-sheet";
import { FormulaError, toStoredFormula, type SheetColumnKind } from "@/lib/spreadsheet-formulas";
import type { LinkBuildingOrderRow } from "@/types/admin/link-building-order";
import { LINK_BUILDING_ORDER_COLUMNS } from "./spreadsheet-formulas/sheet-fixture";

function makeRow(overrides: Partial<LinkBuildingOrderRow> = {}): LinkBuildingOrderRow {
  return {
    id: "uuid-1",
    order_id: "BL-1",
    team_specific_link_id: "",
    link_type: "DA 30+ External",
    client: "Acme",
    keyword: "seo tools",
    landing_page: "https://acme.com",
    exact_match: "No",
    notes: "",
    internal_notes: "",
    request_date: "10/01/2026",
    estimated_delivery_date: "",
    estimated_turnaround_days: "",
    link_builder: "",
    pen_name: "",
    partnership: "",
    partnership_check: "",
    article_title: "",
    article: "",
    status: "New Request",
    live_link: "",
    live_link_date: "",
    dr_lbs: "40",
    posting_fee_lbs: "",
    current_traffic: "",
    dr_formula: "",
    current_poc: "",
    current_price: "100",
    lb_tl_approval: "",
    approval_date: "",
    final_price: "",
    currency: "USD",
    user_id: null,
    admin_team_id: null,
    assigned_admin_user_id: null,
    cell_formulas: null,
    ...overrides,
  };
}

const COLUMNS = [...LINK_BUILDING_ORDER_COLUMNS, { key: "formula_7", kind: "text" as const }];
const mapper = createColumnKeyMapper(COLUMNS);
const KIND_BY_KEY = new Map<string, SheetColumnKind>(COLUMNS.map((column) => [column.key, column.kind]));

/** A1 formula typed on the given row, in the stored notation saved with the row. */
const stored = (formula: string, row_number = 1) => toStoredFormula(formula, row_number, mapper);

function config(overrides: Partial<OrdersSheetConfig> = {}): OrdersSheetConfig {
  return {
    columns: COLUMNS,
    column_formulas: new Map(),
    row_number_offset: 1,
    getAssignmentText: (row, col_key) => {
      if (col_key === "user_id") return row.user_id === 5 ? "Acme Inc." : "";
      if (col_key === "assigned_admin_user_id") return row.assigned_admin_user_id === 9 ? "Ana Admin" : "";
      return null;
    },
    ...overrides,
  };
}

describe("formula cell columns", () => {
  it("match the columns the API accepts formulas for", () => {
    const model_path = path.resolve(__dirname, "../../../base_clients_api/app/Models/LinkBuildingOrderPlacement.php");
    if (!fs.existsSync(model_path)) return;
    const source = fs.readFileSync(model_path, "utf8");
    const match = /FORMULA_COLUMNS\s*=\s*\[([\s\S]*?)\];/.exec(source);
    expect(match).not.toBeNull();
    const backend_keys = [...match![1].matchAll(/'([a-z0-9_]+)'/g)].map((key_match) => key_match[1]).sort();
    expect([...FORMULA_CELL_COLUMN_KEYS].sort()).toEqual(backend_keys);
  });

  it("leave out the columns that only take fixed values", () => {
    for (const key of ["status", "exact_match", "currency", "order_id", "landing_page", "live_link", "link_type"]) {
      expect(FORMULA_CELL_COLUMN_KEYS.has(key)).toBe(false);
    }
  });

  it("recognize formula column keys", () => {
    expect(isFormulaColumnKey("formula_12")).toBe(true);
    expect(isFormulaColumnKey("formula_")).toBe(false);
    expect(isFormulaColumnKey("formula_x")).toBe(false);
    expect(isFormulaColumnKey("final_price")).toBe(false);
    expect(SUMMARY_ROW_ID).toBe("__summary__");
  });
});

describe("getCellFormula and withCellFormula", () => {
  it("reads a cell's formula only for columns that can hold one", () => {
    const row = makeRow({ cell_formulas: { final_price: "=[current_price:~0]*2", status: "=1" } });
    expect(getCellFormula(row, "final_price")).toBe("=[current_price:~0]*2");
    expect(getCellFormula(row, "status")).toBeNull();
    expect(getCellFormula(row, "notes")).toBeNull();
    expect(getCellFormula(makeRow(), "final_price")).toBeNull();
  });

  it("sets, replaces and removes a formula without changing the original map", () => {
    const original = { notes: "=1" };
    expect(withCellFormula(original, "final_price", "=2")).toEqual({ notes: "=1", final_price: "=2" });
    expect(withCellFormula(original, "notes", "=3")).toEqual({ notes: "=3" });
    expect(withCellFormula(original, "notes", null)).toBeNull();
    expect(withCellFormula(null, "notes", null)).toBeNull();
    expect(withCellFormula(undefined, "notes", "=4")).toEqual({ notes: "=4" });
    expect(original).toEqual({ notes: "=1" });
  });
});

describe("toFieldValue", () => {
  it("saves dates as MM/DD/YYYY in date columns, and never an error code", () => {
    expect(toFieldValue({ value: 46316, format: "date" }, "date")).toBe("10/21/2026");
    expect(toFieldValue({ value: 46316, format: null }, "date")).toBe("10/21/2026");
    expect(toFieldValue({ value: new FormulaError("#N/A"), format: null }, "date")).toBe("");
    expect(toFieldValue({ value: "TBD", format: null }, "date")).toBe("TBD");
    expect(toFieldValue({ value: null, format: null }, "date")).toBe("");
  });

  it("saves numbers without float noise", () => {
    expect(toFieldValue({ value: 0.1 + 0.2, format: null }, "number")).toBe("0.3");
    expect(toFieldValue({ value: 115.00000000000001, format: null }, "number")).toBe("115");
  });

  it("saves text columns as the cell shows them", () => {
    expect(toFieldValue({ value: 46316, format: "date" }, "text")).toBe("10/21/2026");
    expect(toFieldValue({ value: 46316, format: null }, "text")).toBe("46316");
    expect(toFieldValue({ value: true, format: null }, "text")).toBe("TRUE");
    expect(toFieldValue({ value: new FormulaError("#N/A"), format: null }, "text")).toBe("#N/A");
    expect(toFieldValue({ value: new FormulaError("#DIV/0!"), format: null }, "number")).toBe("#DIV/0!");
  });
});

describe("createColumnKeyMapper", () => {
  it("maps letters to keys and back", () => {
    expect(mapper.getColumnKey(18)).toBe("dr_lbs");
    expect(mapper.getColumnIndex("final_price")).toBe(26);
    expect(mapper.getColumnIndex("formula_7")).toBe(30);
    expect(mapper.getColumnKey(99)).toBeNull();
    expect(mapper.getColumnIndex("unknown")).toBeNull();
  });
});

describe("buildOrdersSheet", () => {
  it("reads the row fields and the names of assignment cells", () => {
    const rows = [makeRow({ user_id: 5, assigned_admin_user_id: 9 }), makeRow({ id: "uuid-2", order_id: "BL-2" })];
    const sheet = buildOrdersSheet(rows, config());
    expect(sheet.getValue(0, "dr_lbs")).toBe(40);
    expect(sheet.getValue(0, "user_id")).toBe("Acme Inc.");
    expect(sheet.getValue(0, "assigned_admin_user_id")).toBe("Ana Admin");
    expect(sheet.getValue(1, "user_id")).toBeNull();
    expect(sheet.evaluate(stored('=AC1 & " / " & AD1'), 0).value).toBe("Acme Inc. / Ana Admin");
  });

  it("evaluates cell formulas and formula columns", () => {
    const rows = [
      makeRow({ cell_formulas: { final_price: stored("=X1*1.15") } }),
      makeRow({ id: "uuid-2", current_price: "200", cell_formulas: { final_price: stored("=X2*1.15", 2) } }),
    ];
    const sheet = buildOrdersSheet(rows, config({ column_formulas: new Map([["formula_7", stored("=AA1-X1")]]) }));
    expect(sheet.getValue(0, "final_price")).toBeCloseTo(115);
    expect(sheet.getValue(1, "final_price")).toBeCloseTo(230);
    expect(sheet.getValue(1, "formula_7")).toBeCloseTo(30);
  });

  it("evaluates a VLOOKUP across the loaded orders", () => {
    const rows = [
      makeRow({ id: "uuid-1", order_id: "BL-1", partnership: "partner-a.com", current_price: "150" }),
      makeRow({ id: "uuid-2", order_id: "BL-2", partnership: "partner-b.com", current_price: "90" }),
      makeRow({
        id: "uuid-3",
        order_id: "BL-3",
        partnership: "partner-a.com",
        current_price: "",
        cell_formulas: { current_price: stored('=IFERROR(VLOOKUP(N3, N1:X2, 11, FALSE), "")', 3) },
      }),
    ];
    const sheet = buildOrdersSheet(rows, config());
    expect(sheet.getValue(2, "current_price")).toBe(150);
  });

  it("lets an override replace or remove a cell's formula, keyed by row id", () => {
    const rows = [makeRow({ cell_formulas: { notes: stored("=F1") } })];
    const replaced = buildOrdersSheet(rows, config(), new Map([["uuid-1:notes", stored("=UPPER(F1)")]]));
    expect(replaced.getValue(0, "notes")).toBe("SEO TOOLS");
    const removed = buildOrdersSheet(rows, config(), new Map([["uuid-1:notes", null]]));
    expect(removed.getFormulaResult(0, "notes")).toBeNull();
  });

  it("ignores formulas saved on columns that cannot hold one", () => {
    const rows = [makeRow({ status: "Live", cell_formulas: { status: "=1+1" } })];
    expect(buildOrdersSheet(rows, config()).getValue(0, "status")).toBe("Live");
  });
});

describe("collectStaleFormulaCells", () => {
  it("lists formula cells whose saved value differs from the computed one", () => {
    const rows = [
      makeRow({ final_price: "$115.00", cell_formulas: { final_price: stored("=X1*1.15") } }),
      makeRow({ id: "uuid-2", current_price: "200", final_price: "$115.00", cell_formulas: { final_price: stored("=X2*1.15", 2) } }),
    ];
    const sheet = buildOrdersSheet(rows, config());
    expect(collectStaleFormulaCells(rows, sheet, KIND_BY_KEY)).toEqual([
      { row_id: "uuid-2", col_key: "final_price", value: "$230.00" },
    ]);
  });

  it("saves prices with the currency symbol of their row", () => {
    const rows = [makeRow({ currency: "EUR", final_price: "", cell_formulas: { final_price: stored("=X1*1.5") } })];
    const sheet = buildOrdersSheet(rows, config());
    expect(collectStaleFormulaCells(rows, sheet, KIND_BY_KEY)).toEqual([
      { row_id: "uuid-1", col_key: "final_price", value: "€150.00" },
    ]);
  });

  it("saves dates in date columns as MM/DD/YYYY", () => {
    const rows = [
      makeRow({ estimated_delivery_date: "", cell_formulas: { estimated_delivery_date: stored("=K1+30") } }),
    ];
    const sheet = buildOrdersSheet(rows, config());
    expect(collectStaleFormulaCells(rows, sheet, KIND_BY_KEY)).toEqual([
      { row_id: "uuid-1", col_key: "estimated_delivery_date", value: "10/31/2026" },
    ]);
  });

  it("saves an empty date instead of an error, and the error code in a text column", () => {
    const rows = [
      makeRow({
        estimated_delivery_date: "10/31/2026",
        notes: "",
        cell_formulas: {
          estimated_delivery_date: stored('=K1+VLOOKUP(D1, {"Express Link",7}, 2, FALSE)'),
          notes: stored('=VLOOKUP(D1, {"Express Link",7}, 2, FALSE)'),
        },
      }),
    ];
    const sheet = buildOrdersSheet(rows, config());
    expect(collectStaleFormulaCells(rows, sheet, KIND_BY_KEY)).toEqual([
      { row_id: "uuid-1", col_key: "estimated_delivery_date", value: "" },
      { row_id: "uuid-1", col_key: "notes", value: "#N/A" },
    ]);
  });

  it("skips rows without formulas, columns that cannot hold one and filtered cells", () => {
    const rows = [
      makeRow({ cell_formulas: { status: "=1", final_price: stored("=X1*2") } }),
      makeRow({ id: "uuid-2" }),
    ];
    const sheet = buildOrdersSheet(rows, config());
    expect(collectStaleFormulaCells(rows, sheet, KIND_BY_KEY)).toEqual([
      { row_id: "uuid-1", col_key: "final_price", value: "$200.00" },
    ]);
    expect(collectStaleFormulaCells(rows, sheet, KIND_BY_KEY, () => false)).toEqual([]);
  });

  it("refreshes a lookup when the looked up row changes", () => {
    const formula = stored("=VLOOKUP(A2, A1:X1, 24, FALSE)", 2);
    const rows = [
      makeRow({ id: "uuid-1", order_id: "BL-1", current_price: "175" }),
      makeRow({ id: "uuid-2", order_id: "BL-1", current_price: "150", cell_formulas: { current_price: formula } }),
    ];
    const sheet = buildOrdersSheet(rows, config());
    expect(collectStaleFormulaCells(rows, sheet, KIND_BY_KEY)).toEqual([
      { row_id: "uuid-2", col_key: "current_price", value: "$175.00" },
    ]);
  });
});
