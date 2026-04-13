"use client";

import ClientProfile from "@/components/seo-dashboard/ClientProfile";

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      {/* Client profile navigation */}
      <ClientProfile />

      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-50 dark:bg-coral-500/10">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          className="text-coral-500"
        >
          <path
            d="M27 5L22 10M22 10L25 13L30 8L27 5ZM22 10L13 19M13 19L10 16L2 24L8 30L16 22L13 19ZM13 19L10 22"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Heading */}
      <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white/90">
        Tools — Coming Soon
      </h1>

      {/* Description */}
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
        We&apos;re building a suite of SEO tools to help you get more out of
        your campaigns. Check back soon.
      </p>
      </div>
    </div>
  );
}
