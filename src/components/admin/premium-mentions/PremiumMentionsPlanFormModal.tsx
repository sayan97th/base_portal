"use client";

import React, { useEffect, useState } from "react";
import type {
  AdminPremiumMentionsPlan,
  CreatePremiumMentionsPlanPayload,
} from "@/types/admin/premium-mentions";

interface PremiumMentionsPlanFormModalProps {
  is_open: boolean;
  plan: AdminPremiumMentionsPlan | null;
  onClose: () => void;
  onSubmit: (payload: CreatePremiumMentionsPlanPayload) => Promise<void>;
}

const EMPTY_FORM: CreatePremiumMentionsPlanPayload = {
  name: "",
  price_per_month: 0,
  total_placements: 0,
  exclusive_placements: 0,
  core_placements: 0,
  support_placements: 0,
  best_for: "",
  tagline: "",
  is_most_popular: false,
  is_active: true,
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
          value ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
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

export default function PremiumMentionsPlanFormModal({
  is_open,
  plan,
  onClose,
  onSubmit,
}: PremiumMentionsPlanFormModalProps) {
  const [form_data, setFormData] = useState<CreatePremiumMentionsPlanPayload>(EMPTY_FORM);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const is_editing = plan !== null;

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        price_per_month: plan.price_per_month,
        total_placements: plan.total_placements,
        exclusive_placements: plan.exclusive_placements,
        core_placements: plan.core_placements,
        support_placements: plan.support_placements,
        best_for: plan.best_for,
        tagline: plan.tagline,
        is_most_popular: plan.is_most_popular,
        is_active: plan.is_active,
        sort_order: plan.sort_order,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setError(null);
  }, [plan, is_open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form_data.name.trim()) {
      setError("Plan name is required.");
      return;
    }
    if (form_data.price_per_month <= 0) {
      setError("Price must be greater than 0.");
      return;
    }
    if (form_data.total_placements <= 0) {
      setError("Total placements must be greater than 0.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(form_data);
      onClose();
    } catch {
      setError("Failed to save plan. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setField = <K extends keyof CreatePremiumMentionsPlanPayload>(
    key: K,
    value: CreatePremiumMentionsPlanPayload[K]
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  if (!is_open) return null;

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {is_editing ? "Edit Plan" : "Add Plan"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {is_editing ? "Update Premium Mentions plan details." : "Create a new Premium Mentions plan."}
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
        <form
          id="pm-plan-form"
          onSubmit={handleSubmit}
          className="max-h-[calc(100vh-220px)] overflow-y-auto space-y-4 px-6 py-5"
        >
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Plan Name <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={form_data.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Starter, Growth, Enterprise"
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Tagline */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tagline
            </label>
            <input
              type="text"
              value={form_data.tagline}
              onChange={(e) => setField("tagline", e.target.value)}
              placeholder="Short description shown on the plan card"
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Best for */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Best For
            </label>
            <input
              type="text"
              value={form_data.best_for}
              onChange={(e) => setField("best_for", e.target.value)}
              placeholder="e.g. Small businesses getting started with PR"
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Price & Sort order row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price / Month <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form_data.price_per_month}
                  onChange={(e) => setField("price_per_month", parseFloat(e.target.value) || 0)}
                  className="h-11 w-full rounded-lg border border-gray-300 pl-8 pr-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
                className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Placements section */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Placements</p>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Total <span className="text-error-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form_data.total_placements}
                  onChange={(e) => setField("total_placements", parseInt(e.target.value) || 0)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Exclusive
                </label>
                <input
                  type="number"
                  min={0}
                  value={form_data.exclusive_placements}
                  onChange={(e) => setField("exclusive_placements", parseInt(e.target.value) || 0)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Core
                </label>
                <input
                  type="number"
                  min={0}
                  value={form_data.core_placements}
                  onChange={(e) => setField("core_placements", parseInt(e.target.value) || 0)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Support
                </label>
                <input
                  type="number"
                  min={0}
                  value={form_data.support_placements}
                  onChange={(e) => setField("support_placements", parseInt(e.target.value) || 0)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
            <Toggle
              label="Most Popular"
              description="Highlighted with a badge on the plan card"
              value={form_data.is_most_popular}
              onChange={(v) => setField("is_most_popular", v)}
            />
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <Toggle
              label="Active"
              description="Visible to clients on the Premium Mentions page"
              value={form_data.is_active}
              onChange={(v) => setField("is_active", v)}
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
            form="pm-plan-form"
            disabled={is_submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {is_submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {is_editing ? "Save Changes" : "Add Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
