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
 * Row shape used by the post-purchase New Content intake pages (client +
 * admin). Row count is fixed to the quantity purchased, so — unlike the
 * pre-purchase cart intake table — rows can't be added or removed here, only
 * filled in or bulk-pasted.
 */
export interface NewContentEditableRow {
  keyword_phrase: string;
  secondary_keywords: string;
  type_of_content: string;
  notes: string;
}

export interface NewContentEditableItem {
  item_id: string;
  label: string;
  quantity: number;
  rows: NewContentEditableRow[];
}

export const NEW_CONTENT_TYPE_OPTIONS = [
  "Blog Article",
  "Product Page",
  "Home Page",
  "About Us Page",
  "Other",
];

const NEW_CONTENT_FIELD_ORDER: ReadonlyArray<keyof NewContentEditableRow> = [
  "keyword_phrase",
  "secondary_keywords",
  "type_of_content",
  "notes",
];

const IMPORT_COLUMNS: IntakeImportColumn[] = [
  { label: "Keyword Phrase", aliases: ["keyword", "keyword phrase", "primary keyword", "key phrase"] },
  { label: "Secondary Keywords", aliases: ["secondary keywords", "secondary", "secondary keyword"] },
  { label: "Type of Content", aliases: ["type of content", "content type", "type"] },
  { label: "Notes", aliases: ["notes", "note"] },
];

/** Matches a pasted cell against the known content types (case-insensitive);
 * falls back to whatever the cell was already set to when there's no match. */
function matchContentType(raw_value: string, current_value: string): string {
  const match = NEW_CONTENT_TYPE_OPTIONS.find(
    (type) => type.toLowerCase() === raw_value.trim().toLowerCase()
  );
  return match ?? current_value;
}

function parseNewContentCell(
  field: keyof NewContentEditableRow,
  raw_value: string,
  current_value: string
): string {
  return field === "type_of_content" ? matchContentType(raw_value, current_value) : raw_value;
}

interface NewContentIntakeSectionProps {
  item_index: number;
  item: NewContentEditableItem;
  onRowChange: (row_index: number, field: keyof NewContentEditableRow, value: string) => void;
  onRowsPaste: (rows: NewContentEditableRow[]) => void;
}

/** One item's tier header + bulk-paste-enabled intake table, shared by the
 * New Content post-purchase intake pages (client + admin). */
export default function NewContentIntakeSection({
  item_index,
  item,
  onRowChange,
  onRowsPaste,
}: NewContentIntakeSectionProps) {
  const [overflow_row_count, setOverflowRowCount] = useState(0);
  const [import_open, setImportOpen] = useState(false);

  const handleImport = useCallback(
    (grid: PastedGrid) => {
      const { rows: next_rows, overflow_row_count: overflow } = applyPastedGridToRows(
        item.rows,
        0,
        0,
        NEW_CONTENT_FIELD_ORDER,
        grid,
        parseNewContentCell
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
          NEW_CONTENT_FIELD_ORDER,
          grid,
          parseNewContentCell
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
          {item_index + 1}
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{item.label}</h2>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              {item.rows.length} {item.rows.length === 1 ? "article" : "articles"}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">Qty ordered: {item.quantity}</span>
          </div>
          <IntakeImportButton onClick={() => setImportOpen(true)} />
        </div>
      </div>

      <IntakeImportDialog
        is_open={import_open}
        on_close={() => setImportOpen(false)}
        title={`Import Content Rows — ${item.label}`}
        accent="blue"
        columns={IMPORT_COLUMNS}
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
            <col className="w-[26%]" />
            <col className="w-[24%]" />
            <col className="w-48" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              <th className="border-b border-r border-gray-200 py-2 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500">
                #
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Keyword Phrase
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Secondary Keywords
              </th>
              <th className="border-b border-r border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Type of Content
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
                    value={row.keyword_phrase}
                    onChange={(e) => onRowChange(row_index, "keyword_phrase", e.target.value)}
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
                  <select
                    value={row.type_of_content}
                    onChange={(e) => onRowChange(row_index, "type_of_content", e.target.value)}
                    className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-gray-800 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:text-white/90 dark:focus:bg-gray-800"
                  >
                    <option value="">Select type…</option>
                    {NEW_CONTENT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
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
