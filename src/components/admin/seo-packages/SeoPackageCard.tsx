"use client";

import React from "react";
import type { AdminSeoPackage } from "@/types/admin/seo-packages";

interface SeoPackageCardProps {
  package_data: AdminSeoPackage;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: (is_active: boolean) => void;
}

function PackageStatusBadge({ pkg }: { pkg: AdminSeoPackage }) {
  if (!pkg.is_active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
        <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
        Disabled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700 dark:bg-success-500/10 dark:text-success-400">
      <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
      Active
    </span>
  );
}

export default function SeoPackageCard({
  package_data,
  onEdit,
  onDelete,
  onToggleStatus,
}: SeoPackageCardProps) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:shadow-md dark:bg-gray-900 ${
        package_data.is_active
          ? "border-gray-200 hover:border-brand-200 dark:border-gray-800 dark:hover:border-brand-800"
          : "border-warning-200 dark:border-warning-800/40"
      }`}
    >
      {/* Top gradient bar */}
      <div
        className={`h-1.5 w-full ${
          package_data.is_active
            ? "bg-linear-to-r from-brand-400 via-brand-500 to-brand-600"
            : "bg-linear-to-r from-warning-300 to-warning-400"
        }`}
      />

      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                package_data.is_active ? "bg-brand-50 dark:bg-brand-500/10" : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <svg
                className={`h-5 w-5 ${package_data.is_active ? "text-brand-500" : "text-gray-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{package_data.name}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">/{package_data.slug}</p>
              {package_data.is_most_popular && (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-warning-50 px-1.5 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Most popular
                </span>
              )}
            </div>
          </div>
          <PackageStatusBadge pkg={package_data} />
        </div>

        {/* Tagline */}
        {package_data.tagline && (
          <p className="mt-3 text-xs italic text-gray-500 dark:text-gray-400">
            &ldquo;{package_data.tagline}&rdquo;
          </p>
        )}

        {/* Price */}
        <div className="mt-4 flex items-end gap-1">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            ${package_data.price_per_month.toFixed(0)}
          </span>
          <span className="mb-1 text-sm text-gray-400 dark:text-gray-500">/ month</span>
        </div>

        {/* Features */}
        {package_data.features.length > 0 && (
          <div className="mt-4 space-y-1.5 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Features ({package_data.features.length})
            </p>
            {package_data.features.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <svg
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <div className="min-w-0 wrap-break-word">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {feature.category}
                  </span>
                  {feature.description && (
                    <span className="ml-1 text-gray-500 dark:text-gray-400">
                      — {feature.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {package_data.features.length > 3 && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                +{package_data.features.length - 3} more features
              </p>
            )}
          </div>
        )}

        {/* Best for */}
        {package_data.best_for && (
          <div className="mt-3 flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{package_data.best_for}</span>
          </div>
        )}

        {/* Stats row */}
        {(package_data.orders_count !== undefined || package_data.revenue_total !== undefined) && (
          <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
            {package_data.orders_count !== undefined && (
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-3.5 w-3.5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {package_data.orders_count} order{package_data.orders_count !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {package_data.revenue_total !== undefined && (
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-3.5 w-3.5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {(() => {
                    const r = Number(package_data.revenue_total);
                    return `$${r >= 1000 ? `${(r / 1000).toFixed(1)}k` : r.toFixed(0)}`;
                  })()}{" "}
                  revenue
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </button>
          <button
            onClick={() => onToggleStatus(!package_data.is_active)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
          >
            {package_data.is_active ? (
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            ) : (
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {package_data.is_active ? "Disable" : "Enable"}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-error-200 bg-white px-3 py-2.5 text-xs font-semibold text-error-600 transition-colors hover:bg-error-50 dark:border-error-800/40 dark:bg-white/3 dark:text-error-400 dark:hover:bg-error-500/10"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
