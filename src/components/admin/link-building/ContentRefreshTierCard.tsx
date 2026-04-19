"use client";

import React from "react";
import type { AdminContentRefreshTier } from "@/types/admin/content-refresh-tiers";

interface ContentRefreshTierCardProps {
  tier: AdminContentRefreshTier;
  onEdit: () => void;
  onToggleStatus: (is_active: boolean) => void;
  onDelete: () => void;
}

export default function ContentRefreshTierCard({
  tier,
  onEdit,
  onToggleStatus,
  onDelete,
}: ContentRefreshTierCardProps) {
  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {tier.label}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Word count: {tier.word_count_range}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            tier.is_active
              ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
              : "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400"
          }`}
        >
          {tier.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Price
          </p>
          <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
            ${tier.price.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Turnaround
          </p>
          <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
            {tier.turnaround_days} {tier.turnaround_days === 1 ? "day" : "days"}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Display order
        </p>
        <p className="mt-0.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
          #{tier.sort_order}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <button
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
          Edit
        </button>
        <button
          onClick={() => onToggleStatus(!tier.is_active)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            tier.is_active
              ? "border-warning-200 text-warning-600 hover:bg-warning-50 dark:border-warning-500/30 dark:text-warning-400 dark:hover:bg-warning-500/10"
              : "border-success-200 text-success-600 hover:bg-success-50 dark:border-success-500/30 dark:text-success-400 dark:hover:bg-success-500/10"
          }`}
        >
          {tier.is_active ? "Disable" : "Enable"}
        </button>
        <button
          onClick={onDelete}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-error-300 hover:bg-error-50 hover:text-error-500 dark:border-gray-700 dark:hover:border-error-500/30 dark:hover:bg-error-500/10 dark:hover:text-error-400"
          aria-label="Delete tier"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  );
}
