"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SmeAuthoredTier } from "@/services/client/sme-authored.service";
import { adminSmeAuthoredService } from "@/services/admin/sme-authored.service";
import { adminSmeCollaborationService } from "@/services/admin/sme-collaboration.service";
import { adminSmeEnhancedService } from "@/services/admin/sme-enhanced.service";
import SmeServiceCard, { type SmeServiceType } from "./SmeServiceCard";

// ── Types ──────────────────────────────────────────────────────────────────────

type SmeTab = {
  id: SmeServiceType;
  label: string;
  description: string;
  accent_color: string;
  dot_color: string;
};

// ── Config ─────────────────────────────────────────────────────────────────────

const SME_TABS: SmeTab[] = [
  {
    id: "authored",
    label: "Authored",
    description: "Fully written content tiers created by expert writers.",
    accent_color: "text-blue-600 dark:text-blue-400",
    dot_color: "bg-blue-500",
  },
  {
    id: "collaboration",
    label: "Collaboration",
    description: "Co-created content tiers developed with subject matter experts.",
    accent_color: "text-purple-600 dark:text-purple-400",
    dot_color: "bg-purple-500",
  },
  {
    id: "enhanced",
    label: "Enhanced",
    description: "Premium content tiers with advanced SEO and quality enhancements.",
    accent_color: "text-emerald-600 dark:text-emerald-400",
    dot_color: "bg-emerald-500",
  },
];

const service_map = {
  authored: adminSmeAuthoredService,
  collaboration: adminSmeCollaborationService,
  enhanced: adminSmeEnhancedService,
};

// ── Stat strip ────────────────────────────────────────────────────────────────

interface StripStatProps {
  label: string;
  value: number | string;
  dot_color?: string;
}

function StripStat({ label, value, dot_color }: StripStatProps) {
  return (
    <div className="flex items-center gap-2">
      {dot_color && <span className={`h-2 w-2 rounded-full ${dot_color}`} />}
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {label}:{" "}
        <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
      </span>
    </div>
  );
}

// ── Delete confirm modal ───────────────────────────────────────────────────────

