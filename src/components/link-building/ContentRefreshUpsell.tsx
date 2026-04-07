import React from "react";
import Link from "next/link";

interface ContentRefreshTier {
  label: string;
  turnaround: string;
  price: number;
}

const content_refresh_tiers: ContentRefreshTier[] = [
  { label: "Current Content Word Count\n0-799", turnaround: "5 Days", price: 220 },
  { label: "Current Content Word Count\n800-1,599", turnaround: "7 Days", price: 275 },
  { label: "Current Content Word Count\n1,600+", turnaround: "9 Days", price: 440 },
];

const ContentRefreshUpsell: React.FC = () => {
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
        {content_refresh_tiers.map((tier) => (
          <div
            key={tier.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"
          >
            <p className="mb-1 whitespace-pre-line text-sm font-semibold text-gray-800 dark:text-white/90">
              {tier.label}
            </p>
            <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
              Turnaround time: {tier.turnaround}
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
