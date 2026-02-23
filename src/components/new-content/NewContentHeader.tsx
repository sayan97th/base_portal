import React from "react";
import { article_features, content_types } from "./newContentData";

const NewContentHeader: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        Optimized SEO Articles
      </h1>

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Get new content for your website to help with SEO rankings. You can
        expect the following for each freshly created content piece:
      </p>

      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
        {article_features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        After placing your order, you&apos;ll be able to specify the type of
        content you&apos;d like created for the word count chosen from the
        following:
      </p>

      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
        {content_types.map((type) => (
          <li key={type}>{type}</li>
        ))}
      </ul>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        <strong className="font-semibold text-gray-800 dark:text-white/90">
          Example Pieces:
        </strong>{" "}
        <a
          href="#"
          className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Example 1
        </a>
        ,{" "}
        <a
          href="#"
          className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Example 2
        </a>
      </p>
    </div>
  );
};

export default NewContentHeader;
