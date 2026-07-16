"use client";

import { useCallback, useState } from "react";
import type { CartIntakeRow } from "@/types/client/unified-cart";
import { applyPastedGridToRows, isBulkPaste, parsePastedGrid } from "@/lib/pasted-grid";
import PasteOverflowBanner from "@/components/shared/PasteOverflowBanner";

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
  form_index: _form_index,
  total_forms: _total_forms,
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

  const current_notes = rows[0]?.notes ?? "";

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {tier_name}
        </span>
      </div>

      <PasteOverflowBanner
        overflow_row_count={overflow_row_count}
        available_row_count={rows.length}
        onDismiss={() => setOverflowRowCount(0)}
      />

      {/* Keyword table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-10" />
            <col />
            <col />
            <col className="w-44" />
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
                Type of Content
                <span className="ml-1 text-red-500">*</span>
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
                className="group bg-white transition-colors hover:bg-blue-50/20 dark:bg-gray-900 dark:hover:bg-blue-950/10"
              >
                {/* Row number */}
                <td className="border-b border-r border-gray-200 py-2 text-center text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                  {idx + 1}
                </td>

                {/* Primary keyword */}
                <td className="border-b border-r border-gray-200 p-1 dark:border-gray-700">
                  <input
                    type="text"
                    value={row.keyword_phrase ?? ""}
                    onChange={(e) =>
                      handleRowChange(idx, "keyword_phrase", e.target.value)
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

                {/* Type of content */}
                <td className={`border-b border-gray-200 p-1 dark:border-gray-700 ${!hide_actions ? "border-r" : ""}`}>
                  <select
                    value={row.type_of_content ?? ""}
                    onChange={(e) =>
                      handleRowChange(idx, "type_of_content", e.target.value)
                    }
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

                {/* Delete */}
                {!hide_actions && (
                  <td className="border-b border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => deleteRow(idx)}
                      title="Delete row"
                      className="flex h-full w-full items-center justify-center opacity-0 transition-all group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400"
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
            placeholder="Share any instructions, tone of voice, topic ideas, target audience details, or specific requirements for this content. The more context you provide, the better we can tailor your content."
            rows={4}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 transition-colors focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white/80 dark:placeholder:text-white/20 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
          />
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Describe the content style, audience, or any details you&apos;d like us to know. Feel free to write as much as needed.
          </p>
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        Enter 1 primary keyword per article. Secondary keywords are optional. Choose a content type from:{" "}
        <span className="text-gray-600 dark:text-gray-300">
          Blog Article, Product Page, Home Page, About Us Page.
        </span>{" "}
        Tip: paste rows copied from a spreadsheet directly into any cell to fill
        several rows at once.
      </p>
    </div>
  );
}
