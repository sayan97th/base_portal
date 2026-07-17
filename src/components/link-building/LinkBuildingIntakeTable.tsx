"use client";

import React, { useCallback, useState } from "react";
import {
  applyPastedGridToRows,
  isBulkPaste,
  parseBooleanCell,
  parsePastedGrid,
} from "@/lib/pasted-grid";
import { downloadCsv } from "@/lib/exportCsv";
import PasteOverflowBanner from "@/components/shared/PasteOverflowBanner";
import IntakeTierCard from "@/components/shared/IntakeTierCard";
import IntakeExportCsvButton from "@/components/shared/IntakeExportCsvButton";
import {
  INTAKE_INPUT_CLASS,
  INTAKE_ROW_CLASS,
  INTAKE_TABLE_CLASS,
  INTAKE_TABLE_WRAPPER_CLASS,
  INTAKE_TD_CLASS,
  INTAKE_TD_INDEX_CLASS,
  INTAKE_TD_LAST_CLASS,
  INTAKE_TH_CLASS,
  INTAKE_TH_INDEX_CLASS,
  INTAKE_TH_LAST_CLASS,
  INTAKE_THEAD_ROW_CLASS,
} from "@/components/shared/intakeTableStyles";

export interface KeywordRow {
  keyword: string;
  landing_page: string;
  exact_match: boolean;
}

export type KeywordData = Record<string, KeywordRow[]>;

const KEYWORD_ROW_FIELD_ORDER: ReadonlyArray<keyof KeywordRow> = [
  "keyword",
  "landing_page",
  "exact_match",
];

const EXACT_MATCH_TOOLTIP =
  "Exact match uses your target keyword word-for-word as the anchor text, while non-exact match uses a variation, partial phrase, or natural language alternative. A healthy link profile typically includes a mix of both.";

const ExactMatchTooltip: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ref = React.useRef<HTMLSpanElement>(null);

  const showTooltip = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const tooltip_width = 256; // w-64
      const centered = rect.left + rect.width / 2;
      const clamped = Math.min(
        Math.max(centered, tooltip_width / 2 + 10),
        window.innerWidth - tooltip_width / 2 - 10
      );
      setCoords({ top: rect.top, left: clamped });
    }
    setVisible(true);
  };

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setVisible(false)}
        className="inline-flex cursor-default"
      >
        <svg
          className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      {visible && (
        <div
          style={{
            position: "fixed",
            top: coords.top - 8,
            left: coords.left,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
          }}
          className="pointer-events-none w-64 rounded-lg bg-gray-900 px-3 py-2 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-white shadow-lg whitespace-normal dark:bg-gray-700"
        >
          {EXACT_MATCH_TOOLTIP}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      )}
    </>
  );
};

interface LinkBuildingIntakeTableProps {
  tier_name: string;
  form_index?: number;
  total_forms?: number;
  rows: KeywordRow[];
  onRowChange: (row_index: number, field: keyof KeywordRow, value: string | boolean) => void;
  onRowsPaste: (rows: KeywordRow[]) => void;
}

export default function LinkBuildingIntakeTable({
  tier_name,
  form_index,
  total_forms,
  rows,
  onRowChange,
  onRowsPaste,
}: LinkBuildingIntakeTableProps) {
  const [overflow_row_count, setOverflowRowCount] = useState(0);

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
          KEYWORD_ROW_FIELD_ORDER,
          grid,
          (field, raw_value) =>
            field === "exact_match" ? parseBooleanCell(raw_value) : raw_value
        );

        onRowsPaste(next_rows);
        setOverflowRowCount(overflow);
      },
    [rows, onRowsPaste]
  );

  const handleExportCsv = useCallback(() => {
    downloadCsv(
      `${tier_name.replace(/\s+/g, "_")}_intake.csv`,
      ["#", "Keyword", "Landing Page", "Exact Match"],
      rows.map((r, i) => [
        String(i + 1),
        r.keyword,
        r.landing_page,
        r.exact_match ? "Yes" : "No",
      ])
    );
  }, [rows, tier_name]);

  return (
    <IntakeTierCard
      tier_name={tier_name}
      form_index={form_index}
      total_forms={total_forms}
      action={<IntakeExportCsvButton onClick={handleExportCsv} />}
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
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr className={INTAKE_THEAD_ROW_CLASS}>
                <th className={INTAKE_TH_INDEX_CLASS} />
                <th className={INTAKE_TH_CLASS}>Keyword / Key Phrase</th>
                <th className={INTAKE_TH_CLASS}>Landing Page</th>
                <th className={INTAKE_TH_LAST_CLASS}>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    Exact Match
                    <ExactMatchTooltip />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className={INTAKE_ROW_CLASS}>
                  <td className={INTAKE_TD_INDEX_CLASS}>{idx + 1}</td>

                  <td className={INTAKE_TD_CLASS}>
                    <input
                      type="text"
                      value={row.keyword}
                      onChange={(e) => onRowChange(idx, "keyword", e.target.value)}
                      onPaste={handleCellPaste(idx, 0)}
                      placeholder="Enter keyword..."
                      className={INTAKE_INPUT_CLASS}
                    />
                  </td>

                  <td className={INTAKE_TD_CLASS}>
                    <input
                      type="text"
                      value={row.landing_page}
                      onChange={(e) => onRowChange(idx, "landing_page", e.target.value)}
                      onPaste={handleCellPaste(idx, 1)}
                      placeholder="https://"
                      className={INTAKE_INPUT_CLASS}
                    />
                  </td>

                  <td className={INTAKE_TD_LAST_CLASS}>
                    <div className="flex h-8 items-center px-2.5">
                      <input
                        type="checkbox"
                        checked={row.exact_match}
                        onChange={(e) => onRowChange(idx, "exact_match", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-coral-500 accent-coral-500 focus:ring-coral-500"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </IntakeTierCard>
  );
}
