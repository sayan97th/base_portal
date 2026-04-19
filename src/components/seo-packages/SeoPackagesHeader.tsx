import React from "react";

const core_pillars = [
  "Competitive Intelligence: Identifying gaps and exploiting competitor weaknesses.",
  "Content Optimization: Balancing keyword targeting with user experience.",
  "High-Authority Link Building: Manual outreach for quality placements (no link schemes).",
  "Technical SEO: Resolving crawlability, speed, and structural barriers.",
];

const SeoPackagesHeader: React.FC = () => {
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
        SEO Subscription Packages
      </h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Month-to-month plans with no long-term contracts. Upgrades or downgrades require 30 days&apos; notice.
      </p>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Core Pillars Included in All Plans
      </p>
      <ul className="space-y-1.5">
        {core_pillars.map((pillar) => (
          <li
            key={pillar}
            className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
            {pillar}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SeoPackagesHeader;
