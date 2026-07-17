"use client";

import { useCallback, useState } from "react";
import type { ContentOptimizationIntakeRow } from "@/types/client/unified-cart";
import {
  applyPastedGridToRows,
  isBulkPaste,
  parsePastedGrid,
  type PastedGrid,
} from "@/lib/pasted-grid";
import type { IntakeImportColumn } from "@/lib/intake-import";
import { downloadCsv } from "@/lib/exportCsv";
import PasteOverflowBanner from "@/components/shared/PasteOverflowBanner";
import IntakeTierCard from "@/components/shared/IntakeTierCard";
import IntakeExportCsvButton from "@/components/shared/IntakeExportCsvButton";
import IntakeImportButton from "@/components/shared/IntakeImportButton";
import IntakeImportDialog from "@/components/shared/IntakeImportDialog";
import IntakeDeleteRowButton from "@/components/shared/IntakeDeleteRowButton";
import {
  INTAKE_INPUT_CLASS,
  INTAKE_NOTES_HEADER_CLASS,
  INTAKE_NOTES_TEXTAREA_CLASS,
  INTAKE_NOTES_WRAPPER_CLASS,
  INTAKE_ROW_CLASS,
  INTAKE_TABLE_CLASS,
  INTAKE_TABLE_WRAPPER_CLASS,
  INTAKE_TD_CLASS,
  INTAKE_TD_INDEX_CLASS,
  INTAKE_TD_LAST_CLASS,
  INTAKE_TH_ACTION_CLASS,
  INTAKE_TH_CLASS,
  INTAKE_TH_INDEX_CLASS,
  INTAKE_TH_LAST_CLASS,
  INTAKE_THEAD_ROW_CLASS,
} from "@/components/shared/intakeTableStyles";

const CO_ROW_FIELD_ORDER: ReadonlyArray<keyof ContentOptimizationIntakeRow> = [
  "primary_keyword",
  "secondary_keywords",
  "content_page_url",
];

const IMPORT_COLUMNS: IntakeImportColumn[] = [
  { label: "Primary Keyword", aliases: ["keyword", "primary keyword", "key phrase"] },
  { label: "Secondary Keywords", aliases: ["secondary keywords", "secondary", "secondary keyword"] },
  { label: "Content Page URL", aliases: ["content page url", "content url", "page url", "url"] },
];

interface ContentOptimizationIntakeTableProps {
  tier_name: string;
  form_index?: number;
  total_forms?: number;
  rows: ContentOptimizationIntakeRow[];
  onChange: (rows: ContentOptimizationIntakeRow[]) => void;
  hide_actions?: boolean;
}

