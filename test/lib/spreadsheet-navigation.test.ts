/**
 * Unit tests for the spreadsheet style navigation helpers used by the admin
 * Link Building Orders table (arrow key movement, Tab wrapping, column
 * letters, cell addresses and the range Count / Sum / Average summary).
 */

import {
  computeRangeStats,
  formatDateMMDDYYYY,
  getTabPosition,
  insertTextAtSelection,
  isInsertDateShortcut,
  isPrintableKey,
  moveGridPosition,
  parseNumericCell,
  toCellAddress,
  toColumnLetter,
} from "@/lib/spreadsheet-navigation";

const size = { row_count: 5, col_count: 4 };

describe("moveGridPosition", () => {
  it("moves one cell in each direction", () => {
    const origin = { row_idx: 2, col_idx: 1 };
    expect(moveGridPosition(origin, "up", size)).toEqual({ row_idx: 1, col_idx: 1 });
    expect(moveGridPosition(origin, "down", size)).toEqual({ row_idx: 3, col_idx: 1 });
    expect(moveGridPosition(origin, "left", size)).toEqual({ row_idx: 2, col_idx: 0 });
    expect(moveGridPosition(origin, "right", size)).toEqual({ row_idx: 2, col_idx: 2 });
  });

  it("never leaves the grid", () => {
    expect(moveGridPosition({ row_idx: 0, col_idx: 0 }, "up", size)).toEqual({ row_idx: 0, col_idx: 0 });
    expect(moveGridPosition({ row_idx: 0, col_idx: 0 }, "left", size)).toEqual({ row_idx: 0, col_idx: 0 });
    expect(moveGridPosition({ row_idx: 4, col_idx: 3 }, "down", size)).toEqual({ row_idx: 4, col_idx: 3 });
    expect(moveGridPosition({ row_idx: 4, col_idx: 3 }, "right", size)).toEqual({ row_idx: 4, col_idx: 3 });
  });

  it("jumps to the edge with jump_to_edge", () => {
    const origin = { row_idx: 2, col_idx: 1 };
    expect(moveGridPosition(origin, "down", size, { jump_to_edge: true })).toEqual({ row_idx: 4, col_idx: 1 });
    expect(moveGridPosition(origin, "left", size, { jump_to_edge: true })).toEqual({ row_idx: 2, col_idx: 0 });
  });

  it("moves several cells with step and clamps the result", () => {
    expect(moveGridPosition({ row_idx: 1, col_idx: 0 }, "down", size, { step: 10 })).toEqual({ row_idx: 4, col_idx: 0 });
  });

  it("returns the same position for an empty grid", () => {
    const origin = { row_idx: 0, col_idx: 0 };
    expect(moveGridPosition(origin, "down", { row_count: 0, col_count: 4 })).toBe(origin);
  });
});

describe("getTabPosition", () => {
  it("moves right and wraps to the next row", () => {
    expect(getTabPosition({ row_idx: 0, col_idx: 1 }, false, size)).toEqual({ row_idx: 0, col_idx: 2 });
    expect(getTabPosition({ row_idx: 0, col_idx: 3 }, false, size)).toEqual({ row_idx: 1, col_idx: 0 });
  });

  it("moves left and wraps to the previous row with Shift+Tab", () => {
    expect(getTabPosition({ row_idx: 1, col_idx: 0 }, true, size)).toEqual({ row_idx: 0, col_idx: 3 });
  });

  it("stops at the grid corners", () => {
    expect(getTabPosition({ row_idx: 4, col_idx: 3 }, false, size)).toEqual({ row_idx: 4, col_idx: 3 });
    expect(getTabPosition({ row_idx: 0, col_idx: 0 }, true, size)).toEqual({ row_idx: 0, col_idx: 0 });
  });
});

