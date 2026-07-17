/**
 * Utilities for importing intake-form rows from an uploaded spreadsheet
 * (.xlsx / .xls / .csv). A file is read into a 2D grid of string cells, an
 * optional header row and leading "#"/index column are detected and stripped,
 * and the resulting data rows are handed to the same `applyPastedGridToRows`
 * pipeline that powers the manual copy/paste flow — so import and paste share
 * identical column-mapping, quantity-cap and overflow behavior.
 */

import * as XLSX from "xlsx";
import type { PastedGrid } from "./pasted-grid";

/** File extensions accepted by the import dropzone. */
export const ACCEPTED_IMPORT_EXTENSIONS = [".xlsx", ".xls", ".csv"] as const;

/** MIME → extension map for `react-dropzone`'s `accept` option. */
export const IMPORT_DROPZONE_ACCEPT: Record<string, string[]> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "text/plain": [".csv"],
};

/** Max spreadsheet size accepted by the import dropzone. */
export const MAX_IMPORT_FILE_SIZE_MB = 10;
export const MAX_IMPORT_FILE_SIZE_BYTES = MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024;

/**
 * Describes one column of the target intake table, used both to render the
 * import preview and to recognize a header row in the uploaded file.
 */
export interface IntakeImportColumn {
  /** Human-readable header shown in the preview (e.g. "Keyword"). */
  label: string;
  /** Extra header names accepted for this column (case/punctuation-insensitive). */
  aliases?: string[];
}

/** Header labels that indicate a leading row-number/index column to drop. */
const INDEX_COLUMN_ALIASES = [
  "",
  "#",
  "no",
  "no.",
  "num",
  "number",
  "index",
  "row",
  "s.no",
  "sno",
  "sr",
  "sr.",
  "srno",
];

/** Lowercases and strips non-alphanumeric chars for lenient header matching. */
function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** True when a file's extension is one we can parse. */
export function isAcceptedImportFile(file: File): boolean {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  return (ACCEPTED_IMPORT_EXTENSIONS as ReadonlyArray<string>).includes(ext);
}

/** Human-friendly byte size, e.g. "12.3 KB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Reads an .xlsx / .xls / .csv File into a 2D grid of trimmed string cells,
 * using only the first worksheet. Fully empty trailing rows are dropped.
 */
export async function parseSpreadsheetFile(file: File): Promise<PastedGrid> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const first_sheet_name = workbook.SheetNames[0];
  if (!first_sheet_name) return [];

  const sheet = workbook.Sheets[first_sheet_name];
  const raw_rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });

  return raw_rows.map((row) =>
    (Array.isArray(row) ? row : []).map((cell) =>
      cell === null || cell === undefined ? "" : String(cell).trim()
    )
  );
}

export interface PreparedImportGrid {
  /** Data rows only — header row and leading index column removed. */
  rows: PastedGrid;
  had_header: boolean;
  had_index_column: boolean;
}

/**
 * Cleans a raw grid for import: drops fully-empty rows, detects and removes a
 * header row (matched against the target `columns`) and a leading "#"/index
 * column, and returns just the data rows ready for `applyPastedGridToRows`.
 */
export function prepareImportGrid(
  grid: PastedGrid,
  columns: IntakeImportColumn[]
): PreparedImportGrid {
  let working = grid.filter((row) => row.some((cell) => cell.trim() !== ""));
  if (working.length === 0) {
    return { rows: [], had_header: false, had_index_column: false };
  }

  const column_alias_set = new Set<string>();
  columns.forEach((column) => {
    column_alias_set.add(normalizeHeader(column.label));
    (column.aliases ?? []).forEach((alias) =>
      column_alias_set.add(normalizeHeader(alias))
    );
  });
  const index_alias_set = new Set(INDEX_COLUMN_ALIASES.map(normalizeHeader));

  const first_row = working[0];
  const had_header = first_row.some((cell) =>
    column_alias_set.has(normalizeHeader(cell))
  );

  let had_index_column: boolean;
  if (had_header) {
    // Header present: a leading column is an index only if its header is an
    // index alias and NOT one of the real target columns.
    const first_header = normalizeHeader(first_row[0] ?? "");
    had_index_column =
      index_alias_set.has(first_header) && !column_alias_set.has(first_header);
  } else {
    // No header: treat the first column as an index only when there are more
    // columns than the table expects and every first cell is an integer.
    const first_cells = working.map((row) => (row[0] ?? "").trim());
    had_index_column =
      first_row.length > columns.length &&
      first_cells.every((value) => /^\d+$/.test(value));
  }

  if (had_header) working = working.slice(1);
  if (had_index_column) working = working.map((row) => row.slice(1));

  // A dropped header could leave newly-empty rows behind; filter again.
  working = working.filter((row) => row.some((cell) => cell.trim() !== ""));

  return { rows: working, had_header, had_index_column };
}
