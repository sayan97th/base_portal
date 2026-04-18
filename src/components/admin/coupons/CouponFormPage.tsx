"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import type { Coupon, CreateCouponPayload, DiscountType, AppliesTo } from "@/types/admin/coupons";
import type { AdminDrTier } from "@/types/admin/link-building";
import {
  createAdminCoupon,
  updateAdminCoupon,
  getAdminCoupon,
} from "@/services/admin/coupons.service";
import { listAdminDrTiers } from "@/services/admin/link-building.service";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CouponFormPageProps {
  mode: "create" | "edit";
  coupon_id?: string;
}

interface FormData {
  code: string;
  name: string;
  description: string;
  discount_type: DiscountType;
  discount_value: string;
  applies_to: AppliesTo;
  dr_tier_id: string;
  minimum_purchase_amount: string;
  starts_at: string;
  expires_at: string;
  usage_limit: string;
  usage_per_user: string;
  is_active: boolean;
}

interface Toggles {
  has_start_date: boolean;
  has_usage_limit: boolean;
  has_per_user_limit: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function getEmptyForm(): FormData {
  return {
    code: "",
    name: "",
    description: "",
    discount_type: "percentage",
    discount_value: "10",
    applies_to: "all",
    dr_tier_id: "",
    minimum_purchase_amount: "",
    starts_at: "",
    expires_at: "",
    usage_limit: "100",
    usage_per_user: "1",
    is_active: true,
  };
}

function couponFromRecord(coupon: Coupon): FormData {
  return {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description ?? "",
    discount_type: coupon.discount_type,
    discount_value: String(coupon.discount_value),
    applies_to: coupon.applies_to,
    dr_tier_id: coupon.dr_tier_id ?? "",
    minimum_purchase_amount: coupon.minimum_purchase_amount
      ? String(coupon.minimum_purchase_amount)
      : "",
    starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 10) : "",
    expires_at: coupon.expires_at.slice(0, 10),
    usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : "100",
    usage_per_user: coupon.usage_per_user ? String(coupon.usage_per_user) : "1",
    is_active: coupon.is_active,
  };
}

// ── Coupon Date Picker ────────────────────────────────────────────────────────

interface CouponDatePickerProps {
  id: string;
  value: string;
  onChange: (date_str: string) => void;
  disabled?: boolean;
  placeholder?: string;
  min_date?: string;
  has_error?: boolean;
}

