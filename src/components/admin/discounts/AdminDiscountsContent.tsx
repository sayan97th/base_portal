"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { Discount, CreateDiscountPayload, UpdateDiscountPayload, DiscountAppliesTo } from "@/types/admin/discounts";
import {
  listAdminDiscounts,
  createAdminDiscount,
  updateAdminDiscount,
  toggleAdminDiscountStatus,
  deleteAdminDiscount,
} from "@/services/admin/discounts.service";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatRate(discount: Discount): string {
  return `${discount.discount_rate}% off`;
}

const APPLIES_TO_OPTIONS: { value: DiscountAppliesTo; label: string; description: string }[] = [
  { value: "link_building",      label: "Link Building",         description: "Link building orders only" },
  { value: "new_content",        label: "New Content",           description: "New content orders only" },
  { value: "content_optimization", label: "Content Optimization", description: "Content optimization orders only" },
  { value: "content_brief",      label: "Content Briefs",        description: "Content brief orders only" },
  { value: "all",                label: "All Products",          description: "Every product in the cart" },
];

function getAppliesToLabel(applies_to: DiscountAppliesTo): string {
  return APPLIES_TO_OPTIONS.find((o) => o.value === applies_to)?.label ?? applies_to;
}

function formatDate(date_str: string): string {
  return new Date(date_str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ is_active }: { is_active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        is_active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30"
          : "bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:ring-gray-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${is_active ? "bg-emerald-500" : "bg-gray-400"}`}
      />
      {is_active ? "Active" : "Inactive"}
    </span>
  );
}

// ── Confirm Delete Modal ───────────────────────────────────────────────────────

interface ConfirmDeleteModalProps {
  discount: Discount;
  onConfirm: () => void;
  onCancel: () => void;
  is_loading: boolean;
}

