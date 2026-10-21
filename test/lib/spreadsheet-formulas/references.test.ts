/**
 * Conversion between the A1 notation people type and the stored notation saved
 * with a formula (column keys and row offsets), which keeps saved formulas
 * pointing at the same data when columns move or rows are sorted.
 */

import {
  findReferences,
  rewriteReferences,
  toA1Range,
  toDisplayFormula,
  toStoredFormula,
  type ColumnKeyMapper,
} from "@/lib/spreadsheet-formulas";
import { LINK_BUILDING_ORDER_COLUMNS, createColumnMapper } from "./sheet-fixture";

const mapper = createColumnMapper(LINK_BUILDING_ORDER_COLUMNS);

describe("toStoredFormula", () => {
  it("stores relative rows as offsets from the formula's row", () => {
    expect(toStoredFormula("=S5*2", 5, mapper)).toBe("=[dr_lbs:~0]*2");
    expect(toStoredFormula("=S4+S6", 5, mapper)).toBe("=[dr_lbs:~-1]+[dr_lbs:~1]");
  });

  it("keeps absolute rows and columns", () => {
    expect(toStoredFormula("=$S$1", 5, mapper)).toBe("=[$dr_lbs:$1]");
    expect(toStoredFormula("=$S1", 5, mapper)).toBe("=[$dr_lbs:~-4]");
    expect(toStoredFormula("=S$1", 5, mapper)).toBe("=[dr_lbs:$1]");
  });

  it("stores ranges, whole columns and whole rows", () => {
    expect(toStoredFormula("=SUM(S2:AA3)", 2, mapper)).toBe("=SUM([dr_lbs:~0]:[final_price:~1])");
    expect(toStoredFormula("=SUM(AA:AA)", 2, mapper)).toBe("=SUM([final_price]:[final_price])");
    expect(toStoredFormula("=SUM(S2:S)", 2, mapper)).toBe("=SUM([dr_lbs:~0]:[dr_lbs])");
    expect(toStoredFormula("=SUM(2:3)", 2, mapper)).toBe("=SUM([*:~0]:[*:~1])");
  });

  it("stores a VLOOKUP with every kind of reference", () => {
    expect(toStoredFormula('=IFERROR(VLOOKUP(D7, $D$1:$AA$50, 24, FALSE), "")', 7, mapper)).toBe(
      '=IFERROR(VLOOKUP([link_type:~0], [$link_type:$1]:[$final_price:$50], 24, FALSE), "")'
    );
  });

  it("leaves text, function names and spacing untouched", () => {
    expect(toStoredFormula('=CONCATENATE("A1 ", S1)  &  LOG10(S1)', 1, mapper)).toBe(
      '=CONCATENATE("A1 ", [dr_lbs:~0])  &  LOG10([dr_lbs:~0])'
    );
  });

  it("turns references to missing columns and to row 0 into #REF!", () => {
    expect(toStoredFormula("=ZZ1+1", 1, mapper)).toBe("=#REF!+1");
    expect(toStoredFormula("=S0", 1, mapper)).toBe("=#REF!");
    expect(toStoredFormula("=SUM(S0:S3)", 1, mapper)).toBe("=SUM(#REF!)");
  });

  it("leaves a formula already in the stored notation as it is", () => {
    expect(toStoredFormula("=[dr_lbs:~0]*2", 3, mapper)).toBe("=[dr_lbs:~0]*2");
  });
});

describe("toDisplayFormula", () => {
  it("shows a stored formula for the row it is displayed on", () => {
    const stored = toStoredFormula("=IF(S2>40, AA2*$S$1, SUM(S:S))", 2, mapper);
    expect(toDisplayFormula(stored, 2, mapper)).toBe("=IF(S2>40, AA2*$S$1, SUM(S:S))");
    expect(toDisplayFormula(stored, 51, mapper)).toBe("=IF(S51>40, AA51*$S$1, SUM(S:S))");
  });

  it("shows #REF! for rows above the first one", () => {
    expect(toDisplayFormula("=[dr_lbs:~-1]", 1, mapper)).toBe("=#REF!");
    expect(toDisplayFormula("=[dr_lbs:~-1]", 2, mapper)).toBe("=S1");
  });

  it("follows a column to its new letter, and shows #REF! once it is removed", () => {
    const stored = toStoredFormula("=VLOOKUP(D1, D:AA, 24, FALSE)", 1, mapper);
    const moved: ColumnKeyMapper = {
      getColumnKey: () => null,
      getColumnIndex: (col_key) => ({ link_type: 0, final_price: 3 })[col_key] ?? null,
    };
    expect(toDisplayFormula(stored, 1, moved)).toBe("=VLOOKUP(A1, A:D, 24, FALSE)");
    expect(toDisplayFormula(stored, 1, { ...moved, getColumnIndex: () => null })).toBe(
      "=VLOOKUP(#REF!, #REF!, 24, FALSE)"
    );
  });

  it("round trips every formula of the client's sheet", () => {
    for (const formula of [
      '=IF(NOT(ISBLANK(K2)),K2+VLOOKUP(D2,$D$1:$AA$36,3,false),"")',
      '=iferror(if(K2="","",MONTH(K2)),"")',
      "=COUNTIFS($E:$E,$E2,$D:$D,D2)",
      '=XLOOKUP(E2, E:E, K:K, "", 0, -1)',
      "=SUM(S2:AA2)",
    ]) {
      expect(toDisplayFormula(toStoredFormula(formula, 2, mapper), 2, mapper)).toBe(formula);
    }
  });
});

describe("reference helpers", () => {
  it("rewrites every reference with a callback", () => {
    expect(rewriteReferences("=A1+SUM(B2:C3)", () => "X")).toBe("=X+SUM(X)");
  });

  it("finds references in both notations with their positions", () => {
    expect(findReferences("=[dr_lbs:~0]+B2").map((match) => [match.start, match.end])).toEqual([
      [1, 12],
      [13, 15],
    ]);
  });

  it("builds the A1 text of a clicked cell or dragged range", () => {
    expect(toA1Range({ col_idx: 18, row_number: 4 }, null)).toBe("S4");
    expect(toA1Range({ col_idx: 18, row_number: 4 }, { col_idx: 18, row_number: 4 })).toBe("S4");
    expect(toA1Range({ col_idx: 26, row_number: 9 }, { col_idx: 18, row_number: 2 })).toBe("S2:AA9");
  });
});
