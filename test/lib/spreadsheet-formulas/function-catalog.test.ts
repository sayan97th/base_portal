/**
 * The function catalog (autocomplete, argument hints and the Functions panel) and
 * a robustness sweep over every supported function: whatever arguments a user
 * types, a formula must evaluate to a value or an error, never throw.
 */

import {
  EVALUATOR_FUNCTION_NAMES,
} from "@/lib/spreadsheet-formulas/functions";
import {
  FUNCTION_CATEGORIES,
  FormulaError,
  VOLATILE_FUNCTION_NAMES,
  formatFunctionSignature,
  getFormulaFunction,
  getFunctionCatalog,
  getFunctionInfo,
  getSupportedFunctionNames,
  parseFormula,
  suggestFunctions,
  type Scalar,
} from "@/lib/spreadsheet-formulas";
import { LINK_BUILDING_ORDER_COLUMNS, createTestSheet } from "./sheet-fixture";

const ROWS: Array<Record<string, string>> = [
  { order_id: "BL-1", status: "Live", link_type: "DA 30+ External", client: "Acme", keyword: "seo tools", request_date: "10/01/2026", estimated_delivery_date: "10/31/2026", dr_lbs: "45", current_traffic: "1200", current_price: "150", final_price: "172.5", currency: "USD" },
  { order_id: "BL-2", status: "Approved", link_type: "Express Link", client: "Globex", keyword: "ppc", request_date: "10/15/2026", estimated_delivery_date: "", dr_lbs: "", current_traffic: "", current_price: "400", final_price: "", currency: "EUR" },
  { order_id: "BL-3", status: "New Request", link_type: "", client: "", keyword: "", request_date: "", estimated_delivery_date: "", dr_lbs: "70", current_traffic: "50", current_price: "", final_price: "80", currency: "" },
];

const { evaluate } = createTestSheet({ columns: LINK_BUILDING_ORDER_COLUMNS, rows: ROWS });

function isValidScalar(value: Scalar): boolean {
  if (value === null || value instanceof FormulaError) return true;
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" || typeof value === "boolean";
}

