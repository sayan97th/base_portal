"use client";

import React from "react";
import type { SeoPackage } from "@/types/client/seo-packages";

export interface SeoCheckoutAction {
  total: number;
  is_processing: boolean;
  onSubmit: () => void;
}

interface SeoPackageOrderSummaryProps {
  selected_package: SeoPackage | null;
  action_label: string;
  onAction: () => void;
  is_action_disabled?: boolean;
  checkout_action?: SeoCheckoutAction;
}

const SeoPackageOrderSummary: React.FC<SeoPackageOrderSummaryProps> = ({
  selected_package,
  action_label,
  onAction,
  is_action_disabled = false,
  checkout_action,
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

      {/* Checkout action: Complete Purchase */}
      {checkout_action ? (
        <div className="space-y-3">
          <button
            onClick={checkout_action.onSubmit}
            disabled={checkout_action.is_processing}
            className="group relative w-full overflow-hidden rounded-xl bg-coral-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-coral-500/20 transition-all hover:bg-coral-600 hover:shadow-coral-500/30 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none dark:disabled:bg-gray-700"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 60%)",
              }}
            />
            {checkout_action.is_processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Processing payment&hellip;
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
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
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                  />
                </svg>
                Complete Purchase
              </span>
            )}
          </button>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            Secured &amp; encrypted by Stripe
          </div>
        </div>
      ) : (
        /* Regular step action button */
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
      )}
    </div>
  );
};

export default SeoPackageOrderSummary;