describe("toColumnLetter / toCellAddress", () => {
  it("maps indexes to spreadsheet letters", () => {
    expect(toColumnLetter(0)).toBe("A");
    expect(toColumnLetter(25)).toBe("Z");
    expect(toColumnLetter(26)).toBe("AA");
    expect(toColumnLetter(27)).toBe("AB");
    expect(toColumnLetter(701)).toBe("ZZ");
    expect(toColumnLetter(702)).toBe("AAA");
  });

  it("builds a cell address", () => {
    expect(toCellAddress(1, 12)).toBe("B12");
  });
});

describe("isPrintableKey", () => {
  const base = { ctrlKey: false, metaKey: false, altKey: false };

  it("accepts single characters and space", () => {
    expect(isPrintableKey({ ...base, key: "a" })).toBe(true);
    expect(isPrintableKey({ ...base, key: "7" })).toBe(true);
    expect(isPrintableKey({ ...base, key: " " })).toBe(true);
  });

  it("rejects named keys and shortcuts", () => {
    expect(isPrintableKey({ ...base, key: "ArrowDown" })).toBe(false);
    expect(isPrintableKey({ ...base, key: "Enter" })).toBe(false);
    expect(isPrintableKey({ ...base, key: "c", ctrlKey: true })).toBe(false);
    expect(isPrintableKey({ ...base, key: "v", metaKey: true })).toBe(false);
  });
});

describe("parseNumericCell / computeRangeStats", () => {
  it("parses plain and currency formatted numbers", () => {
    expect(parseNumericCell("42")).toBe(42);
    expect(parseNumericCell("$1,250.50")).toBe(1250.5);
    expect(parseNumericCell("-3.5")).toBe(-3.5);
    expect(parseNumericCell("DR 50+ External")).toBeNull();
    expect(parseNumericCell("")).toBeNull();
  });

  it("counts non-empty cells and sums the numeric ones", () => {
    expect(computeRangeStats(["10", "", "$20", "Live"])).toEqual({
      count: 3,
      numeric_count: 2,
      sum: 30,
      average: 15,
    });
  });

  it("returns a null average when nothing is numeric", () => {
    expect(computeRangeStats(["Live", " "]).average).toBeNull();
  });
});

describe("isInsertDateShortcut", () => {
  const base = { ctrlKey: false, metaKey: false, altKey: false };

  it("accepts Ctrl+; and Cmd+;, with or without Shift", () => {
    expect(isInsertDateShortcut({ ...base, key: ";", ctrlKey: true })).toBe(true);
    expect(isInsertDateShortcut({ ...base, key: ";", metaKey: true })).toBe(true);
    expect(isInsertDateShortcut({ ...base, key: ":", metaKey: true })).toBe(true);
  });

  it("rejects the plain key and other combinations", () => {
    expect(isInsertDateShortcut({ ...base, key: ";" })).toBe(false);
    expect(isInsertDateShortcut({ ...base, key: ";", ctrlKey: true, altKey: true })).toBe(false);
    expect(isInsertDateShortcut({ ...base, key: "c", ctrlKey: true })).toBe(false);
  });
});

describe("formatDateMMDDYYYY", () => {
  it("pads month and day", () => {
    expect(formatDateMMDDYYYY(new Date(2026, 0, 5))).toBe("01/05/2026");
    expect(formatDateMMDDYYYY(new Date(2026, 11, 31))).toBe("12/31/2026");
  });
});

describe("insertTextAtSelection", () => {
  it("inserts at the caret", () => {
    expect(insertTextAtSelection("Live ", 5, 5, "10/21/2026")).toEqual({ text: "Live 10/21/2026", caret: 15 });
  });

  it("replaces the selected text", () => {
    expect(insertTextAtSelection("01/01/2020", 0, 10, "10/21/2026")).toEqual({ text: "10/21/2026", caret: 10 });
  });

  it("clamps positions outside the text", () => {
    expect(insertTextAtSelection("ab", 9, 9, "x")).toEqual({ text: "abx", caret: 3 });
  });
});
