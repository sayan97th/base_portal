"use client";

import React, { useEffect, useState } from "react";
import type { AdminDrTier, CreateDrTierPayload } from "@/types/admin/link-building";

interface DrTierFormModalProps {
  is_open: boolean;
  tier: AdminDrTier | null;
  onClose: () => void;
  onSubmit: (payload: CreateDrTierPayload) => Promise<void>;
}

const EMPTY_FORM: CreateDrTierPayload = {
  label: "",
  traffic_range: "",
  word_count: 500,
  price_per_link: 0,
  is_most_popular: false,
  is_active: true,
};

export default function DrTierFormModal({
  is_open,
  tier,
  onClose,
  onSubmit,
}: DrTierFormModalProps) {
  const [form_data, setFormData] = useState<CreateDrTierPayload>(EMPTY_FORM);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const is_editing = tier !== null;

  useEffect(() => {
    if (tier) {
      setFormData({
        label: tier.label,
        traffic_range: tier.traffic_range,
        word_count: tier.word_count,
        price_per_link: tier.price_per_link,
        is_most_popular: tier.is_most_popular,
        is_active: tier.is_active,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setError(null);
  }, [tier, is_open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form_data.label.trim()) {
      setError("DR label is required.");
      return;
    }
    if (form_data.price_per_link <= 0) {
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
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {is_editing ? "Edit DR Tier" : "Add DR Tier"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {is_editing ? "Update tier details." : "Add a new link building tier."}
            </p>
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
        <form id="dr-tier-form" onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* DR Label */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              DR Label <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={form_data.label}
              onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. DR 20-30"
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Traffic Range */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Traffic Range
            </label>
            <input
              type="text"
              value={form_data.traffic_range}
              onChange={(e) => setFormData((p) => ({ ...p, traffic_range: e.target.value }))}
              placeholder="e.g. 10K – 50K monthly visitors"
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Word Count & Price row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Word Count
              </label>
              <input
                type="number"
                min={0}
                value={form_data.word_count}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, word_count: parseInt(e.target.value) || 0 }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price per Link <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form_data.price_per_link}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      price_per_link: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 pl-8 pr-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
            <label className="flex cursor-pointer items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Most Popular</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Highlighted with a badge</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, is_most_popular: !p.is_most_popular }))}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  form_data.is_most_popular ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form_data.is_most_popular ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <label className="flex cursor-pointer items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Active</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Visible to clients</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, is_active: !p.is_active }))}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  form_data.is_active ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form_data.is_active ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
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
            form="dr-tier-form"
            disabled={is_submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
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
