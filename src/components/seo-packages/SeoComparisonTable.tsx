import React from "react";
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

function getColumnHeaderStyle(is_most_popular: boolean, tier_index: number): string {
  if (is_most_popular) {
    return "bg-coral-50 text-coral-600 dark:bg-coral-500/10 dark:text-coral-400";
  }
  if (tier_index === 0) {
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
  return "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400";
}

const SeoComparisonTable: React.FC<SeoComparisonTableProps> = ({ packages, rows }) => {
  if (packages.length === 0 || rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
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

      <div className="overflow-x-auto pt-3">
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
                    className={`relative border-b border-r border-t border-gray-200 px-3 py-2.5 text-center align-middle dark:border-gray-800 ${
                      is_last_column ? "rounded-tr-xl" : ""
                    } ${getColumnHeaderStyle(pkg.is_most_popular, tier_index)}`}
                  >
                    {pkg.is_most_popular && (
                      <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-coral-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
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
                    className={`break-words border-b border-l border-r border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400 ${
                      is_last_row ? "rounded-bl-xl font-semibold text-gray-900 dark:text-white/90" : ""
                    }`}
                  >
                    {row.label}
                  </td>
                  {packages.map((pkg, tier_index) => {
                    const is_last_column = tier_index === packages.length - 1;
                    return (
                      <td
                        key={pkg.id}
                        className={`border-b border-r border-gray-200 px-3 py-2 text-center text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400 ${
                          is_last_row ? "font-semibold text-gray-900 dark:text-white/90" : ""
                        } ${is_last_row && is_last_column ? "rounded-br-xl" : ""} ${
                          pkg.is_most_popular ? "bg-coral-50/40 dark:bg-coral-500/5" : ""
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
