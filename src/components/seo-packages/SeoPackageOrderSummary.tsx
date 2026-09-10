"use client";

import React from "react";
import type { SeoPackage } from "@/types/client/seo-packages";

interface SeoPackageOrderSummaryProps {
  selected_package: SeoPackage | null;
  action_label: string;
  onAction: () => void;
  is_action_disabled?: boolean;
}

const SeoPackageOrderSummary: React.FC<SeoPackageOrderSummaryProps> = ({
  selected_package,
  action_label,
  onAction,
  is_action_disabled = false,
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 sm:p-6 lg:sticky lg:top-24">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
        <svg className="h-5 w-5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
        Order Summary
      </h2>

      {!selected_package && (
        <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Select a plan to see your details and schedule a consultation.
        </p>
      )}

      {/* Selected plan card */}
      {selected_package ? (
        <>
          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {selected_package.name}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
              {selected_package.best_for}
            </p>
            <ul className="mt-3 space-y-1.5">
              {selected_package.features.map((feature) => (
                <li key={feature.title} className="flex items-center gap-1.5">
                  <svg
                    className="h-3 w-3 shrink-0 text-coral-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">{feature.title}:</span>{" "}
                    {feature.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Monthly Total
              </p>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-800 dark:text-white/90">
                  ${selected_package.price_per_month.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">per month</p>
              </div>
            </div>
          </div>

          {/* Contract note */}
          <p className="mt-4 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
            Month-to-month subscription. No long-term contracts. Upgrades or downgrades require 30 days&apos; notice.
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
            <svg
              className="h-8 w-8 text-gray-400 dark:text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="mt-5 text-base font-semibold text-gray-800 dark:text-white/90">
            No plan selected yet
          </p>
          <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Choose a plan to view the full summary, including pricing and next steps.
          </p>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={onAction}
        disabled={is_action_disabled}
        className="mt-6 flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-coral-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
      >
        {action_label}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <path
            d="M3 8H13M9 4L13 8L9 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default SeoPackageOrderSummary;
