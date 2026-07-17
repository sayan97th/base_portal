"use client";

import type { ReactNode } from "react";

const COLOR_CLASSES = {
  coral:
    "border-coral-200 bg-coral-50 text-coral-700 dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-300",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  violet:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
} as const;

export type IntakeSectionColor = keyof typeof COLOR_CLASSES;

interface IntakeSectionBadgeProps {
  label: string;
  color: IntakeSectionColor;
  icon: ReactNode;
}

/** Colored pill + divider used to separate product sections when an order mixes multiple product types. */
export default function IntakeSectionBadge({ label, color, icon }: IntakeSectionBadgeProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${COLOR_CLASSES[color]}`}
      >
        {icon}
        {label}
      </span>
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}
