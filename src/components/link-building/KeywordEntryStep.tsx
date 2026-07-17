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
  onKeywordChange: (
    tier_id: string,
    row_index: number,
    field: keyof KeywordRow,
    value: string | boolean
  ) => void;
  onKeywordsPaste: (tier_id: string, rows: KeywordRow[]) => void;
}

const KeywordEntryStep: React.FC<KeywordEntryStepProps> = ({
  selected_items,
  keyword_data,
  onKeywordChange,
  onKeywordsPaste,
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
    </div>
  );
};

export default KeywordEntryStep;
