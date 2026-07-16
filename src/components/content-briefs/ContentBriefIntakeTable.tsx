"use client";

import { useCallback, useState } from "react";
import type { ContentOptimizationIntakeRow } from "@/types/client/unified-cart";
import { applyPastedGridToRows, isBulkPaste, parsePastedGrid } from "@/lib/pasted-grid";
import PasteOverflowBanner from "@/components/shared/PasteOverflowBanner";

const CONTENT_BRIEF_ROW_FIELD_ORDER: ReadonlyArray<keyof ContentOptimizationIntakeRow> = [
  "primary_keyword",
  "secondary_keywords",
  "content_page_url",
];

interface ContentBriefIntakeTableProps {
  tier_name: string;
  rows: ContentOptimizationIntakeRow[];
  onChange: (rows: ContentOptimizationIntakeRow[]) => void;
  hide_actions?: boolean;
}

export default function ContentBriefIntakeTable({
  tier_name,
  rows,
  onChange,
  hide_actions = false,
}: ContentBriefIntakeTableProps) {
  const [overflow_row_count, setOverflowRowCount] = useState(0);

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
          CONTENT_BRIEF_ROW_FIELD_ORDER,
          grid
        );

        onChange(next_rows);
        setOverflowRowCount(overflow);
      },
    [rows, onChange]
  );

  const handleExportCsv = useCallback(() => {
    const csv_rows = [
      ["#", "Primary Keyword", "Secondary Keywords", "Current Live URL", "Notes"],
      ...rows.map((r, i) => [
        String(i + 1),
        r.primary_keyword,
        r.secondary_keywords,
        r.content_page_url,
        r.notes ?? "",
      ]),
    ];
    const csv_content = csv_rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv_content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tier_name.replace(/\s+/g, "_")}_intake.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, tier_name]);

  const current_notes = rows[0]?.notes ?? "";

  return (
    <div className="space-y-4">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {tier_name}
        </span>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Export CSV
        </button>
      </div>

      <PasteOverflowBanner
        overflow_row_count={overflow_row_count}
        available_row_count={rows.length}
        onDismiss={() => setOverflowRowCount(0)}
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-10" />
            <col />
            <col />
            <col />
            {!hide_actions && <col className="w-10" />}
          </colgroup>
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              <th className="border-b border-r border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500" />
              <th className="border-b border-r border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Primary Keyword
              </th>
              <th className="border-b border-r border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Secondary Keywords
                <span className="ml-1 font-normal text-gray-400 dark:text-gray-500">(optional)</span>
              </th>
              <th className={`border-b border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400 ${!hide_actions ? "border-r" : ""}`}>
                Current Live URL
              </th>
              {!hide_actions && (
                <th className="border-b border-gray-200 py-2.5 dark:border-gray-700" />
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="group bg-white transition-colors hover:bg-blue-50/30 dark:bg-gray-900 dark:hover:bg-blue-950/10"
              >
                {/* Row number */}
                <td className="border-b border-r border-gray-200 py-2 text-center text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                  {idx + 1}
                </td>

                {/* Primary keyword */}
                <td className="border-b border-r border-gray-200 p-1 dark:border-gray-700">
                  <input
                    type="text"
                    value={row.primary_keyword ?? ""}
                    onChange={(e) =>
                      handleRowChange(idx, "primary_keyword", e.target.value)
                    }
                    onPaste={handleCellPaste(idx, 0)}
                    placeholder="e.g. seo content strategy"
                    className="h-8 w-full rounded border-0 bg-transparent px-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 dark:text-white/80 dark:placeholder:text-white/20 dark:focus:bg-blue-950/20 dark:focus:ring-blue-900"
                  />
                </td>

                {/* Secondary keywords */}
                <td className="border-b border-r border-gray-200 p-1 dark:border-gray-700">
                  <input
                    type="text"
                    value={row.secondary_keywords ?? ""}
                    onChange={(e) =>
                      handleRowChange(idx, "secondary_keywords", e.target.value)
                    }
                    onPaste={handleCellPaste(idx, 1)}
                    placeholder="e.g. content marketing, seo tips"
                    className="h-8 w-full rounded border-0 bg-transparent px-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 dark:text-white/80 dark:placeholder:text-white/20 dark:focus:bg-blue-950/20 dark:focus:ring-blue-900"
                  />
                </td>

                {/* Current live URL */}
                <td className={`border-b border-gray-200 p-1 dark:border-gray-700 ${!hide_actions ? "border-r" : ""}`}>
                  <input
                    type="url"
                    value={row.content_page_url ?? ""}
                    onChange={(e) =>
                      handleRowChange(idx, "content_page_url", e.target.value)
                    }
                    onPaste={handleCellPaste(idx, 2)}
                    placeholder="https://example.com/page"
                    className="h-8 w-full rounded border-0 bg-transparent px-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 dark:text-white/80 dark:placeholder:text-white/20 dark:focus:bg-blue-950/20 dark:focus:ring-blue-900"
                  />
                </td>

                {/* Delete */}
                {!hide_actions && (
                  <td className="border-b border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => deleteRow(idx)}
                      title="Delete row"
                      disabled={rows.length <= 1}
                      className="flex h-full w-full items-center justify-center opacity-0 transition-all group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
                    >
                      <svg
                        className="h-3.5 w-3.5 text-gray-300 transition-colors group-hover:text-red-400 dark:text-gray-600 dark:group-hover:text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes — per-form textarea outside the table */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/60 dark:border-gray-700/80 dark:bg-gray-800/20">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-gray-700/80">
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
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Notes
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">(optional)</span>
        </div>
        <div className="p-3">
          <textarea
            value={current_notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Share any specific angles, target audience details, tone of voice, competitor pages to reference, or any requirements you'd like us to keep in mind when creating your content brief. The more context you provide, the better we can tailor the brief."
            rows={4}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 transition-colors focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white/80 dark:placeholder:text-white/20 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
          />
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Provide any context or instructions that will help us create a more targeted brief. Feel free to write as much as needed.
          </p>
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        Enter one primary keyword per row with its corresponding live URL. Secondary keywords are optional but improve targeting.
        Tip: paste rows copied from a spreadsheet directly into any cell to fill several rows at once.
      </p>
    </div>
  );
}
