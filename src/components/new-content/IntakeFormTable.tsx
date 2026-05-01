"use client";

import React, { useCallback } from "react";
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
  form_index,
  total_forms,
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
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-800/60">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {tier_name}
          </h3>
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            Form {form_index}/{total_forms}
          </span>
        </div>
        <span className="text-xs font-medium text-brand-500 dark:text-brand-400">
          Spreadsheet View
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-12" />
            <col />
            <col className="w-48" />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pl-4 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500" />
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Keyword Phrase
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Type of Content
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-white/[0.02]"
              >
                <td className="py-2 pl-4 text-center text-xs font-medium text-gray-400 dark:text-gray-600">
                  {idx + 1}
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    value={row.keyword_phrase}
                    onChange={(e) =>
                      handleRowChange(idx, "keyword_phrase", e.target.value)
                    }
                    placeholder="Enter primary keyword..."
                    className="h-8 w-full rounded-md border-0 bg-transparent px-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 dark:text-white/80 dark:placeholder:text-white/20 dark:focus:bg-blue-950/20 dark:focus:ring-blue-900"
                  />
                </td>
                <td className="p-1">
                  <select
                    value={row.type_of_content}
                    onChange={(e) =>
                      handleRowChange(idx, "type_of_content", e.target.value)
                    }
                    className="h-8 w-full cursor-pointer rounded-md border-0 bg-transparent px-2 text-sm text-gray-700 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 dark:bg-transparent dark:text-white/80 dark:focus:bg-blue-950/20 dark:focus:ring-blue-900"
                  >
                    <option value="">Select type...</option>
                    {CONTENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1">
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) =>
                      handleRowChange(idx, "notes", e.target.value)
                    }
                    placeholder='Notes or "none"'
                    className="h-8 w-full rounded-md border-0 bg-transparent px-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 dark:text-white/80 dark:placeholder:text-white/20 dark:focus:bg-blue-950/20 dark:focus:ring-blue-900"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row actions */}
      <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
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

      {/* Help text */}
      <p className="border-t border-gray-100 px-5 pb-5 pt-3 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
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
