"use client";

import React, { useState, useEffect } from "react";
import type { Coupon, CreateCouponPayload, DiscountType, AppliesTo } from "@/types/admin/coupons";
import type { AdminDrTier } from "@/types/admin/link-building";

interface CouponFormModalProps {
  is_open: boolean;
  editing_coupon: Coupon | null;
  dr_tiers: AdminDrTier[];
  onClose: () => void;
  onSubmit: (payload: CreateCouponPayload) => Promise<void>;
}

const empty_form = (): CreateCouponPayload => ({
  code: "",
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  applies_to: "all",
  dr_tier_id: null,
  minimum_purchase_amount: null,
  starts_at: null,
  expires_at: "",
  usage_limit: null,
  usage_per_user: null,
  is_active: true,
});

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function CouponFormModal({
  is_open,
  editing_coupon,
  dr_tiers,
  onClose,
  onSubmit,
}: CouponFormModalProps) {
  const [form_data, setFormData] = useState<CreateCouponPayload>(empty_form());
  const [has_usage_limit, setHasUsageLimit] = useState(false);
  const [has_per_user_limit, setHasPerUserLimit] = useState(false);
  const [has_start_date, setHasStartDate] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!is_open) return;
    if (editing_coupon) {
      setFormData({
        code: editing_coupon.code,
        name: editing_coupon.name,
        description: editing_coupon.description ?? "",
        discount_type: editing_coupon.discount_type,
        discount_value: editing_coupon.discount_value,
        applies_to: editing_coupon.applies_to,
        dr_tier_id: editing_coupon.dr_tier_id,
        minimum_purchase_amount: editing_coupon.minimum_purchase_amount,
        starts_at: editing_coupon.starts_at ?? null,
        expires_at: editing_coupon.expires_at.slice(0, 10),
        usage_limit: editing_coupon.usage_limit,
        usage_per_user: editing_coupon.usage_per_user,
        is_active: editing_coupon.is_active,
      });
      setHasUsageLimit(editing_coupon.usage_limit !== null);
      setHasPerUserLimit(editing_coupon.usage_per_user !== null);
      setHasStartDate(editing_coupon.starts_at !== null);
    } else {
      setFormData(empty_form());
      setHasUsageLimit(false);
      setHasPerUserLimit(false);
      setHasStartDate(false);
    }
    setErrors({});
  }, [is_open, editing_coupon]);

  const updateField = <K extends keyof CreateCouponPayload>(
    key: K,
    value: CreateCouponPayload[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const new_errors: Record<string, string> = {};
    if (!form_data.code.trim()) new_errors.code = "Code is required.";
    if (!form_data.name.trim()) new_errors.name = "Name is required.";
    if (form_data.discount_value <= 0) new_errors.discount_value = "Value must be greater than 0.";
    if (form_data.discount_type === "percentage" && form_data.discount_value > 100)
      new_errors.discount_value = "Percentage cannot exceed 100.";
    if (!form_data.expires_at) new_errors.expires_at = "Expiry date is required.";
    if (form_data.applies_to === "specific_product" && !form_data.dr_tier_id)
      new_errors.dr_tier_id = "Please select a DR tier.";
    if (
      form_data.applies_to === "minimum_purchase" &&
      (!form_data.minimum_purchase_amount || form_data.minimum_purchase_amount <= 0)
    )
      new_errors.minimum_purchase_amount = "Minimum amount must be greater than 0.";
    setErrors(new_errors);
    return Object.keys(new_errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload: CreateCouponPayload = {
        ...form_data,
        description: form_data.description || null,
        starts_at: has_start_date ? form_data.starts_at : null,
        usage_limit: has_usage_limit ? form_data.usage_limit : null,
        usage_per_user: has_per_user_limit ? form_data.usage_per_user : null,
        dr_tier_id: form_data.applies_to === "specific_product" ? form_data.dr_tier_id : null,
        minimum_purchase_amount:
          form_data.applies_to === "minimum_purchase"
            ? form_data.minimum_purchase_amount
            : null,
      };
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!is_open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {editing_coupon ? "Edit Coupon" : "Create Coupon"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {editing_coupon
                ? "Update the coupon details below."
                : "Fill in the details to create a new discount coupon."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Code + Name */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Code */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Coupon Code <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form_data.code}
                  onChange={(e) => updateField("code", e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE20"
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-mono uppercase tracking-widest bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
                    errors.code
                      ? "border-red-400 dark:border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => updateField("code", generateCode())}
                  title="Auto-generate code"
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Auto
                </button>
              </div>
              {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
            </div>

            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Coupon Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form_data.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Summer Sale 20% Off"
                className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
                  errors.name
                    ? "border-red-400 dark:border-red-500"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form_data.description ?? ""}
              onChange={(e) => updateField("description", e.target.value)}
              rows={2}
              placeholder="Internal note about this coupon..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-colors"
            />
          </div>

          {/* Discount Type + Value */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Discount
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Type selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Type
                </label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden dark:border-gray-700">
                  {(
                    [
                      { value: "percentage", label: "% Percentage" },
                      { value: "fixed_amount", label: "$ Fixed" },
                    ] as { value: DiscountType; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField("discount_type", opt.value)}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${
                        form_data.discount_type === opt.value
                          ? "bg-brand-500 text-white"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  {form_data.discount_type === "percentage" ? "Percentage (%)" : "Amount ($)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {form_data.discount_type === "percentage" ? "%" : "$"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={form_data.discount_type === "percentage" ? 100 : undefined}
                    step="0.01"
                    value={form_data.discount_value}
                    onChange={(e) => updateField("discount_value", parseFloat(e.target.value) || 0)}
                    className={`w-full rounded-lg border pl-7 pr-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
                      errors.discount_value
                        ? "border-red-400 dark:border-red-500"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  />
                </div>
                {errors.discount_value && (
                  <p className="mt-1 text-xs text-red-500">{errors.discount_value}</p>
                )}
              </div>
            </div>
          </div>

          {/* Applies To */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Applies To
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    value: "all",
                    label: "All Products",
                    icon: (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                      </svg>
                    ),
                  },
                  {
                    value: "specific_product",
                    label: "Specific Tier",
                    icon: (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    ),
                  },
                  {
                    value: "minimum_purchase",
                    label: "Min. Purchase",
                    icon: (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                ] as { value: AppliesTo; label: string; icon: React.ReactNode }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField("applies_to", opt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all ${
                    form_data.applies_to === opt.value
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Conditional fields */}
            {form_data.applies_to === "specific_product" && (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Select DR Tier <span className="text-red-500">*</span>
                </label>
                <select
                  value={form_data.dr_tier_id ?? ""}
                  onChange={(e) => updateField("dr_tier_id", e.target.value || null)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
                    errors.dr_tier_id
                      ? "border-red-400 dark:border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <option value="">-- Select a tier --</option>
                  {dr_tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.dr_label} — {tier.traffic_range}
                    </option>
                  ))}
                </select>
                {errors.dr_tier_id && (
                  <p className="mt-1 text-xs text-red-500">{errors.dr_tier_id}</p>
                )}
              </div>
            )}

            {form_data.applies_to === "minimum_purchase" && (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Minimum Purchase Amount ($) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form_data.minimum_purchase_amount ?? ""}
                    onChange={(e) =>
                      updateField("minimum_purchase_amount", parseFloat(e.target.value) || null)
                    }
                    placeholder="1000.00"
                    className={`w-full rounded-lg border pl-7 pr-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
                      errors.minimum_purchase_amount
                        ? "border-red-400 dark:border-red-500"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  />
                </div>
                {errors.minimum_purchase_amount && (
                  <p className="mt-1 text-xs text-red-500">{errors.minimum_purchase_amount}</p>
                )}
              </div>
            )}
          </div>

          {/* Validity Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Start Date */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <button
                  type="button"
                  onClick={() => setHasStartDate((v) => !v)}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                    has_start_date ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                      has_start_date ? "translate-x-3.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <input
                type="date"
                disabled={!has_start_date}
                value={form_data.starts_at?.slice(0, 10) ?? ""}
                onChange={(e) => updateField("starts_at", e.target.value || null)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-40 transition-colors"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form_data.expires_at}
                onChange={(e) => updateField("expires_at", e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
                  errors.expires_at
                    ? "border-red-400 dark:border-red-500"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              />
              {errors.expires_at && (
                <p className="mt-1 text-xs text-red-500">{errors.expires_at}</p>
              )}
            </div>
          </div>

          {/* Usage Limits */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Total Usage Limit */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Total Usage Limit
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setHasUsageLimit((v) => !v);
                    if (!has_usage_limit) updateField("usage_limit", 100);
                    else updateField("usage_limit", null);
                  }}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                    has_usage_limit ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                      has_usage_limit ? "translate-x-3.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <input
                type="number"
                min="1"
                disabled={!has_usage_limit}
                value={form_data.usage_limit ?? ""}
                onChange={(e) => updateField("usage_limit", parseInt(e.target.value) || null)}
                placeholder="e.g. 100"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-40 transition-colors"
              />
            </div>

            {/* Per User Limit */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Per User Limit
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setHasPerUserLimit((v) => !v);
                    if (!has_per_user_limit) updateField("usage_per_user", 1);
                    else updateField("usage_per_user", null);
                  }}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                    has_per_user_limit ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                      has_per_user_limit ? "translate-x-3.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <input
                type="number"
                min="1"
                disabled={!has_per_user_limit}
                value={form_data.usage_per_user ?? ""}
                onChange={(e) => updateField("usage_per_user", parseInt(e.target.value) || null)}
                placeholder="e.g. 1"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-40 transition-colors"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Active</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Inactive coupons cannot be applied by users.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateField("is_active", !form_data.is_active)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                form_data.is_active ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  form_data.is_active ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={is_submitting}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={is_submitting}
              className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {is_submitting
                ? editing_coupon
                  ? "Saving..."
                  : "Creating..."
                : editing_coupon
                  ? "Save Changes"
                  : "Create Coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
