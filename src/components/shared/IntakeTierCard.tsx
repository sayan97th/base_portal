"use client";

import type { ReactNode } from "react";

interface IntakeTierCardProps {
  tier_name: string;
  form_index?: number;
  total_forms?: number;
  action?: ReactNode;
  children: ReactNode;
}

/** Card shell shared by every per-tier intake form: tier name + optional "Form x of y"
 * badge + optional right-aligned action (e.g. Export CSV) on top, content below. */
export default function IntakeTierCard({
  tier_name,
  form_index,
  total_forms,
  action,
  children,
}: IntakeTierCardProps) {
  const show_form_badge = Boolean(total_forms && total_forms > 1 && form_index);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {tier_name}
          </span>
          {show_form_badge && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Form {form_index} of {total_forms}
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
