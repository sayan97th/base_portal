import React from "react";
import { sme_authored_features, content_types } from "./smeAuthoredData";

const SmeAuthoredHeader: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        SME Authored Content
      </h1>

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        We connect you with industry experts who both provide expertise AND
        create compelling content&mdash;delivering the perfect balance of deep
        knowledge and engaging writing.
      </p>

      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
        {sme_authored_features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        After placing your order, you&apos;ll be able to specify the type of
        content you&apos;d like created for the word count chosen from the
        following:
      </p>

      <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
        {content_types.map((type) => (
          <li key={type}>{type}</li>
        ))}
      </ul>
    </div>
  );
};

export default SmeAuthoredHeader;
