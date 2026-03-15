"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import type { Coupon, CreateCouponPayload } from "@/types/admin/coupons";
import type { AdminDrTier } from "@/types/admin/services";
import {
  listAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  toggleAdminCouponStatus,
  deleteAdminCoupon,
} from "@/services/admin/coupons.service";
import { listAdminDrTiers } from "@/services/admin/services.service";
import CouponFormModal from "./CouponFormModal";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDiscount(coupon: Coupon): string {
  if (coupon.discount_type === "percentage") return `${coupon.discount_value}% off`;
  return `$${coupon.discount_value.toLocaleString("en-US", { minimumFractionDigits: 2 })} off`;
}

function getCouponStatus(coupon: Coupon): "active" | "expired" | "disabled" | "scheduled" {
  if (!coupon.is_active) return "disabled";
  const now = new Date();
  const expires = new Date(coupon.expires_at);
  if (expires < now) return "expired";
  if (coupon.starts_at) {
    const starts = new Date(coupon.starts_at);
    if (starts > now) return "scheduled";
  }
  return "active";
}

function getAppliesToLabel(coupon: Coupon): string {
  if (coupon.applies_to === "specific_product") {
    return coupon.dr_tier_label ? `Tier: ${coupon.dr_tier_label}` : "Specific Tier";
  }
  if (coupon.applies_to === "minimum_purchase") {
    const amount = coupon.minimum_purchase_amount?.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    });
    return `Min. ${amount ?? "N/A"}`;
  }
  return "All Products";
}

