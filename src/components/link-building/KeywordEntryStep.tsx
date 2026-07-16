"use client";

import React, { useCallback, useState } from "react";
import { OrderSummaryItem } from "./LinkBuildingOrderSummary";
import {
  applyPastedGridToRows,
  isBulkPaste,
  parseBooleanCell,
  parsePastedGrid,
} from "@/lib/pasted-grid";

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

const input_class =
  "h-9 w-full border-0 bg-transparent px-3 py-2 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none dark:text-white/80 dark:placeholder:text-white/20";

const EXACT_MATCH_TOOLTIP =
  "Exact match uses your target keyword word-for-word as the anchor text, while non-exact match uses a variation, partial phrase, or natural language alternative. A healthy link profile typically includes a mix of both.";

const ExactMatchTooltip: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });
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
  const [paste_overflow, setPasteOverflow] = useState<Record<string, number>>({});

  const handleCellPaste = useCallback(
    (
      tier_id: string,
      rows: KeywordRow[],
      row_index: number,
      field_index: number
    ) =>
      (event: React.ClipboardEvent<HTMLInputElement>) => {
        const grid = parsePastedGrid(event.clipboardData.getData("text/plain"));
        if (!isBulkPaste(grid)) return;

        event.preventDefault();
        const { rows: next_rows, overflow_row_count } = applyPastedGridToRows(
          rows,
          row_index,
          field_index,
          KEYWORD_ROW_FIELD_ORDER,
          grid,
          (field, raw_value) =>
            field === "exact_match" ? parseBooleanCell(raw_value) : raw_value
        );

        onKeywordsPaste(tier_id, next_rows);
        setPasteOverflow((prev) => ({ ...prev, [tier_id]: overflow_row_count }));
      },
    [onKeywordsPaste]
  );

  return (
    <div className="space-y-6">
      {/* Description banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Enter your target keywords and landing pages for each placement.
          Copy rows straight from a spreadsheet and paste them into any cell
          below to fill multiple rows at once.
        </p>
      </div>

      {selected_items.map((item) => {
        const rows = keyword_data[item.id] ?? [];
        const overflow_count = paste_overflow[item.id] ?? 0;

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

            {/* Paste overflow warning */}
            {overflow_count > 0 && (
              <div className="flex items-start justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {overflow_count} pasted row{overflow_count !== 1 ? "s" : ""} could
                  not fit — this tier only has {rows.length} placement
                  {rows.length !== 1 ? "s" : ""}. Increase the quantity in the
                  previous step to add more.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setPasteOverflow((prev) => ({ ...prev, [item.id]: 0 }))
                  }
                  className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Table */}
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-8" />
                <col />
                <col />
                <col className="w-36" />
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
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      Exact Match
                      <ExactMatchTooltip />
                    </span>
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
                        onPaste={handleCellPaste(item.id, rows, idx, 0)}
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
                        onPaste={handleCellPaste(item.id, rows, idx, 1)}
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
