/**
 * Utilities for turning clipboard text (e.g. rows copied from Excel or Google
 * Sheets) into a 2D grid, and applying that grid onto an array of table rows
 * starting from the cell the user pasted into.
 */

export type PastedGrid = string[][];

/** Parses tab/newline-delimited clipboard text into a grid of trimmed cells. */
export function parsePastedGrid(text: string): PastedGrid {
  const normalized_text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized_text.split("\n");
  while (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.map((line) => line.split("\t").map((cell) => cell.trim()));
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
 * Rows beyond the end of `rows` are counted as overflow rather than dropped
 * silently, so callers can either grow the array first (see
 * `growRowsForPaste`) or warn the user.
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

/**
 * Extends `rows` with freshly-created empty rows so every row in `grid` has
 * somewhere to land, starting at `start_row_index`. Use this before
 * `applyPastedGridToRows` for tables where the row count isn't capped by a
 * purchased quantity (e.g. tables that already support deleting rows freely).
 */
export function growRowsForPaste<T>(
  rows: T[],
  start_row_index: number,
  grid: PastedGrid,
  create_empty_row: () => T
): T[] {
  const required_length = start_row_index + grid.length;
  if (required_length <= rows.length) return rows;
  return [
    ...rows,
    ...Array.from({ length: required_length - rows.length }, create_empty_row),
  ];
}

/** Interprets a pasted cell as a boolean (e.g. an "Exact Match" column). */
export function parseBooleanCell(raw_value: string): boolean {
  const normalized_value = raw_value.trim().toLowerCase();
  return ["true", "yes", "y", "1", "x", "exact"].includes(normalized_value);
}