function CouponDatePicker({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = "Select a date",
  min_date,
  has_error = false,
}: CouponDatePickerProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const fp_ref = useRef<flatpickr.Instance | null>(null);
  const onChange_ref = useRef(onChange);

  // Keep callback ref always current to avoid stale closures
  useEffect(() => {
    onChange_ref.current = onChange;
  });

  // Initialize / reinitialize when disabled or min_date changes
  useEffect(() => {
    if (!input_ref.current) return;

    fp_ref.current?.destroy();

    if (disabled) {
      fp_ref.current = null;
      return;
    }

    const instance = flatpickr(input_ref.current, {
      mode: "single",
      dateFormat: "Y-m-d",
      defaultDate: value || undefined,
      minDate: min_date || undefined,
      disableMobile: true,
      prevArrow:
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
      nextArrow:
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>',
      onChange: (_, date_str) => {
        onChange_ref.current(date_str);
      },
    });

    fp_ref.current = Array.isArray(instance) ? instance[0] : instance;

    return () => {
      fp_ref.current?.destroy();
      fp_ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, min_date]);

  // Sync external value (edit mode — fires after instance is ready)
  useEffect(() => {
    if (fp_ref.current) {
      fp_ref.current.setDate(value || "", false);
    }
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={input_ref}
        id={id}
        type="text"
        readOnly
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full cursor-pointer rounded-lg border py-2.5 pl-4 pr-10 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          has_error
            ? "border-red-400 dark:border-red-500"
            : "border-gray-200 dark:border-gray-700"
        }`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
          />
        </svg>
      </span>
    </div>
  );
}

// ── Live Preview Card ──────────────────────────────────────────────────────────

interface PreviewCardProps {
  form: FormData;
  dr_tiers: AdminDrTier[];
  toggles: Toggles;
}

function PreviewCard({ form, dr_tiers, toggles }: PreviewCardProps) {
  const value = parseFloat(form.discount_value) || 0;
  const discount_label =
    form.discount_type === "percentage"
      ? `${value}%`
      : `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const selected_tier = dr_tiers.find((t) => t.id === form.dr_tier_id);

  const applies_label =
    form.applies_to === "specific_product" && selected_tier
      ? `On ${selected_tier.dr_label}`
      : form.applies_to === "minimum_purchase" && form.minimum_purchase_amount
        ? `Orders over $${parseFloat(form.minimum_purchase_amount).toLocaleString("en-US", { minimumFractionDigits: 0 })}`
        : "On all products";

  const expiry_label = form.expires_at
    ? new Date(form.expires_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No expiry set";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-xl">
      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
      <div className="absolute -left-4 bottom-4 h-20 w-20 rounded-full bg-white/5" />
      <div className="absolute right-12 bottom-2 h-10 w-10 rounded-full bg-white/8" />

      {/* Status pill */}
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-brand-200">
          Discount Coupon
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

      {/* Discount value — hero text */}
      <div className="mb-1">
        <span className="text-5xl font-black tracking-tight text-white">
          {discount_label}
        </span>
        <span className="ml-2 text-lg font-medium text-brand-200">OFF</span>
      </div>

      <p className="mb-6 text-sm text-brand-200">{applies_label}</p>

      {/* Dashed divider */}
      <div className="relative mb-5">
        <div className="border-t border-dashed border-white/20" />
        <div className="absolute -left-6 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-gray-100 dark:bg-gray-900" />
        <div className="absolute -right-6 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-gray-100 dark:bg-gray-900" />
      </div>

      {/* Coupon code */}
      <div className="mb-4">
        <p className="mb-1 text-[10px] uppercase tracking-widest text-brand-300">
          Coupon Code
        </p>
        <p className="font-mono text-xl font-bold tracking-[0.3em] text-white">
          {form.code || "- - - - - - - -"}
        </p>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-brand-300">Expires</p>
          <p className="mt-0.5 text-xs font-semibold text-white">{expiry_label}</p>
        </div>
        <div className="rounded-lg bg-white/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-brand-300">Usage</p>
          <p className="mt-0.5 text-xs font-semibold text-white">
            {toggles.has_usage_limit && form.usage_limit
              ? `Max ${form.usage_limit}`
              : "No limit"}
          </p>
        </div>
      </div>

      {/* Name */}
      {form.name && (
        <p className="mt-4 text-xs font-medium text-brand-200 line-clamp-1">{form.name}</p>
      )}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

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

// ── Toggle switch ──────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
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

// ── Input field wrapper ────────────────────────────────────────────────────────

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
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

const input_base =
  "w-full rounded-lg border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors";

const input_normal = `${input_base} border-gray-200 dark:border-gray-700`;
const input_error = `${input_base} border-red-400 dark:border-red-500`;

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CouponFormPage({ mode, coupon_id }: CouponFormPageProps) {
  const router = useRouter();

  const [form, setForm] = useState<FormData>(getEmptyForm());
  const [toggles, setToggles] = useState<Toggles>({
    has_start_date: false,
    has_usage_limit: false,
    has_per_user_limit: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dr_tiers, setDrTiers] = useState<AdminDrTier[]>([]);
  const [is_loading, setIsLoading] = useState(mode === "edit");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const tiers = await listAdminDrTiers();
      setDrTiers(tiers.filter((t) => t.is_active));
      if (mode === "edit" && coupon_id) {
        const coupon = await getAdminCoupon(coupon_id);
        setForm(couponFromRecord(coupon));
        setToggles({
          has_start_date: coupon.starts_at !== null,
          has_usage_limit: coupon.usage_limit !== null,
          has_per_user_limit: coupon.usage_per_user !== null,
        });
      }
    } catch {
      setLoadError("Failed to load data. Please go back and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [mode, coupon_id]);

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

  const handleCopyCode = () => {
    if (!form.code) return;
    navigator.clipboard.writeText(form.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Code is required.";
    if (!form.name.trim()) e.name = "Name is required.";
    const val = parseFloat(form.discount_value);
    if (!form.discount_value || isNaN(val) || val <= 0)
      e.discount_value = "Value must be greater than 0.";
    if (form.discount_type === "percentage" && val > 100)
      e.discount_value = "Percentage cannot exceed 100.";
    if (!form.expires_at) e.expires_at = "Expiry date is required.";
    if (form.applies_to === "specific_product" && !form.dr_tier_id)
      e.dr_tier_id = "Please select a DR tier.";
    if (form.applies_to === "minimum_purchase") {
      const min = parseFloat(form.minimum_purchase_amount);
      if (!form.minimum_purchase_amount || isNaN(min) || min <= 0)
        e.minimum_purchase_amount = "Enter a valid minimum amount.";
    }
    if (toggles.has_usage_limit) {
      const limit = parseInt(form.usage_limit);
      if (!form.usage_limit || isNaN(limit) || limit < 1)
        e.usage_limit = "Enter a valid limit (min 1).";
    }
    if (toggles.has_per_user_limit) {
      const per_user = parseInt(form.usage_per_user);
      if (!form.usage_per_user || isNaN(per_user) || per_user < 1)
        e.usage_per_user = "Enter a valid limit (min 1).";
    }
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
    try {
      const payload: CreateCouponPayload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        applies_to: form.applies_to,
        dr_tier_id: form.applies_to === "specific_product" ? form.dr_tier_id || null : null,
        minimum_purchase_amount:
          form.applies_to === "minimum_purchase"
            ? parseFloat(form.minimum_purchase_amount) || null
            : null,
        starts_at: toggles.has_start_date && form.starts_at ? form.starts_at : null,
        expires_at: form.expires_at,
        usage_limit: toggles.has_usage_limit ? parseInt(form.usage_limit) || null : null,
        usage_per_user: toggles.has_per_user_limit
          ? parseInt(form.usage_per_user) || null
          : null,
        is_active: form.is_active,
      };

      if (mode === "edit" && coupon_id) {
        await updateAdminCoupon(coupon_id, payload);
      } else {
        await createAdminCoupon(payload);
      }

      router.push("/admin/coupons");
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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (is_loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-4 lg:col-span-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
          <div className="col-span-12 lg:col-span-4">
            <div className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (load_error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-red-500">{load_error}</p>
          <Link
            href="/admin/coupons"
            className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Back to Coupons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/coupons"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <Link href="/admin/coupons" className="hover:text-brand-500 transition-colors">
              Coupons
            </Link>
            <span>/</span>
            <span className="text-gray-600 dark:text-gray-300">
              {mode === "edit" ? "Edit Coupon" : "New Coupon"}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === "edit" ? "Edit Coupon" : "Create New Coupon"}
          </h1>
        </div>
      </div>

      {/* Global submit error */}
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
          {/* ── Left column: form ───────────────────────────────────── */}
          <div className="col-span-12 space-y-5 lg:col-span-8">

            {/* Basic Information */}
            <FormSection
              title="Basic Information"
              description="The coupon code and a descriptive name visible to your team."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Code */}
                <div>
                  <FieldLabel required>Coupon Code</FieldLabel>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => updateField("code", e.target.value.toUpperCase())}
                      placeholder="e.g. SAVE20"
                      maxLength={32}
                      className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-mono uppercase tracking-widest bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${errors.code ? "border-red-400 dark:border-red-500" : "border-gray-200 dark:border-gray-700"}`}
                    />
                    <button
                      type="button"
                      onClick={() => updateField("code", generateCode())}
                      title="Auto-generate code"
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 shrink-0"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Auto
                    </button>
                    {form.code && (
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        title="Copy code"
                        className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 shrink-0"
                      >
                        {copied ? (
                          <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                  <FieldError message={errors.code} />
                </div>

                {/* Name */}
                <div>
                  <FieldLabel required>Display Name</FieldLabel>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Summer Sale 20% Off"
                    className={errors.name ? input_error : input_normal}
                  />
                  <FieldError message={errors.name} />
                </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={2}
                  placeholder="Internal notes about this coupon (not visible to users)..."
                  className={`${input_normal} resize-none`}
                />
              </div>
            </FormSection>

            {/* Discount */}
            <FormSection
              title="Discount Settings"
              description="Choose how the discount is calculated and its value."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Type */}
                <div>
                  <FieldLabel required>Discount Type</FieldLabel>
                  <div className="flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                    {(
                      [
                        {
                          value: "percentage" as DiscountType,
                          label: "Percentage",
                          icon: (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          ),
                        },
                        {
                          value: "fixed_amount" as DiscountType,
                          label: "Fixed Amount",
                          icon: (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ),
                        },
                      ]
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("discount_type", opt.value)}
                        className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                          form.discount_type === opt.value
                            ? "bg-brand-500 text-white"
                            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Value */}
                <div>
                  <FieldLabel required>
                    {form.discount_type === "percentage" ? "Percentage Value" : "Fixed Amount (USD)"}
                  </FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                      {form.discount_type === "percentage" ? "%" : "$"}
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      max={form.discount_type === "percentage" ? 100 : undefined}
                      step="0.01"
                      value={form.discount_value}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = parseFloat(raw);
                        if (!isNaN(num) && num < 0) {
                          updateField("discount_value", "0.01");
                          return;
                        }
                        if (form.discount_type === "percentage" && !isNaN(num) && num > 100) {
                          updateField("discount_value", "100");
                          return;
                        }
                        updateField("discount_value", raw);
                      }}
                      placeholder={form.discount_type === "percentage" ? "10" : "25.00"}
                      className={`${errors.discount_value ? input_error : input_normal} pl-8`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {form.discount_type === "percentage"
                      ? "Allowed range: 0.01% – 100%. Values above 100% are not permitted."
                      : "Enter a positive dollar amount. No upper limit for fixed discounts."}
                  </p>
                  <FieldError message={errors.discount_value} />
                </div>
              </div>
            </FormSection>

            {/* Applies To */}
            <FormSection
              title="Coupon Restrictions"
              description="Define what this coupon applies to and any purchase requirements."
            >
              {/* Applies to selector */}
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    {
                      value: "all" as AppliesTo,
                      label: "All Products",
                      description: "Applies to the full order",
                      icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                      ),
                    },
                    {
                      value: "specific_product" as AppliesTo,
                      label: "Specific Tier",
                      description: "One DR tier only",
                      icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      ),
                    },
                    {
                      value: "minimum_purchase" as AppliesTo,
                      label: "Min. Purchase",
                      description: "Requires order total",
                      icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                        </svg>
                      ),
                    },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField("applies_to", opt.value)}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                      form.applies_to === opt.value
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-500"
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

              {/* Conditional: Specific Product */}
              {form.applies_to === "specific_product" && (
                <div className="mt-4">
                  <FieldLabel required>DR Tier</FieldLabel>
                  <select
                    value={form.dr_tier_id}
                    onChange={(e) => updateField("dr_tier_id", e.target.value)}
                    className={errors.dr_tier_id ? input_error : input_normal}
                  >
                    <option value="">— Select a DR tier —</option>
                    {dr_tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.dr_label} — {tier.traffic_range} · ${tier.price_per_link.toLocaleString("en-US")} / link
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.dr_tier_id} />
                </div>
              )}

              {/* Conditional: Minimum Purchase */}
              {form.applies_to === "minimum_purchase" && (
                <div className="mt-4">
                  <FieldLabel required>Minimum Order Amount (USD)</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.minimum_purchase_amount}
                      onChange={(e) => updateField("minimum_purchase_amount", e.target.value)}
                      placeholder="1000.00"
                      className={`${errors.minimum_purchase_amount ? input_error : input_normal} pl-8`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    The coupon will only apply if the order total reaches or exceeds this amount.
                  </p>
                  <FieldError message={errors.minimum_purchase_amount} />
                </div>
              )}
            </FormSection>

            {/* Validity */}
            <FormSection
              title="Validity Period"
              description="Control when this coupon is active and when it expires."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Start Date */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <FieldLabel>Start Date</FieldLabel>
                    <Toggle
                      enabled={toggles.has_start_date}
                      onChange={(v) => {
                        setToggles((prev) => ({ ...prev, has_start_date: v }));
                        if (!v) updateField("starts_at", "");
                      }}
                    />
                  </div>
                  <CouponDatePicker
                    id="coupon_start_date"
                    value={form.starts_at}
                    onChange={(date_str) => updateField("starts_at", date_str)}
                    disabled={!toggles.has_start_date}
                    placeholder="Pick a start date"
                  />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Optional — if set, coupon is not valid before this date.
                  </p>
                </div>

                {/* Expiry Date */}
                <div>
                  <FieldLabel required>Expiry Date</FieldLabel>
                  <CouponDatePicker
                    id="coupon_expiry_date"
                    value={form.expires_at}
                    onChange={(date_str) => {
                      updateField("expires_at", date_str);
                    }}
                    placeholder="Pick an expiry date"
                    has_error={!!errors.expires_at}
                  />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    The coupon will be invalid after this date.
                  </p>
                  <FieldError message={errors.expires_at} />
                </div>
              </div>
            </FormSection>

            {/* Usage Limits */}
            <FormSection
              title="Usage Limits"
              description="Optionally cap how many times this coupon can be used overall or per user."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Total Limit */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <FieldLabel>Total Usage Limit</FieldLabel>
                    <Toggle
                      enabled={toggles.has_usage_limit}
                      onChange={(v) =>
                        setToggles((prev) => ({ ...prev, has_usage_limit: v }))
                      }
                    />
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={!toggles.has_usage_limit}
                    value={form.usage_limit}
                    onChange={(e) => updateField("usage_limit", e.target.value)}
                    placeholder="e.g. 100"
                    className={`${errors.usage_limit ? input_error : input_normal} disabled:cursor-not-allowed disabled:opacity-40`}
                  />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Max times this code can be redeemed across all users.
                  </p>
                  <FieldError message={errors.usage_limit} />
                </div>

                {/* Per User Limit */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <FieldLabel>Per User Limit</FieldLabel>
                    <Toggle
                      enabled={toggles.has_per_user_limit}
                      onChange={(v) =>
                        setToggles((prev) => ({ ...prev, has_per_user_limit: v }))
                      }
                    />
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={!toggles.has_per_user_limit}
                    value={form.usage_per_user}
                    onChange={(e) => updateField("usage_per_user", e.target.value)}
                    placeholder="e.g. 1"
                    className={`${errors.usage_per_user ? input_error : input_normal} disabled:cursor-not-allowed disabled:opacity-40`}
                  />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Max times a single user can redeem this code.
                  </p>
                  <FieldError message={errors.usage_per_user} />
                </div>
              </div>
            </FormSection>

            {/* Status */}
            <FormSection
              title="Status"
              description="Inactive coupons cannot be applied by users even if all other conditions are met."
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {form.is_active ? "Coupon is active" : "Coupon is inactive"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {form.is_active
                      ? "Users can apply this coupon at checkout."
                      : "This coupon is currently disabled and cannot be used."}
                  </p>
                </div>
                <Toggle
                  enabled={form.is_active}
                  onChange={(v) => updateField("is_active", v)}
                />
              </div>
            </FormSection>

            {/* Form Actions */}
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
              <Link
                href="/admin/coupons"
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
                    {mode === "edit" ? "Save Changes" : "Create Coupon"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Right column: live preview ─────────────────────────── */}
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Live Preview
                </h3>
                <PreviewCard form={form} dr_tiers={dr_tiers} toggles={toggles} />
              </div>

              {/* Quick tips */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tips
                </h3>
                <ul className="space-y-3">
                  {[
                    {
                      icon: "💡",
                      text: "Use the Auto button to generate a random, unique coupon code.",
                    },
                    {
                      icon: "🎯",
                      text: "Specific Tier discounts apply only to items from the chosen DR tier.",
                    },
                    {
                      icon: "💰",
                      text: "Minimum Purchase coupons activate only when the order total meets the threshold.",
                    },
                    {
                      icon: "⏱️",
                      text: "Set a per-user limit of 1 to make it a one-time-use coupon.",
                    },
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-sm">{tip.icon}</span>
                      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        {tip.text}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
