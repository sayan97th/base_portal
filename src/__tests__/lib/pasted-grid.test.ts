/**
 * Unit tests for the bulk copy/paste helpers used by the intake form tables.
 *
 * Clients paste multi-row, multi-column data copied from Excel/Google Sheets
 * (tab-separated cells, newline-separated rows) directly into a table cell.
 * These tests lock in the parsing and row-application behavior so the intake
 * tables (link building, new content, content optimization, content briefs)
 * stay consistent.
 */

import {
  applyPastedGridToRows,
  growRowsForPaste,
  isBulkPaste,
  parseBooleanCell,
  parsePastedGrid,
} from "@/lib/pasted-grid";

describe("parsePastedGrid", () => {
  it("splits a single cell into a 1x1 grid", () => {
    expect(parsePastedGrid("hello")).toEqual([["hello"]]);
  });

  it("splits tab-separated columns within a single row", () => {
    expect(parsePastedGrid("seo tips\thttps://example.com")).toEqual([
      ["seo tips", "https://example.com"],
    ]);
  });

  it("splits newline-separated rows", () => {
    expect(parsePastedGrid("row1\nrow2\nrow3")).toEqual([
      ["row1"],
      ["row2"],
      ["row3"],
    ]);
  });

  it("parses a full tab + newline grid, matching an Excel copy", () => {
    const text = "kw1\thttps://a.com\nkw2\thttps://b.com";
    expect(parsePastedGrid(text)).toEqual([
      ["kw1", "https://a.com"],
      ["kw2", "https://b.com"],
    ]);
  });

  it("normalizes Windows-style CRLF line endings", () => {
    const text = "kw1\thttps://a.com\r\nkw2\thttps://b.com";
    expect(parsePastedGrid(text)).toEqual([
      ["kw1", "https://a.com"],
      ["kw2", "https://b.com"],
    ]);
  });

  it("drops a single trailing empty line left by an Excel copy", () => {
    expect(parsePastedGrid("row1\trow2\n")).toEqual([["row1", "row2"]]);
  });

  it("trims whitespace around each cell", () => {
    expect(parsePastedGrid("  kw1  \t  https://a.com  ")).toEqual([
      ["kw1", "https://a.com"],
    ]);
  });
});

describe("isBulkPaste", () => {
  it("is false for a single cell", () => {
    expect(isBulkPaste([["hello"]])).toBe(false);
  });

  it("is true for multiple columns in one row", () => {
    expect(isBulkPaste([["a", "b"]])).toBe(true);
  });

  it("is true for multiple rows", () => {
    expect(isBulkPaste([["a"], ["b"]])).toBe(true);
  });
});

describe("parseBooleanCell", () => {
  it.each(["true", "TRUE", "yes", "Y", "1", "x", "exact"])(
    "treats %s as true",
    (value) => {
      expect(parseBooleanCell(value)).toBe(true);
    }
  );

  it.each(["false", "no", "n", "0", "", "maybe"])(
    "treats %s as false",
    (value) => {
      expect(parseBooleanCell(value)).toBe(false);
    }
  );
});

interface KeywordRow {
  keyword: string;
  landing_page: string;
  exact_match: boolean;
}

const KEYWORD_FIELD_ORDER: ReadonlyArray<keyof KeywordRow> = [
  "keyword",
  "landing_page",
  "exact_match",
];

function makeRows(count: number): KeywordRow[] {
  return Array.from({ length: count }, () => ({
    keyword: "",
    landing_page: "",
    exact_match: false,
  }));
}

