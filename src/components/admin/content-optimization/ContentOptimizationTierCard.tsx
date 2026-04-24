"use client";

import React from "react";
import type { AdminContentOptimizationTier } from "@/types/admin/content-optimization";

interface ContentOptimizationTierCardProps {
  tier: AdminContentOptimizationTier;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: (is_active: boolean) => void;
}

function StatusBadge({ tier }: { tier: AdminContentOptimizationTier }) {
  if (!tier.is_active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
        <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
        Disabled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700 dark:bg-success-500/10 dark:text-success-400">
      <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
      Active
    </span>
  );
}

export default function ContentOptimizationTierCard({
  tier,
  onEdit,
  onDelete,
  onToggleStatus,
}: ContentOptimizationTierCardProps) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:shadow-md dark:bg-gray-900 ${
        tier.is_active
          ? "border-gray-200 hover:border-violet-200 dark:border-gray-800 dark:hover:border-violet-800"
          : "border-warning-200 dark:border-warning-800/40"
      } ${tier.is_hidden ? "opacity-70" : ""}`}
    >
      {/* Top gradient bar */}
      <div
        className={`h-1.5 w-full ${
          tier.is_active
            ? "bg-linear-to-r from-violet-400 via-violet-500 to-purple-600"
            : "bg-linear-to-r from-warning-300 to-warning-400"
        }`}
      />

      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                tier.is_active ? "bg-violet-50 dark:bg-violet-500/10" : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <svg
                className={`h-5 w-5 ${tier.is_active ? "text-violet-500" : "text-gray-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{tier.label}</h3>
              <span className="inline-block rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {tier.id}
              </span>
            </div>
          </div>
          <StatusBadge tier={tier} />
        </div>

        {/* Badges row */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tier.is_most_popular && (
            <span className="inline-flex items-center gap-1 rounded-md bg-warning-50 px-1.5 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Most Popular
            </span>
          )}
          {tier.is_hidden && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
              Hidden
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Sort #{tier.sort_order}
          </span>
        </div>

        {/* Price */}
        <div className="mt-4 flex items-end gap-1">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            ${tier.price.toFixed(0)}
          </span>
          <span className="mb-1 text-sm text-gray-400 dark:text-gray-500">/ page</span>
        </div>

        {/* Details */}
        <div className="mt-4 space-y-2 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="h-4 w-4 shrink-0 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="text-gray-500 dark:text-gray-400">
              Word count:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {tier.word_count_range}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="h-4 w-4 shrink-0 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-500 dark:text-gray-400">
              Turnaround:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {tier.turnaround_days} {tier.turnaround_days === 1 ? "day" : "days"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="h-4 w-4 shrink-0 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <span className="text-gray-500 dark:text-gray-400">
              Max quantity:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {tier.max_quantity === null ? "Unlimited" : tier.max_quantity}
              </span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-violet-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => onToggleStatus(!tier.is_active)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
          >
            {tier.is_active ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {tier.is_active ? "Disable" : "Enable"}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-error-200 bg-white px-3 py-2.5 text-xs font-semibold text-error-600 transition-colors hover:bg-error-50 dark:border-error-800/40 dark:bg-white/3 dark:text-error-400 dark:hover:bg-error-500/10"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
