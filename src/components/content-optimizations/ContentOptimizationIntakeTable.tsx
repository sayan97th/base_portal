"use client";

import { useCallback } from "react";
import type { ContentOptimizationIntakeRow } from "@/types/client/unified-cart";

const empty_row = (): ContentOptimizationIntakeRow => ({
  primary_keyword: "",
  secondary_keywords: "",
  content_page_url: "",
});

interface ContentOptimizationIntakeTableProps {
  tier_name: string;
  rows: ContentOptimizationIntakeRow[];
  onChange: (rows: ContentOptimizationIntakeRow[]) => void;
  hide_actions?: boolean;
}

export default function ContentOptimizationIntakeTable({
  tier_name,
  rows,
  onChange,
  hide_actions = false,
}: ContentOptimizationIntakeTableProps) {
  const handleRowChange = useCallback(
    (row_index: number, field: keyof ContentOptimizationIntakeRow, value: string) => {
      onChange(
        rows.map((row, i) => (i === row_index ? { ...row, [field]: value } : row))
      );
    },
    [rows, onChange]
  );

  const addRow = useCallback(() => {
    onChange([...rows, empty_row()]);
  }, [rows, onChange]);

  const addFiveRows = useCallback(() => {
    onChange([...rows, ...Array.from({ length: 5 }, empty_row)]);
  }, [rows, onChange]);

  const deleteRow = useCallback(
    (row_index: number) => {
      if (rows.length <= 1) return;
      onChange(rows.filter((_, i) => i !== row_index));
    },
    [rows, onChange]
  );

  return (
    <div className="space-y-3">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {tier_name}
        </span>
        <button
          type="button"
          onClick={() => {
            const csv_rows = [
              ["Target Keyword", "Content Page URL"],
              ...rows.map((r) => [r.primary_keyword, r.content_page_url]),
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
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Spreadsheet View
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-12" />
            <col />
            <col />
            {!hide_actions && <col className="w-10" />}
          </colgroup>
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              <th className="border-b border-r border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500" />
              <th className="border-b border-r border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Target Keyword
              </th>
              <th className="border-b border-r border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Content Page URL
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
                    value={row.primary_keyword}
                    onChange={(e) => handleRowChange(idx, "primary_keyword", e.target.value)}
                    placeholder="e.g. seo content optimization"
                    className="h-8 w-full rounded border-0 bg-transparent px-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 dark:text-white/80 dark:placeholder:text-white/20 dark:focus:bg-blue-950/20 dark:focus:ring-blue-900"
                  />
                </td>

                {/* Content page URL */}
                <td className="border-b border-r border-gray-200 p-1 dark:border-gray-700">
                  <input
                    type="url"
                    value={row.content_page_url}
                    onChange={(e) => handleRowChange(idx, "content_page_url", e.target.value)}
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row actions */}
      {!hide_actions && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={addFiveRows}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            + Add 5 rows
          </button>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            + Add row
          </button>
        </div>
      )}

      {/* Help text */}
      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        Please insert one keyword phrase per row with its corresponding content page URL.
      </p>
    </div>
  );
}
