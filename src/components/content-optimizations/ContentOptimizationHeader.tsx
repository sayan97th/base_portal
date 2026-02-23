import React from "react";
import { optimization_features } from "./contentOptimizationData";

const ContentOptimizationHeader: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        SEO Content Optimizations
      </h1>

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Want to revive published content pieces? With our SEO Content Refresh
        offering, we will take your current content and optimize it in the
        following ways:
      </p>

      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
        {optimization_features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
        How to order:
      </h3>

      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
        <li>
          Choose a content piece on your site that you would like optimized.
        </li>
        <li>
          Copy and paste your content into{" "}
          <a
            href="https://wordcounter.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            this tool
          </a>{" "}
          to calculate the total number of words your content piece has.
        </li>
        <li>
          <strong className="font-semibold text-gray-800 dark:text-white/90">
            Choose the option below based on the number of words your content
            piece currently has.
          </strong>
        </li>
        <li>Checkout.</li>
        <li>
          Fill out the intake form with your target keyword and the content
          page&apos;s URL.
        </li>
      </ol>
    </div>
  );
};

export default ContentOptimizationHeader;
