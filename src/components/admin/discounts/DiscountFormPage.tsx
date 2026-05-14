"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Discount,
  DiscountDrTier,
  CreateDiscountPayload,
  DiscountAppliesTo,
} from "@/types/admin/discounts";
import {
  createAdminDiscount,
  updateAdminDiscount,
  getAdminDiscount,
  fetchDiscountFormDrTiers,
} from "@/services/admin/discounts.service";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DiscountFormPageProps {
  mode: "create" | "edit";
  discount_id?: string;
}

interface FormData {
  name: string;
  description: string;
  discount_type: "bulk";
  discount_rate: string;
  min_quantity: string;
  applies_to: DiscountAppliesTo;
  is_active: boolean;
  dr_tier_ids: string[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const APPLIES_TO_OPTIONS: {
  value: DiscountAppliesTo;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "link_building",
    label: "Link Building",
    description: "Link building orders only",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
  {
    value: "new_content",
    label: "New Content",
    description: "New content orders only",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    value: "content_optimization",
    label: "Content Optimization",
    description: "Content optimization orders",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
  {
    value: "content_brief",
    label: "Content Briefs",
    description: "Content brief orders only",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    value: "all",
    label: "All Products",
    description: "Every product in the cart",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
];

function getEmptyForm(): FormData {
  return {
    name: "",
    description: "",
    discount_type: "bulk",
    discount_rate: "10",
    min_quantity: "12",
    applies_to: "link_building",
    is_active: true,
    dr_tier_ids: [],
  };
}

function discountToForm(d: Discount): FormData {
  return {
    name: d.name,
    description: d.description ?? "",
    discount_type: d.discount_type,
    discount_rate: String(d.discount_rate),
    min_quantity: String(d.min_quantity),
    applies_to: d.applies_to,
    is_active: d.is_active,
    dr_tier_ids: d.dr_tier_ids ?? [],
  };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

// ── Shared primitives ──────────────────────────────────────────────────────────

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        enabled ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

const input_base =
  "w-full rounded-lg border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors";
const input_normal = `${input_base} border-gray-200 dark:border-gray-700`;
const input_error_cls = `${input_base} border-red-400 dark:border-red-500`;

// ── DR Tier Multi-Select ───────────────────────────────────────────────────────

interface DrTierPickerProps {
  available_tiers: DiscountDrTier[];
  selected_ids: string[];
  is_loading: boolean;
  onChange: (ids: string[]) => void;
}

function DrTierPicker({ available_tiers, selected_ids, is_loading, onChange }: DrTierPickerProps) {
  const all_selected = available_tiers.length > 0 && selected_ids.length === available_tiers.length;
  const some_selected = selected_ids.length > 0 && !all_selected;

  const toggleAll = () => {
    onChange(all_selected ? [] : available_tiers.map((t) => t.id));
  };

  const toggleTier = (id: string) => {
    onChange(selected_ids.includes(id) ? selected_ids.filter((s) => s !== id) : [...selected_ids, id]);
  };

  if (is_loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-3 dark:border-gray-700">
        <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-xs text-gray-400">Loading DR tiers…</span>
      </div>
    );
  }

  if (available_tiers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 px-3.5 py-4 text-center text-xs text-gray-400 dark:border-gray-700">
        No active DR tiers found. Enable DR tiers in the Link Building section first.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Select-all row */}
      <button
        type="button"
        onClick={toggleAll}
        className="flex w-full items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5 text-left transition-colors hover:bg-gray-100/70 dark:border-gray-800 dark:bg-white/3 dark:hover:bg-white/5"
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
            all_selected
              ? "border-brand-500 bg-brand-500"
              : some_selected
              ? "border-brand-400 bg-brand-100 dark:bg-brand-500/20"
              : "border-gray-300 dark:border-gray-600"
          }`}
        >
          {all_selected && (
            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          {some_selected && <span className="h-0.5 w-2 rounded-full bg-brand-500" />}
        </span>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {all_selected ? "Deselect All" : "Select All DR Tiers"}
        </span>
        {selected_ids.length > 0 && (
          <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            {selected_ids.length} of {available_tiers.length} selected
          </span>
        )}
      </button>

      {/* Tier grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {available_tiers.map((tier, idx) => {
          const is_checked = selected_ids.includes(tier.id);
          const is_right = idx % 2 === 1;
          const needs_top = idx >= 2;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => toggleTier(tier.id)}
              className={`flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/3 ${
                is_checked ? "bg-brand-50/40 dark:bg-brand-500/5" : ""
              } ${needs_top ? "border-t border-gray-100 dark:border-gray-800" : ""} ${
                is_right ? "sm:border-l sm:border-gray-100 dark:sm:border-gray-800" : ""
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  is_checked ? "border-brand-500 bg-brand-500" : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {is_checked && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${is_checked ? "text-brand-700 dark:text-brand-300" : "text-gray-700 dark:text-gray-300"}`}>
                  {tier.label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatPrice(tier.price_per_link)} / link
                </p>
              </div>
              {is_checked && (
                <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Live Preview Card ──────────────────────────────────────────────────────────

interface PreviewCardProps {
  form: FormData;
  available_dr_tiers: DiscountDrTier[];
}

function PreviewCard({ form, available_dr_tiers }: PreviewCardProps) {
  const rate = parseFloat(form.discount_rate) || 0;
  const qty = parseInt(form.min_quantity, 10) || 0;
  const applies_opt = APPLIES_TO_OPTIONS.find((o) => o.value === form.applies_to);
  const selected_tiers = available_dr_tiers.filter((t) => form.dr_tier_ids.includes(t.id));

  const tier_label =
    form.applies_to === "link_building" && selected_tiers.length > 0
      ? selected_tiers.map((t) => t.label).join(", ")
      : form.applies_to === "link_building"
      ? "All DR tiers"
      : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-violet-900 p-6 text-white shadow-xl">
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/5" />
      <div className="absolute -left-4 bottom-4 h-16 w-16 rounded-full bg-white/5" />

      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">
          Bulk Discount Rule
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            form.is_active
              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30"
              : "bg-gray-500/20 text-gray-300 ring-1 ring-gray-400/30"
          }`}
        >
          {form.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Hero rate */}
      <div className="mb-1">
        <span className="text-5xl font-black tracking-tight text-white">
          {rate > 0 ? `${rate}%` : "—"}
        </span>
        <span className="ml-2 text-lg font-medium text-violet-300">OFF</span>
      </div>

      <p className="mb-5 text-sm text-violet-200">
        {applies_opt?.label ?? "—"}
        {tier_label && (
          <span className="ml-1 text-xs text-violet-300">({tier_label})</span>
        )}
      </p>

      {/* Dashed divider with circles */}
      <div className="relative mb-5">
        <div className="border-t border-dashed border-white/20" />
        <div className="absolute -left-6 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-gray-100 dark:bg-gray-900" />
        <div className="absolute -right-6 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-gray-100 dark:bg-gray-900" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-violet-300">Min. Quantity</p>
          <p className="mt-0.5 text-sm font-bold text-white">{qty > 0 ? `${qty} items` : "—"}</p>
        </div>
        <div className="rounded-lg bg-white/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-violet-300">DR Tiers</p>
          <p className="mt-0.5 text-sm font-bold text-white">
            {form.applies_to === "link_building"
              ? selected_tiers.length > 0
                ? `${selected_tiers.length} selected`
                : "All tiers"
              : "N/A"}
          </p>
        </div>
      </div>

      {form.name && (
        <p className="mt-4 truncate text-xs font-medium text-violet-300">{form.name}</p>
      )}
    </div>
  );
}

// ── Tips panel ─────────────────────────────────────────────────────────────────

function TipsPanel() {
  const tips = [
    {
      icon: "🎯",
      text: "Select specific DR tiers to target only certain link building price points with this discount.",
    },
    {
      icon: "📦",
      text: "Leave DR tiers empty when applies to Link Building to discount all tiers equally.",
    },
    {
      icon: "⚡",
      text: "Changes take effect immediately for all active customer sessions.",
    },
    {
      icon: "🔢",
      text: "Min. Quantity is counted per product category — not the total cart quantity.",
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Tips
      </h3>
      <ul className="space-y-3">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="text-sm">{tip.icon}</span>
            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{tip.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DiscountFormPage({ mode, discount_id }: DiscountFormPageProps) {
  const router = useRouter();

  const [form, setForm] = useState<FormData>(getEmptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [available_dr_tiers, setAvailableDrTiers] = useState<DiscountDrTier[]>([]);
  const [dr_tiers_loading, setDrTiersLoading] = useState(false);
  const [is_loading, setIsLoading] = useState(mode === "edit");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setDrTiersLoading(true);
    try {
      const tiers = await fetchDiscountFormDrTiers();
      setAvailableDrTiers(tiers);

      if (mode === "edit" && discount_id) {
        const discount = await getAdminDiscount(discount_id);
        setForm(discountToForm(discount));
      }
    } catch {
      setLoadError("Failed to load data. Please go back and try again.");
    } finally {
      setIsLoading(false);
      setDrTiersLoading(false);
    }
  }, [mode, discount_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    const rate = parseFloat(form.discount_rate);
    if (isNaN(rate) || rate <= 0 || rate > 100) e.discount_rate = "Rate must be between 0.01 and 100.";
    const qty = parseInt(form.min_quantity, 10);
    if (isNaN(qty) || qty < 1) e.min_quantity = "Minimum quantity must be at least 1.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    const payload: CreateDiscountPayload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_rate: parseFloat(form.discount_rate),
      min_quantity: parseInt(form.min_quantity, 10),
      applies_to: form.applies_to,
      is_active: form.is_active,
    };

    if (form.applies_to === "link_building") {
      payload.dr_tier_ids = form.dr_tier_ids;
    }

    try {
      if (mode === "edit" && discount_id) {
        await updateAdminDiscount(discount_id, payload);
      } else {
        await createAdminDiscount(payload);
      }
      router.push("/admin/discounts");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (is_loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 h-8 w-56 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-4 lg:col-span-8">
            {[120, 160, 200, 80].map((h, i) => (
              <div
                key={i}
                style={{ height: h }}
                className="animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
          <div className="col-span-12 lg:col-span-4">
            <div className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  // ── Load error ─────────────────────────────────────────────────────────────

  if (load_error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-4 text-sm text-red-500">{load_error}</p>
          <Link
            href="/admin/discounts"
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Back to Discounts
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/discounts"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <Link href="/admin/discounts" className="transition-colors hover:text-brand-500">
              Discounts
            </Link>
            <span>/</span>
            <span className="text-gray-600 dark:text-gray-300">
              {mode === "edit" ? "Edit Discount" : "New Discount"}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === "edit" ? "Edit Discount" : "Create New Discount"}
          </h1>
        </div>
      </div>

      {/* Submit error */}
      {submit_error && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {submit_error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          {/* ── Left column ──────────────────────────────────────────── */}
          <div className="col-span-12 space-y-5 lg:col-span-8">

            {/* Basic Information */}
            <FormSection
              title="Basic Information"
              description="A clear name helps identify this rule at a glance in the discounts table."
            >
              <div className="space-y-4">
                <div>
                  <FieldLabel required>Discount Name</FieldLabel>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Bulk Link Building — Q3 Promo"
                    className={errors.name ? input_error_cls : input_normal}
                  />
                  <FieldError message={errors.name} />
                </div>
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Internal notes about this rule (not visible to customers)..."
                    rows={2}
                    className={`${input_normal} resize-none`}
                  />
                </div>
              </div>
            </FormSection>

            {/* Discount Settings */}
            <FormSection
              title="Discount Settings"
              description="Set the percentage off and the minimum quantity required to trigger it."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Discount Rate (%)</FieldLabel>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.discount_rate}
                      onChange={(e) => updateField("discount_rate", e.target.value)}
                      min="0.01"
                      max="100"
                      step="0.01"
                      placeholder="10"
                      className={`${errors.discount_rate ? input_error_cls : input_normal} pr-8`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      %
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Allowed range: 0.01% – 100%.
                  </p>
                  <FieldError message={errors.discount_rate} />
                </div>

                <div>
                  <FieldLabel required>Minimum Quantity</FieldLabel>
                  <input
                    type="number"
                    value={form.min_quantity}
                    onChange={(e) => updateField("min_quantity", e.target.value)}
                    min="1"
                    step="1"
                    placeholder="12"
                    className={errors.min_quantity ? input_error_cls : input_normal}
                  />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Items in the matching category needed to unlock the discount.
                  </p>
                  <FieldError message={errors.min_quantity} />
                </div>
              </div>
            </FormSection>

            {/* Applies To */}
            <FormSection
              title="Applies To"
              description="Choose which product category triggers this discount."
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {APPLIES_TO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField("applies_to", opt.value)}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                      form.applies_to === opt.value
                        ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                    }`}
                  >
                    <span
                      className={
                        form.applies_to === opt.value
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-gray-400 dark:text-gray-500"
                      }
                    >
                      {opt.icon}
                    </span>
                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          form.applies_to === opt.value
                            ? "text-brand-700 dark:text-brand-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </FormSection>

            {/* DR Tiers — only for link_building */}
            {form.applies_to === "link_building" && (
              <FormSection
                title="DR Tiers"
                description="Select which Domain Rating tiers this discount applies to. Leave all unchecked to apply to every tier."
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {form.dr_tier_ids.length === 0
                      ? "No tiers selected — discount will apply to all DR tiers."
                      : `${form.dr_tier_ids.length} tier${form.dr_tier_ids.length > 1 ? "s" : ""} selected.`}
                  </p>
                  {form.dr_tier_ids.length > 0 && (
                    <button
                      type="button"
                      onClick={() => updateField("dr_tier_ids", [])}
                      className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                <DrTierPicker
                  available_tiers={available_dr_tiers}
                  selected_ids={form.dr_tier_ids}
                  is_loading={dr_tiers_loading}
                  onChange={(ids) => updateField("dr_tier_ids", ids)}
                />
              </FormSection>
            )}

            {/* Status */}
            <FormSection
              title="Status"
              description="Inactive discounts are never applied at checkout, even if all conditions are met."
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {form.is_active ? "Discount is active" : "Discount is inactive"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {form.is_active
                      ? "This rule will be evaluated at checkout for all qualifying orders."
                      : "This rule is disabled and will not affect any orders."}
                  </p>
                </div>
                <Toggle enabled={form.is_active} onChange={(v) => updateField("is_active", v)} />
              </div>
            </FormSection>

            {/* Form actions */}
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
              <Link
                href="/admin/discounts"
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={is_submitting}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-60"
              >
                {is_submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mode === "edit" ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {mode === "edit" ? "Save Changes" : "Create Discount"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Right column: sticky preview + tips ──────────────────── */}
          <div className="col-span-12 lg:col-span-4">
            <div className="space-y-4 lg:sticky lg:top-24">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Live Preview
                </h3>
                <PreviewCard form={form} available_dr_tiers={available_dr_tiers} />
              </div>
              <TipsPanel />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