function ConfirmDeleteModal({ discount, onConfirm, onCancel, is_loading }: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
          <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Delete Discount</h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-300">{discount.name}</span>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={is_loading}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {is_loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form Modal ─────────────────────────────────────────────────────────────────

interface DiscountFormValues {
  name: string;
  description: string;
  discount_type: "bulk";
  discount_rate: string;
  min_quantity: string;
  applies_to: DiscountAppliesTo;
  is_active: boolean;
}

const DEFAULT_FORM: DiscountFormValues = {
  name: "",
  description: "",
  discount_type: "bulk",
  discount_rate: "10",
  min_quantity: "12",
  applies_to: "link_building",
  is_active: true,
};

interface DiscountFormModalProps {
  editing: Discount | null;
  onSave: (payload: CreateDiscountPayload | UpdateDiscountPayload) => Promise<void>;
  onClose: () => void;
  is_loading: boolean;
}

function DiscountFormModal({ editing, onSave, onClose, is_loading }: DiscountFormModalProps) {
  const [form, setForm] = useState<DiscountFormValues>(() => {
    if (editing) {
      return {
        name: editing.name,
        description: editing.description ?? "",
        discount_type: editing.discount_type,
        discount_rate: String(editing.discount_rate),
        min_quantity: String(editing.min_quantity),
        applies_to: editing.applies_to,
        is_active: editing.is_active,
      };
    }
    return DEFAULT_FORM;
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DiscountFormValues, string>>>({});

  const validate = (): boolean => {
    const new_errors: Partial<Record<keyof DiscountFormValues, string>> = {};
    if (!form.name.trim()) new_errors.name = "Name is required.";
    const rate = parseFloat(form.discount_rate);
    if (isNaN(rate) || rate <= 0 || rate > 100)
      new_errors.discount_rate = "Rate must be between 0.01 and 100.";
    const qty = parseInt(form.min_quantity, 10);
    if (isNaN(qty) || qty < 1)
      new_errors.min_quantity = "Minimum quantity must be at least 1.";
    setErrors(new_errors);
    return Object.keys(new_errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave({
      name: form.name.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_rate: parseFloat(form.discount_rate),
      min_quantity: parseInt(form.min_quantity, 10),
      applies_to: form.applies_to,
      is_active: form.is_active,
    });
  };

  const field = (key: keyof DiscountFormValues, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/20">
              <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {editing ? "Edit Discount" : "New Discount"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Discount Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              placeholder="e.g. Bulk Link Building Discount"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                errors.name
                  ? "border-red-300 focus:ring-red-400/30 dark:border-red-500/50"
                  : "border-gray-200 focus:ring-brand-500/30 focus:border-brand-400 dark:border-gray-700 dark:focus:border-brand-500"
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
              placeholder="Optional description of this discount rule..."
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-500"
            />
          </div>

          {/* Rate + Min Quantity (2 cols) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Discount Rate (%) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.discount_rate}
                  onChange={(e) => field("discount_rate", e.target.value)}
                  min="0.01"
                  max="100"
                  step="0.01"
                  placeholder="10"
                  className={`w-full rounded-xl border px-3.5 py-2.5 pr-8 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                    errors.discount_rate
                      ? "border-red-300 focus:ring-red-400/30 dark:border-red-500/50"
                      : "border-gray-200 focus:ring-brand-500/30 focus:border-brand-400 dark:border-gray-700 dark:focus:border-brand-500"
                  }`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                  %
                </span>
              </div>
              {errors.discount_rate && (
                <p className="mt-1 text-xs text-red-500">{errors.discount_rate}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Min. Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.min_quantity}
                onChange={(e) => field("min_quantity", e.target.value)}
                min="1"
                step="1"
                placeholder="12"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                  errors.min_quantity
                    ? "border-red-300 focus:ring-red-400/30 dark:border-red-500/50"
                    : "border-gray-200 focus:ring-brand-500/30 focus:border-brand-400 dark:border-gray-700 dark:focus:border-brand-500"
                }`}
              />
              {errors.min_quantity && (
                <p className="mt-1 text-xs text-red-500">{errors.min_quantity}</p>
              )}
            </div>
          </div>

          {/* Applies To */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Applies To
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {APPLIES_TO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => field("applies_to", opt.value)}
                  className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    form.applies_to === opt.value
                      ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      form.applies_to === opt.value
                        ? "text-brand-700 dark:text-brand-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="mt-0.5 text-[10px] leading-tight text-gray-400 dark:text-gray-500">
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview pill */}
          {form.discount_rate && form.min_quantity && (
            <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/60 px-3.5 py-3 dark:border-violet-500/20 dark:bg-violet-500/10">
              <svg className="h-4 w-4 shrink-0 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
                Preview: customers ordering{" "}
                <span className="font-bold">{form.min_quantity}+</span>{" "}
                {APPLIES_TO_OPTIONS.find((o) => o.value === form.applies_to)?.label.toLowerCase() ?? form.applies_to}{" "}
                items will receive{" "}
                <span className="font-bold">{form.discount_rate}% off</span>{" "}
                their{" "}
                {form.applies_to === "all" ? "entire cart subtotal" : `${APPLIES_TO_OPTIONS.find((o) => o.value === form.applies_to)?.label.toLowerCase()} subtotal`}.
              </p>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 px-3.5 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Inactive discounts are not applied to any orders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => field("is_active", !form.is_active)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                form.is_active ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  form.is_active ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={is_loading}
              className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {is_loading ? "Saving..." : editing ? "Save Changes" : "Create Discount"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Content ───────────────────────────────────────────────────────────────

export default function AdminDiscountsContent() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [show_form, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form_loading, setFormLoading] = useState(false);
  const [form_error, setFormError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Discount | null>(null);
  const [delete_loading, setDeleteLoading] = useState(false);

  const [toggle_loading_id, setToggleLoadingId] = useState<string | null>(null);

  const [success_message, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const loadDiscounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAdminDiscounts();
      setDiscounts(data);
    } catch {
      setError("Failed to load discounts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  const handleOpenCreate = () => {
    setEditing(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleOpenEdit = (discount: Discount) => {
    setEditing(discount);
    setFormError(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async (payload: Parameters<typeof createAdminDiscount>[0] | Parameters<typeof updateAdminDiscount>[1]) => {
    setFormLoading(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = await updateAdminDiscount(editing.id, payload);
        setDiscounts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        showSuccess("Discount updated successfully.");
      } else {
        const created = await createAdminDiscount(payload as Parameters<typeof createAdminDiscount>[0]);
        setDiscounts((prev) => [created, ...prev]);
        showSuccess("Discount created successfully.");
      }
      handleCloseForm();
    } catch {
      setFormError("Could not save the discount. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (discount: Discount) => {
    setToggleLoadingId(discount.id);
    try {
      const updated = await toggleAdminDiscountStatus(discount.id, !discount.is_active);
      setDiscounts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      showSuccess(`Discount ${updated.is_active ? "activated" : "deactivated"}.`);
    } catch {
      setError("Failed to update discount status.");
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteAdminDiscount(deleting.id);
      setDiscounts((prev) => prev.filter((d) => d.id !== deleting.id));
      setDeleting(null);
      showSuccess("Discount deleted.");
    } catch {
      setError("Failed to delete discount.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const active_count = discounts.filter((d) => d.is_active).length;
  const inactive_count = discounts.length - active_count;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discounts</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage automatic bulk discounts applied at checkout based on item quantity.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Discount
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Total
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{discounts.length}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">discount rules</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Active
          </p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{active_count}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">currently enabled</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-5 sm:col-span-1 dark:border-gray-800 dark:bg-white/3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Inactive
          </p>
          <p className="text-3xl font-bold text-gray-400 dark:text-gray-500">{inactive_count}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">paused rules</p>
        </div>
      </div>

      {/* Success toast */}
      {success_message && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{success_message}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
          <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-white/3">
        {is_loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="mb-3 h-8 w-8 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm">Loading discounts…</p>
          </div>
        ) : discounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
              No discounts configured
            </p>
            <p className="mb-5 text-xs text-gray-400 dark:text-gray-500">
              Create your first discount rule to start rewarding bulk orders.
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create First Discount
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Name
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Type
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Rate
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Min. Qty
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Applies To
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Created
                  </th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {discounts.map((discount) => (
                  <tr
                    key={discount.id}
                    className="group transition-colors hover:bg-gray-50/60 dark:hover:bg-white/2"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {discount.name}
                        </p>
                        {discount.description && (
                          <p className="mt-0.5 max-w-[220px] truncate text-xs text-gray-400 dark:text-gray-500">
                            {discount.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium capitalize text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/30">
                        {discount.discount_type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-gray-800 dark:text-white/80">
                        {formatRate(discount)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white/80">
                          {discount.min_quantity}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">items</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getAppliesToLabel(discount.applies_to)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggle(discount)}
                        disabled={toggle_loading_id === discount.id}
                        className="transition-opacity disabled:opacity-50"
                        title={discount.is_active ? "Deactivate" : "Activate"}
                      >
                        {toggle_loading_id === discount.id ? (
                          <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <StatusBadge is_active={discount.is_active} />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(discount.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleOpenEdit(discount)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleting(discount)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info callout */}
      {!is_loading && discounts.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-5 py-4 dark:border-amber-500/20 dark:bg-amber-500/5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
            <span className="font-semibold">How it works:</span> Active bulk discounts are automatically
            applied in the checkout Order Summary when a customer adds the required number of items to
            their cart. Changes take effect immediately for all new sessions.
          </p>
        </div>
      )}

      {/* Modals */}
      {show_form && (
        <DiscountFormModal
          editing={editing}
          onSave={handleSave}
          onClose={handleCloseForm}
          is_loading={form_loading}
        />
      )}
      {form_error && show_form && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {form_error}
        </div>
      )}
      {deleting && (
        <ConfirmDeleteModal
          discount={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          is_loading={delete_loading}
        />
      )}
    </div>
  );
}
