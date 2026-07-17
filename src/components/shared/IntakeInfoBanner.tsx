"use client";

import type { ReactNode } from "react";

interface IntakeInfoBannerProps {
  children: ReactNode;
}

/** Single-line instructional banner shared across all intake form sections. */
export default function IntakeInfoBanner({ children }: IntakeInfoBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
      <p className="text-sm text-blue-700 dark:text-blue-300">{children}</p>
    </div>
  );
}