describe("applyPastedGridToRows", () => {
  it("fills rows starting at the pasted cell, in column order", () => {
    const rows = makeRows(3);
    const grid = parsePastedGrid("kw1\thttps://a.com\nkw2\thttps://b.com");

    const { rows: next_rows, overflow_row_count } = applyPastedGridToRows(
      rows,
      0,
      0,
      KEYWORD_FIELD_ORDER,
      grid
    );

    expect(next_rows[0]).toMatchObject({ keyword: "kw1", landing_page: "https://a.com" });
    expect(next_rows[1]).toMatchObject({ keyword: "kw2", landing_page: "https://b.com" });
    expect(next_rows[2]).toMatchObject({ keyword: "", landing_page: "" });
    expect(overflow_row_count).toBe(0);
  });

  it("starts from the pasted row/column, leaving earlier rows and columns untouched", () => {
    const rows = makeRows(3);
    rows[0] = { keyword: "existing", landing_page: "https://keep.com", exact_match: false };
    const grid = parsePastedGrid("kw2\thttps://b.com");

    const { rows: next_rows } = applyPastedGridToRows(
      rows,
      1,
      0,
      KEYWORD_FIELD_ORDER,
      grid
    );

    expect(next_rows[0]).toEqual(rows[0]);
    expect(next_rows[1]).toMatchObject({ keyword: "kw2", landing_page: "https://b.com" });
  });

  it("pastes starting mid-row when the field index is offset", () => {
    const rows = makeRows(1);
    const grid = parsePastedGrid("https://only-landing.com");

    const { rows: next_rows } = applyPastedGridToRows(
      rows,
      0,
      1,
      KEYWORD_FIELD_ORDER,
      grid
    );

    expect(next_rows[0]).toMatchObject({ keyword: "", landing_page: "https://only-landing.com" });
  });

  it("reports overflow rows that don't fit and leaves the array length unchanged", () => {
    const rows = makeRows(2);
    const grid = parsePastedGrid("kw1\nkw2\nkw3\nkw4");

    const { rows: next_rows, overflow_row_count } = applyPastedGridToRows(
      rows,
      0,
      0,
      KEYWORD_FIELD_ORDER,
      grid
    );

    expect(next_rows).toHaveLength(2);
    expect(overflow_row_count).toBe(2);
  });

  it("applies a custom cell parser (e.g. boolean exact_match column)", () => {
    const rows = makeRows(1);
    const grid = parsePastedGrid("kw1\thttps://a.com\tyes");

    const { rows: next_rows } = applyPastedGridToRows(
      rows,
      0,
      0,
      KEYWORD_FIELD_ORDER,
      grid,
      (field, raw_value) => (field === "exact_match" ? parseBooleanCell(raw_value) : raw_value)
    );

    expect(next_rows[0]).toEqual({ keyword: "kw1", landing_page: "https://a.com", exact_match: true });
  });

  it("falls back to the current value when the custom parser can't match (e.g. an unrecognized select option)", () => {
    interface Row {
      primary_keyword: string;
      type_of_content: string;
    }
    const rows: Row[] = [{ primary_keyword: "", type_of_content: "Blog Article" }];
    const grid = parsePastedGrid("kw1\tNot A Real Type");

    const { rows: next_rows } = applyPastedGridToRows<Row>(
      rows,
      0,
      0,
      ["primary_keyword", "type_of_content"],
      grid,
      (field, raw_value, current_value) =>
        field === "type_of_content" ? current_value : raw_value
    );

    expect(next_rows[0]).toEqual({ primary_keyword: "kw1", type_of_content: "Blog Article" });
  });
});

describe("growRowsForPaste", () => {
  interface Row {
    value: string;
  }
  const create_empty_row = (): Row => ({ value: "" });

  it("does nothing when the existing rows already cover the pasted grid", () => {
    const rows: Row[] = [{ value: "a" }, { value: "b" }];
    const grid = parsePastedGrid("x");

    expect(growRowsForPaste(rows, 0, grid, create_empty_row)).toBe(rows);
  });

  it("appends empty rows so every pasted row has a home", () => {
    const rows: Row[] = [{ value: "a" }];
    const grid = parsePastedGrid("x\ny\nz");

    const grown = growRowsForPaste(rows, 0, grid, create_empty_row);

    expect(grown).toHaveLength(3);
    expect(grown[0]).toEqual({ value: "a" });
    expect(grown[1]).toEqual({ value: "" });
    expect(grown[2]).toEqual({ value: "" });
  });

  it("accounts for the starting row index when growing", () => {
    const rows: Row[] = [{ value: "a" }, { value: "b" }];
    const grid = parsePastedGrid("x\ny");

    const grown = growRowsForPaste(rows, 1, grid, create_empty_row);

    expect(grown).toHaveLength(3);
  });
});
