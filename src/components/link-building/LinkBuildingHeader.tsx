import React from "react";

const feature_list = [
  "In-house, original written content",
  "650-700 guest blog word count",
  "Indexed regularly",
  "Do-follow links",
  "30-day turnaround time",
];

const LinkBuildingHeader: React.FC = () => {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">
        Guest Post Backlinks
      </h2>
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

export default LinkBuildingHeader;
