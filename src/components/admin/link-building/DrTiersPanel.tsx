"use client";

import React, { useState } from "react";
import type { AdminDrTier, CreateDrTierPayload, UpdateDrTierPayload } from "@/types/admin/link-building";
import DrTierFormModal from "./DrTierFormModal";
import {
  createAdminDrTier,
  updateAdminDrTier,
  toggleAdminDrTierStatus,
  deleteAdminDrTier,
} from "@/services/admin/link-building.service";

interface DrTiersPanelProps {
  tiers: AdminDrTier[];
  service_name: string;
  onRefresh: () => void;
}

interface DeleteConfirmProps {
  tier_label: string;
  onConfirm: () => void;
  onCancel: () => void;
  is_loading: boolean;
}

function DeleteConfirmModal({ tier_label, onConfirm, onCancel, is_loading }: DeleteConfirmProps) {
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
            Remove DR Tier
          </h3>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to remove <span className="font-medium text-gray-700 dark:text-gray-300">{tier_label}</span>? This action will mark it as unavailable.
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

export default function DrTiersPanel({
  tiers,
  service_name,
  onRefresh,
}: DrTiersPanelProps) {
  const [modal_open, setModalOpen] = useState(false);
  const [editing_tier, setEditingTier] = useState<AdminDrTier | null>(null);
  const [deleting_tier, setDeletingTier] = useState<AdminDrTier | null>(null);
  const [is_deleting, setIsDeleting] = useState(false);
  const [toggling_id, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active_count = tiers.filter((t) => t.is_active).length;
  const inactive_count = tiers.length - active_count;

  const handleAddTier = async (payload: CreateDrTierPayload) => {
    await createAdminDrTier(payload);
    onRefresh();
  };

  const handleEditTier = async (payload: CreateDrTierPayload) => {
    if (!editing_tier) return;
    await updateAdminDrTier(editing_tier.id, payload as UpdateDrTierPayload);
    onRefresh();
  };

  const handleToggle = async (tier: AdminDrTier) => {
    setTogglingId(tier.id);
    setError(null);
    try {
      await toggleAdminDrTierStatus(tier.id, !tier.is_active);
      onRefresh();
    } catch {
      setError("Failed to update tier status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting_tier) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAdminDrTier(deleting_tier.id);
      setDeletingTier(null);
      onRefresh();
    } catch {
      setError("Failed to remove tier.");
      setIsDeleting(false);
    }
  };

  const openEdit = (tier: AdminDrTier) => {
    setEditingTier(tier);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingTier(null);
    setModalOpen(true);
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {service_name} — DR Tiers
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {tiers.length} tier{tiers.length !== 1 ? "s" : ""} total
                {active_count > 0 && (
                  <span className="ml-1.5 text-success-600 dark:text-success-400">
                    · {active_count} active
                  </span>
                )}
                {inactive_count > 0 && (
                  <span className="ml-1.5 text-gray-400">
                    · {inactive_count} inactive
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Tier
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  DR Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Traffic Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Word Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Price / Link
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Popular
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tiers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 4v16" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No DR tiers yet. Add your first tier to get started.
                      </p>
                      <button
                        onClick={openAdd}
                        className="mt-1 text-sm font-medium text-brand-500 hover:text-brand-600"
                      >
                        Add first tier →
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                tiers.map((tier) => (
                  <tr
                    key={tier.id}
                    className={`transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                      !tier.is_active ? "opacity-60" : ""
                    }`}
                  >
                    {/* DR Label */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
                          <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {tier.dr_label}
                        </span>
                      </div>
                    </td>

                    {/* Traffic Range */}
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {tier.traffic_range || "—"}
                    </td>

                    {/* Word Count */}
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {tier.word_count.toLocaleString()} words
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${tier.price_per_link.toFixed(2)}
                      </span>
                    </td>

                    {/* Popular */}
                    <td className="px-6 py-4">
                      {tier.is_most_popular ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Popular
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(tier)}
                        disabled={toggling_id === tier.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50 ${
                          tier.is_active
                            ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {toggling_id === tier.id ? (
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <span className={`h-1.5 w-1.5 rounded-full ${tier.is_active ? "bg-success-500" : "bg-gray-400"}`} />
                        )}
                        {tier.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(tier)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingTier(tier)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-error-100 bg-white px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-500/20 dark:bg-white/3 dark:text-error-400 dark:hover:bg-error-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tier Form Modal */}
      <DrTierFormModal
        is_open={modal_open}
        tier={editing_tier}
        onClose={() => { setModalOpen(false); setEditingTier(null); }}
        onSubmit={editing_tier ? handleEditTier : handleAddTier}
      />

      {/* Delete confirmation */}
      {deleting_tier && (
        <DeleteConfirmModal
          tier_label={deleting_tier.dr_label}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTier(null)}
          is_loading={is_deleting}
        />
      )}
    </>
  );
}
