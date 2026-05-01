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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3 lg:sticky lg:top-24">
      <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">
        Order Summary
      </h2>

      {/* Selected plan card */}
      {selected_package ? (
        <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {selected_package.name}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
            {selected_package.best_for}
          </p>
          <ul className="mt-3 space-y-1.5">
            {selected_package.features.map((feature) => (
              <li key={feature.category} className="flex items-center gap-1.5">
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
                  <span className="font-semibold">{feature.category}:</span>{" "}
                  {feature.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">
          No plan selected yet.
        </p>
      )}

      {/* Pricing */}
      <div className="mb-5 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Monthly Total
          </p>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-800 dark:text-white/90">
              {selected_package
                ? `$${selected_package.price_per_month.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "—"}
            </p>
            {selected_package && (
              <p className="text-xs text-gray-400 dark:text-gray-500">per month</p>
            )}
          </div>
        </div>
      </div>

      {/* Contract note */}
      <p className="mb-5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
        Month-to-month subscription. No long-term contracts. Upgrades or downgrades require 30 days&apos; notice.
      </p>

      {/* Action button */}
      <button
        onClick={onAction}
        disabled={is_action_disabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
      >
        {action_label}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