function formatDate(date_str: string): string {
  return new Date(date_str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntilExpiry(date_str: string): number {
  const now = new Date();
  const expires = new Date(date_str);
  return Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: "active" | "expired" | "disabled" | "scheduled";
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
    expired: "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30",
    disabled: "bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:ring-gray-700",
    scheduled: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
  };
  const labels = { active: "Active", expired: "Expired", disabled: "Disabled", scheduled: "Scheduled" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : status === "expired" ? "bg-red-500" : status === "scheduled" ? "bg-amber-500" : "bg-gray-400"}`} />
      {labels[status]}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  coupon: Coupon;
  is_deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ coupon, is_deleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10 mb-4">
          <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Coupon</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{coupon.code}</span>?
          This action cannot be undone.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={is_deleting}
            className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={is_deleting}
            className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {is_deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${
        type === "success"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {message}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type StatusFilter = "all" | "active" | "scheduled" | "expired" | "disabled";

export default function AdminCouponsContent() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [dr_tiers, setDrTiers] = useState<AdminDrTier[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search_query, setSearchQuery] = useState("");
  const [status_filter, setStatusFilter] = useState<StatusFilter>("all");

  const [form_modal_open, setFormModalOpen] = useState(false);
  const [editing_coupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [delete_coupon, setDeleteCoupon] = useState<Coupon | null>(null);
  const [is_deleting, setIsDeleting] = useState(false);

  const [copied_code, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetched_coupons, fetched_tiers] = await Promise.all([
        listAdminCoupons(),
        listAdminDrTiers(),
      ]);
      setCoupons(fetched_coupons);
      setDrTiers(fetched_tiers);
    } catch {
      setError("Failed to load coupons. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats
  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => getCouponStatus(c) === "active").length;
    const expired = coupons.filter((c) => getCouponStatus(c) === "expired").length;
    const disabled = coupons.filter((c) => getCouponStatus(c) === "disabled").length;
    const scheduled = coupons.filter((c) => getCouponStatus(c) === "scheduled").length;
    return { total, active, expired, disabled, scheduled };
  }, [coupons]);

  // Filtered coupons
  const filtered_coupons = useMemo(() => {
    return coupons.filter((c) => {
      if (status_filter !== "all" && getCouponStatus(c) !== status_filter) return false;
      if (search_query) {
        const q = search_query.toLowerCase();
        return (
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [coupons, status_filter, search_query]);

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }, []);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (payload: CreateCouponPayload) => {
    try {
      if (editing_coupon) {
        const updated = await updateAdminCoupon(editing_coupon.id, payload);
        setCoupons((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        showToast("Coupon updated successfully.", "success");
      } else {
        const created = await createAdminCoupon(payload);
        setCoupons((prev) => [created, ...prev]);
        showToast("Coupon created successfully.", "success");
      }
      setFormModalOpen(false);
      setEditingCoupon(null);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to save coupon.";
      showToast(message, "error");
      throw err;
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const new_status = !coupon.is_active;
    setCoupons((prev) =>
      prev.map((c) => (c.id === coupon.id ? { ...c, is_active: new_status } : c))
    );
    try {
      await toggleAdminCouponStatus(coupon.id, new_status);
      showToast(
        new_status ? "Coupon activated." : "Coupon deactivated.",
        "success"
      );
    } catch {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !new_status } : c))
      );
      showToast("Failed to update status.", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!delete_coupon) return;
    setIsDeleting(true);
    try {
      await deleteAdminCoupon(delete_coupon.id);
      setCoupons((prev) => prev.filter((c) => c.id !== delete_coupon.id));
      showToast("Coupon deleted.", "success");
      setDeleteCoupon(null);
    } catch {
      showToast("Failed to delete coupon.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const status_tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "active", label: "Active", count: stats.active },
    { key: "scheduled", label: "Scheduled", count: stats.scheduled },
    { key: "expired", label: "Expired", count: stats.expired },
    { key: "disabled", label: "Disabled", count: stats.disabled },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Coupons</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Manage discount coupons for your platform.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Coupon
        </button>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Coupons"
          value={stats.total}
          color="bg-brand-50 dark:bg-brand-500/10"
          icon={
            <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active"
          value={stats.active}
          color="bg-emerald-50 dark:bg-emerald-500/10"
          icon={
            <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          color="bg-red-50 dark:bg-red-500/10"
          icon={
            <svg className="h-5 w-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Scheduled"
          value={stats.scheduled}
          color="bg-amber-50 dark:bg-amber-500/10"
          icon={
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
            </svg>
          }
        />
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-gray-100 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900 overflow-x-auto">
          {status_tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                status_filter === tab.key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  status_filter === tab.key
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search coupons..."
            value={search_query}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Content */}
      {is_loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={loadData}
            className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
          >
            Retry
          </button>
        </div>
      ) : filtered_coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
            <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
            No coupons found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search_query ? "Try a different search." : "Create your first coupon to get started."}
          </p>
          {!search_query && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Create Coupon
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
          {/* Table header */}
          <div className="hidden grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-900/60 lg:grid">
            {["Code", "Name", "Discount", "Applies To", "Usage", "Expires", ""].map((h) => (
              <span key={h} className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered_coupons.map((coupon) => {
              const status = getCouponStatus(coupon);
              const days_left = daysUntilExpiry(coupon.expires_at);
              const usage_pct =
                coupon.usage_limit ? (coupon.times_used / coupon.usage_limit) * 100 : null;

              return (
                <div
                  key={coupon.id}
                  className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/2 lg:grid lg:grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr_1fr_auto] lg:items-center lg:gap-4"
                >
                  {/* Code */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-widest text-gray-900 dark:text-white">
                      {coupon.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(coupon.code)}
                      title="Copy code"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                      {copied_code === coupon.code ? (
                        <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <StatusBadge status={status} />
                  </div>

                  {/* Name + Description */}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{coupon.name}</p>
                    {coupon.description && (
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
                        {coupon.description}
                      </p>
                    )}
                  </div>

                  {/* Discount */}
                  <div>
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-bold ${
                        coupon.discount_type === "percentage"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      }`}
                    >
                      {formatDiscount(coupon)}
                    </span>
                  </div>

                  {/* Applies To */}
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      {coupon.applies_to === "all" && (
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                      )}
                      {getAppliesToLabel(coupon)}
                    </span>
                  </div>

                  {/* Usage */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {coupon.times_used}
                      {coupon.usage_limit ? ` / ${coupon.usage_limit}` : " uses"}
                    </p>
                    {usage_pct !== null && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usage_pct >= 90
                              ? "bg-red-500"
                              : usage_pct >= 60
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(usage_pct, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Expires */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {formatDate(coupon.expires_at)}
                    </p>
                    {status !== "expired" && status !== "disabled" && (
                      <p
                        className={`mt-0.5 text-[11px] ${
                          days_left <= 7
                            ? "text-red-500"
                            : days_left <= 30
                              ? "text-amber-500"
                              : "text-gray-400"
                        }`}
                      >
                        {days_left <= 0 ? "Expires today" : `${days_left}d left`}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggleStatus(coupon)}
                      title={coupon.is_active ? "Deactivate" : "Activate"}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                        coupon.is_active
                          ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {coupon.is_active ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                        )}
                      </svg>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(coupon)}
                      title="Edit"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteCoupon(coupon)}
                      title="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form Modal */}
      <CouponFormModal
        is_open={form_modal_open}
        editing_coupon={editing_coupon}
        dr_tiers={dr_tiers}
        onClose={() => {
          setFormModalOpen(false);
          setEditingCoupon(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirm Modal */}
      {delete_coupon && (
        <DeleteConfirmModal
          coupon={delete_coupon}
          is_deleting={is_deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteCoupon(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
