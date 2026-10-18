/**
 * Unit tests for the spreadsheet-import helpers used by the intake form tables.
 *
 * Clients upload an .xlsx/.xls/.csv file to bulk-fill an intake table. The
 * parsed grid is cleaned by `prepareImportGrid` — dropping a header row and a
 * leading "#"/index column when present — before being handed to the same
 * `applyPastedGridToRows` pipeline that powers manual paste. These tests lock
 * in that cleaning behavior across the four intake table shapes.
 */

import * as XLSX from "xlsx";
import {
  formatFileSize,
  isAcceptedImportFile,
  parseSpreadsheetFile,
  prepareImportGrid,
  type IntakeImportColumn,
} from "@/lib/intake-import";

/** Builds an .xlsx File in memory from a 2D array of cell values. */
function makeXlsxFile(rows: (string | number)[][], name = "import.xlsx"): File {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([buffer], name);
}

/** Builds a .csv File in memory from raw CSV text. */
function makeCsvFile(text: string, name = "import.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

const KEYWORD_COLUMNS: IntakeImportColumn[] = [
  { label: "Keyword", aliases: ["keyword", "key phrase"] },
  { label: "Landing Page", aliases: ["landing page", "url"] },
  { label: "Exact Match", aliases: ["exact match", "exact"] },
];

describe("prepareImportGrid", () => {
  it("keeps plain data rows with no header or index column", () => {
    const grid = [
      ["seo tips", "https://a.com"],
      ["link building", "https://b.com"],
    ];
    const result = prepareImportGrid(grid, KEYWORD_COLUMNS);

    expect(result.had_header).toBe(false);
    expect(result.had_index_column).toBe(false);
    expect(result.rows).toEqual(grid);
  });

  it("detects and strips a header row matched against the column labels/aliases", () => {
    const grid = [
      ["Keyword", "Landing Page", "Exact Match"],
      ["seo tips", "https://a.com", "yes"],
    ];
    const result = prepareImportGrid(grid, KEYWORD_COLUMNS);

    expect(result.had_header).toBe(true);
    expect(result.rows).toEqual([["seo tips", "https://a.com", "yes"]]);
  });

  it("matches headers case- and punctuation-insensitively", () => {
    const grid = [
      ["  KEY PHRASE ", "URL"],
      ["seo tips", "https://a.com"],
    ];
    const result = prepareImportGrid(grid, KEYWORD_COLUMNS);

    expect(result.had_header).toBe(true);
    expect(result.rows).toEqual([["seo tips", "https://a.com"]]);
  });

  it("strips a leading '#' index column when a header is present", () => {
    const grid = [
      ["#", "Keyword", "Landing Page"],
      ["1", "seo tips", "https://a.com"],
      ["2", "link building", "https://b.com"],
    ];
    const result = prepareImportGrid(grid, KEYWORD_COLUMNS);

    expect(result.had_header).toBe(true);
    expect(result.had_index_column).toBe(true);
    expect(result.rows).toEqual([
      ["seo tips", "https://a.com"],
      ["link building", "https://b.com"],
    ]);
  });

  it("strips a numeric leading index column even without a header", () => {
    const grid = [
      ["1", "seo tips", "https://a.com", "yes"],
      ["2", "link building", "https://b.com", "no"],
    ];
    const result = prepareImportGrid(grid, KEYWORD_COLUMNS);

    expect(result.had_index_column).toBe(true);
    expect(result.rows).toEqual([
      ["seo tips", "https://a.com", "yes"],
      ["link building", "https://b.com", "no"],
    ]);
  });

  it("does not treat a real first column as an index when column counts line up", () => {
    const grid = [
      ["seo tips", "https://a.com", "yes"],
      ["link building", "https://b.com", "no"],
    ];
    const result = prepareImportGrid(grid, KEYWORD_COLUMNS);

    expect(result.had_index_column).toBe(false);
    expect(result.rows).toEqual(grid);
  });

  it("drops fully-empty rows", () => {
    const grid = [
      ["seo tips", "https://a.com"],
      ["", ""],
      ["link building", "https://b.com"],
    ];
    const result = prepareImportGrid(grid, KEYWORD_COLUMNS);

    expect(result.rows).toEqual([
      ["seo tips", "https://a.com"],
      ["link building", "https://b.com"],
    ]);
  });

  it("returns an empty result for a blank grid", () => {
    expect(prepareImportGrid([], KEYWORD_COLUMNS)).toEqual({
      rows: [],
      had_header: false,
      had_index_column: false,
    });
  });
});

describe("parseSpreadsheetFile", () => {
  it("reads a CSV file into a trimmed string grid", async () => {
    const file = makeCsvFile("Keyword,Landing Page\n  seo tips ,https://a.com\nlink building,https://b.com");
    const grid = await parseSpreadsheetFile(file);

    expect(grid).toEqual([
      ["Keyword", "Landing Page"],
      ["seo tips", "https://a.com"],
      ["link building", "https://b.com"],
    ]);
  });

  it("reads an .xlsx file from the first worksheet", async () => {
    const file = makeXlsxFile([
      ["Keyword", "Landing Page", "Exact Match"],
      ["seo tips", "https://a.com", "yes"],
      ["link building", "https://b.com", "no"],
    ]);
    const grid = await parseSpreadsheetFile(file);

    expect(grid[0]).toEqual(["Keyword", "Landing Page", "Exact Match"]);
    expect(grid[1]).toEqual(["seo tips", "https://a.com", "yes"]);
    expect(grid[2]).toEqual(["link building", "https://b.com", "no"]);
  });

  it("stringifies numeric cells (e.g. an index column)", async () => {
    const file = makeXlsxFile([
      ["#", "Keyword"],
      [1, "seo tips"],
      [2, "link building"],
    ]);
    const grid = await parseSpreadsheetFile(file);

    expect(grid[1]).toEqual(["1", "seo tips"]);
    expect(grid[2]).toEqual(["2", "link building"]);
  });

  it("feeds cleanly into prepareImportGrid to yield ready-to-apply data rows", async () => {
    const file = makeXlsxFile([
      ["#", "Keyword", "Landing Page", "Exact Match"],
      [1, "seo tips", "https://a.com", "yes"],
      [2, "link building", "https://b.com", "no"],
    ]);
    const grid = await parseSpreadsheetFile(file);
    const prepared = prepareImportGrid(grid, KEYWORD_COLUMNS);

    expect(prepared.had_header).toBe(true);
    expect(prepared.had_index_column).toBe(true);
    expect(prepared.rows).toEqual([
      ["seo tips", "https://a.com", "yes"],
      ["link building", "https://b.com", "no"],
    ]);
  });
});

describe("isAcceptedImportFile", () => {
  it.each(["orders.xlsx", "orders.XLS", "data.csv"])(
    "accepts %s",
    (name) => {
      expect(isAcceptedImportFile(new File(["x"], name))).toBe(true);
    }
  );

  it.each(["notes.txt", "image.png", "archive.zip"])(
    "rejects %s",
    (name) => {
      expect(isAcceptedImportFile(new File(["x"], name))).toBe(false);
    }
  );
});

describe("formatFileSize", () => {
  it("formats bytes, KB and MB", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
