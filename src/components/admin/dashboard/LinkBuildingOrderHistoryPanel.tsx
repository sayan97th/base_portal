"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebounce } from "@/hooks/useDebounce";
import {
  getLinkBuildingOrderHistoryBatch,
  getLinkBuildingOrderRowHistory,
  listLinkBuildingOrderHistory,
  restoreLinkBuildingOrderHistory,
  type LinkBuildingRestoreResult,
} from "@/services/admin/link-building-order-history.service";
import {
  HISTORY_SOURCE_FILTER_OPTIONS,
  HISTORY_SOURCE_LABELS,
  describeBatch,
  describeSkip,
  formatHistoryValue,
  historyDayLabel,
  historyFieldLabel,
  historyTimeLabel,
  isBatchRestorable,
  isRevisionRestorable,
} from "@/lib/link-building-history";
import type {
  LinkBuildingConflictStrategy,
  LinkBuildingHistoryBatch,
  LinkBuildingHistorySource,
  LinkBuildingOrderRevision,
  LinkBuildingRestoreConflict,
  LinkBuildingRestoreTarget,
} from "@/types/admin/link-building-order-history";

export interface LinkBuildingOrderHistoryPanelProps {
  is_open: boolean;
  /** Row whose edit history is shown, or null for the version history of the whole table. */
  row_id: string | null;
  /** Grid header of each column, so changes read like the table. */
  column_labels: Record<string, string>;
  onClose: () => void;
  /** Leaves the row history for the version history of the whole table. */
  onShowAllChanges: () => void;
  /** Called after a restore changed the table, with the restored rows. */
  onRestored: (result: LinkBuildingRestoreResult) => void;
}

/** A restore waiting for confirmation, or for a decision about its conflicts. */
interface PendingRestore {
  key: string;
  target: LinkBuildingRestoreTarget;
  question: string;
  conflicts: LinkBuildingRestoreConflict[] | null;
  /** Every conflict, the list above only holds the first ones. */
  conflicts_count: number;
}

/** Revisions of an opened action, loaded a page at a time. */
interface BatchDetails {
  revisions: LinkBuildingOrderRevision[];
  has_more: boolean;
  next_after_id: number | null;
  is_loading: boolean;
}

interface PanelNotice {
  tone: "success" | "error";
  message: string;
  details: string[];
}

const SOURCE_BADGE_CLASSES: Partial<Record<LinkBuildingHistorySource, string>> = {
  paste: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  edit: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30",
  fill: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
  clear: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
  delete: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
  clear_all: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
  import: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30",
  metrics_import: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30",
  restore: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  checkout: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30",
  client_details: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30",
};

/**
 * Above the app header (z-99999) and the table in full screen mode (z-[100000]),
 * so the drawer is never covered whichever way the table is shown.
 */
const DRAWER_LAYER_CLASS = "z-[100001]";

const DEFAULT_BADGE_CLASS = "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-700/60 dark:text-gray-300 dark:ring-gray-600";

/** Conflicts listed before the rest are summarized as "and N more". */
const MAX_CONFLICTS_SHOWN = 8;

/** Order IDs named on an action's card before the rest are counted. */
const MAX_ORDER_IDS_SHOWN = 3;

/** "BL-25730, BL-25732 and 1,198 more rows", from the summary of an action. */
function describeOrderIds(batch: LinkBuildingHistoryBatch): string {
  const shown = batch.order_ids_preview.slice(0, MAX_ORDER_IDS_SHOWN);
  if (shown.length === 0) return "";
  const others = batch.rows_count - shown.length;
  return others > 0 ? `${shown.join(", ")} and ${others.toLocaleString()} more row${others === 1 ? "" : "s"}` : shown.join(", ");
}

