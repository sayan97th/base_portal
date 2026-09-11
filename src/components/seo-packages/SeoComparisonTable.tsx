"use client";

import React, { useState } from "react";
import type { SeoPackage, SeoComparisonRow } from "@/types/client/seo-packages";

interface SeoComparisonTableProps {
  packages: SeoPackage[];
  rows: SeoComparisonRow[];
}

const LayersIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5"
    />
  </svg>
);

const ChevronIcon = ({ is_expanded }: { is_expanded: boolean }) => (
  <svg
    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${is_expanded ? "rotate-180" : ""}`}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
  </svg>
);

function getColumnHeaderStyle(is_most_popular: boolean, tier_index: number): string {
  if (is_most_popular) {
    return "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400";
  }
  if (tier_index === 0) {
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
  return "bg-teal-50/30 text-teal-600 dark:bg-teal-600/10 dark:text-teal-300";
}

const SeoComparisonTable: React.FC<SeoComparisonTableProps> = ({ packages, rows }) => {
  const most_popular_package = packages.find((pkg) => pkg.is_most_popular) ?? packages[0];
  const [expanded_package_id, setExpandedPackageId] = useState<string | null>(
    most_popular_package?.id ?? null
  );

  if (packages.length === 0 || rows.length === 0) return null;

  const toggleExpandedPackage = (package_id: string) => {
    setExpandedPackageId((prev) => (prev === package_id ? null : package_id));
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0effd] text-[#3d35a6]">
          <LayersIcon />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white/90">
            Quick Comparison
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            See how each plan builds on the last.
          </p>
        </div>
      </div>

      {/* Narrow layout: one collapsible card per plan, avoids squeezing a data table into a small space */}
      <div className="space-y-3 @xl:hidden">
        {packages.map((pkg, tier_index) => {
          const is_expanded = expanded_package_id === pkg.id;
          return (
            <div
              key={pkg.id}
              className={`overflow-hidden rounded-xl border ${pkg.is_most_popular
                ? "border-brand-300 dark:border-brand-500/40"
                : "border-gray-200 dark:border-gray-800"
                }`}
            >
              <button
                type="button"
                onClick={() => toggleExpandedPackage(pkg.id)}
                aria-expanded={is_expanded}
                className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left ${getColumnHeaderStyle(
                  pkg.is_most_popular,
                  tier_index
                )}`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide">{pkg.name}</span>
                  {pkg.is_most_popular && (
                    <span className="whitespace-nowrap rounded-full bg-brand-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Most Popular
                    </span>
                  )}
                </span>
                <ChevronIcon is_expanded={is_expanded} />
              </button>
              {is_expanded && (
                <dl className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((row) => (
                    <div key={row.id} className="flex items-start justify-between gap-4 px-4 py-2.5">
                      <dt className="text-xs text-gray-500 dark:text-gray-400">{row.label}</dt>
                      <dd className="shrink-0 text-right text-xs font-medium text-gray-800 dark:text-white/90">
                        {row.values[pkg.id] ?? "N/A"}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>

      {/* Wide layout: full comparison table, once there is enough room for it */}
      <div className="hidden overflow-x-auto pt-3 @xl:block">
        <table
          className="w-full min-w-[520px] table-fixed border-separate border-spacing-0 text-left text-sm"
        >
          <colgroup>
            <col style={{ width: "24%" }} />
            {packages.map((pkg) => (
              <col key={pkg.id} style={{ width: `${76 / packages.length}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="whitespace-nowrap rounded-tl-xl border-l border-r border-t border-b border-gray-200 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:text-gray-500">
                Features
              </th>
              {packages.map((pkg, tier_index) => {
                const is_last_column = tier_index === packages.length - 1;
                return (
                  <th
                    key={pkg.id}
                    className={`relative border-b border-r border-t border-gray-200 px-3 py-2.5 text-center align-middle dark:border-gray-800 ${is_last_column ? "rounded-tr-xl" : ""
                      } ${getColumnHeaderStyle(pkg.is_most_popular, tier_index)}`}
                  >
                    {pkg.is_most_popular && (
                      <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-brand-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                        Most Popular
                      </span>
                    )}
                    <p className="text-xs font-bold uppercase tracking-wide">{pkg.name}</p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, row_index) => {
              const is_last_row = row_index === rows.length - 1;
              return (
                <tr key={row.id}>
                  <td
                    className={`break-words border-b border-l border-r border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400 ${is_last_row ? "rounded-bl-xl font-semibold text-gray-900 dark:text-white/90" : ""
                      }`}
                  >
                    {row.label}
                  </td>
                  {packages.map((pkg, tier_index) => {
                    const is_last_column = tier_index === packages.length - 1;
                    return (
                      <td
                        key={pkg.id}
                        className={`border-b border-r border-gray-200 px-3 py-2 text-center text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400 ${is_last_row ? "font-semibold text-gray-900 dark:text-white/90" : ""
                          } ${is_last_row && is_last_column ? "rounded-br-xl" : ""} ${pkg.is_most_popular ? "bg-brand-50/40 dark:bg-brand-500/5" : ""
                          }`}
                      >
                        {row.values[pkg.id] ?? "N/A"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SeoComparisonTable;
