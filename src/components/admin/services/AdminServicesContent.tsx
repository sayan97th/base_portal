"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { AdminDrTier, CreateDrTierPayload, UpdateDrTierPayload } from "@/types/admin/services";
import type {
  AdminContentRefreshTier,
  CreateContentRefreshTierPayload,
  UpdateContentRefreshTierPayload,
} from "@/types/admin/content-refresh-tiers";
import {
  listAdminDrTiers,
  createAdminDrTier,
  updateAdminDrTier,
  toggleAdminDrTierStatus,
  hideAdminDrTier,
  unhideAdminDrTier,
  listAdminContentRefreshTiers,
  createAdminContentRefreshTier,
  updateAdminContentRefreshTier,
  toggleAdminContentRefreshTierStatus,
  deleteAdminContentRefreshTier,
} from "@/services/admin/services.service";
import DrTierCard from "./DrTierCard";
import DrTierFormModal from "./DrTierFormModal";
import DrTierDetailModal from "./DrTierDetailModal";
import ContentRefreshTierCard from "./ContentRefreshTierCard";
import ContentRefreshTierFormModal from "./ContentRefreshTierFormModal";

type StatusFilter = "all" | "active" | "disabled";

type ServiceTab = {
  id: string;
  label: string;
  category: string;
  available: boolean;
};

const SERVICE_TABS: ServiceTab[] = [
  { id: "link_building", label: "Link Building", category: "link_building", available: true },
  { id: "link_building_addons", label: "Link Building Add-ons", category: "link_building_addons", available: true },
  { id: "content", label: "Content", category: "content", available: false },
  { id: "seo", label: "SEO", category: "seo", available: false },
];

// ── Summary stat strip ─────────────────────────────────────────────────────────

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

