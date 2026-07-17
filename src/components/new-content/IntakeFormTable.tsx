"use client";

import { useCallback, useState } from "react";
import type { CartIntakeRow } from "@/types/client/unified-cart";
import { applyPastedGridToRows, isBulkPaste, parsePastedGrid } from "@/lib/pasted-grid";
import { downloadCsv } from "@/lib/exportCsv";
import PasteOverflowBanner from "@/components/shared/PasteOverflowBanner";
import IntakeTierCard from "@/components/shared/IntakeTierCard";
import IntakeExportCsvButton from "@/components/shared/IntakeExportCsvButton";
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

const CONTENT_TYPES = [
  "Blog Article",
  "Product Page",
  "Home Page",
  "About Us Page",
  "Other",
];

const INTAKE_ROW_FIELD_ORDER: ReadonlyArray<keyof CartIntakeRow> = [
  "keyword_phrase",
  "secondary_keywords",
  "type_of_content",
];

function matchContentType(raw_value: string, current_value: string | null): string | null {
  const match = CONTENT_TYPES.find(
    (type) => type.toLowerCase() === raw_value.trim().toLowerCase()
  );
  return match ?? current_value;
}

interface IntakeFormTableProps {
  tier_name: string;
  form_index: number;
  total_forms: number;
  rows: CartIntakeRow[];
  onChange: (rows: CartIntakeRow[]) => void;
  hide_actions?: boolean;
  show_errors?: boolean;
}

export default function IntakeFormTable({
  tier_name,
  form_index,
  total_forms,
  rows,
  onChange,
  hide_actions = false,
  show_errors = false,
}: IntakeFormTableProps) {
  const [overflow_row_count, setOverflowRowCount] = useState(0);

  const handleRowChange = useCallback(
    (row_index: number, field: keyof CartIntakeRow, value: string) => {
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
          INTAKE_ROW_FIELD_ORDER,
          grid,
          (field, raw_value, current_value) =>
            field === "type_of_content"
              ? matchContentType(raw_value, current_value as string | null)
              : raw_value
        );

        onChange(next_rows);
        setOverflowRowCount(overflow);
      },
    [rows, onChange]
  );

  const handleExportCsv = useCallback(() => {
    downloadCsv(
      `${tier_name.replace(/\s+/g, "_")}_intake.csv`,
      ["#", "Primary Keyword", "Secondary Keywords", "Type of Content", "Notes"],
      rows.map((r, i) => [
        String(i + 1),
        r.keyword_phrase,
        r.secondary_keywords ?? "",
        r.type_of_content ?? "",
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
      action={!hide_actions && <IntakeExportCsvButton onClick={handleExportCsv} />}
    >
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
              <col className="w-44" />
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
                  Type of Content
                  <span className="ml-1 text-red-500">*</span>
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
                      value={row.keyword_phrase ?? ""}
                      onChange={(e) => handleRowChange(idx, "keyword_phrase", e.target.value)}
                      onPaste={handleCellPaste(idx, 0)}
                      placeholder="e.g. seo content strategy"
                      className={INTAKE_INPUT_CLASS}
                    />
                  </td>

                  <td className={INTAKE_TD_CLASS}>
                    <input
                      type="text"
                      value={row.secondary_keywords ?? ""}
                      onChange={(e) => handleRowChange(idx, "secondary_keywords", e.target.value)}
                      onPaste={handleCellPaste(idx, 1)}
                      placeholder="e.g. content marketing, seo tips"
                      className={INTAKE_INPUT_CLASS}
                    />
                  </td>

                  <td className={!hide_actions ? INTAKE_TD_CLASS : INTAKE_TD_LAST_CLASS}>
                    <select
                      value={row.type_of_content ?? ""}
                      onChange={(e) => handleRowChange(idx, "type_of_content", e.target.value)}
                      className={`h-8 w-full cursor-pointer rounded border-0 bg-transparent px-2 text-sm text-gray-700 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset dark:bg-transparent dark:text-white/80 dark:focus:bg-blue-950/20 ${
                        show_errors && !row.type_of_content
                          ? "ring-2 ring-inset ring-red-300 dark:ring-red-700 focus:ring-red-300 dark:focus:ring-red-700"
                          : "focus:ring-blue-200 dark:focus:ring-blue-900"
                      }`}
                    >
                      <option value="">Select type...</option>
                      {CONTENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
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
              placeholder="Tone of voice, topic ideas, target audience, or any other instructions for this content."
              rows={3}
              className={INTAKE_NOTES_TEXTAREA_CLASS}
            />
          </div>
        </div>
      </div>
    </IntakeTierCard>
  );
}
