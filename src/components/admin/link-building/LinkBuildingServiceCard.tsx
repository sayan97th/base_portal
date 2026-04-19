"use client";

import React, { useState } from "react";
import type { AdminLinkBuildingService, ServiceCategory } from "@/types/admin/link-building";

interface ServiceCardProps {
  service: AdminLinkBuildingService;
  is_selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

const CATEGORY_CONFIG: Record<
  ServiceCategory,
  { label: string; gradient: string; icon_bg: string; text_color: string }
> = {
  link_building: {
    label: "Link Building",
    gradient: "from-brand-500 to-brand-600",
    icon_bg: "bg-brand-500/10",
    text_color: "text-brand-600 dark:text-brand-400",
  },
  content: {
    label: "Content",
    gradient: "from-blue-light-500 to-blue-light-600",
    icon_bg: "bg-blue-light-500/10",
    text_color: "text-blue-light-600 dark:text-blue-light-400",
  },
  seo: {
    label: "SEO",
    gradient: "from-success-500 to-success-600",
    icon_bg: "bg-success-500/10",
    text_color: "text-success-600 dark:text-success-400",
  },
  other: {
    label: "Other",
    gradient: "from-orange-500 to-orange-600",
    icon_bg: "bg-orange-500/10",
    text_color: "text-orange-600 dark:text-orange-400",
  },
};

const CATEGORY_ICONS: Record<ServiceCategory, React.ReactNode> = {
  link_building: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  content: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  seo: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  other: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
};

const PRICING_MODEL_LABELS: Record<string, string> = {
  tiered: "Tiered pricing",
  fixed: "Fixed price",
  per_unit: "Per unit",
  subscription: "Subscription",
  custom: "Custom quote",
};

export default function LinkBuildingServiceCard({
  service,
  is_selected,
  onSelect,
  onEdit,
  onToggleStatus,
  onDelete,
}: ServiceCardProps) {
  const [menu_open, setMenuOpen] = useState(false);
  const config = CATEGORY_CONFIG[service.category];

  const has_dr_tiers = service.category === "link_building";
  const dr_tier_count = service.dr_tiers?.length ?? 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white transition-all duration-200 dark:bg-gray-900 ${
        is_selected
          ? "border-brand-400 shadow-lg shadow-brand-500/10 dark:border-brand-500"
          : "border-gray-200 hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:hover:border-gray-700"
      }`}
    >
      {/* Gradient top bar */}
      <div className={`h-1.5 w-full bg-linear-to-r ${config.gradient}`} />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.icon_bg} ${config.text_color}`}
            >
              {CATEGORY_ICONS[service.category]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">
                {service.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${config.icon_bg} ${config.text_color}`}
                >
                  {config.label}
                </span>
                {service.is_featured && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Featured
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status + menu */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
                service.is_active
                  ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              <span
                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                  service.is_active ? "bg-success-500" : "bg-gray-400"
                }`}
              />
              {service.is_active ? "Active" : "Inactive"}
            </span>

            {/* Kebab menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                </svg>
              </button>

              {menu_open && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
                    <button
                      onClick={() => { onEdit(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit service
                    </button>
                    <button
                      onClick={() => { onToggleStatus(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      {service.is_active ? (
                        <>
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          Deactivate
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Activate
                        </>
                      )}
                    </button>
                    <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                    <button
                      onClick={() => { onDelete(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-error-600 transition-colors hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove service
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
          {service.description}
        </p>

        {/* Pricing info */}
        <div className="mt-4 flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {PRICING_MODEL_LABELS[service.pricing_model]}
            {service.base_price !== null && (
              <> · <span className="font-medium text-gray-700 dark:text-gray-300">${service.base_price.toFixed(2)}</span></>
            )}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 px-3.5 py-3 dark:bg-gray-800/60">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Total Orders</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">
              {service.orders_count.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 px-3.5 py-3 dark:bg-gray-800/60">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Revenue</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">
              ${(() => { const r = Number(service.revenue_total ?? 0); return r >= 1000 ? `${(r / 1000).toFixed(1)}k` : r.toFixed(0); })()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-2">
          {has_dr_tiers && (
            <button
              onClick={onSelect}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                is_selected
                  ? "bg-brand-500 text-white hover:bg-brand-600"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 4v16" />
              </svg>
              {is_selected ? "Viewing Tiers" : `Manage Tiers${dr_tier_count > 0 ? ` (${dr_tier_count})` : ""}`}
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
