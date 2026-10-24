// ── Link Building Orders edit history ──────────────────────────────────────────
// Mirrors LinkBuildingOrderHistoryController in the API. Every change to a row of
// the Link Building Orders table is kept as a revision, grouped by the action that
// made it (a cell edit, a paste, an import), and any action can be restored.

/** What made a change, as recorded by the API. */
export type LinkBuildingHistorySource =
  | "edit"
  | "paste"
  | "clear"
  | "fill"
  | "undo"
  | "redo"
  | "formula"
  | "create"
  | "delete"
  | "clear_all"
  | "import"
  | "metrics_import"
  | "auto_assign"
  | "restore"
  | "checkout"
  | "client_details"
  | "admin_details"
  | "system";

/** Sources the dashboard sends with its batch updates. */
export type LinkBuildingChangeSource = Extract<
  LinkBuildingHistorySource,
  "edit" | "paste" | "clear" | "fill" | "undo" | "redo" | "formula"
>;

export type LinkBuildingRevisionEvent = "created" | "updated" | "deleted";

/** A recorded cell value: text, number, Yes/No boolean, or a formulas map. */
export type LinkBuildingHistoryValue = string | number | boolean | Record<string, string> | null;

export interface LinkBuildingHistoryUser {
  id: number;
  name: string;
}

export interface LinkBuildingCellChange {
  field: string;
  old: LinkBuildingHistoryValue;
  new: LinkBuildingHistoryValue;
}

/** One change to one row. */
export interface LinkBuildingOrderRevision {
  id: number;
  batch_id: string;
  placement_id: string;
  /** BL- order id the row had when it changed. */
  order_id: string | null;
  event: LinkBuildingRevisionEvent;
  source: LinkBuildingHistorySource;
  /** Changed cells, for "updated" revisions. */
  changes: LinkBuildingCellChange[];
  /** Full row, for "created" and "deleted" revisions. */
  snapshot: Record<string, LinkBuildingHistoryValue> | null;
  user: LinkBuildingHistoryUser | null;
  created_at: string;
}

/**
 * Summary of one action: every revision written by a single edit, paste,
 * import... Its revisions load only when the action is opened, see
 * getLinkBuildingOrderHistoryBatch().
 */
export interface LinkBuildingHistoryBatch {
  /** Cursor of the list: pass the last one shown as before_id to load older actions. */
  id: number;
  batch_id: string;
  source: LinkBuildingHistorySource;
  user: LinkBuildingHistoryUser | null;
  started_at: string;
  revisions_count: number;
  rows_count: number;
  cells_count: number;
  created_count: number;
  updated_count: number;
  deleted_count: number;
  /** First Order IDs the action touched, to recognize it without opening it. */
  order_ids_preview: string[];
  /** Set when this action is itself a restore of another one. */
  restored_batch_id: string | null;
  /** Set once this action has been restored. */
  restored: { restored_at: string; user: LinkBuildingHistoryUser | null } | null;
}

/** Cursor pagination: no total count, which a large history would have to scan for. */
export interface LinkBuildingHistoryListMeta {
  per_page: number;
  has_more: boolean;
  next_before_id: number | null;
}

export interface LinkBuildingHistoryBatchMeta {
  per_page: number;
  has_more: boolean;
  next_after_id: number | null;
}

export interface LinkBuildingHistoryFilters {
  /** Id of the last action already shown, to load older ones. */
  before_id?: number | null;
  per_page?: number;
  source?: LinkBuildingHistorySource | "";
  user_id?: number | null;
  /** An Order ID or its start, e.g. "BL-257" or "257". */
  order_id?: string;
}

export interface LinkBuildingHistoryResponse {
  data: LinkBuildingHistoryBatch[];
  meta: LinkBuildingHistoryListMeta;
}

export interface LinkBuildingHistoryBatchResponse {
  data: LinkBuildingOrderRevision[];
  meta: LinkBuildingHistoryBatchMeta;
}

export interface LinkBuildingRowHistoryResponse {
  data: LinkBuildingOrderRevision[];
  meta: LinkBuildingHistoryListMeta;
  order_id: string | null;
  is_deleted: boolean;
}

/** What to do with cells edited again after the change being restored. */
export type LinkBuildingConflictStrategy = "abort" | "skip" | "overwrite";

/** A cell edited again after the change being restored. */
export interface LinkBuildingRestoreConflict {
  placement_id: string;
  order_id: string | null;
  field: string;
  current_value: LinkBuildingHistoryValue;
  expected_value: LinkBuildingHistoryValue;
  restore_value: LinkBuildingHistoryValue;
}

/** A row or cell that cannot be restored at all. */
export interface LinkBuildingRestoreSkip {
  placement_id: string;
  order_id: string | null;
  field: string | null;
  reason: "row_deleted" | "order_id_in_use";
}

export interface LinkBuildingRestoreTarget {
  batch_id?: string;
  revision_id?: number;
}
