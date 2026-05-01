"use client";

import React from "react";
import IntakeFormTable from "./IntakeFormTable";
import type { CartIntakeRow } from "@/types/client/unified-cart";

export interface IntakeFormTierData {
  tier_id: string;
  tier_name: string;
  quantity: number;
  rows: CartIntakeRow[];
}

interface IntakeFormStepProps {
  tier_data: IntakeFormTierData[];
  onRowsChange: (tier_id: string, rows: CartIntakeRow[]) => void;
  error?: string | null;
  onBack: () => void;
  onNext: () => void;
}

export default function IntakeFormStep({
  tier_data,
  onRowsChange,
  error,
  onBack,
  onNext,
}: IntakeFormStepProps) {
  const total_forms = tier_data.length;
  const page_title =
    total_forms === 1
      ? `Intake Form for ${tier_data[0].tier_name}`
      : "Content Intake Forms";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {page_title}
          </h2>
          {total_forms === 1 && (
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              Form 1/1
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Selection
        </button>
      </div>

      {/* Validation error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Incomplete intake form
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Intake tables — one per selected tier */}
      <div className="space-y-6">
        {tier_data.map((tier, idx) => (
          <IntakeFormTable
            key={tier.tier_id}
            tier_name={tier.tier_name}
            form_index={idx + 1}
            total_forms={total_forms}
            rows={tier.rows}
            onChange={(rows) => onRowsChange(tier.tier_id, rows)}
          />
        ))}
      </div>

      {/* Review action */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          Review
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
