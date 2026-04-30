"use client";

import React from "react";
import type { ActiveSeoSubscription } from "@/types/client/seo-packages";

interface Props {
  subscription: ActiveSeoSubscription;
}

export default function ActiveSubscriptionBanner({ subscription }: Props) {
  function formatDate(date_str: string | null) {
    if (!date_str) return null;
    return new Date(date_str).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const start_label = formatDate(subscription.starts_at);
  const end_label = formatDate(subscription.ends_at);

  return (
    <div className="overflow-hidden rounded-2xl border border-success-200 bg-gradient-to-br from-success-50 to-white shadow-sm dark:border-success-500/20 dark:from-success-500/5 dark:to-gray-900">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: icon + text */}
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-100 dark:bg-success-500/10">
            <svg
              className="h-5.5 w-5.5 text-success-600 dark:text-success-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-semibold text-success-700 dark:bg-success-500/10 dark:text-success-400">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                Active Subscription
              </span>
            </div>
            <h3 className="mt-1.5 text-base font-semibold text-gray-900 dark:text-white">
              {subscription.package.name}
            </h3>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
              ${subscription.package.price_per_month.toLocaleString()}/month
            </p>
          </div>
        </div>

        {/* Right: dates */}
        <div className="flex flex-wrap gap-5 sm:shrink-0 sm:text-right">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Started
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {start_label}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {end_label ? "Expires" : "Renewal"}
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {end_label ?? "Ongoing"}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom note */}
      <div className="border-t border-success-100 bg-success-50/50 px-6 py-3 dark:border-success-500/10 dark:bg-success-500/5">
        <p className="text-xs text-success-700 dark:text-success-400">
          Your SEO package is active. Our team is working on your strategy — reach out to support if you have any questions.
        </p>
      </div>
    </div>
  );
}
