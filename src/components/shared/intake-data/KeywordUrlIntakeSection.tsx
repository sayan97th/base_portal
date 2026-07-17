"use client";

import { useCallback, useState } from "react";
import {
  applyPastedGridToRows,
  isBulkPaste,
  parsePastedGrid,
  type PastedGrid,
} from "@/lib/pasted-grid";
import type { IntakeImportColumn } from "@/lib/intake-import";
import PasteOverflowBanner from "@/components/shared/PasteOverflowBanner";
import IntakeImportButton from "@/components/shared/IntakeImportButton";
import IntakeImportDialog from "@/components/shared/IntakeImportDialog";

/**
 * Shared "primary keyword / secondary keywords / content page URL / notes"
 * row shape used by the post-purchase Content Optimization and Content Brief
 * intake pages (client + admin). Row count is fixed to the quantity
 * purchased, so — unlike the pre-purchase cart intake tables — rows can't be
 * added or removed here, only filled in or bulk-pasted.
 */
export interface KeywordUrlEditableRow {
  primary_keyword: string;
  secondary_keywords: string;
  content_page_url: string;
  notes: string;
}

export interface KeywordUrlEditableItem {
  item_id: string;
  label: string;
  quantity: number;
  rows: KeywordUrlEditableRow[];
}

const KEYWORD_URL_FIELD_ORDER: ReadonlyArray<keyof KeywordUrlEditableRow> = [
  "primary_keyword",
  "secondary_keywords",
  "content_page_url",
  "notes",
];

const ACCENT_CLASSES: Record<"violet" | "emerald", { badge_bg: string; badge_text: string; pill: string }> = {
  violet: {
    badge_bg: "bg-violet-100 dark:bg-violet-500/20",
    badge_text: "text-violet-700 dark:text-violet-300",
    pill: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  },
  emerald: {
    badge_bg: "bg-emerald-100 dark:bg-emerald-500/20",
    badge_text: "text-emerald-700 dark:text-emerald-300",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
};

interface KeywordUrlIntakeSectionProps {
  item_index: number;
  item: KeywordUrlEditableItem;
  accent: "violet" | "emerald";
  primary_keyword_label: string;
  secondary_keywords_label: string;
  content_page_url_label: string;
  row_noun: string;
  onRowChange: (row_index: number, field: keyof KeywordUrlEditableRow, value: string) => void;
  onRowsPaste: (rows: KeywordUrlEditableRow[]) => void;
}

/** One item's tier header + bulk-paste-enabled intake table, shared by the
 * Content Optimization and Content Brief post-purchase intake pages. */
export default function KeywordUrlIntakeSection({
  item_index,
  item,
  accent,
  primary_keyword_label,
  secondary_keywords_label,
  content_page_url_label,
  row_noun,
  onRowChange,
  onRowsPaste,
}: KeywordUrlIntakeSectionProps) {
  const [overflow_row_count, setOverflowRowCount] = useState(0);
  const [import_open, setImportOpen] = useState(false);
  const styles = ACCENT_CLASSES[accent];

  const import_columns: IntakeImportColumn[] = [
    { label: primary_keyword_label, aliases: ["keyword", "primary keyword", "key phrase", "target keyword"] },
    { label: secondary_keywords_label, aliases: ["secondary keywords", "secondary", "secondary keyword"] },
    { label: content_page_url_label, aliases: ["content page url", "content url", "page url", "url", "live url"] },
    { label: "Notes", aliases: ["notes", "note"] },
  ];

  const handleImport = useCallback(
    (grid: PastedGrid) => {
      const { rows: next_rows, overflow_row_count: overflow } = applyPastedGridToRows(
        item.rows,
        0,
        0,
        KEYWORD_URL_FIELD_ORDER,
        grid
      );
      onRowsPaste(next_rows);
      setOverflowRowCount(overflow);
    },
    [item.rows, onRowsPaste]
  );

  const handleCellPaste = useCallback(
    (row_index: number, field_index: number) =>
      (event: React.ClipboardEvent<HTMLInputElement>) => {
        const grid = parsePastedGrid(event.clipboardData.getData("text/plain"));
        if (!isBulkPaste(grid)) return;

        event.preventDefault();
        const { rows: next_rows, overflow_row_count: overflow } = applyPastedGridToRows(
          item.rows,
          row_index,
          field_index,
          KEYWORD_URL_FIELD_ORDER,
          grid
        );
        onRowsPaste(next_rows);
        setOverflowRowCount(overflow);
      },
    [item.rows, onRowsPaste]
  );

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${styles.badge_bg} ${styles.badge_text}`}>
          {item_index + 1}
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{item.label}</h2>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles.pill}`}>
              {item.rows.length} {item.rows.length === 1 ? row_noun : `${row_noun}s`}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">Qty ordered: {item.quantity}</span>
          </div>
          <IntakeImportButton onClick={() => setImportOpen(true)} />
        </div>
      </div>

      <IntakeImportDialog
        is_open={import_open}
        on_close={() => setImportOpen(false)}
        title={`Import Keywords — ${item.label}`}
        accent={accent}
        columns={import_columns}
        available_row_count={item.rows.length}
        on_import={handleImport}
      />

      <PasteOverflowBanner
        overflow_row_count={overflow_row_count}
        available_row_count={item.rows.length}
        onDismiss={() => setOverflowRowCount(0)}
      />

      {/* Intake table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col className="w-12" />
            <col className="w-[24%]" />
            <col className="w-[24%]" />
            <col className="w-[28%]" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              <th className="border-b border-r border-gray-200 py-2 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                #
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                {primary_keyword_label}
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                {secondary_keywords_label}
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                {content_page_url_label}
              </th>
              <th className="border-b border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {item.rows.map((row, row_index) => (
              <tr
                key={row_index}
                className="border-b border-gray-100 bg-white last:border-b-0 dark:border-gray-800 dark:bg-gray-900"
              >
                <td className="border-r border-gray-200 py-1 text-center text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                  {row_index + 1}
                </td>
                <td className="border-r border-gray-200 px-2 py-1 dark:border-gray-700">
                  <input
                    type="text"
                    value={row.primary_keyword}
                    onChange={(e) => onRowChange(row_index, "primary_keyword", e.target.value)}
                    onPaste={handleCellPaste(row_index, 0)}
                    placeholder="e.g. best running shoes"
                    className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:bg-gray-800"
                  />
                </td>
                <td className="border-r border-gray-200 px-2 py-1 dark:border-gray-700">
                  <input
                    type="text"
                    value={row.secondary_keywords}
                    onChange={(e) => onRowChange(row_index, "secondary_keywords", e.target.value)}
                    onPaste={handleCellPaste(row_index, 1)}
                    placeholder="Comma-separated keywords"
                    className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:bg-gray-800"
                  />
                </td>
                <td className="border-r border-gray-200 px-2 py-1 dark:border-gray-700">
                  <input
                    type="text"
                    value={row.content_page_url}
                    onChange={(e) => onRowChange(row_index, "content_page_url", e.target.value)}
                    onPaste={handleCellPaste(row_index, 2)}
                    placeholder="https://example.com/page"
                    className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:bg-gray-800"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) => onRowChange(row_index, "notes", e.target.value)}
                    onPaste={handleCellPaste(row_index, 3)}
                    placeholder="Optional notes"
                    className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:bg-gray-800"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
