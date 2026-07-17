"use client";

import React from "react";
import { OrderSummaryItem } from "./LinkBuildingOrderSummary";
import IntakeInfoBanner from "@/components/shared/IntakeInfoBanner";
import LinkBuildingIntakeTable, {
  type KeywordRow,
  type KeywordData,
} from "./LinkBuildingIntakeTable";

export type { KeywordRow, KeywordData };

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
  onKeywordsPaste: (tier_id: string, rows: KeywordRow[]) => void;
  onOrderTitleChange: (value: string) => void;
  onOrderNotesChange: (value: string) => void;
}

const KeywordEntryStep: React.FC<KeywordEntryStepProps> = ({
  selected_items,
  keyword_data,
  order_title,
  order_notes,
  onKeywordChange,
  onKeywordsPaste,
  onOrderTitleChange,
  onOrderNotesChange,
}) => {
  return (
    <div className="space-y-6">
      <IntakeInfoBanner>
        Enter your target keyword and landing page for each placement. Paste rows from a
        spreadsheet into any cell to fill multiple rows at once.
      </IntakeInfoBanner>

      {selected_items.map((item, idx) => (
        <LinkBuildingIntakeTable
          key={item.id}
          tier_name={item.label}
          form_index={idx + 1}
          total_forms={selected_items.length}
          rows={keyword_data[item.id] ?? []}
          onRowChange={(row_index, field, value) =>
            onKeywordChange(item.id, row_index, field, value)
          }
          onRowsPaste={(rows) => onKeywordsPaste(item.id, rows)}
        />
      ))}

      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
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
            rows={4}
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/20 dark:focus:border-brand-800"
          />
        </div>
      </div>
    </div>
  );
};

export default KeywordEntryStep;
