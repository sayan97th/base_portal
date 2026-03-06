"use client";

import React from "react";
import { OrderSummaryItem } from "./LinkBuildingOrderSummary";

export interface KeywordRow {
  keyword: string;
  landing_page: string;
  exact_match: boolean;
}

export type KeywordData = Record<string, KeywordRow[]>;

interface KeywordEntryStepProps {
  selected_items: OrderSummaryItem[];
  keyword_data: KeywordData;
  order_title: string;
  order_notes: string;
  onKeywordChange: (
    tier_id: string,
    row_index: number,
    field: keyof KeywordRow,
    value: string | boolean
  ) => void;
  onOrderTitleChange: (value: string) => void;
  onOrderNotesChange: (value: string) => void;
}

const input_class =
  "h-9 w-full border-0 bg-transparent px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none dark:text-white/80 dark:placeholder:text-white/20";

const KeywordEntryStep: React.FC<KeywordEntryStepProps> = ({
  selected_items,
  keyword_data,
  order_title,
  order_notes,
  onKeywordChange,
  onOrderTitleChange,
  onOrderNotesChange,
}) => {
  return (
    <div className="space-y-6">
      {selected_items.map((item) => {
        const rows = keyword_data[item.id] ?? [];

        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3"
          >
            {/* Tier header */}
            <div className="border-b border-gray-200  px-5 py-3 dark:border-gray-600 dark:bg-gray-700">
              <h3 className="text-sm font-semibold ">
                {item.label}
              </h3>
            </div>

            {/* Table */}
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-8" />
                <col />
                <col />
                <col className="w-28" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                  <th className="py-2 pl-5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Keyword / Key Phrase
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Landing Page
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Exact Match
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-gray-100 last:border-0 dark:border-gray-800 ${idx % 2 === 1 ? "bg-gray-50/70 dark:bg-white/2" : ""
                      }`}
                  >
                    <td className="py-1 pl-5 text-sm text-gray-400 dark:text-gray-500">
                      {idx + 1}.
                    </td>
                    <td className="border-l border-gray-200 px-1 py-1 dark:border-gray-700">
                      <input
                        type="text"
                        value={row.keyword}
                        onChange={(e) =>
                          onKeywordChange(
                            item.id,
                            idx,
                            "keyword",
                            e.target.value
                          )
                        }
                        placeholder="Enter keyword..."
                        className={input_class}
                      />
                    </td>
                    <td className="border-l border-gray-200 px-1 py-1 dark:border-gray-700">
                      <input
                        type="text"
                        value={row.landing_page}
                        onChange={(e) =>
                          onKeywordChange(
                            item.id,
                            idx,
                            "landing_page",
                            e.target.value
                          )
                        }
                        placeholder="https://"
                        className={input_class}
                      />
                    </td>
                    <td className="border-l border-gray-200 px-3 py-1 dark:border-gray-700">
                      <input
                        type="checkbox"
                        checked={row.exact_match}
                        onChange={(e) =>
                          onKeywordChange(
                            item.id,
                            idx,
                            "exact_match",
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300 text-coral-500 accent-coral-500 focus:ring-coral-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Order Title */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Order Title
          </label>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            optional
          </span>
        </div>
        <input
          type="text"
          value={order_title}
          onChange={(e) => onOrderTitleChange(e.target.value)}
          placeholder="Optional"
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:border-brand-800"
        />
      </div>

      {/* Order Notes */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Order Notes
          </label>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            optional
          </span>
        </div>
        <textarea
          value={order_notes}
          onChange={(e) => onOrderNotesChange(e.target.value)}
          placeholder="Optional"
          rows={5}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:border-brand-800"
        />
      </div>
    </div>
  );
};

export default KeywordEntryStep;
