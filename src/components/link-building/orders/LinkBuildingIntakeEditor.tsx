"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type {
  LinkBuildingDetailsPlacement,
  OrderDetailsResult,
} from "@/services/client/order-details.service";
import {
  applyPastedGridToRows,
  isBulkPaste,
  parseBooleanCell,
  parsePastedGrid,
  type PastedGrid,
} from "@/lib/pasted-grid";
import type { IntakeImportColumn } from "@/lib/intake-import";
import PasteOverflowBanner from "@/components/shared/PasteOverflowBanner";
import IntakeImportButton from "@/components/shared/IntakeImportButton";
import IntakeImportDialog from "@/components/shared/IntakeImportDialog";

// ── Types ────────────────────────────────────────────────────────────────────

export interface EditorPlacement {
  id: string;
  keyword: string;
  landing_page: string;
  exact_match: boolean;
}

export interface EditorItem {
  id: string;
  label: string;
  quantity: number;
  placements: EditorPlacement[];
}

interface LinkBuildingIntakeEditorProps {
  order_id: string;
  order_title: string | null;
  created_at: string;
  status: string;
  items: EditorItem[];
  onSave: (placements: LinkBuildingDetailsPlacement[]) => Promise<OrderDetailsResult>;
  back_href: string;
  is_admin?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const PLACEMENT_FIELD_ORDER: ReadonlyArray<keyof EditorPlacement> = [
  "keyword",
  "landing_page",
  "exact_match",
];

const IMPORT_COLUMNS: IntakeImportColumn[] = [
  { label: "Keyword", aliases: ["keyword", "keywords", "key phrase", "keyword / key phrase"] },
  { label: "Landing Page", aliases: ["landing page", "landing", "url", "target url", "target page"] },
  { label: "Exact Match", aliases: ["exact match", "exact", "match"] },
];

function parsePlacementCell(
  field: keyof EditorPlacement,
  raw_value: string
): EditorPlacement[keyof EditorPlacement] {
  return field === "exact_match" ? parseBooleanCell(raw_value) : raw_value;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LinkBuildingIntakeEditor({
  order_id,
  order_title,
  created_at,
  status,
  items,
  onSave,
  back_href,
  is_admin = false,
}: LinkBuildingIntakeEditorProps) {
  // Flat editable state keyed by placement id, plus the grouped structure for layout.
  const [rows, setRows] = useState<Record<string, EditorPlacement>>(() => {
    const map: Record<string, EditorPlacement> = {};
    for (const item of items) {
      for (const placement of item.placements) {
        map[placement.id] = { ...placement };
      }
    }
    return map;
  });

  const [current_status, setCurrentStatus] = useState(status);
  const [is_saving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const total_placements = useMemo(
    () => items.reduce((sum, item) => sum + item.placements.length, 0),
    [items]
  );

  const filled_count = useMemo(
    () =>
      Object.values(rows).filter(
        (r) => r.keyword.trim() !== "" && r.landing_page.trim() !== ""
      ).length,
    [rows]
  );

  const is_pending_details = current_status === "pending_details";

  const handleChange = (
    id: string,
    field: keyof EditorPlacement,
    value: string | boolean
  ) => {
    if (error) setError(null);
    if (saved) setSaved(false);
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  // ── Bulk copy/paste ─────────────────────────────────────────────────────────
  // Row count per item is capped to the quantity purchased, so pasted grids are
  // applied against that item's placements only and any overflow is surfaced.

  const [overflow_by_item, setOverflowByItem] = useState<Record<string, number>>({});
  const [import_open_item_id, setImportOpenItemId] = useState<string | null>(null);

  const applyRowsToItem = (item: EditorItem, next_rows: EditorPlacement[]) => {
    if (error) setError(null);
    if (saved) setSaved(false);
    setRows((prev) => {
      const next = { ...prev };
      item.placements.forEach((placement, index) => {
        next[placement.id] = next_rows[index];
      });
      return next;
    });
  };

  const handleImport = (item: EditorItem) => (grid: PastedGrid) => {
    const item_rows = item.placements.map((placement) => rows[placement.id]);
    const { rows: next_rows, overflow_row_count } = applyPastedGridToRows(
      item_rows,
      0,
      0,
      PLACEMENT_FIELD_ORDER,
      grid,
      parsePlacementCell
    );
    applyRowsToItem(item, next_rows);
    setOverflowByItem((prev) => ({ ...prev, [item.id]: overflow_row_count }));
  };

  const handleCellPaste = (item: EditorItem, row_index: number, field_index: number) =>
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      const grid = parsePastedGrid(event.clipboardData.getData("text/plain"));
      if (!isBulkPaste(grid)) return;

      event.preventDefault();
      const item_rows = item.placements.map((placement) => rows[placement.id]);
      const { rows: next_rows, overflow_row_count } = applyPastedGridToRows(
        item_rows,
        row_index,
        field_index,
        PLACEMENT_FIELD_ORDER,
        grid,
        parsePlacementCell
      );
      applyRowsToItem(item, next_rows);
      setOverflowByItem((prev) => ({ ...prev, [item.id]: overflow_row_count }));
    };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload: LinkBuildingDetailsPlacement[] = Object.values(rows).map((r) => ({
        id: r.id,
        keyword: r.keyword.trim() || null,
        landing_page: r.landing_page.trim() || null,
        exact_match: r.exact_match,
      }));
      const result = await onSave(payload);
      setCurrentStatus(result.status);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("We couldn't save the details. Please review the fields and try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={back_href}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {is_admin ? "Back to Order" : "Back to Orders"}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-coral-200 bg-coral-50 px-3 py-1.5 dark:border-coral-500/30 dark:bg-coral-500/10">
            <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-coral-700 dark:text-coral-300">
              Link Building
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Keyword &amp; Link Details
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {order_title
              ? `${order_title} · `
              : `Order ${order_id.slice(0, 8).toUpperCase()} · `}
            Placed on {formatDate(created_at)}
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
          {filled_count} / {total_placements} completed
        </span>
      </div>

      {/* Status banners */}
      {saved && !is_pending_details && (
        <div className="flex items-start gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3 dark:border-success-500/25 dark:bg-success-500/10">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <p className="text-sm text-success-700 dark:text-success-300">
            Details submitted. This order is now in the work queue and the turnaround clock has
            started.
          </p>
        </div>
      )}

      {saved && is_pending_details && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/25 dark:bg-blue-500/10">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Progress saved. Fill in the keyword and landing page for every placement to move this
            order into the work queue.
          </p>
        </div>
      )}

      {is_pending_details && !saved && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/8">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This order is <span className="font-semibold">Pending Link Details</span>. Enter the
            target keyword and landing page for each placement below and save — the turnaround clock
            starts once every placement is filled in.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 dark:border-error-500/25 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
        </div>
      )}

      {/* Item sections */}
      <div className="space-y-8">
        {items.map((item, item_index) => (
          <div key={item.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-coral-100 text-sm font-bold text-coral-700 dark:bg-coral-500/20 dark:text-coral-300">
                {item_index + 1}
              </div>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {item.label}
                  </h2>
                  <span className="inline-flex items-center rounded-full border border-coral-200 bg-coral-50 px-2.5 py-0.5 text-xs font-medium text-coral-700 dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-300">
                    {item.placements.length} {item.placements.length === 1 ? "link" : "links"}
                  </span>
                </div>
                <IntakeImportButton onClick={() => setImportOpenItemId(item.id)} />
              </div>
            </div>

            <IntakeImportDialog
              is_open={import_open_item_id === item.id}
              on_close={() => setImportOpenItemId(null)}
              title={`Import Keywords — ${item.label}`}
              accent="coral"
              columns={IMPORT_COLUMNS}
              available_row_count={item.placements.length}
              on_import={handleImport(item)}
            />

            <PasteOverflowBanner
              overflow_row_count={overflow_by_item[item.id] ?? 0}
              available_row_count={item.placements.length}
              onDismiss={() => setOverflowByItem((prev) => ({ ...prev, [item.id]: 0 }))}
            />

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full border-collapse text-sm">
                <colgroup>
                  <col className="w-14" />
                  <col className="w-2/5" />
                  <col />
                  <col className="w-28" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60">
                    <th className="border-b border-r border-gray-200 py-2 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                      #
                    </th>
                    <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                      Keyword
                    </th>
                    <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                      Landing Page
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2 text-center text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                      Exact Match
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {item.placements.map((placement, row_index) => {
                    const row = rows[placement.id];
                    return (
                      <tr
                        key={placement.id}
                        className="border-b border-gray-100 bg-white last:border-b-0 dark:border-gray-800 dark:bg-gray-900"
                      >
                        <td className="border-r border-gray-200 py-1 text-center text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                          {row_index + 1}
                        </td>
                        <td className="border-r border-gray-200 px-2 py-1 dark:border-gray-700">
                          <input
                            type="text"
                            value={row.keyword}
                            onChange={(e) => handleChange(placement.id, "keyword", e.target.value)}
                            onPaste={handleCellPaste(item, row_index, 0)}
                            placeholder="e.g. best running shoes"
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:bg-gray-800"
                          />
                        </td>
                        <td className="border-r border-gray-200 px-2 py-1 dark:border-gray-700">
                          <input
                            type="text"
                            value={row.landing_page}
                            onChange={(e) => handleChange(placement.id, "landing_page", e.target.value)}
                            onPaste={handleCellPaste(item, row_index, 1)}
                            placeholder="https://example.com/page"
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:bg-gray-800"
                          />
                        </td>
                        <td className="px-4 py-1 text-center">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={row.exact_match}
                            aria-label="Exact match"
                            onClick={() => handleChange(placement.id, "exact_match", !row.exact_match)}
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                              row.exact_match
                                ? "border-brand-500 bg-brand-500 text-white"
                                : "border-gray-300 bg-white hover:border-brand-400 dark:border-gray-600 dark:bg-gray-800"
                            }`}
                          >
                            {row.exact_match && (
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Save bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6 dark:border-gray-800">
        <Link
          href={back_href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={is_saving}
          className="inline-flex items-center gap-2 rounded-xl bg-coral-500 px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500"
        >
          {is_saving ? "Saving…" : "Save Details"}
        </button>
      </div>
    </div>
  );
}
