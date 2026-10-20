/**
 * Utilities for turning clipboard text (e.g. rows copied from Excel or Google
 * Sheets) into a 2D grid, and applying that grid onto an array of table rows
 * starting from the cell the user pasted into.
 */

export type PastedGrid = string[][];

/**
 * Parses tab/newline-delimited clipboard text into a grid of trimmed cells.
 *
 * Google Sheets and Excel wrap a cell in double quotes when its value holds a line
 * break, a tab or a leading quote (inner quotes doubled), so a quoted cell keeps
 * its line breaks instead of being split into extra rows. A quote that does not
 * close right before a tab, a line break or the end of the text is kept as plain
 * text, so a value that merely starts with a quote still pastes as typed.
 */
export function parsePastedGrid(text: string): PastedGrid {
  const normalized_text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: PastedGrid = [];
  let row: string[] = [];
  let position = 0;

  for (;;) {
    const { value, next_position } = readGridCell(normalized_text, position);
    row.push(value.trim());
    position = next_position;

    if (position >= normalized_text.length) {
      rows.push(row);
      break;
    }

    if (normalized_text[position] === "\n") {
      rows.push(row);
      row = [];
    }
    position += 1;
  }

  while (rows.length > 1 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }
  return rows;
}

/** Reads one cell starting at `position`, stopping at the tab or line break that ends it. */
function readGridCell(text: string, position: number): { value: string; next_position: number } {
  if (text[position] === '"') {
    let value = "";
    let cursor = position + 1;
    while (cursor < text.length) {
      if (text[cursor] !== '"') {
        value += text[cursor];
        cursor += 1;
        continue;
      }
      if (text[cursor + 1] === '"') {
        value += '"';
        cursor += 2;
        continue;
      }
      const after_quote = text[cursor + 1];
      if (after_quote === undefined || after_quote === "\t" || after_quote === "\n") {
        return { value, next_position: cursor + 1 };
      }
      break;
    }
  }

  let end = position;
  while (end < text.length && text[end] !== "\t" && text[end] !== "\n") end += 1;
  return { value: text.slice(position, end), next_position: end };
}

/** Quotes a cell the way Google Sheets does, only when it would otherwise break the grid. */
function toTsvCell(value: string): string {
  return /[\t\n\r]/.test(value) || value.startsWith('"') ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Serializes a grid as tab/newline-delimited text, the plain text format Excel and
 * Google Sheets read on paste. parsePastedGrid() reads it back to the same grid.
 */
export function serializeGridToTsv(grid: PastedGrid): string {
  return grid.map((grid_row) => grid_row.map(toTsvCell).join("\t")).join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Serializes a grid as an HTML table, the rich format spreadsheets prefer on
 * paste, so every value lands in its own cell with its line breaks intact.
 */
export function serializeGridToHtml(grid: PastedGrid): string {
  const body = grid
    .map(
      (grid_row) =>
        `<tr>${grid_row.map((value) => `<td>${escapeHtml(value).replace(/\r?\n/g, "<br>")}</td>`).join("")}</tr>`
    )
    .join("");
  return `<table><tbody>${body}</tbody></table>`;
}

/** Number of cells in a grid, counting every row (rows may differ in length). */
export function countGridCells(grid: PastedGrid): number {
  return grid.reduce((total, grid_row) => total + grid_row.length, 0);
}

/** True when the parsed grid spans more than a single cell. */
export function isBulkPaste(grid: PastedGrid): boolean {
  return grid.length > 1 || (grid[0]?.length ?? 0) > 1;
}

export interface ApplyPastedGridResult<T> {
  rows: T[];
  /** Number of pasted rows that had no matching table row and were dropped. */
  overflow_row_count: number;
}

/**
 * Writes a pasted grid onto `rows`, starting at `start_row_index` /
 * `start_field_index`, mapping grid columns to `field_order` in sequence.
 * Row count in these tables is capped to the quantity purchased, so rows
 * beyond the end of `rows` are counted as overflow and dropped rather than
 * appended — callers should surface `overflow_row_count` to the user.
 */
export function applyPastedGridToRows<T extends object>(
  rows: T[],
  start_row_index: number,
  start_field_index: number,
  field_order: ReadonlyArray<keyof T>,
  grid: PastedGrid,
  parse_cell_value?: (
    field: keyof T,
    raw_value: string,
    current_value: T[keyof T]
  ) => T[keyof T]
): ApplyPastedGridResult<T> {
  const next_rows = rows.map((row) => ({ ...row }));
  let overflow_row_count = 0;

  grid.forEach((grid_row, row_offset) => {
    const target_row_index = start_row_index + row_offset;
    if (target_row_index >= next_rows.length) {
      overflow_row_count += 1;
      return;
    }

    grid_row.forEach((raw_value, col_offset) => {
      const field = field_order[start_field_index + col_offset];
      if (!field) return;

      const current_value = next_rows[target_row_index][field];
      const next_value = parse_cell_value
        ? parse_cell_value(field, raw_value, current_value)
        : ((raw_value as unknown) as T[keyof T]);

      next_rows[target_row_index] = {
        ...next_rows[target_row_index],
        [field]: next_value,
      };
    });
  });

  return { rows: next_rows, overflow_row_count };
}

/** Interprets a pasted cell as a boolean (e.g. an "Exact Match" column). */
export function parseBooleanCell(raw_value: string): boolean {
  const normalized_value = raw_value.trim().toLowerCase();
  return ["true", "yes", "y", "1", "x", "exact"].includes(normalized_value);
}
