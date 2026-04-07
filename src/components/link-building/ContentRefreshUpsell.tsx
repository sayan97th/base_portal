"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ContentRefreshTier } from "@/types/client/link-building";
import { linkBuildingService } from "@/services/client/link-building.service";

const ContentRefreshUpsell: React.FC = () => {
  const [tiers, setTiers] = useState<ContentRefreshTier[]>([]);
  const [is_loading, setIsLoading] = useState(true);

  const fetchTiers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await linkBuildingService.fetchContentRefreshTiers();
      setTiers(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch {
      // Silently fail — the upsell section simply stays hidden
      setTiers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  // Don't render anything while loading or if there are no active tiers
  if (is_loading || tiers.length === 0) return null;

  return (
    <div className="mt-8">
      {/* Popular Pairing label */}
      <p className="mb-3 text-sm font-medium text-amber-500">
        ⭐ Popular Pairing:
      </p>

      {/* Section header */}
      <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
        Content Refresh
      </h2>
      <p className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">
        Don&apos;t Just Build Links. Build Authority.
      </p>
      <p className="mb-5 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Pair your link order with a content optimization and give our team the green light
        to refresh your landing pages. We&apos;ll align your content with the latest algorithm
        updates and AI search signals, so the URLs you&apos;re building to are credible, current,
        and built to rank.
      </p>

      {/* Word count label */}
      <div className="mb-4 flex items-center gap-2">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
          Choose how many articles you would like optimized and their current word count:
        </p>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          multiple
        </span>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"
          >
            <p className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">
              {tier.label}
            </p>
            <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
              Turnaround time: {tier.turnaround_days} {tier.turnaround_days === 1 ? "Day" : "Days"}
            </p>
            <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />
            <p className="mt-4 text-base font-bold text-gray-800 dark:text-white/90">
              ${tier.price.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* See Details link */}
      <div className="mt-5 flex justify-end">
        <Link
          href="/content-optimizations"
          className="inline-flex items-center gap-1 text-sm font-medium text-coral-500 transition-colors hover:text-coral-600 dark:text-coral-400 dark:hover:text-coral-300"
        >
          See Details
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8H13M9 4L13 8L9 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default ContentRefreshUpsell;
