/**
 * Pure helpers behind the spreadsheet style (Excel / Google Sheets) keyboard
 * navigation of the admin data tables: moving the active cell with the arrow
 * keys, Tab wrapping, column letters (A, B, ..., AA), cell addresses (B12) and
 * the Count / Sum / Average summary shown for a selected range.
 */

/** Zero-based position of a cell inside the rendered grid. */
export interface GridPosition {
  row_idx: number;
  col_idx: number;
}

export interface GridSize {
  row_count: number;
  col_count: number;
}

export type GridDirection = "up" | "down" | "left" | "right";

export interface MoveGridPositionOptions {
  /** Ctrl/Cmd + Arrow: jumps straight to the first or last cell in that direction. */
  jump_to_edge?: boolean;
  /** How many cells to move (e.g. PageUp / PageDown). Defaults to 1. */
  step?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Moves a position one step (or to the edge) in a direction, never leaving the grid. */
export function moveGridPosition(
  position: GridPosition,
  direction: GridDirection,
  size: GridSize,
  options: MoveGridPositionOptions = {}
): GridPosition {
  if (size.row_count <= 0 || size.col_count <= 0) return position;

  const last_row = size.row_count - 1;
  const last_col = size.col_count - 1;
  const step = options.step ?? 1;
  let { row_idx, col_idx } = position;

  if (direction === "up") row_idx = options.jump_to_edge ? 0 : row_idx - step;
  if (direction === "down") row_idx = options.jump_to_edge ? last_row : row_idx + step;
  if (direction === "left") col_idx = options.jump_to_edge ? 0 : col_idx - step;
  if (direction === "right") col_idx = options.jump_to_edge ? last_col : col_idx + step;

  return { row_idx: clamp(row_idx, 0, last_row), col_idx: clamp(col_idx, 0, last_col) };
}

/**
 * Tab / Shift+Tab movement: steps right (or left) and wraps to the start of the
 * next row (or the end of the previous one), stopping at the grid's corners.
 */
export function getTabPosition(position: GridPosition, backwards: boolean, size: GridSize): GridPosition {
  if (size.row_count <= 0 || size.col_count <= 0) return position;

  const last_col = size.col_count - 1;
  const { row_idx, col_idx } = position;

  if (!backwards) {
    if (col_idx < last_col) return { row_idx, col_idx: col_idx + 1 };
    if (row_idx < size.row_count - 1) return { row_idx: row_idx + 1, col_idx: 0 };
    return position;
  }

  if (col_idx > 0) return { row_idx, col_idx: col_idx - 1 };
  if (row_idx > 0) return { row_idx: row_idx - 1, col_idx: last_col };
  return position;
}

/** Converts a zero-based column index to its spreadsheet letter: 0 → A, 25 → Z, 26 → AA. */
export function toColumnLetter(col_idx: number): string {
  let remaining = Math.max(0, Math.floor(col_idx)) + 1;
  let letters = "";
  while (remaining > 0) {
    const char_offset = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + char_offset) + letters;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return letters;
}

/** Builds a spreadsheet address such as "B12" from a column index and a one-based row number. */
export function toCellAddress(col_idx: number, row_number: number): string {
  return `${toColumnLetter(col_idx)}${row_number}`;
}

/** Keyboard event fields needed to decide if a key press should start typing into a cell. */
export interface KeyPressLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/**
 * True for a single printable character (letters, digits, symbols, space) that is not a
 * Ctrl/Cmd shortcut. Option on Mac and AltGr on Windows (reported as Ctrl+Alt) type
 * characters such as "@", "#" or "[" on many keyboard layouts, so they still count.
 */
export function isPrintableKey(event: KeyPressLike): boolean {
  if (event.key.length !== 1 || event.metaKey) return false;
  return !event.ctrlKey || event.altKey;
}

/**
 * Ctrl+; (Cmd+; on Mac) inserts today's date, like Google Sheets. The ":" variant
 * (Shift held) is accepted too, since it is the same physical key.
 */
export function isInsertDateShortcut(event: KeyPressLike): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && (event.key === ";" || event.key === ":");
}

/** Formats a date the way the table's date columns store it: MM/DD/YYYY. */
export function formatDateMMDDYYYY(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
}

/** Replaces the selected part of a text (or inserts at the caret) and returns where the caret ends. */
export function insertTextAtSelection(
  value: string,
  selection_start: number,
  selection_end: number,
  inserted_text: string
): { text: string; caret: number } {
  const start = clamp(Math.min(selection_start, selection_end), 0, value.length);
  const end = clamp(Math.max(selection_start, selection_end), 0, value.length);
  return {
    text: value.slice(0, start) + inserted_text + value.slice(end),
    caret: start + inserted_text.length,
  };
}

export interface RangeStats {
  /** Non-empty cells in the range. */
  count: number;
  /** Cells whose value parses as a number. */
  numeric_count: number;
  sum: number;
  average: number | null;
}

/**
 * Parses a cell value as a number, tolerating the currency symbols, thousands
 * separators and percent signs that show up in the pricing columns ("$1,250.00").
 * Returns null when the value is not numeric.
 */
export function parseNumericCell(value: string): number | null {
  const cleaned = value.trim().replace(/[$€£,%\s]/g, "");
  if (cleaned === "" || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Count / Sum / Average for a set of cell values, like the Google Sheets status bar. */
export function computeRangeStats(values: ReadonlyArray<string>): RangeStats {
  let count = 0;
  let numeric_count = 0;
  let sum = 0;

  for (const value of values) {
    if (value.trim() === "") continue;
    count += 1;
    const numeric_value = parseNumericCell(value);
    if (numeric_value === null) continue;
    numeric_count += 1;
    sum += numeric_value;
  }

  return { count, numeric_count, sum, average: numeric_count > 0 ? sum / numeric_count : null };
}

/** Pixels hidden behind sticky UI on each edge of a scroll container. */
export interface StickyInsets {
  top: number;
  left: number;
}

/**
 * Scrolls `container` just enough for `cell_el` to be fully visible, keeping it
 * clear of the sticky header (top inset) and the frozen columns (left inset).
 * Frozen cells only need vertical scrolling, since they never leave the view sideways.
 */
export function scrollCellIntoView(
  container: HTMLElement,
  cell_el: HTMLElement,
  insets: StickyInsets,
  is_frozen_column = false
): void {
  const container_rect = container.getBoundingClientRect();
  const cell_rect = cell_el.getBoundingClientRect();

  const visible_top = container_rect.top + insets.top;
  const visible_bottom = container_rect.top + container.clientHeight;
  if (cell_rect.top < visible_top) {
    container.scrollTop -= visible_top - cell_rect.top;
  } else if (cell_rect.bottom > visible_bottom) {
    container.scrollTop += cell_rect.bottom - visible_bottom;
  }

  if (is_frozen_column) return;

  const visible_left = container_rect.left + insets.left;
  const visible_right = container_rect.left + container.clientWidth;
  if (cell_rect.left < visible_left) {
    container.scrollLeft -= visible_left - cell_rect.left;
  } else if (cell_rect.right > visible_right) {
    container.scrollLeft += cell_rect.right - visible_right;
  }
}
