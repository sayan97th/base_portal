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
  isBulkPaste,
  parseBooleanCell,
  parsePastedGrid,
  serializeGridToHtml,
  serializeGridToTsv,
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

  it("regression: pasting 17 rows into a 7-row table (quantity purchased) keeps exactly 7 rows, never grows to 17", () => {
    interface CoRow {
      primary_keyword: string;
      content_page_url: string;
    }
    const field_order: (keyof CoRow)[] = ["primary_keyword", "content_page_url"];
    const rows: CoRow[] = Array.from({ length: 7 }, () => ({
      primary_keyword: "",
      content_page_url: "",
    }));
    const grid = parsePastedGrid(
      Array.from({ length: 17 }, (_, i) => `Test\thttp://localhost:3000/link-building-${i}`).join("\n")
    );

    const { rows: next_rows, overflow_row_count } = applyPastedGridToRows(
      rows,
      0,
      0,
      field_order,
      grid
    );

    expect(next_rows).toHaveLength(7);
    expect(overflow_row_count).toBe(10);
    expect(next_rows.every((row) => row.primary_keyword === "Test")).toBe(true);
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

describe("parsePastedGrid, quoted cells copied from Google Sheets or Excel", () => {
  it("keeps the line breaks of a quoted cell inside that cell", () => {
    expect(parsePastedGrid('kw1\t"line one\nline two"\nkw2\tsingle')).toEqual([
      ["kw1", "line one\nline two"],
      ["kw2", "single"],
    ]);
  });

  it("keeps a tab inside a quoted cell", () => {
    expect(parsePastedGrid('"a\tb"\tc')).toEqual([["a\tb", "c"]]);
  });

  it("turns doubled quotes inside a quoted cell into one quote", () => {
    expect(parsePastedGrid('"say ""hi""\nnow"')).toEqual([['say "hi"\nnow']]);
  });

  it("keeps a value that only starts with a quote as typed", () => {
    expect(parsePastedGrid('"Best" tools\tnext')).toEqual([['"Best" tools', "next"]]);
  });

  it("keeps an unclosed quote as plain text", () => {
    expect(parsePastedGrid('"open\tnext')).toEqual([['"open', "next"]]);
  });

  it("parses a quoted cell at the end of the text", () => {
    expect(parsePastedGrid('a\t"b"\n')).toEqual([["a", "b"]]);
  });

  it("parses an empty clipboard as one empty cell", () => {
    expect(parsePastedGrid("")).toEqual([[""]]);
  });
});

describe("serializeGridToTsv", () => {
  it("joins cells with tabs and rows with line breaks", () => {
    expect(serializeGridToTsv([["a", "b"], ["c", "d"]])).toBe("a\tb\nc\td");
  });

  it("quotes only the cells that would break the grid, the way Sheets does", () => {
    expect(serializeGridToTsv([["line one\nline two", 'say "hi"', '"quoted"', "tab\there"]])).toBe(
      '"line one\nline two"\tsay "hi"\t"""quoted"""\t"tab\there"'
    );
  });

  it("reads back to the same grid", () => {
    const grid = [
      ["Live", "line one\nline two", '"Best" tools'],
      ["", "DR 30+ External", "54"],
    ];
    expect(parsePastedGrid(serializeGridToTsv(grid))).toEqual(grid);
  });
});

describe("serializeGridToHtml", () => {
  it("writes an HTML table with escaped values and line breaks", () => {
    expect(serializeGridToHtml([["<b>A&B</b>", "one\ntwo"]])).toBe(
      "<table><tbody><tr><td>&lt;b&gt;A&amp;B&lt;/b&gt;</td><td>one<br>two</td></tr></tbody></table>"
    );
  });
});
