import React from "react";

const feature_list = [
  "Editorial coverage on high-authority news sites",
  "Strengthens brand entity signals for Google & AI Search",
  "Builds brand credibility and awareness",
  "Supports visibility across traditional and AI-era search",
  "Legitimate placements on trusted publications",
];

const PremiumMentionsHeader: React.FC = () => {
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
        Get Featured on Trusted News Sites That Support AI-Era Visibility
      </h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Premium News Placements help brands earn editorial coverage on legitimate,
        high-authority news and editorial sites. These placements are designed to
        build brand credibility, strengthen entity signals, and support visibility
        across Google and AI Search.
      </p>
      <ul className="space-y-1.5">
        {feature_list.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PremiumMentionsHeader;
