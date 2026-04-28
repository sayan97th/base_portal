"use client";

import React, { useEffect, useState } from "react";
import type {
  AdminContentOptimizationTier,
  CreateContentOptimizationTierPayload,
} from "@/types/admin/content-optimization";

interface ContentOptimizationTierFormModalProps {
  is_open: boolean;
  tier: AdminContentOptimizationTier | null;
  onClose: () => void;
  onSubmit: (payload: CreateContentOptimizationTierPayload) => Promise<void>;
}

const EMPTY_FORM: CreateContentOptimizationTierPayload = {
  id: "",
  label: "",
  word_count_range: "",
  turnaround_days: 5,
  price: 0,
  is_active: true,
  is_most_popular: false,
  max_quantity: null,
  is_hidden: false,
  sort_order: 0,
};

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
          value ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

export default function ContentOptimizationTierFormModal({
  is_open,
  tier,
  onClose,
  onSubmit,
}: ContentOptimizationTierFormModalProps) {
  const [form_data, setFormData] = useState<CreateContentOptimizationTierPayload>(EMPTY_FORM);
  const [has_max_quantity, setHasMaxQuantity] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const is_editing = tier !== null;

  useEffect(() => {
    if (tier) {
      setFormData({
        id: tier.id,
        label: tier.label,
        word_count_range: tier.word_count_range,
        turnaround_days: tier.turnaround_days,
        price: tier.price,
        is_active: tier.is_active,
        is_most_popular: tier.is_most_popular,
        max_quantity: tier.max_quantity,
        is_hidden: tier.is_hidden,
        sort_order: tier.sort_order,
      });
      setHasMaxQuantity(tier.max_quantity !== null);
    } else {
      setFormData(EMPTY_FORM);
      setHasMaxQuantity(false);
    }
    setError(null);
  }, [tier, is_open]);

  const setField = <K extends keyof CreateContentOptimizationTierPayload>(
    key: K,
    value: CreateContentOptimizationTierPayload[K]
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleMaxQuantityToggle = (enabled: boolean) => {
    setHasMaxQuantity(enabled);
    setField("max_quantity", enabled ? 1 : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form_data.id.trim()) {
      setError("Tier ID is required.");
      return;
    }
    if (!form_data.label.trim()) {
      setError("Label is required.");
      return;
    }
    if (!form_data.word_count_range.trim()) {
      setError("Word count range is required.");
      return;
    }
    if (form_data.turnaround_days <= 0) {
      setError("Turnaround days must be greater than 0.");
      return;
    }
    if (form_data.price <= 0) {
      setError("Price must be greater than 0.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(form_data);
      onClose();
    } catch {
      setError("Failed to save tier. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!is_open) return null;

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10">
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {is_editing ? "Edit Optimization Tier" : "Add Optimization Tier"}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {is_editing
                  ? "Update the details of this Content Optimization tier."
                  : "Create a new tier for the Content Optimization service."}
              </p>
            </div>
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

        {/* Body */}
        <form
          id="content-optimization-tier-form"
          onSubmit={handleSubmit}
          className="max-h-[calc(100vh-220px)] space-y-4 overflow-y-auto px-6 py-5"
        >
          {/* ID */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tier ID <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={form_data.id}
              onChange={(e) => setField("id", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              placeholder="e.g. basic, standard, premium"
              disabled={is_editing}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-3 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:disabled:bg-gray-800/50"
            />
            {is_editing && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                The ID cannot be changed after creation.
              </p>
            )}
          </div>

          {/* Label */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Label <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={form_data.label}
              onChange={(e) => setField("label", e.target.value)}
              placeholder="e.g. Basic, Standard, Premium"
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-3 focus:ring-violet-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Word Count Range */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Word Count Range <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={form_data.word_count_range}
              onChange={(e) => setField("word_count_range", e.target.value)}
              placeholder="e.g. 500–750 words, Up to 1,000 words"
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-3 focus:ring-violet-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Turnaround Days, Price & Sort Order */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Turnaround <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={form_data.turnaround_days}
                  onChange={(e) => setField("turnaround_days", parseInt(e.target.value) || 1)}
                  className="h-11 w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-10 text-sm text-gray-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-3 focus:ring-violet-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  days
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form_data.price}
                  onChange={(e) => setField("price", parseFloat(e.target.value) || 0)}
                  className="h-11 w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-4 text-sm text-gray-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-3 focus:ring-violet-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort Order
              </label>
              <input
                type="number"
                min={0}
                value={form_data.sort_order}
                onChange={(e) => setField("sort_order", parseInt(e.target.value) || 0)}
                className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-3 focus:ring-violet-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Max Quantity */}
          <div className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Max Quantity</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Limit the number of pages a client can order
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleMaxQuantityToggle(!has_max_quantity)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  has_max_quantity ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    has_max_quantity ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {has_max_quantity && (
              <div className="mt-3">
                <input
                  type="number"
                  min={1}
                  value={form_data.max_quantity ?? 1}
                  onChange={(e) => setField("max_quantity", parseInt(e.target.value) || 1)}
                  placeholder="e.g. 10"
                  className="h-10 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-3 focus:ring-violet-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
            <Toggle
              label="Active"
              description="Visible and available to clients"
              value={form_data.is_active}
              onChange={(v) => setField("is_active", v)}
            />
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <Toggle
              label="Most Popular"
              description="Highlighted with a badge on the tier card"
              value={form_data.is_most_popular}
              onChange={(v) => setField("is_most_popular", v)}
            />
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <Toggle
              label="Hidden"
              description="Hidden from the public listing but still accessible"
              value={form_data.is_hidden}
              onChange={(v) => setField("is_hidden", v)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={is_submitting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="content-optimization-tier-form"
            disabled={is_submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
          >
            {is_submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {is_editing ? "Save Changes" : "Add Tier"}
          </button>
        </div>
      </div>
    </div>
  );
}
