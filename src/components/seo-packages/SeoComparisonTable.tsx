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

const SeoComparisonTable: React.FC<SeoComparisonTableProps> = ({ packages, rows }) => {
  if (packages.length === 0 || rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="whitespace-nowrap px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Features
              </th>
              {packages.map((pkg) => (
                <th key={pkg.id} className="px-3 pb-3 text-center align-bottom">
                  {pkg.is_most_popular && (
                    <span className="mb-1 inline-block rounded-full bg-coral-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Most Popular
                    </span>
                  )}
                  <p
                    className={`text-xs font-bold uppercase tracking-wide ${
                      pkg.is_most_popular
                        ? "text-coral-600 dark:text-coral-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {pkg.name}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, row_index) => {
              const is_last_row = row_index === rows.length - 1;
              return (
                <tr key={row.id}>
                  <td
                    className={`whitespace-nowrap px-3 py-3 text-sm text-gray-600 dark:text-gray-400 ${
                      is_last_row
                        ? "font-semibold text-gray-900 dark:text-white/90"
                        : ""
                    } ${row_index > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}`}
                  >
                    {row.label}
                  </td>
                  {packages.map((pkg) => (
                    <td
                      key={pkg.id}
                      className={`px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-400 ${
                        is_last_row
                          ? "font-semibold text-gray-900 dark:text-white/90"
                          : ""
                      } ${row_index > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""} ${
                        pkg.is_most_popular ? "bg-coral-50/40 dark:bg-coral-500/5" : ""
                      }`}
                    >
                      {row.values[pkg.id] ?? "N/A"}
                    </td>
                  ))}
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