function SourceBadge({ source }: { source: LinkBuildingHistorySource }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SOURCE_BADGE_CLASSES[source] ?? DEFAULT_BADGE_CLASS}`}>
      {HISTORY_SOURCE_LABELS[source] ?? source}
    </span>
  );
}

/** The cells one revision changed, or the row it added or deleted. */
function RevisionChanges({ revision, column_labels, show_order_id }: {
  revision: LinkBuildingOrderRevision;
  column_labels: Record<string, string>;
  show_order_id: boolean;
}) {
  const row_label = revision.order_id ?? "Row";

  if (revision.event !== "updated") {
    const snapshot = revision.snapshot ?? {};
    const is_deleted = revision.event === "deleted";
    return (
      <div className="text-xs">
        <p className="font-medium text-gray-700 dark:text-gray-200">
          {show_order_id && <span className="mr-1.5 font-mono font-semibold">{row_label}</span>}
          <span className={is_deleted ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
            {is_deleted ? "Row deleted" : "Row added"}
          </span>
        </p>
        <p className="mt-0.5 truncate text-gray-500 dark:text-gray-400">
          {[snapshot.client, snapshot.keyword, snapshot.landing_page].filter(Boolean).map(String).join(" · ") || "No details"}
        </p>
      </div>
    );
  }

  return (
    <div className="text-xs">
      {show_order_id && <p className="mb-1 font-mono font-semibold text-gray-700 dark:text-gray-200">{row_label}</p>}
      <dl className="space-y-1">
        {revision.changes.map((change) => (
          <div key={change.field} className="grid grid-cols-[7.5rem_1fr] gap-2">
            <dt className="truncate text-gray-500 dark:text-gray-400" title={historyFieldLabel(change.field, column_labels)}>
              {historyFieldLabel(change.field, column_labels)}
            </dt>
            <dd className="min-w-0 break-words">
              <span className="rounded bg-red-50 px-1 text-red-700 line-through decoration-red-400/70 dark:bg-red-500/10 dark:text-red-300">
                {formatHistoryValue(change.old)}
              </span>
              <span className="mx-1 text-gray-400" aria-hidden="true">→</span>
              <span className="sr-only">changed to</span>
              <span className="rounded bg-emerald-50 px-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {formatHistoryValue(change.new)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Confirmation of a restore, then the choice of what to do with cells edited again since. */
function RestorePrompt({ pending, column_labels, is_working, onConfirm, onCancel }: {
  pending: PendingRestore;
  column_labels: Record<string, string>;
  is_working: boolean;
  onConfirm: (strategy: LinkBuildingConflictStrategy) => void;
  onCancel: () => void;
}) {
  const button_base = "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  if (pending.conflicts === null) {
    return (
      <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50/60 p-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <p className="text-xs text-gray-700 dark:text-gray-200">{pending.question}</p>
        <div className="mt-2 flex justify-end gap-2">
          <button onClick={onCancel} disabled={is_working} className={`${button_base} text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800`}>
            Cancel
          </button>
          <button onClick={() => onConfirm("abort")} disabled={is_working} className={`${button_base} bg-emerald-600 text-white hover:bg-emerald-700`}>
            {is_working ? "Restoring..." : "Restore"}
          </button>
        </div>
      </div>
    );
  }

  const conflicts = pending.conflicts;
  const hidden_conflicts = pending.conflicts_count - Math.min(conflicts.length, MAX_CONFLICTS_SHOWN);
  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/70 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10" role="alert">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
        {pending.conflicts_count === 1 ? "1 cell was" : `${pending.conflicts_count.toLocaleString()} cells were`} edited again after this change.
      </p>
      <ul className="mt-1.5 space-y-1 text-xs text-gray-700 dark:text-gray-200">
        {conflicts.slice(0, MAX_CONFLICTS_SHOWN).map((conflict) => (
          <li key={`${conflict.placement_id}:${conflict.field}`}>
            <span className="font-mono font-semibold">{conflict.order_id ?? "Row"}</span>
            {" · "}
            {historyFieldLabel(conflict.field, column_labels)}: now{" "}
            <span className="font-medium">&quot;{formatHistoryValue(conflict.current_value)}&quot;</span>, restore to{" "}
            <span className="font-medium">&quot;{formatHistoryValue(conflict.restore_value)}&quot;</span>
          </li>
        ))}
        {hidden_conflicts > 0 && (
          <li className="text-gray-500 dark:text-gray-400">and {hidden_conflicts.toLocaleString()} more</li>
        )}
      </ul>
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <button onClick={onCancel} disabled={is_working} className={`${button_base} text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800`}>
          Cancel
        </button>
        <button
          onClick={() => onConfirm("skip")}
          disabled={is_working}
          className={`${button_base} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`}
          title="Restore every other cell and keep the later edits"
        >
          Keep later edits
        </button>
        <button
          onClick={() => onConfirm("overwrite")}
          disabled={is_working}
          className={`${button_base} bg-amber-600 text-white hover:bg-amber-700`}
          title="Restore every cell, replacing the later edits too"
        >
          Overwrite them too
        </button>
      </div>
    </div>
  );
}

/**
 * Version history of the Link Building Orders table, like "Version history" and
 * "Show edit history" in Google Sheets: every change grouped by the action that
 * made it, who made it and when, with the old and new value of each cell. Any
 * action, or a single row change, can be restored. Cells edited again since are
 * never overwritten without asking.
 *
 * Built for a large table: the list shows one summary per action and pages with
 * a cursor, and the cells of an action load only when it is opened, a hundred
 * revisions at a time. A paste over 30,000 rows costs the same to list as a
 * single edit.
 */
export default function LinkBuildingOrderHistoryPanel({
  is_open,
  row_id,
  column_labels,
  onClose,
  onShowAllChanges,
  onRestored,
}: LinkBuildingOrderHistoryPanelProps) {
  const close_button_ref = useRef<HTMLButtonElement>(null);
  const request_id_ref = useRef(0);

  const [batches, setBatches] = useState<LinkBuildingHistoryBatch[]>([]);
  const [row_revisions, setRowRevisions] = useState<LinkBuildingOrderRevision[]>([]);
  const [row_info, setRowInfo] = useState<{ order_id: string | null; is_deleted: boolean } | null>(null);
  const [next_before_id, setNextBeforeId] = useState<number | null>(null);
  const [is_loading, setIsLoading] = useState(false);
  const [load_error, setLoadError] = useState<string | null>(null);

  const [source_filter, setSourceFilter] = useState<LinkBuildingHistorySource | "">("");
  const [order_id_search, setOrderIdSearch] = useState("");
  const debounced_order_id_search = useDebounce(order_id_search, 350);

  const [batch_details, setBatchDetails] = useState<Record<string, BatchDetails>>({});
  const [expanded_batch_ids, setExpandedBatchIds] = useState<Set<string>>(new Set());

  const [pending_restore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [is_restoring, setIsRestoring] = useState(false);
  const [restore_progress, setRestoreProgress] = useState<string | null>(null);
  const [notice, setNotice] = useState<PanelNotice | null>(null);

  /** Loads the newest entries (before_id null) or the ones older than before_id. */
  const loadEntries = useCallback(async (before_id: number | null) => {
    const request_id = ++request_id_ref.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      if (row_id) {
        const res = await getLinkBuildingOrderRowHistory(row_id, before_id);
        if (request_id !== request_id_ref.current) return;
        setRowRevisions((prev) => (before_id === null ? res.data : [...prev, ...res.data]));
        setRowInfo({ order_id: res.order_id, is_deleted: res.is_deleted });
        setNextBeforeId(res.meta.next_before_id);
      } else {
        const res = await listLinkBuildingOrderHistory({
          before_id,
          source: source_filter,
          order_id: debounced_order_id_search,
        });
        if (request_id !== request_id_ref.current) return;
        setBatches((prev) => (before_id === null ? res.data : [...prev, ...res.data]));
        setNextBeforeId(res.meta.next_before_id);
      }
    } catch {
      if (request_id !== request_id_ref.current) return;
      setLoadError("The history could not be loaded. Please try again.");
    } finally {
      if (request_id === request_id_ref.current) setIsLoading(false);
    }
  }, [row_id, source_filter, debounced_order_id_search]);

  useEffect(() => {
    if (!is_open) return;
    setPendingRestore(null);
    setExpandedBatchIds(new Set());
    loadEntries(null);
  }, [is_open, loadEntries]);

  // A new panel (or another row) starts without the previous result.
  useEffect(() => {
    if (!is_open) {
      setNotice(null);
      setBatches([]);
      setRowRevisions([]);
      setRowInfo(null);
      setNextBeforeId(null);
      setBatchDetails({});
    }
  }, [is_open, row_id]);

  useEffect(() => {
    if (!is_open) return;
    close_button_ref.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  /** Loads the next page of revisions of an action, the first one when it is opened. */
  const loadBatchRevisions = useCallback(async (batch_id: string) => {
    const current = batch_details[batch_id];
    if (current?.is_loading || (current && !current.has_more)) return;

    setBatchDetails((prev) => ({
      ...prev,
      [batch_id]: { revisions: current?.revisions ?? [], has_more: true, next_after_id: current?.next_after_id ?? null, is_loading: true },
    }));
    try {
      const res = await getLinkBuildingOrderHistoryBatch(batch_id, current?.next_after_id ?? null);
      setBatchDetails((prev) => ({
        ...prev,
        [batch_id]: {
          revisions: [...(prev[batch_id]?.revisions ?? []), ...res.data],
          has_more: res.meta.has_more,
          next_after_id: res.meta.next_after_id,
          is_loading: false,
        },
      }));
    } catch {
      setBatchDetails((prev) => ({ ...prev, [batch_id]: { ...prev[batch_id], is_loading: false } }));
      setNotice({ tone: "error", message: "The changes of this action could not be loaded. Please try again.", details: [] });
    }
  }, [batch_details]);

  const toggleBatch = (batch_id: string) => {
    const is_expanded = expanded_batch_ids.has(batch_id);
    setExpandedBatchIds((prev) => {
      const next = new Set(prev);
      if (is_expanded) next.delete(batch_id);
      else next.add(batch_id);
      return next;
    });
    if (!is_expanded && !batch_details[batch_id]) loadBatchRevisions(batch_id);
  };

  const runRestore = useCallback(async (strategy: LinkBuildingConflictStrategy) => {
    if (!pending_restore) return;
    setIsRestoring(true);
    setNotice(null);
    try {
      const result = await restoreLinkBuildingOrderHistory(pending_restore.target, strategy, () =>
        setRestoreProgress("This change is large, it is being restored in the background. You can keep working, the table reloads when it is done.")
      );
      if (!result.applied) {
        setPendingRestore({ ...pending_restore, conflicts: result.conflicts, conflicts_count: result.conflicts_count });
        return;
      }
      setPendingRestore(null);
      const details = result.skipped.map((skip) => describeSkip(skip, column_labels));
      const hidden_skips = result.skipped_count - result.skipped.length;
      if (hidden_skips > 0) details.push(`and ${hidden_skips.toLocaleString()} more rows that could not be restored.`);
      setNotice({ tone: "success", message: result.message, details });
      if (result.data.length > 0 || result.reload_required) onRestored(result);
      setBatchDetails({});
      setExpandedBatchIds(new Set());
      await loadEntries(null);
    } catch (err) {
      const message = (err as { message?: string })?.message;
      setNotice({ tone: "error", message: message || "The change could not be restored. Please try again.", details: [] });
    } finally {
      setIsRestoring(false);
      setRestoreProgress(null);
    }
  }, [pending_restore, column_labels, onRestored, loadEntries]);

  const askBatchRestore = (batch: LinkBuildingHistoryBatch) => {
    const label = HISTORY_SOURCE_LABELS[batch.source]?.toLowerCase() ?? "change";
    const kept_rows = batch.created_count > 0 ? " Rows it added are kept." : "";
    setPendingRestore({
      key: `batch:${batch.batch_id}`,
      target: { batch_id: batch.batch_id },
      question: `Restore ${describeBatch(batch)} to how they were before this ${label}?${kept_rows}`,
      conflicts: null,
      conflicts_count: 0,
    });
  };

  const askRevisionRestore = (revision: LinkBuildingOrderRevision) => {
    const row_label = revision.order_id ?? "this row";
    setPendingRestore({
      key: `revision:${revision.id}`,
      target: { revision_id: revision.id },
      question: revision.event === "deleted"
        ? `Bring ${row_label} back to the table with the values it had when it was deleted?`
        : `Restore ${revision.changes.length === 1 ? "this cell" : `these ${revision.changes.length} cells`} of ${row_label} to their values before this change?`,
      conflicts: null,
      conflicts_count: 0,
    });
  };

  if (!is_open) return null;

  const has_more = next_before_id !== null;
  const is_row_mode = row_id !== null;
  const is_empty = !is_loading && !load_error && (is_row_mode ? row_revisions.length === 0 : batches.length === 0);

  // Day headings: shown before the first entry of each day.
  let previous_day = "";
  const dayHeading = (iso: string) => {
    const day = historyDayLabel(iso);
    if (day === previous_day) return null;
    previous_day = day;
    return (
      <li className="sticky top-0 z-[1] -mx-4 bg-white/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 backdrop-blur dark:bg-gray-900/95 dark:text-gray-400">
        {day}
      </li>
    );
  };

  const restoredLabel = (batch: LinkBuildingHistoryBatch) => {
    if (!batch.restored) return "";
    const at = batch.restored.restored_at;
    const when = historyDayLabel(at) === "Today" ? `at ${historyTimeLabel(at)}` : `on ${historyDayLabel(at)}`;
    return `Restored ${when}${batch.restored.user ? ` by ${batch.restored.user.name}` : ""}`;
  };

  const restore_button_class = "rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300";

  // Portaled to the body so no ancestor of the table (sticky header, full screen
  // container) can clip the drawer or stack above it.
  return createPortal(
    <div
      className={`fixed inset-0 ${DRAWER_LAYER_CLASS} flex justify-end bg-black/30`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="lbo-history-title"
        className="flex h-full w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div className="min-w-0">
            <h2 id="lbo-history-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {is_row_mode ? `Edit history${row_info?.order_id ? ` · ${row_info.order_id}` : ""}` : "Version history"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {is_row_mode
                ? "Every change to this row, newest first. Restore a change to put its old values back."
                : "Every change to the table, grouped by action. Restore an action to undo it, even after a reload."}
            </p>
          </div>
          <button
            ref={close_button_ref}
            onClick={onClose}
            aria-label="Close history"
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {is_row_mode ? (
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs dark:border-gray-800 dark:bg-gray-800/40">
            <span className="text-gray-600 dark:text-gray-300">
              {row_info?.is_deleted ? "This row was deleted. Restore its deletion to bring it back." : "Showing one row only."}
            </span>
            <button onClick={onShowAllChanges} className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Show all changes
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
            <label className="sr-only" htmlFor="lbo-history-source">Change type</label>
            <select
              id="lbo-history-source"
              value={source_filter}
              onChange={(e) => setSourceFilter(e.target.value as LinkBuildingHistorySource | "")}
              className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">All changes</option>
              {HISTORY_SOURCE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="lbo-history-order-id">Order ID</label>
            <input
              id="lbo-history-order-id"
              value={order_id_search}
              onChange={(e) => setOrderIdSearch(e.target.value)}
              placeholder="Order ID, e.g. BL-25730"
              className="h-8 min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
        )}

        {restore_progress && (
          <div role="status" className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-blue-light-200 bg-blue-light-50 px-3 py-2 text-xs text-blue-light-800 dark:border-blue-light-500/30 dark:bg-blue-light-500/10 dark:text-blue-light-300">
            <span className="mt-0.5 h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            {restore_progress}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className={`mx-4 mt-3 rounded-md border px-3 py-2 text-xs ${
              notice.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            }`}
          >
            <p className="font-medium">{notice.message}</p>
            {notice.details.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {notice.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {load_error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {load_error}{" "}
              <button onClick={() => loadEntries(null)} className="font-semibold underline">Retry</button>
            </div>
          )}

          {is_empty && (
            <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {is_row_mode ? "No changes recorded for this row yet." : "No changes match these filters."}
            </p>
          )}

          {is_row_mode ? (
            <ul className="space-y-2">
              {row_revisions.map((revision) => (
                <React.Fragment key={revision.id}>
                  {dayHeading(revision.created_at)}
                  <li className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <SourceBadge source={revision.source} />
                        <span className="truncate">{revision.user?.name ?? "System"} · {historyTimeLabel(revision.created_at)}</span>
                      </div>
                      {isRevisionRestorable(revision) && (
                        <button
                          onClick={() => askRevisionRestore(revision)}
                          disabled={is_restoring}
                          className={restore_button_class}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                    <RevisionChanges revision={revision} column_labels={column_labels} show_order_id={false} />
                    {pending_restore?.key === `revision:${revision.id}` && (
                      <RestorePrompt
                        pending={pending_restore}
                        column_labels={column_labels}
                        is_working={is_restoring}
                        onConfirm={runRestore}
                        onCancel={() => setPendingRestore(null)}
                      />
                    )}
                  </li>
                </React.Fragment>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {batches.map((batch) => {
                const is_expanded = expanded_batch_ids.has(batch.batch_id);
                const details = batch_details[batch.batch_id];
                const order_ids = describeOrderIds(batch);
                const loaded_count = details?.revisions.length ?? 0;
                return (
                  <React.Fragment key={batch.batch_id}>
                    {dayHeading(batch.started_at)}
                    <li className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <SourceBadge source={batch.source} />
                            {batch.restored && (
                              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700/60 dark:text-gray-300">
                                {restoredLabel(batch)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">{describeBatch(batch)}</p>
                          {order_ids && (
                            <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500 dark:text-gray-400" title={order_ids}>
                              {order_ids}
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {batch.user?.name ?? "System"} · {historyTimeLabel(batch.started_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => toggleBatch(batch.batch_id)}
                            aria-expanded={is_expanded}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            {is_expanded ? "Hide" : "Details"}
                          </button>
                          {isBatchRestorable(batch) && (
                            <button
                              onClick={() => askBatchRestore(batch)}
                              disabled={is_restoring}
                              className={restore_button_class}
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>

                      {pending_restore?.key === `batch:${batch.batch_id}` && (
                        <RestorePrompt
                          pending={pending_restore}
                          column_labels={column_labels}
                          is_working={is_restoring}
                          onConfirm={runRestore}
                          onCancel={() => setPendingRestore(null)}
                        />
                      )}

                      {is_expanded && (
                        <div className="mt-2 space-y-2 border-t border-gray-100 pt-2 dark:border-gray-800">
                          {details?.revisions.map((revision) => (
                            <RevisionChanges key={revision.id} revision={revision} column_labels={column_labels} show_order_id />
                          ))}
                          {details?.is_loading && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Loading changes...</p>
                          )}
                          {details && details.has_more && !details.is_loading && (
                            <button
                              onClick={() => loadBatchRevisions(batch.batch_id)}
                              className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                            >
                              Show more ({loaded_count.toLocaleString()} of {batch.revisions_count.toLocaleString()} row changes shown)
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  </React.Fragment>
                );
              })}
            </ul>
          )}

          {is_loading && (
            <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">Loading history...</p>
          )}

          {has_more && !is_loading && (
            <div className="mt-3 text-center">
              <button
                onClick={() => loadEntries(next_before_id)}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Load older changes
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