describe("function catalog", () => {
  const catalog = getFunctionCatalog();

  it("lists every supported function once, sorted by name", () => {
    const names = catalog.map((info) => info.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual([...names].sort());
    expect(names).toEqual(getSupportedFunctionNames());
  });

  it("can evaluate every function it lists", () => {
    const special_forms = new Set<string>(EVALUATOR_FUNCTION_NAMES);
    const missing = catalog.filter((info) => !special_forms.has(info.name) && !getFormulaFunction(info.name));
    expect(missing.map((info) => info.name)).toEqual([]);
  });

  it("puts every function in a known category, with a description and arguments", () => {
    for (const info of catalog) {
      expect(FUNCTION_CATEGORIES).toContain(info.category);
      expect(info.description.length).toBeGreaterThan(0);
      expect(Array.isArray(info.args)).toBe(true);
    }
  });

  it("documents the functions the Link Building sheet relies on", () => {
    for (const name of ["VLOOKUP", "HLOOKUP", "XLOOKUP", "MATCH", "INDEX", "IF", "IFERROR", "IFNA", "IFS", "SUMIF", "COUNTIFS", "REGEXMATCH", "TODAY", "NETWORKDAYS", "EOMONTH", "UNIQUE", "FILTER", "SORT", "CONCATENATE"]) {
      const info = getFunctionInfo(name);
      expect(info).toBeDefined();
      expect(info!.args).not.toEqual(["..."]);
    }
  });

  it("gives every example a valid formula that evaluates without throwing", () => {
    const failures: string[] = [];
    for (const info of catalog) {
      if (!info.example) continue;
      try {
        parseFormula(`=${info.example}`);
        if (!isValidScalar(evaluate(`=${info.example}`, 2))) failures.push(`${info.name}: invalid result`);
      } catch (error) {
        failures.push(`${info.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("formats a signature with optional arguments in brackets", () => {
    expect(formatFunctionSignature(getFunctionInfo("VLOOKUP")!)).toBe("VLOOKUP(search_key, range, index, [is_sorted])");
    expect(formatFunctionSignature(getFunctionInfo("TODAY")!)).toBe("TODAY()");
  });

  it("finds a function without regard to case, and accepts legacy spellings", () => {
    expect(getFunctionInfo("vlookup")?.name).toBe("VLOOKUP");
    expect(getFunctionInfo("NOSUCHFUNCTION")).toBeUndefined();
    expect(getFormulaFunction("stdev")).toBeDefined();
    expect(getFormulaFunction("STDEV.S")).toBeDefined();
  });

  it("lists the volatile functions", () => {
    for (const name of VOLATILE_FUNCTION_NAMES) expect(getFunctionInfo(name)).toBeDefined();
  });
});

describe("suggestFunctions", () => {
  it("suggests nothing for an empty prefix", () => {
    expect(suggestFunctions("")).toEqual([]);
  });

  it("suggests names starting with the prefix, documented and shorter ones first", () => {
    const names = suggestFunctions("vl").map((info) => info.name);
    expect(names[0]).toBe("VLOOKUP");
    expect(suggestFunctions("if").map((info) => info.name).slice(0, 4)).toEqual(["IF", "IFS", "IFNA", "IFERROR"]);
    expect(suggestFunctions("x").every((info) => info.name.startsWith("X"))).toBe(true);
  });

  it("respects the limit", () => {
    expect(suggestFunctions("s")).toHaveLength(8);
    expect(suggestFunctions("s", 3)).toHaveLength(3);
  });

  it("suggests nothing for an unknown prefix", () => {
    expect(suggestFunctions("zzz")).toEqual([]);
  });
});

describe("robustness of every function", () => {
  // Argument lists a user may type, valid or not, including errors, ranges and blanks.
  const ARGUMENT_SHAPES = [
    "",
    "1",
    "-1",
    "0",
    '"text"',
    '""',
    "TRUE",
    "S1",
    "S2",
    "S1:S3",
    "A1:E3",
    "K:K",
    "1/0",
    "NA()",
    "1, 2",
    '"a", 1, TRUE',
    "S1:S3, 2",
    "S1:S3, S1:S3",
    'E:E, "Acme", AA:AA',
    "{1,2;3,4}, 1, 1",
    "1, 2, 3, 4, 5, 6",
  ];

  it("returns a value or an error for any arguments, never throws", () => {
    const failures: string[] = [];
    for (const name of getSupportedFunctionNames()) {
      for (const args of ARGUMENT_SHAPES) {
        const formula = `=${name}(${args})`;
        try {
          const value = evaluate(formula, 2);
          if (!isValidScalar(value)) failures.push(`${formula} returned ${String(value)}`);
        } catch (error) {
          failures.push(`${formula} threw ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("never registers the CommonJS default export as functions", () => {
    expect(getSupportedFunctionNames().filter((name) => name.startsWith("DEFAULT."))).toEqual([]);
  });

  it("refuses to build huge arrays or texts instead of freezing the page", () => {
    expect((evaluate("=MUNIT(100000)") as FormulaError).code).toBe("#NUM!");
    expect((evaluate("=MUNIT(K1)") as FormulaError).code).toBe("#NUM!");
    expect(evaluate("=SUM(MUNIT(3))")).toBe(3);
    expect((evaluate("=EXPAND({1,2}, 100000, 100000)") as FormulaError).code).toBe("#NUM!");
    expect(evaluate("=ROWS(EXPAND({1,2}, 3, 2, 0))")).toBe(3);
    expect((evaluate('=REPT("abc", 1000000000)') as FormulaError).code).toBe("#VALUE!");
    expect(evaluate('=LEN(REPT("ab", 100))')).toBe(200);
  });

  it("never lets a function change a range other formulas read", () => {
    const { evaluate: evaluateShared } = createTestSheet({ columns: LINK_BUILDING_ORDER_COLUMNS, rows: ROWS });
    expect(evaluateShared("=SUM(S1:S3)")).toBe(115);
    // These library functions flatten their arguments in place.
    for (const name of ["AVERAGEA", "MAXA", "MINA", "STDEVA", "VARA", "GCD", "LCM", "NPV"]) {
      evaluateShared(`=${name}(S1:S3, 2)`);
    }
    expect(evaluateShared("=SUM(S1:S3)")).toBe(115);
    expect(evaluateShared("=ROWS(S1:S3)")).toBe(3);
    expect(evaluateShared("=ROWS(FLATTEN(S1:S3))")).toBe(3);
  });

  it("returns #NAME? for an unknown function", () => {
    const value = evaluate("=VLOKUP(1, A:B, 2)");
    expect(value).toBeInstanceOf(FormulaError);
    expect((value as FormulaError).code).toBe("#NAME?");
  });
});
