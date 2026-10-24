import type {
  LinkBuildingHistoryBatch,
  LinkBuildingHistorySource,
  LinkBuildingHistoryValue,
  LinkBuildingOrderRevision,
  LinkBuildingRestoreSkip,
} from "@/types/admin/link-building-order-history";

/** How each change source reads in the version history. */
export const HISTORY_SOURCE_LABELS: Record<LinkBuildingHistorySource, string> = {
  edit: "Edit",
  paste: "Paste",
  clear: "Clear cells",
  fill: "Fill",
  undo: "Undo",
  redo: "Redo",
  formula: "Formula update",
  create: "Row added",
  delete: "Row deleted",
  clear_all: "Clear all",
  import: "CSV import",
  metrics_import: "Metrics update",
  auto_assign: "Auto assign",
  restore: "Restore",
  checkout: "Client checkout",
  client_details: "Client details",
  admin_details: "Admin details",
  system: "System",
};

/** Sources offered in the version history filter, most useful first. */
export const HISTORY_SOURCE_FILTER_OPTIONS: { value: LinkBuildingHistorySource; label: string }[] = (
  ["paste", "edit", "fill", "clear", "undo", "redo", "delete", "clear_all", "import", "metrics_import", "restore", "checkout", "client_details", "admin_details"] as const
).map((value) => ({ value, label: HISTORY_SOURCE_LABELS[value] }));

/** Columns that are not on the grid but are kept in the history. */
const EXTRA_FIELD_LABELS: Record<string, string> = {
  cell_formulas: "Formulas",
  user_id: "Client Account",
  assigned_admin_user_id: "Assigned To",
  admin_team_id: "Team",
  link_builder_user_id: "Link Builder Account",
  order_item_id: "Purchase Item",
  row_index: "Row Position",
  dr: "DR",
  completed_date: "Completed Date",
  currency: "Currency",
};

/** Label of a recorded column: the grid header when there is one, else a readable name. */
export function historyFieldLabel(field: string, column_labels: Record<string, string>): string {
  if (column_labels[field]) return column_labels[field];
  if (EXTRA_FIELD_LABELS[field]) return EXTRA_FIELD_LABELS[field];
  const words = field.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A recorded value as shown in the history: Yes/No booleans, formulas listed, "(empty)" for blanks. */
export function formatHistoryValue(value: LinkBuildingHistoryValue | undefined): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    const formulas = Object.entries(value);
    if (formulas.length === 0) return "(empty)";
    return formulas.map(([column, formula]) => `${column}: ${formula}`).join(", ");
  }
  return String(value);
}

/** Whether an action changed or deleted something that can be put back. */
export function isBatchRestorable(batch: LinkBuildingHistoryBatch): boolean {
  return batch.updated_count + batch.deleted_count > 0;
}

/** Whether one revision can be restored on its own (rows added are never removed). */
export function isRevisionRestorable(revision: LinkBuildingOrderRevision): boolean {
  return revision.event !== "created";
}

function plural(count: number, word: string): string {
  return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

/** One line summary of an action, e.g. "8 cells in 2 rows" or "2 rows deleted". */
export function describeBatch(batch: LinkBuildingHistoryBatch): string {
  const parts: string[] = [];

  if (batch.updated_count > 0) {
    const changed = batch.cells_count !== null ? plural(batch.cells_count, "cell") : plural(batch.updated_count, "row change");
    const rows_changed = batch.rows_count - batch.created_count - batch.deleted_count;
    parts.push(rows_changed > 1 ? `${changed} in ${plural(rows_changed, "row")}` : changed);
  }
  if (batch.created_count > 0) parts.push(`${plural(batch.created_count, "row")} added`);
  if (batch.deleted_count > 0) parts.push(`${plural(batch.deleted_count, "row")} deleted`);

  return parts.join(", ") || "No changes";
}

/** Day heading of the version history ("Today", "Yesterday", or the date). */
export function historyDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const start_of = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days_ago = Math.round((start_of(now) - start_of(date)) / 86_400_000);

  if (days_ago === 0) return "Today";
  if (days_ago === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** Time of a change, e.g. "3:42 PM". */
export function historyTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Why a row or cell was left out of a restore. */
export function describeSkip(skip: LinkBuildingRestoreSkip, column_labels: Record<string, string>): string {
  const row = skip.order_id ?? "A row";
  if (skip.reason === "order_id_in_use") {
    return `${row}: its Order ID is now used by another row, so it was not restored.`;
  }
  return skip.field
    ? `${row}: the row was deleted, so ${historyFieldLabel(skip.field, column_labels)} could not be restored.`
    : `${row}: the row was deleted, so it could not be restored.`;
}
