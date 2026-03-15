"use client";

import React, { useEffect, useState, useCallback } from "react";
import type {
  AdminService,
  AdminDrTier,
  ServiceCategory,
  ServiceStats,
  CreateServicePayload,
} from "@/types/admin/services";
import {
  listAdminServices,
  createAdminService,
  updateAdminService,
  toggleAdminServiceStatus,
  deleteAdminService,
  listAdminDrTiers,
} from "@/services/admin/services.service";
import ServiceCard from "./ServiceCard";
import ServiceFormModal from "./ServiceFormModal";
import DrTiersPanel from "./DrTiersPanel";

type StatusFilter = "all" | "active" | "inactive";
type CategoryFilter = ServiceCategory | "all";

interface DeleteServiceConfirmProps {
  service_name: string;
  onConfirm: () => void;
  onCancel: () => void;
  is_loading: boolean;
}

function DeleteServiceModal({ service_name, onConfirm, onCancel, is_loading }: DeleteServiceConfirmProps) {
  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <svg className="h-6 w-6 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-center text-base font-semibold text-gray-900 dark:text-white">
            Remove Service
          </h3>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to remove{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{service_name}</span>?
            Existing records and payments will not be affected.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={onCancel}
              disabled={is_loading}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={is_loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-600 disabled:opacity-50"
            >
              {is_loading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  sub_label?: string;
}

function StatCard({ label, value, icon, color, sub_label }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub_label && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub_label}</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminServicesContent() {
  const [services, setServices] = useState<AdminService[]>([]);
  const [dr_tiers, setDrTiers] = useState<AdminDrTier[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search_query, setSearchQuery] = useState("");
  const [status_filter, setStatusFilter] = useState<StatusFilter>("all");
  const [category_filter, setCategoryFilter] = useState<CategoryFilter>("all");

  // Selected service for DR tiers panel
  const [selected_service_id, setSelectedServiceId] = useState<string | null>(null);

  // Modals
  const [form_modal_open, setFormModalOpen] = useState(false);
  const [editing_service, setEditingService] = useState<AdminService | null>(null);
  const [deleting_service, setDeletingService] = useState<AdminService | null>(null);
  const [is_deleting, setIsDeleting] = useState(false);
  const [toggling_id, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [services_data, tiers_data] = await Promise.all([
        listAdminServices(),
        listAdminDrTiers(),
      ]);
      setServices(services_data);
      setDrTiers(tiers_data);

      // Auto-select the link building service if none selected
      if (!selected_service_id) {
        const lb = services_data.find((s) => s.category === "link_building");
        if (lb) setSelectedServiceId(lb.id);
      }
    } catch {
      setError("Failed to load services. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [selected_service_id]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Computed stats ───────────────────────────────────────────────────────────

  const stats: ServiceStats = {
    total_services: services.length,
    active_services: services.filter((s) => s.is_active).length,
    inactive_services: services.filter((s) => !s.is_active).length,
    total_dr_tiers: dr_tiers.length,
    active_dr_tiers: dr_tiers.filter((t) => t.is_active).length,
  };

  // ── Filtered services ────────────────────────────────────────────────────────

  const filtered_services = services.filter((s) => {
    const matches_search =
      !search_query ||
      s.name.toLowerCase().includes(search_query.toLowerCase()) ||
      s.description.toLowerCase().includes(search_query.toLowerCase());

    const matches_status =
      status_filter === "all" ||
      (status_filter === "active" && s.is_active) ||
      (status_filter === "inactive" && !s.is_active);

    const matches_category =
      category_filter === "all" || s.category === category_filter;

    return matches_search && matches_status && matches_category;
  });

  const selected_service = services.find((s) => s.id === selected_service_id) ?? null;

  const selected_service_tiers =
    selected_service?.category === "link_building" ? dr_tiers : [];

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCreateService = async (payload: CreateServicePayload) => {
    await createAdminService(payload);
    fetchData();
  };

  const handleUpdateService = async (payload: CreateServicePayload) => {
    if (!editing_service) return;
    await updateAdminService(editing_service.id, payload);
    fetchData();
  };

  const handleToggleStatus = async (service: AdminService) => {
    setTogglingId(service.id);
    try {
      await toggleAdminServiceStatus(service.id, !service.is_active);
      fetchData();
    } catch {
      setError("Failed to update service status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteService = async () => {
    if (!deleting_service) return;
    setIsDeleting(true);
    try {
      await deleteAdminService(deleting_service.id);
      setDeletingService(null);
      if (selected_service_id === deleting_service.id) setSelectedServiceId(null);
      fetchData();
    } catch {
      setError("Failed to remove service.");
      setIsDeleting(false);
    }
  };

  const openAddService = () => {
    setEditingService(null);
    setFormModalOpen(true);
  };

  const openEditService = (service: AdminService) => {
    setEditingService(service);
    setFormModalOpen(true);
  };

  // ── Skeleton loader ──────────────────────────────────────────────────────────

  if (is_loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800/50" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Services
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage platform offerings, pricing, and availability.
            </p>
          </div>
          <button
            onClick={openAddService}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Service
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Services"
            value={stats.total_services}
            color="bg-brand-50 dark:bg-brand-500/10"
            icon={
              <svg className="h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <StatCard
            label="Active Services"
            value={stats.active_services}
            color="bg-success-50 dark:bg-success-500/10"
            icon={
              <svg className="h-6 w-6 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            sub_label="Visible to clients"
          />
          <StatCard
            label="Inactive Services"
            value={stats.inactive_services}
            color="bg-gray-100 dark:bg-gray-800"
            icon={
              <svg className="h-6 w-6 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            }
            sub_label="Hidden from clients"
          />
          <StatCard
            label="DR Tiers"
            value={stats.active_dr_tiers}
            color="bg-blue-light-50 dark:bg-blue-light-500/10"
            icon={
              <svg className="h-6 w-6 text-blue-light-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
            sub_label={`${stats.total_dr_tiers} total`}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
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
              placeholder="Search services..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
            {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                  status_filter === f
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select
            value={category_filter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="all">All categories</option>
            <option value="link_building">Link Building</option>
            <option value="content">Content</option>
            <option value="seo">SEO</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Service cards */}
        {filtered_services.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
              No services found
            </h3>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              {search_query || status_filter !== "all" || category_filter !== "all"
                ? "Try adjusting your filters."
                : "Add your first service to get started."}
            </p>
            {!search_query && status_filter === "all" && category_filter === "all" && (
              <button
                onClick={openAddService}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add First Service
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered_services.map((service) => (
              <div key={service.id} className={toggling_id === service.id ? "opacity-60 pointer-events-none" : ""}>
                <ServiceCard
                  service={service}
                  is_selected={selected_service_id === service.id}
                  onSelect={() =>
                    setSelectedServiceId(
                      selected_service_id === service.id ? null : service.id
                    )
                  }
                  onEdit={() => openEditService(service)}
                  onToggleStatus={() => handleToggleStatus(service)}
                  onDelete={() => setDeletingService(service)}
                />
              </div>
            ))}
          </div>
        )}

        {/* DR Tiers panel (only for link_building) */}
        {selected_service && selected_service.category === "link_building" && (
          <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                <svg className="h-3.5 w-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Link Building Tiers
              </div>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            </div>

            <DrTiersPanel
              tiers={selected_service_tiers}
              service_name={selected_service.name}
              onRefresh={fetchData}
            />
          </div>
        )}
      </div>

      {/* Service form modal */}
      <ServiceFormModal
        is_open={form_modal_open}
        service={editing_service}
        onClose={() => { setFormModalOpen(false); setEditingService(null); }}
        onSubmit={editing_service ? handleUpdateService : handleCreateService}
      />

      {/* Delete service confirm */}
      {deleting_service && (
        <DeleteServiceModal
          service_name={deleting_service.name}
          onConfirm={handleDeleteService}
          onCancel={() => { setDeletingService(null); setIsDeleting(false); }}
          is_loading={is_deleting}
        />
      )}
    </>
  );
}
