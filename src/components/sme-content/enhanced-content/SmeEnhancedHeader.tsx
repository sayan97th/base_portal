import React from "react";

const SmeEnhancedHeader: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        SME Enhanced Content
      </h1>

      <p className="mb-4 text-sm italic text-gray-600 dark:text-gray-400">
        We write the content and have a qualified SME review it for technical
        accuracy and put their name on the article.
      </p>

      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm font-medium text-gray-700 dark:text-gray-300">
        <li>Technical accuracy verification by qualified SMEs</li>
        <li>Identification of knowledge gaps and credibility issues</li>
        <li>Industry-specific terminology refinement</li>
        <li>Up-to-date information and best practices verification</li>
      </ul>

      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        After placing your order, you&apos;ll be able to specify the type of
        content you&apos;d like created for the word count chosen from the
        following:
      </p>

      <ul className="list-disc space-y-1.5 pl-5 text-sm font-medium text-gray-700 dark:text-gray-300">
        <li>Home Page</li>
        <li>About Us Page</li>
        <li>Blog Article</li>
        <li>Product page</li>
      </ul>
    </div>
  );
};

export default SmeEnhancedHeader;
