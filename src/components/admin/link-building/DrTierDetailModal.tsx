"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminDrTierDetail } from "@/types/admin/link-building";
import { getAdminDrTierDetail } from "@/services/admin/link-building.service";

interface DrTierDetailModalProps {
  tier_id: string | null;
  onClose: () => void;
  onEdit: () => void;
  onToggleStatus: (is_active: boolean) => Promise<void>;
  onHide: () => Promise<void>;
  onUnhide: () => Promise<void>;
}

// ── Stat mini card ─────────────────────────────────────────────────────────────

interface MiniStatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function MiniStat({ label, value, icon, color }: MiniStatProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ── Confirm action inline ──────────────────────────────────────────────────────

interface ConfirmBannerProps {
  message: string;
  confirm_label: string;
  confirm_class: string;
  onConfirm: () => void;
  onCancel: () => void;
  is_loading: boolean;
}

function ConfirmBanner({
  message,
  confirm_label,
  confirm_class,
  onConfirm,
  onCancel,
  is_loading,
}: ConfirmBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-error-100 bg-error-50 px-4 py-3 dark:border-error-500/20 dark:bg-error-500/10">
      <p className="text-sm text-error-700 dark:text-error-400">{message}</p>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={onCancel}
          disabled={is_loading}
          className="rounded-lg border border-error-200 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-100 disabled:opacity-50 dark:border-error-500/30 dark:text-error-400"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={is_loading}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${confirm_class}`}
        >
          {is_loading && (
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {confirm_label}
        </button>
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function DrTierDetailModal({
  tier_id,
  onClose,
  onEdit,
  onToggleStatus,
  onHide,
  onUnhide,
}: DrTierDetailModalProps) {
  const [tier, setTier] = useState<AdminDrTierDetail | null>(null);
  const [is_loading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action_loading, setActionLoading] = useState(false);
  const [confirm_action, setConfirmAction] = useState<"disable" | "enable" | "hide" | "unhide" | null>(null);

  useEffect(() => {
    if (!tier_id) {
      setTier(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setConfirmAction(null);
    getAdminDrTierDetail(tier_id)
      .then(setTier)
      .catch(() => setError("Failed to load tier details."))
      .finally(() => setIsLoading(false));
  }, [tier_id]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleConfirmedAction = async () => {
    if (!tier || !confirm_action) return;
    setActionLoading(true);
    try {
      if (confirm_action === "disable") await onToggleStatus(false);
      else if (confirm_action === "enable") await onToggleStatus(true);
      else if (confirm_action === "hide") await onHide();
      else if (confirm_action === "unhide") await onUnhide();
      setConfirmAction(null);
      // Refresh tier data
      const updated = await getAdminDrTierDetail(tier.id);
      setTier(updated);
    } catch {
      setError("Action failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!tier_id) return null;

  const CONFIRM_CONFIGS = {
    disable: {
      message: "This tier will no longer be available to clients but will remain visible in admin.",
      confirm_label: "Disable Tier",
      confirm_class: "bg-warning-500 hover:bg-warning-600",
    },
    enable: {
      message: "This tier will become visible and purchasable by clients again.",
      confirm_label: "Enable Tier",
      confirm_class: "bg-success-500 hover:bg-success-600",
    },
    hide: {
      message: "This tier will be completely hidden from both clients and admin listings.",
      confirm_label: "Hide from Platform",
      confirm_class: "bg-error-500 hover:bg-error-600",
    },
    unhide: {
      message: "This tier will reappear in admin listings. Its status will return to its previous active/disabled state.",
      confirm_label: "Restore Tier",
      confirm_class: "bg-brand-500 hover:bg-brand-600",
    },
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">

        {/* ── Loading state ── */}
        {is_loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12">
            <svg className="h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading tier details...</p>
          </div>
        )}

        {/* ── Error state ── */}
        {!is_loading && error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
              <svg className="h-6 w-6 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <button onClick={onClose} className="text-sm font-medium text-brand-500 hover:underline">
              Close
            </button>
          </div>
        )}

        {/* ── Main content ── */}
        {!is_loading && tier && (
          <>
            {/* Header */}
            <div className="shrink-0 border-b border-gray-100 dark:border-gray-800">
              {/* Gradient bar */}
              <div
                className={`h-1.5 w-full ${tier.is_hidden
                    ? "bg-gray-300 dark:bg-gray-700"
                    : tier.is_active
                      ? "bg-linear-to-r from-brand-400 via-brand-500 to-brand-600"
                      : "bg-linear-to-r from-warning-300 to-warning-400"
                  }`}
              />
              <div className="flex items-start justify-between gap-4 px-6 py-5">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                      <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {tier.dr_label}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                          Link Building
                        </span>
                        {tier.is_most_popular && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Most popular
                          </span>
                        )}
                        {tier.is_hidden ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                            Hidden
                          </span>
                        ) : tier.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700 dark:bg-success-500/10 dark:text-success-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                            Disabled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 p-6">

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat
                    label="Total Orders"
                    value={tier.orders_count ?? 0}
                    color="bg-brand-50 dark:bg-brand-500/10"
                    icon={<svg className="h-4.5 w-4.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
                  />
                  <MiniStat
                    label="Total Revenue"
                    value={(() => { const r = tier.revenue_total ?? 0; return `$${r >= 1000 ? `${(r / 1000).toFixed(1)}k` : r.toFixed(2)}`; })()}
                    color="bg-success-50 dark:bg-success-500/10"
                    icon={<svg className="h-4.5 w-4.5 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                  <MiniStat
                    label="Unique Buyers"
                    value={tier.unique_buyers ?? 0}
                    color="bg-blue-light-50 dark:bg-blue-light-500/10"
                    icon={<svg className="h-4.5 w-4.5 text-blue-light-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  />
                  <MiniStat
                    label="Price / Link"
                    value={`$${tier.price_per_link.toFixed(2)}`}
                    color="bg-orange-50 dark:bg-orange-500/10"
                    icon={<svg className="h-4.5 w-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                  />
                </div>

                {/* Tier info row */}
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:grid-cols-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Traffic Range
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {tier.traffic_range || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Word Count
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {tier.word_count.toLocaleString()} words
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Added On
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(tier.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Purchases table */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Clients who purchased
                    </h3>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {tier.purchases.length} record{tier.purchases.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Client
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Order
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Subtotal
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {tier.purchases.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                  </div>
                                  <p className="text-sm text-gray-400 dark:text-gray-500">
                                    No purchases yet for this tier.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            tier.purchases.map((purchase) => (
                              <tr
                                key={purchase.order_id}
                                className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                              >
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {purchase.user.first_name} {purchase.user.last_name}
                                    </p>
                                    <p className="text-xs text-gray-400">{purchase.user.email}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <Link
                                    href={`/admin/orders/${purchase.order_id}`}
                                    className="font-mono text-xs text-brand-500 hover:underline"
                                  >
                                    {purchase.order_id.slice(0, 8)}…
                                  </Link>
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                  {purchase.quantity}
                                </td>
                                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                                  ${purchase.subtotal.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                  {new Date(purchase.purchased_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Confirm action banner */}
                {confirm_action && (
                  <ConfirmBanner
                    message={CONFIRM_CONFIGS[confirm_action].message}
                    confirm_label={CONFIRM_CONFIGS[confirm_action].confirm_label}
                    confirm_class={CONFIRM_CONFIGS[confirm_action].confirm_class}
                    onConfirm={handleConfirmedAction}
                    onCancel={() => setConfirmAction(null)}
                    is_loading={action_loading}
                  />
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="shrink-0 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  These actions affect client visibility. Existing orders are never deleted.
                </p>
                <div className="flex gap-2">
                  {tier.is_hidden ? (
                    <button
                      onClick={() => setConfirmAction("unhide")}
                      disabled={!!confirm_action}
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Restore to Platform
                    </button>
                  ) : (
                    <>
                      {tier.is_active ? (
                        <button
                          onClick={() => setConfirmAction("disable")}
                          disabled={!!confirm_action}
                          className="inline-flex items-center gap-2 rounded-lg border border-warning-200 bg-warning-50 px-4 py-2 text-xs font-semibold text-warning-700 transition-colors hover:bg-warning-100 disabled:opacity-50 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          Disable Service
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmAction("enable")}
                          disabled={!!confirm_action}
                          className="inline-flex items-center gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-2 text-xs font-semibold text-success-700 transition-colors hover:bg-success-100 disabled:opacity-50 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Enable Service
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmAction("hide")}
                        disabled={!!confirm_action}
                        className="inline-flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2 text-xs font-semibold text-error-700 transition-colors hover:bg-error-100 disabled:opacity-50 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        Hide from Platform
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
