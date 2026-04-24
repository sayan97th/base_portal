"use client";

import React, { useCallback, useEffect, useState } from "react";
import type {
  AdminContentOptimizationTier,
  CreateContentOptimizationTierPayload,
  UpdateContentOptimizationTierPayload,
} from "@/types/admin/content-optimization";
import {
  listAdminContentOptimizationTiers,
  createAdminContentOptimizationTier,
  updateAdminContentOptimizationTier,
  toggleAdminContentOptimizationTierStatus,
  deleteAdminContentOptimizationTier,
} from "@/services/admin/content-optimization.service";
import ContentOptimizationTierCard from "./ContentOptimizationTierCard";
import ContentOptimizationTierFormModal from "./ContentOptimizationTierFormModal";

type StatusFilter = "all" | "active" | "disabled" | "hidden";

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

interface DeleteConfirmModalProps {
  tier: AdminContentOptimizationTier | null;
  is_deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ tier, is_deleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (!tier) return null;
  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <svg
              className="h-6 w-6 text-error-600 dark:text-error-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
            Delete &ldquo;{tier.label}&rdquo;?
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. The tier &ldquo;
            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{tier.id}</span>
            &rdquo; will be permanently removed.
          </p>
        </div>
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onCancel}
            disabled={is_deleting}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={is_deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-700 disabled:opacity-50"
          >
            {is_deleting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Delete Tier
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminContentOptimizationContent() {
  const [tiers, setTiers] = useState<AdminContentOptimizationTier[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search_query, setSearchQuery] = useState("");
  const [status_filter, setStatusFilter] = useState<StatusFilter>("all");

  const [form_modal_open, setFormModalOpen] = useState(false);
  const [editing_tier, setEditingTier] = useState<AdminContentOptimizationTier | null>(null);

  const [deleting_tier, setDeletingTier] = useState<AdminContentOptimizationTier | null>(null);
  const [is_deleting, setIsDeleting] = useState(false);

  const fetchTiers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAdminContentOptimizationTiers();
      setTiers(data);
    } catch {
      setError("Failed to load optimization tiers. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const total_count = tiers.length;
  const active_count = tiers.filter((t) => t.is_active).length;
  const disabled_count = tiers.filter((t) => !t.is_active).length;
  const hidden_count = tiers.filter((t) => t.is_hidden).length;
  const popular_count = tiers.filter((t) => t.is_most_popular).length;

  const filtered_tiers = tiers
    .filter((t) => {
      const q = search_query.toLowerCase();
      const matches_search =
        !search_query ||
        t.label.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.word_count_range.toLowerCase().includes(q);

      const matches_status =
        status_filter === "all" ||
        (status_filter === "active" && t.is_active) ||
        (status_filter === "disabled" && !t.is_active) ||
        (status_filter === "hidden" && t.is_hidden);

      return matches_search && matches_status;
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleCreate = async (payload: CreateContentOptimizationTierPayload) => {
    await createAdminContentOptimizationTier(payload);
    fetchTiers();
  };

  const handleUpdate = async (payload: CreateContentOptimizationTierPayload) => {
    if (!editing_tier) return;
    await updateAdminContentOptimizationTier(
      editing_tier.id,
      payload as UpdateContentOptimizationTierPayload
    );
    fetchTiers();
  };

  const handleToggleStatus = async (
    tier: AdminContentOptimizationTier,
    is_active: boolean
  ) => {
    await toggleAdminContentOptimizationTierStatus(tier.id, is_active);
    fetchTiers();
  };

  const handleDelete = async () => {
    if (!deleting_tier) return;
    setIsDeleting(true);
    try {
      await deleteAdminContentOptimizationTier(deleting_tier.id);
      setDeletingTier(null);
      fetchTiers();
    } catch {
      setError("Failed to delete tier. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openAdd = () => {
    setEditingTier(null);
    setFormModalOpen(true);
  };

  const openEdit = (tier: AdminContentOptimizationTier) => {
    setEditingTier(tier);
    setFormModalOpen(true);
  };

  if (is_loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-72 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="h-12 w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
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
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10">
                <svg
                  className="h-5 w-5 text-violet-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Content Optimization Tiers
                </h1>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Manage pricing tiers and availability for the Content Optimization service.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Tier
          </button>
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            <span>{error}</span>
            <button
              onClick={fetchTiers}
              className="ml-4 rounded-lg border border-error-200 px-3 py-1 text-xs font-medium transition-colors hover:bg-error-100 dark:border-error-800 dark:hover:bg-error-500/20"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 dark:border-violet-800/30 dark:bg-violet-500/5">
          <StripStat label="Total" value={total_count} />
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <StripStat label="Active" value={active_count} dot_color="bg-success-500" />
          <StripStat label="Disabled" value={disabled_count} dot_color="bg-warning-400" />
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <StripStat label="Hidden" value={hidden_count} dot_color="bg-gray-400" />
          <StripStat label="Most Popular" value={popular_count} dot_color="bg-warning-500" />
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
              placeholder="Search by label, ID, or word count range..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-3 focus:ring-violet-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
            {(["all", "active", "disabled", "hidden"] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  status_filter === f
                    ? "bg-violet-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Tiers grid */}
        {filtered_tiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-500/10">
              <svg
                className="h-7 w-7 text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
              No tiers found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {search_query || status_filter !== "all"
                ? "Try adjusting your search or filter."
                : "Add your first optimization tier to get started."}
            </p>
            {!search_query && status_filter === "all" && (
              <button
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600"
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
              <ContentOptimizationTierCard
                key={tier.id}
                tier={tier}
                onEdit={() => openEdit(tier)}
                onDelete={() => setDeletingTier(tier)}
                onToggleStatus={(is_active) => handleToggleStatus(tier, is_active)}
              />
            ))}
          </div>
        )}
      </div>

      <ContentOptimizationTierFormModal
        is_open={form_modal_open}
        tier={editing_tier}
        onClose={() => {
          setFormModalOpen(false);
          setEditingTier(null);
        }}
        onSubmit={editing_tier ? handleUpdate : handleCreate}
      />

      <DeleteConfirmModal
        tier={deleting_tier}
        is_deleting={is_deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingTier(null)}
      />
    </>
  );
}