// ── Coming soon placeholder ────────────────────────────────────────────────────

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
        {label} — Coming soon
      </h3>
      <p className="mt-2 max-w-xs text-center text-sm text-gray-500 dark:text-gray-400">
        This service category will be available in a future update.
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminServicesContent() {
  const [active_tab, setActiveTab] = useState("link_building");

  // ── DR Tiers state ─────────────────────────────────────────────────────────
  const [tiers, setTiers] = useState<AdminDrTier[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search_query, setSearchQuery] = useState("");
  const [status_filter, setStatusFilter] = useState<StatusFilter>("active");

  // Modals
  const [form_modal_open, setFormModalOpen] = useState(false);
  const [editing_tier, setEditingTier] = useState<AdminDrTier | null>(null);
  const [detail_tier_id, setDetailTierId] = useState<string | null>(null);

  // ── Content Refresh Tiers state ────────────────────────────────────────────
  const [cr_tiers, setCrTiers] = useState<AdminContentRefreshTier[]>([]);
  const [cr_is_loading, setCrIsLoading] = useState(false);
  const [cr_error, setCrError] = useState<string | null>(null);
  const [cr_form_modal_open, setCrFormModalOpen] = useState(false);
  const [cr_editing_tier, setCrEditingTier] = useState<AdminContentRefreshTier | null>(null);

  // ── Fetch DR Tiers ─────────────────────────────────────────────────────────

  const fetchTiers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAdminDrTiers();
      setTiers(data);
    } catch {
      setError("Failed to load tiers. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  // ── Fetch Content Refresh Tiers ────────────────────────────────────────────

  const fetchCrTiers = useCallback(async () => {
    setCrIsLoading(true);
    setCrError(null);
    try {
      const data = await listAdminContentRefreshTiers();
      setCrTiers(data);
    } catch {
      setCrError("Failed to load content refresh tiers. Please try again.");
    } finally {
      setCrIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active_tab === "link_building_addons") {
      fetchCrTiers();
    }
  }, [active_tab, fetchCrTiers]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const visible_tiers = tiers.filter((t) => !t.is_hidden);
  const total_count = visible_tiers.length;
  const active_count = visible_tiers.filter((t) => t.is_active).length;
  const disabled_count = visible_tiers.filter((t) => !t.is_active).length;

  // ── Filters ────────────────────────────────────────────────────────────────

  const filtered_tiers = visible_tiers.filter((t) => {
    const matches_search =
      !search_query ||
      t.dr_label.toLowerCase().includes(search_query.toLowerCase()) ||
      t.traffic_range.toLowerCase().includes(search_query.toLowerCase());

    const matches_status =
      status_filter === "all" ||
      (status_filter === "active" && t.is_active) ||
      (status_filter === "disabled" && !t.is_active);

    return matches_search && matches_status;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateTier = async (payload: CreateDrTierPayload) => {
    await createAdminDrTier(payload);
    fetchTiers();
  };

  const handleUpdateTier = async (payload: CreateDrTierPayload) => {
    if (!editing_tier) return;
    await updateAdminDrTier(editing_tier.id, payload as UpdateDrTierPayload);
    fetchTiers();
  };

  const handleToggleStatus = async (is_active: boolean) => {
    if (!detail_tier_id) return;
    await toggleAdminDrTierStatus(detail_tier_id, is_active);
    fetchTiers();
  };

  const handleHide = async () => {
    if (!detail_tier_id) return;
    await hideAdminDrTier(detail_tier_id);
    fetchTiers();
  };

  const handleUnhide = async () => {
    if (!detail_tier_id) return;
    await unhideAdminDrTier(detail_tier_id);
    fetchTiers();
  };

  const openAdd = () => {
    setEditingTier(null);
    setFormModalOpen(true);
  };

  const openEdit = (tier: AdminDrTier) => {
    setEditingTier(tier);
    setDetailTierId(null);
    setFormModalOpen(true);
  };

  // ── Content Refresh Handlers ───────────────────────────────────────────────

  const handleCreateCrTier = async (payload: CreateContentRefreshTierPayload) => {
    await createAdminContentRefreshTier(payload);
    fetchCrTiers();
  };

  const handleUpdateCrTier = async (payload: CreateContentRefreshTierPayload) => {
    if (!cr_editing_tier) return;
    await updateAdminContentRefreshTier(cr_editing_tier.id, payload as UpdateContentRefreshTierPayload);
    fetchCrTiers();
  };

  const handleToggleCrTierStatus = async (tier_id: string, is_active: boolean) => {
    await toggleAdminContentRefreshTierStatus(tier_id, is_active);
    fetchCrTiers();
  };

  const handleDeleteCrTier = async (tier_id: string) => {
    if (!confirm("Are you sure you want to delete this tier? This action cannot be undone.")) return;
    await deleteAdminContentRefreshTier(tier_id);
    fetchCrTiers();
  };

  const openCrAdd = () => {
    setCrEditingTier(null);
    setCrFormModalOpen(true);
  };

  const openCrEdit = (tier: AdminContentRefreshTier) => {
    setCrEditingTier(tier);
    setCrFormModalOpen(true);
  };

  // ── Skeleton ───────────────────────────────────────────────────────────────

  if (is_loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-28 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="h-12 w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Services
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage platform service offerings and pricing.
            </p>
          </div>
          {active_tab === "link_building" && (
            <button
              onClick={openAdd}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add DR Tier
            </button>
          )}
          {active_tab === "link_building_addons" && (
            <button
              onClick={openCrAdd}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Tier
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {/* Service tabs */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-100 px-4 dark:border-gray-800">
            {SERVICE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.available && setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
                  !tab.available
                    ? "cursor-default text-gray-300 dark:text-gray-600"
                    : active_tab === tab.id
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.id === "link_building" && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )}
                {tab.id === "link_building_addons" && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
                {tab.id === "content" && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {tab.id === "seo" && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                {tab.label}
                
                {!tab.available && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400 dark:bg-gray-800 dark:text-gray-600">
                    Soon
                  </span>
                )}
                {/* Active underline */}
                {active_tab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-brand-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div className="p-5">
            {active_tab === "link_building_addons" ? (
              /* ── Content Refresh Tiers tab ─────────────────────────────── */
              <div className="space-y-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage the Content Refresh add-on tiers shown on the Link Building page when clients select links.
                </p>

                {cr_error && (
                  <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                    {cr_error}
                  </div>
                )}

                {cr_is_loading ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-52 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
                    ))}
                  </div>
                ) : cr_tiers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 dark:border-gray-700">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                      No content refresh tiers yet
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Add your first tier to show it on the Link Building page.
                    </p>
                    <button
                      onClick={openCrAdd}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add First Tier
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {cr_tiers
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((tier) => (
                        <ContentRefreshTierCard
                          key={tier.id}
                          tier={tier}
                          onEdit={() => openCrEdit(tier)}
                          onToggleStatus={(is_active) => handleToggleCrTierStatus(tier.id, is_active)}
                          onDelete={() => handleDeleteCrTier(tier.id)}
                        />
                      ))}
                  </div>
                )}
              </div>
            ) : active_tab !== "link_building" ? (
              <ComingSoonTab
                label={SERVICE_TABS.find((t) => t.id === active_tab)?.label ?? ""}
              />
            ) : (
              <div className="space-y-5">
                {/* Stats strip */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <StripStat label="Total" value={total_count} />
                  <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
                  <StripStat label="Active" value={active_count} dot_color="bg-success-500" />
                  <StripStat label="Disabled" value={disabled_count} dot_color="bg-warning-400" />
                </div>

                {/* Search & filter row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
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
                      placeholder="Search by DR label or traffic range..."
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>

                  <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
                    {(["all", "active", "disabled"] as StatusFilter[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                          status_filter === f
                            ? "bg-brand-500 text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DR tier cards */}
                {filtered_tiers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 dark:border-gray-700">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                      No tiers found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {search_query || status_filter !== "all"
                        ? "Try adjusting your search or filter."
                        : "Add your first DR tier to get started."}
                    </p>
                    {!search_query && status_filter === "all" && (
                      <button
                        onClick={openAdd}
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
                    {filtered_tiers.map((tier) => (
                      <DrTierCard
                        key={tier.id}
                        tier={tier}
                        onViewDetail={() => setDetailTierId(tier.id)}
                        onEdit={() => openEdit(tier)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit DR tier modal */}
      <DrTierFormModal
        is_open={form_modal_open}
        tier={editing_tier}
        onClose={() => { setFormModalOpen(false); setEditingTier(null); }}
        onSubmit={editing_tier ? handleUpdateTier : handleCreateTier}
      />

      {/* Add / Edit Content Refresh tier modal */}
      <ContentRefreshTierFormModal
        is_open={cr_form_modal_open}
        tier={cr_editing_tier}
        onClose={() => { setCrFormModalOpen(false); setCrEditingTier(null); }}
        onSubmit={cr_editing_tier ? handleUpdateCrTier : handleCreateCrTier}
      />

      {/* Detail modal */}
      <DrTierDetailModal
        tier_id={detail_tier_id}
        onClose={() => setDetailTierId(null)}
        onEdit={() => {
          const tier = tiers.find((t) => t.id === detail_tier_id) ?? null;
          if (tier) openEdit(tier);
        }}
        onToggleStatus={handleToggleStatus}
        onHide={handleHide}
        onUnhide={handleUnhide}
      />
    </>
  );
}