export default function ContentOptimizationIntakeTable({
  tier_name,
  form_index,
  total_forms,
  rows,
  onChange,
  hide_actions = false,
}: ContentOptimizationIntakeTableProps) {
  const [overflow_row_count, setOverflowRowCount] = useState(0);
  const [import_open, setImportOpen] = useState(false);

  const handleImport = useCallback(
    (grid: PastedGrid) => {
      const { rows: next_rows, overflow_row_count: overflow } = applyPastedGridToRows(
        rows,
        0,
        0,
        CO_ROW_FIELD_ORDER,
        grid
      );

      onChange(next_rows);
      setOverflowRowCount(overflow);
    },
    [rows, onChange]
  );

  const handleRowChange = useCallback(
    (row_index: number, field: keyof ContentOptimizationIntakeRow, value: string) => {
      onChange(
        rows.map((row, i) => (i === row_index ? { ...row, [field]: value } : row))
      );
    },
    [rows, onChange]
  );

  const handleNotesChange = useCallback(
    (value: string) => {
      onChange(rows.map((row) => ({ ...row, notes: value })));
    },
    [rows, onChange]
  );

  const deleteRow = useCallback(
    (row_index: number) => {
      if (rows.length <= 1) return;
      onChange(rows.filter((_, i) => i !== row_index));
    },
    [rows, onChange]
  );

  const handleCellPaste = useCallback(
    (row_index: number, field_index: number) =>
      (event: React.ClipboardEvent<HTMLInputElement>) => {
        const grid = parsePastedGrid(event.clipboardData.getData("text/plain"));
        if (!isBulkPaste(grid)) return;

        event.preventDefault();
        const { rows: next_rows, overflow_row_count: overflow } = applyPastedGridToRows(
          rows,
          row_index,
          field_index,
          CO_ROW_FIELD_ORDER,
          grid
        );

        onChange(next_rows);
        setOverflowRowCount(overflow);
      },
    [rows, onChange]
  );

  const handleExportCsv = useCallback(() => {
    downloadCsv(
      `${tier_name.replace(/\s+/g, "_")}_intake.csv`,
      ["#", "Primary Keyword", "Secondary Keywords", "Content Page URL", "Notes"],
      rows.map((r, i) => [
        String(i + 1),
        r.primary_keyword,
        r.secondary_keywords,
        r.content_page_url,
        r.notes ?? "",
      ])
    );
  }, [rows, tier_name]);

  const current_notes = rows[0]?.notes ?? "";

  return (
    <IntakeTierCard
      tier_name={tier_name}
      form_index={form_index}
      total_forms={total_forms}
      action={
        !hide_actions && (
          <div className="flex items-center gap-4">
            <IntakeImportButton onClick={() => setImportOpen(true)} />
            <IntakeExportCsvButton onClick={handleExportCsv} />
          </div>
        )
      }
    >
      {!hide_actions && (
        <IntakeImportDialog
          is_open={import_open}
          on_close={() => setImportOpen(false)}
          title={`Import Pages — ${tier_name}`}
          accent="violet"
          columns={IMPORT_COLUMNS}
          available_row_count={rows.length}
          on_import={handleImport}
        />
      )}

      <div className="space-y-4">
        <PasteOverflowBanner
          overflow_row_count={overflow_row_count}
          available_row_count={rows.length}
          onDismiss={() => setOverflowRowCount(0)}
        />

        <div className={INTAKE_TABLE_WRAPPER_CLASS}>
          <table className={INTAKE_TABLE_CLASS}>
            <colgroup>
              <col className="w-10" />
              <col />
              <col />
              <col />
              {!hide_actions && <col className="w-10" />}
            </colgroup>
            <thead>
              <tr className={INTAKE_THEAD_ROW_CLASS}>
                <th className={INTAKE_TH_INDEX_CLASS} />
                <th className={INTAKE_TH_CLASS}>Primary Keyword</th>
                <th className={INTAKE_TH_CLASS}>
                  Secondary Keywords
                  <span className="ml-1 font-normal text-gray-400 dark:text-gray-500">
                    (optional)
                  </span>
                </th>
                <th className={!hide_actions ? INTAKE_TH_CLASS : INTAKE_TH_LAST_CLASS}>
                  Content Page URL
                </th>
                {!hide_actions && <th className={INTAKE_TH_ACTION_CLASS} />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className={INTAKE_ROW_CLASS}>
                  <td className={INTAKE_TD_INDEX_CLASS}>{idx + 1}</td>

                  <td className={INTAKE_TD_CLASS}>
                    <input
                      type="text"
                      value={row.primary_keyword ?? ""}
                      onChange={(e) => handleRowChange(idx, "primary_keyword", e.target.value)}
                      onPaste={handleCellPaste(idx, 0)}
                      placeholder="e.g. seo content optimization"
                      className={INTAKE_INPUT_CLASS}
                    />
                  </td>

                  <td className={INTAKE_TD_CLASS}>
                    <input
                      type="text"
                      value={row.secondary_keywords ?? ""}
                      onChange={(e) => handleRowChange(idx, "secondary_keywords", e.target.value)}
                      onPaste={handleCellPaste(idx, 1)}
                      placeholder="e.g. content marketing, on-page seo"
                      className={INTAKE_INPUT_CLASS}
                    />
                  </td>

                  <td className={!hide_actions ? INTAKE_TD_CLASS : INTAKE_TD_LAST_CLASS}>
                    <input
                      type="url"
                      value={row.content_page_url ?? ""}
                      onChange={(e) => handleRowChange(idx, "content_page_url", e.target.value)}
                      onPaste={handleCellPaste(idx, 2)}
                      placeholder="https://example.com/page"
                      className={INTAKE_INPUT_CLASS}
                    />
                  </td>

                  {!hide_actions && (
                    <td className="border-b border-gray-200 dark:border-gray-700">
                      <IntakeDeleteRowButton onClick={() => deleteRow(idx)} disabled={rows.length <= 1} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={INTAKE_NOTES_WRAPPER_CLASS}>
          <div className={INTAKE_NOTES_HEADER_CLASS}>
            <svg
              className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Notes</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">(optional)</span>
          </div>
          <div className="p-3">
            <textarea
              value={current_notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Optimization goals, competitor pages, or any other context for this page."
              rows={3}
              className={INTAKE_NOTES_TEXTAREA_CLASS}
            />
          </div>
        </div>
      </div>
    </IntakeTierCard>
  );
}