interface DeleteModalProps {
  service_label: string;
  is_deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ service_label, is_deleting, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
            Delete service tier
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{service_label}</span>?
            This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onCancel}
            disabled={is_deleting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={is_deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-700 disabled:opacity-50"
          >
            {is_deleting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface AdminSmeContentContentProps {
  default_tab?: SmeServiceType;
}

export default function AdminSmeContentContent({ default_tab = "authored" }: AdminSmeContentContentProps) {
  const router = useRouter();
  const [active_tab, setActiveTab] = useState<SmeServiceType>(default_tab);

  const [services, setServices] = useState<Record<SmeServiceType, SmeAuthoredTier[]>>({
    authored: [],
    collaboration: [],
    enhanced: [],
  });
  const [loading, setLoading] = useState<Record<SmeServiceType, boolean>>({
    authored: default_tab === "authored",
    collaboration: default_tab === "collaboration",
    enhanced: default_tab === "enhanced",
  });
  const [errors, setErrors] = useState<Record<SmeServiceType, string | null>>({
    authored: null,
    collaboration: null,
    enhanced: null,
  });
  const [search_query, setSearchQuery] = useState("");
  const [delete_target, setDeleteTarget] = useState<SmeAuthoredTier | null>(null);
  const [is_deleting, setIsDeleting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchTab = useCallback(
    async (type: SmeServiceType) => {
      setLoading((prev) => ({ ...prev, [type]: true }));
      setErrors((prev) => ({ ...prev, [type]: null }));
      try {
        const data = await service_map[type].fetchServices();
        setServices((prev) => ({ ...prev, [type]: data }));
      } catch {
        setErrors((prev) => ({ ...prev, [type]: "Failed to load tiers. Please try again." }));
      } finally {
        setLoading((prev) => ({ ...prev, [type]: false }));
      }
    },
    []
  );

  useEffect(() => {
    fetchTab(default_tab);
  }, [fetchTab, default_tab]);

  const handleTabChange = (type: SmeServiceType) => {
    if (type === active_tab) return;
    router.push(`/admin/sme-content/${type}`);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!delete_target) return;
    setIsDeleting(true);
    try {
      await service_map[active_tab].deleteService(delete_target.id);
      setServices((prev) => ({
        ...prev,
        [active_tab]: prev[active_tab].filter((s) => s.id !== delete_target.id),
      }));
      setDeleteTarget(null);
    } catch {
      setErrors((prev) => ({ ...prev, [active_tab]: "Failed to delete tier. Please try again." }));
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const current_tab = SME_TABS.find((t) => t.id === active_tab)!;
  const current_services = services[active_tab];
  const is_loading_tab = loading[active_tab];
  const current_error = errors[active_tab];

  const filtered_services = current_services.filter(
    (s) =>
      !search_query ||
      s.label.toLowerCase().includes(search_query.toLowerCase()) ||
      s.description.toLowerCase().includes(search_query.toLowerCase())
  );

  // ── Loading skeleton ────────────────────────────────────────────────────────

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              SME Content
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage Subject Matter Expert content service tiers across all types.
            </p>
          </div>
          <button
            onClick={() => router.push(`/admin/sme-content/${active_tab}/new`)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Tier
          </button>
        </div>

        {/* Main panel */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-100 px-4 dark:border-gray-800">
            {SME_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
                  active_tab === tab.id
                    ? tab.accent_color
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.id === "authored" && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                )}
                {tab.id === "collaboration" && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                )}
                {tab.id === "enhanced" && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                )}
                {tab.label}
                {/* Active underline */}
                {active_tab === tab.id && (
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full ${
                      tab.id === "authored" ? "bg-blue-500" : tab.id === "collaboration" ? "bg-purple-500" : "bg-emerald-500"
                    }`}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div className="p-5">
            <div className="space-y-5">
              {/* Tab description & stats */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
                <p className="text-sm text-gray-500 dark:text-gray-400 flex-1 min-w-0">
                  {current_tab.description}
                </p>
                <StripStat
                  label="Total"
                  value={current_services.length}
                  dot_color={current_tab.dot_color}
                />
              </div>

              {/* Error */}
              {current_error && (
                <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                  {current_error}
                  <button
                    onClick={() => fetchTab(active_tab)}
                    className="ml-2 underline underline-offset-2 hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Search row */}
              {!is_loading_tab && current_services.length > 0 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative max-w-sm flex-1">
                    <svg
                      className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={search_query}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${current_tab.label.toLowerCase()} tiers...`}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                  <button
                    onClick={() => router.push(`/admin/sme-content/${active_tab}/new`)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      active_tab === "authored"
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                        : active_tab === "collaboration"
                        ? "bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add {current_tab.label} Tier
                  </button>
                </div>
              )}

              {/* Content */}
              {is_loading_tab ? (
                renderSkeleton()
              ) : filtered_services.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                      active_tab === "authored"
                        ? "bg-blue-50 dark:bg-blue-500/10"
                        : active_tab === "collaboration"
                        ? "bg-purple-50 dark:bg-purple-500/10"
                        : "bg-emerald-50 dark:bg-emerald-500/10"
                    }`}
                  >
                    <svg
                      className={`h-7 w-7 ${current_tab.accent_color}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
                    {search_query
                      ? "No tiers match your search"
                      : `No ${current_tab.label.toLowerCase()} tiers yet`}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {search_query
                      ? "Try adjusting your search query."
                      : `Add the first ${current_tab.label.toLowerCase()} tier to get started.`}
                  </p>
                  {!search_query && (
                    <button
                      onClick={() => router.push(`/admin/sme-content/${active_tab}/new`)}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add First Tier
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered_services.map((service_item) => (
                    <SmeServiceCard
                      key={service_item.id}
                      service={service_item}
                      type={active_tab}
                      onEdit={() =>
                        router.push(`/admin/sme-content/${active_tab}/${service_item.id}/edit`)
                      }
                      onDelete={() => setDeleteTarget(service_item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {delete_target && (
        <DeleteConfirmModal
          service_label={delete_target.label}
          is_deleting={is_deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
