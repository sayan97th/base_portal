"use client";

import React, { useEffect, useState } from "react";
import type {
  AdminService,
  ServiceCategory,
  PricingModel,
  CreateServicePayload,
} from "@/types/admin/services";

interface ServiceFormModalProps {
  is_open: boolean;
  service: AdminService | null;
  onClose: () => void;
  onSubmit: (payload: CreateServicePayload) => Promise<void>;
}

const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: "link_building", label: "Link Building" },
  { value: "content", label: "Content Creation" },
  { value: "seo", label: "SEO" },
  { value: "other", label: "Other" },
];

const PRICING_MODEL_OPTIONS: { value: PricingModel; label: string; description: string }[] = [
  { value: "tiered", label: "Tiered", description: "Pricing based on service tiers/packages" },
  { value: "fixed", label: "Fixed Price", description: "Single fixed price for the service" },
  { value: "per_unit", label: "Per Unit", description: "Price per individual unit" },
  { value: "subscription", label: "Subscription", description: "Recurring subscription-based pricing" },
  { value: "custom", label: "Custom Quote", description: "Price negotiated per client" },
];

const EMPTY_FORM: CreateServicePayload = {
  name: "",
  description: "",
  category: "link_building",
  pricing_model: "tiered",
  base_price: null,
  is_active: true,
  is_featured: false,
};

export default function ServiceFormModal({
  is_open,
  service,
  onClose,
  onSubmit,
}: ServiceFormModalProps) {
  const [form_data, setFormData] = useState<CreateServicePayload>(EMPTY_FORM);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const is_editing = service !== null;

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description,
        category: service.category,
        pricing_model: service.pricing_model,
        base_price: service.base_price,
        is_active: service.is_active,
        is_featured: service.is_featured,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setError(null);
  }, [service, is_open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form_data.name.trim() || !form_data.description.trim()) {
      setError("Name and description are required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(form_data);
      onClose();
    } catch {
      setError("Failed to save service. Please try again.");
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
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {is_editing ? "Edit Service" : "Add New Service"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {is_editing
                ? "Update the service details below."
                : "Fill in the details to add a new service."}
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
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="service-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Service Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={form_data.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Link Building"
                className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description <span className="text-error-500">*</span>
              </label>
              <textarea
                rows={3}
                value={form_data.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe what this service offers..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <select
                value={form_data.category}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, category: e.target.value as ServiceCategory }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing Model */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pricing Model
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PRICING_MODEL_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      form_data.pricing_model === opt.value
                        ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pricing_model"
                      value={opt.value}
                      checked={form_data.pricing_model === opt.value}
                      onChange={() =>
                        setFormData((p) => ({ ...p, pricing_model: opt.value }))
                      }
                      className="mt-0.5 accent-brand-500"
                    />
                    <div>
                      <p className={`text-sm font-medium ${form_data.pricing_model === opt.value ? "text-brand-700 dark:text-brand-400" : "text-gray-800 dark:text-gray-200"}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {opt.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Base Price (only if not tiered/custom) */}
            {form_data.pricing_model !== "tiered" &&
              form_data.pricing_model !== "custom" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Base Price (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form_data.base_price ?? ""}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          base_price: e.target.value ? parseFloat(e.target.value) : null,
                        }))
                      }
                      placeholder="0.00"
                      className="h-11 w-full rounded-lg border border-gray-300 pl-8 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                </div>
              )}

            {/* Toggles */}
            <div className="space-y-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
              <label className="flex cursor-pointer items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Active
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Visible to clients when enabled
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, is_active: !p.is_active }))}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
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
              <div className="border-t border-gray-100 dark:border-gray-800" />
              <label className="flex cursor-pointer items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Featured
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Highlighted as a recommended service
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, is_featured: !p.is_featured }))}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                    form_data.is_featured ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form_data.is_featured ? "translate-x-4" : "translate-x-0"
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
        </div>

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
            form="service-form"
            disabled={is_submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {is_submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {is_editing ? "Save Changes" : "Add Service"}
          </button>
        </div>
      </div>
    </div>
  );
}
