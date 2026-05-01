"use client";

import { useCallback } from "react";
import type { CartIntakeRow } from "@/types/client/unified-cart";

const CONTENT_TYPES = [
  "Blog Article",
  "Product Page",
  "Home Page",
  "About Us Page",
  "Other",
];

const empty_row = (): CartIntakeRow => ({
  keyword_phrase: "",
  type_of_content: "",
  notes: "",
});

interface IntakeFormTableProps {
  tier_name: string;
  form_index: number;
  total_forms: number;
  rows: CartIntakeRow[];
  onChange: (rows: CartIntakeRow[]) => void;
}

export default function IntakeFormTable({
  tier_name,
  form_index: _form_index,
  total_forms: _total_forms,
  rows,
  onChange,
}: IntakeFormTableProps) {
  const handleRowChange = useCallback(
    (row_index: number, field: keyof CartIntakeRow, value: string) => {
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

  return (
    <div className="space-y-3">
      {/* Label row — outside the table border */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {tier_name}
        </span>
        <span className="text-sm font-medium text-brand-500 dark:text-brand-400">
          Spreadsheet View
        </span>
      </div>

      {/* Table — bordered spreadsheet */}
      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-16" />
            <col />
            <col className="w-52" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              <th className="border-b border-r border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-400 dark:border-gray-700 dark:text-gray-500" />
              <th className="border-b border-r border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Keyword Phrase
              </th>
              <th className="border-b border-r border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Type of Content
              </th>
              <th className="border-b border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-white/2"
              >
                <td className="border-b border-r border-gray-200 py-2 text-center text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-500">
                  {idx + 1}
                </td>
                <td className="border-b border-r border-gray-200 p-1 dark:border-gray-700">
                  <input
                    type="text"
                    value={row.keyword_phrase}
                    onChange={(e) =>
                      handleRowChange(idx, "keyword_phrase", e.target.value)
                    }
                    className="h-8 w-full rounded border-0 bg-transparent px-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 dark:text-white/80 dark:placeholder:text-white/20 dark:focus:bg-blue-950/20 dark:focus:ring-blue-900"
                  />
                </td>
                <td className="border-b border-r border-gray-200 p-1 dark:border-gray-700">
                  <select
                    value={row.type_of_content}
                    onChange={(e) =>
                      handleRowChange(idx, "type_of_content", e.target.value)
                    }
                    className="h-8 w-full cursor-pointer rounded border-0 bg-transparent px-2 text-sm text-gray-700 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 dark:bg-transparent dark:text-white/80 dark:focus:bg-blue-950/20 dark:focus:ring-blue-900"
                  >
                    <option value="">Select type...</option>
                    {CONTENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-gray-200 p-1 dark:border-gray-700">
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) =>
                      handleRowChange(idx, "notes", e.target.value)
                    }
                    placeholder='Notes or "none"'
                    className="h-8 w-full rounded border-0 bg-transparent px-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 dark:text-white/80 dark:placeholder:text-white/20 dark:focus:bg-blue-950/20 dark:focus:ring-blue-900"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row actions — outside the table border */}
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

      {/* Help text — outside the table border */}
      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        Please enter 1 keyword phrase per article and choose from the following
        when specifying the type of content you&apos;d like created:{" "}
        <span className="text-gray-600 dark:text-gray-300">
          Blog Article, Product page, Home Page, About Us Page.
        </span>{" "}
        Under notes, feel free to add any notes you&apos;d like for us to know
        or &quot;none.&quot;
      </p>
    </div>
  );
}
