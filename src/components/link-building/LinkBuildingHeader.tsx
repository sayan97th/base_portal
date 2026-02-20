import React from "react";
import Link from "next/link";

const LinkBuildingHeader: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        Link Building
      </h1>
      <ul className="mb-5 list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
        <li>
          We handle the writing, outreach, and placement of your links
        </li>
        <li>
          For best/natural results, mix up DR range placements
        </li>
        <li>
          For <strong className="font-semibold text-gray-800 dark:text-white/90">bulk pricing</strong> select 10 or more total links for an automatic 10% discount
        </li>
        <li>
          <strong className="font-semibold text-gray-800 dark:text-white/90">
            Please insert your keyword(s) and landing page(s) in the intake form after completing the purchase.
          </strong>
        </li>
      </ul>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Have any additional questions before ordering?{" "}
        <Link
          href="/support"
          className="font-medium text-brand-500 underline hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Send us a message here
        </Link>
        .
      </p>
    </div>
  );
};

export default LinkBuildingHeader;
