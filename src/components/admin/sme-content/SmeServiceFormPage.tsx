"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SmeServiceType } from "./SmeServiceCard";
import { adminSmeAuthoredService } from "@/services/admin/sme-authored.service";
import { adminSmeCollaborationService } from "@/services/admin/sme-collaboration.service";
import { adminSmeEnhancedService } from "@/services/admin/sme-enhanced.service";
import type { SmeAuthoredTierPayload } from "@/services/admin/sme-authored.service";

const type_meta: Record<SmeServiceType, { label: string; color: string; description: string }> = {
  authored: {
    label: "Authored",
    color: "text-blue-600 dark:text-blue-400",
    description: "Fully written content created by our expert writers.",
  },
  collaboration: {
    label: "Collaboration",
    color: "text-purple-600 dark:text-purple-400",
    description: "Co-created content in partnership with subject matter experts.",
  },
  enhanced: {
    label: "Enhanced",
    color: "text-emerald-600 dark:text-emerald-400",
    description: "Premium content with advanced SEO enhancements.",
  },
};

const services = {
  authored: adminSmeAuthoredService,
  collaboration: adminSmeCollaborationService,
  enhanced: adminSmeEnhancedService,
};

interface SmeServiceFormPageProps {
  type: SmeServiceType;
  service_id?: string;
}

const EMPTY_FORM: SmeAuthoredTierPayload = {
  label: "",
  description: "",
  price: 0,
};

export default function SmeServiceFormPage({ type, service_id }: SmeServiceFormPageProps) {
  const router = useRouter();
  const is_editing = !!service_id;
  const meta = type_meta[type];
  const service = services[type];

  const [form_data, setFormData] = useState<SmeAuthoredTierPayload>(EMPTY_FORM);
  const [is_loading, setIsLoading] = useState(is_editing);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  const fetchService = useCallback(async () => {
    if (!service_id) return;
    setIsLoading(true);
    setError(null);
    try {
      const items = await service.fetchServices();
      const found = items.find((item) => item.id === service_id);
      if (!found) {
        setError("Service tier not found.");
        return;
      }
      setFormData({ label: found.label, description: found.description, price: found.price });
    } catch {
      setError("Failed to load service tier. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [service_id, service]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form_data.label.trim()) {
      setError("Label is required.");
      return;
    }
    if (!form_data.description.trim()) {
      setError("Description is required.");
      return;
    }
    if (form_data.price <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (is_editing && service_id) {
        await service.updateService(service_id, form_data);
        setSuccessMessage("Service tier updated successfully.");
      } else {
        await service.createService(form_data);
        setSuccessMessage("Service tier created successfully.");
      }
      setTimeout(() => router.push(`/admin/sme-content/${type}`), 1000);
    } catch {
      setError("Failed to save service tier. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (is_loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href={`/admin/sme-content/${type}`}
          className="transition-colors hover:text-gray-700 dark:hover:text-gray-200"
        >
          SME Content
        </Link>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className={`font-medium ${meta.color}`}>{meta.label}</span>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-900 dark:text-white">
          {is_editing ? "Edit Tier" : "New Tier"}
        </span>
      </nav>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {is_editing ? `Edit ${meta.label} Tier` : `New ${meta.label} Tier`}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {is_editing
            ? `Update the details for this ${meta.label.toLowerCase()} service tier.`
            : `Create a new tier for the ${meta.label.toLowerCase()} SME content service.`}
        </p>
      </div>

      {/* Form card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <form id="sme-service-form" onSubmit={handleSubmit}>
          <div className="space-y-5 p-6">
            {/* Success banner */}
            {success_message && (
              <div className="flex items-center gap-3 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {success_message}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            {/* Label */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Label <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={form_data.label}
                onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Starter, Professional, Enterprise"
                className="h-11 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description <span className="text-error-500">*</span>
              </label>
              <textarea
                value={form_data.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe what's included in this tier..."
                rows={5}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 resize-none"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {form_data.description.length} characters
              </p>
            </div>

            {/* Price */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form_data.price}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-300 pl-8 pr-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* Type indicator */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Service type
              </p>
              <p className={`mt-1 text-sm font-semibold ${meta.color}`}>
                SME {meta.label} Content
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {meta.description}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/20">
            <Link
              href={`/admin/sme-content/${type}`}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              form="sme-service-form"
              disabled={is_submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {is_submitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {is_editing ? "Save Changes" : "Create Tier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
