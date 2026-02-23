import React from "react";
import { brief_features } from "./contentBriefsData";

const ContentBriefsHeader: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        Content Briefs/Outlines
      </h1>

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Get quick and quality content briefs for your website to help with SEO
        rankings. You can expect the following for all of our content briefs:
      </p>

      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
        {brief_features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        <strong className="font-semibold text-gray-800 dark:text-white/90">
          Example Brief:
        </strong>{" "}
        <a
          href="#"
          className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Example 1
        </a>
      </p>
    </div>
  );
};

export default ContentBriefsHeader;
