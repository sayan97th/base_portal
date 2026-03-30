"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import type { NewsPost, PostType, PostStatus, CreateNewsPostPayload } from "@/types/admin/news";
import type { Coupon } from "@/types/admin/coupons";
import { createAdminNewsPost, updateAdminNewsPost, getAdminNewsPost } from "@/services/admin/news.service";
import { listAdminCoupons } from "@/services/admin/coupons.service";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NewsFormPageProps {
  mode: "create" | "edit";
  post_id?: string;
}

interface FormData {
  type: PostType;
  status: PostStatus;
  title: string;
  subtitle: string;
  description: string;
  discount_value: string;
  discount_label: string;
  coupon_id: string;
  starts_at: string;
  ends_at: string;
  image_url: string;
  thumbnail_url: string;
  cta_text: string;
  cta_url: string;
  tags: string;
  is_featured: boolean;
  sort_order: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getEmptyForm(): FormData {
  return {
    type: "promo",
    status: "draft",
    title: "",
    subtitle: "",
    description: "",
    discount_value: "",
    discount_label: "",
    coupon_id: "",
    starts_at: "",
    ends_at: "",
    image_url: "",
    thumbnail_url: "",
    cta_text: "",
    cta_url: "",
    tags: "",
    is_featured: false,
    sort_order: "0",
  };
}

function formFromPost(post: NewsPost): FormData {
  return {
    type: post.type,
    status: post.status,
    title: post.title,
    subtitle: post.subtitle ?? "",
    description: post.description ?? "",
    discount_value: post.discount_value ?? "",
    discount_label: post.discount_label ?? "",
    coupon_id: post.coupon_id ?? "",
    starts_at: post.starts_at ? post.starts_at.slice(0, 10) : "",
    ends_at: post.ends_at ? post.ends_at.slice(0, 10) : "",
    image_url: post.image_url ?? "",
    thumbnail_url: post.thumbnail_url ?? "",
    cta_text: post.cta_text ?? "",
    cta_url: post.cta_url ?? "",
    tags: post.tags.join(", "),
    is_featured: post.is_featured,
    sort_order: String(post.sort_order),
  };
}

function buildPayload(form: FormData): CreateNewsPostPayload {
  const tags = form.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    type: form.type,
    status: form.status,
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || null,
    description: form.description.trim() || null,
    discount_value: form.discount_value.trim() || null,
    discount_label: form.discount_label.trim() || null,
    coupon_id: form.coupon_id || null,
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
    image_url: form.image_url.trim() || null,
    thumbnail_url: form.thumbnail_url.trim() || null,
    cta_text: form.cta_text.trim() || null,
    cta_url: form.cta_url.trim() || null,
    tags,
    is_featured: form.is_featured,
    sort_order: parseInt(form.sort_order, 10) || 0,
  };
}

// ── Date picker ───────────────────────────────────────────────────────────────

interface DatePickerProps {
  id: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  min_date?: string;
  has_error?: boolean;
}

function DatePickerField({ id, value, onChange, placeholder, min_date, has_error }: DatePickerProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const fp_ref = useRef<ReturnType<typeof flatpickr> | null>(null);

  useEffect(() => {
    if (!input_ref.current) return;
    fp_ref.current = flatpickr(input_ref.current, {
      dateFormat: "Y-m-d",
      defaultDate: value || undefined,
      minDate: min_date,
      onChange: ([date]) => {
        if (date) {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, "0");
          const d = String(date.getDate()).padStart(2, "0");
          onChange(`${y}-${m}-${d}`);
        } else {
          onChange("");
        }
      },
    });
    return () => fp_ref.current?.destroy();
  }, []);

  useEffect(() => {
    if (fp_ref.current && value !== fp_ref.current.input.value) {
      fp_ref.current.setDate(value || "", false);
    }
  }, [value]);

  return (
    <input
      ref={input_ref}
      id={id}
      readOnly
      placeholder={placeholder ?? "Select date"}
      className={`w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 dark:text-white dark:placeholder-gray-500 ${
        has_error
          ? "border-red-400 bg-red-50 focus:ring-red-300 dark:border-red-500/50 dark:bg-red-500/10"
          : "border-gray-200 bg-white focus:border-brand-400 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-700 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
      }`}
    />
  );
}

// ── Form field components ─────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, error, hint, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  has_error?: boolean;
}

function Input({ has_error, className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 dark:text-white dark:placeholder-gray-500 ${
        has_error
          ? "border-red-400 bg-red-50 focus:ring-red-300 dark:border-red-500/50 dark:bg-red-500/10"
          : "border-gray-200 bg-white focus:border-brand-400 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-700 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
      } ${className}`}
    />
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  has_error?: boolean;
}

function TextArea({ has_error, className = "", ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 dark:text-white dark:placeholder-gray-500 ${
        has_error
          ? "border-red-400 bg-red-50 focus:ring-red-300 dark:border-red-500/50 dark:bg-red-500/10"
          : "border-gray-200 bg-white focus:border-brand-400 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-700 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
      } ${className}`}
    />
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}

function Section({ title, description, icon, children, accent = "from-brand-500 to-blue-500" }: SectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Preview card ──────────────────────────────────────────────────────────────

function PreviewCard({ form }: { form: FormData }) {
  const type_accent: Record<PostType, string> = {
    promo: "from-amber-500 to-orange-500",
    news: "from-brand-500 to-blue-500",
    blog_post: "from-purple-500 to-violet-500",
    tip: "from-emerald-500 to-teal-500",
  };

  const type_label: Record<PostType, string> = {
    promo: "Promo",
    news: "News",
    blog_post: "Blog Post",
    tip: "Tip",
  };

  const tags = form.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* top accent */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${type_accent[form.type]}`} />

      {/* Hero */}
      {form.image_url ? (
        <div className="relative h-44 overflow-hidden">
          <img src={form.image_url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {form.is_featured && (
            <div className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
              Featured
            </div>
          )}
        </div>
      ) : form.type === "promo" && form.discount_value ? (
        <div className={`flex h-44 items-center justify-center bg-gradient-to-br ${type_accent[form.type]} px-4`}>
          <div className="text-center text-white">
            <p className="text-6xl font-black leading-none tracking-tight">
              {form.discount_value}%
            </p>
            <p className="mt-1.5 text-sm font-semibold uppercase tracking-widest opacity-90">
              {form.discount_label || "Off"}
            </p>
          </div>
        </div>
      ) : (
        <div className={`flex h-44 items-center justify-center bg-gradient-to-br ${type_accent[form.type]}/10`}>
          <div className={`rounded-2xl bg-gradient-to-br ${type_accent[form.type]} p-6 text-white shadow-lg text-2xl font-bold`}>
            {type_label[form.type][0]}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center rounded-full bg-gradient-to-r ${type_accent[form.type]} px-2.5 py-0.5 text-xs font-semibold text-white`}>
            {type_label[form.type]}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            form.status === "active"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30"
              : form.status === "draft"
              ? "bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-600"
              : "bg-gray-100 text-gray-400 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:ring-gray-600"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${form.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
            {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
          </span>
        </div>

        <h3 className="mt-3 text-base font-bold text-gray-900 line-clamp-2 dark:text-white">
          {form.title || <span className="italic text-gray-400">Post title…</span>}
        </h3>
        {form.subtitle && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">{form.subtitle}</p>
        )}

        {form.type === "promo" && (form.starts_at || form.ends_at) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
            </svg>
            {form.starts_at || "Now"} → {form.ends_at || "No end"}
          </p>
        )}

        {form.cta_text && (
          <div className="mt-3">
            <span className={`inline-flex items-center rounded-lg bg-gradient-to-r ${type_accent[form.type]} px-3 py-1.5 text-xs font-semibold text-white shadow-sm`}>
              {form.cta_text}
            </span>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function NewsFormPage({ mode, post_id }: NewsFormPageProps) {
  const router = useRouter();

  const [form, setForm] = useState<FormData>(getEmptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Load coupons for the select
  useEffect(() => {
    listAdminCoupons().then(setCoupons).catch(() => {});
  }, []);

  // Load post data for edit mode
  useEffect(() => {
    if (mode !== "edit" || !post_id) return;
    setLoading(true);
    getAdminNewsPost(post_id)
      .then((post) => setForm(formFromPost(post)))
      .catch(() => setSubmitError("Failed to load post data."))
      .finally(() => setLoading(false));
  }, [mode, post_id]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (form.type === "promo" && form.discount_value && isNaN(Number(form.discount_value))) {
      e.discount_value = "Discount must be a number.";
    }
    if (form.type === "promo" && form.ends_at && form.starts_at && form.ends_at < form.starts_at) {
      e.ends_at = "End date must be after start date.";
    }
    if (form.cta_url && !/^https?:\/\/.+/.test(form.cta_url.trim())) {
      e.cta_url = "Enter a valid URL starting with http:// or https://";
    }
    if (form.image_url && !/^https?:\/\/.+/.test(form.image_url.trim())) {
      e.image_url = "Enter a valid URL starting with http:// or https://";
    }
    if (form.sort_order && isNaN(Number(form.sort_order))) {
      e.sort_order = "Sort order must be a number.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = buildPayload(form);
      if (mode === "create") {
        await createAdminNewsPost(payload);
      } else {
        await updateAdminNewsPost(post_id!, payload);
      }
      router.push("/admin/news");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading post…</span>
        </div>
      </div>
    );
  }

  const is_promo = form.type === "promo";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/news"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-gray-400">
              <Link href="/admin/news" className="hover:text-gray-600 dark:hover:text-gray-300">
                News &amp; Promos
              </Link>
              <span>/</span>
              <span className="text-gray-600 dark:text-gray-300">
                {mode === "create" ? "New Post" : "Edit Post"}
              </span>
            </nav>
            <h1 className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
              {mode === "create" ? "Create Post" : "Edit Post"}
            </h1>
          </div>
        </div>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit}>
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Left column — form sections */}
            <div className="flex flex-col gap-6">

              {/* 1 ── Basic Information */}
              <Section
                title="Basic Information"
                description="Post type, status, and primary content"
                accent="from-brand-500 to-blue-500"
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                }
              >
                <div className="grid gap-5">
                  {/* Post type */}
                  <Field label="Post Type" required>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(["promo", "news", "blog_post", "tip"] as PostType[]).map((t) => {
                        const labels: Record<PostType, string> = {
                          promo: "Promo",
                          news: "News",
                          blog_post: "Blog Post",
                          tip: "Tip",
                        };
                        const icons: Record<PostType, React.ReactNode> = {
                          promo: (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
                            </svg>
                          ),
                          news: (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                            </svg>
                          ),
                          blog_post: (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                          ),
                          tip: (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                            </svg>
                          ),
                        };
                        const accent_selected: Record<PostType, string> = {
                          promo: "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-400",
                          news: "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-400",
                          blog_post: "border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-500/50 dark:bg-purple-500/10 dark:text-purple-400",
                          tip: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-400",
                        };

                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => updateField("type", t)}
                            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition ${
                              form.type === t
                                ? accent_selected[t]
                                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:border-gray-500"
                            }`}
                          >
                            {icons[t]}
                            {labels[t]}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Title */}
                    <Field label="Title" required error={errors.title}>
                      <Input
                        value={form.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="e.g. February Promo"
                        has_error={!!errors.title}
                      />
                    </Field>

                    {/* Subtitle */}
                    <Field label="Subtitle" hint="Short tagline shown below the title">
                      <Input
                        value={form.subtitle}
                        onChange={(e) => updateField("subtitle", e.target.value)}
                        placeholder="e.g. 14% off this week only"
                      />
                    </Field>
                  </div>

                  {/* Description */}
                  <Field label="Description" hint="Full content or body text for this post">
                    <TextArea
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      rows={4}
                      placeholder="Write a detailed description or article body…"
                    />
                  </Field>
                </div>
              </Section>

              {/* 2 ── Promo Details (conditional) */}
              {is_promo && (
                <Section
                  title="Promo Details"
                  description="Discount info, validity dates and linked coupon"
                  accent="from-amber-500 to-orange-500"
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
                    </svg>
                  }
                >
                  <div className="grid gap-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      {/* Discount value */}
                      <Field label="Discount Value (%)" error={errors.discount_value} hint="Numeric value e.g. 14">
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={form.discount_value}
                            onChange={(e) => updateField("discount_value", e.target.value)}
                            placeholder="14"
                            has_error={!!errors.discount_value}
                            className="pr-8"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">%</span>
                        </div>
                      </Field>

                      {/* Discount label */}
                      <Field label="Discount Label" hint='Shown below the %, e.g. "All Services"'>
                        <Input
                          value={form.discount_label}
                          onChange={(e) => updateField("discount_label", e.target.value)}
                          placeholder="All Services"
                        />
                      </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      {/* Start date */}
                      <Field label="Start Date">
                        <DatePickerField
                          id="starts_at"
                          value={form.starts_at}
                          onChange={(v) => updateField("starts_at", v)}
                          placeholder="From date (optional)"
                        />
                      </Field>

                      {/* End date */}
                      <Field label="End Date" error={errors.ends_at}>
                        <DatePickerField
                          id="ends_at"
                          value={form.ends_at}
                          onChange={(v) => updateField("ends_at", v)}
                          placeholder="Expiration date (optional)"
                          min_date={form.starts_at || undefined}
                          has_error={!!errors.ends_at}
                        />
                      </Field>
                    </div>

                    {/* Linked coupon */}
                    <Field label="Linked Coupon" hint="Optional: associate an existing coupon code with this promo">
                      <select
                        value={form.coupon_id}
                        onChange={(e) => updateField("coupon_id", e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
                      >
                        <option value="">No coupon linked</option>
                        {coupons.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>
              )}

              {/* 3 ── Media & Links */}
              <Section
                title="Media &amp; Links"
                description="Images and call-to-action button"
                accent="from-violet-500 to-purple-500"
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                }
              >
                <div className="grid gap-5">
                  <Field label="Banner Image URL" error={errors.image_url} hint="Full URL to the banner/hero image">
                    <Input
                      type="url"
                      value={form.image_url}
                      onChange={(e) => updateField("image_url", e.target.value)}
                      placeholder="https://example.com/images/banner.jpg"
                      has_error={!!errors.image_url}
                    />
                  </Field>

                  <Field label="Thumbnail URL" hint="Small preview image (optional)">
                    <Input
                      type="url"
                      value={form.thumbnail_url}
                      onChange={(e) => updateField("thumbnail_url", e.target.value)}
                      placeholder="https://example.com/images/thumb.jpg"
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="CTA Button Text" hint='e.g. "Learn More", "Claim Offer"'>
                      <Input
                        value={form.cta_text}
                        onChange={(e) => updateField("cta_text", e.target.value)}
                        placeholder="Learn More"
                      />
                    </Field>

                    <Field label="CTA Button URL" error={errors.cta_url}>
                      <Input
                        type="url"
                        value={form.cta_url}
                        onChange={(e) => updateField("cta_url", e.target.value)}
                        placeholder="https://example.com/promo"
                        has_error={!!errors.cta_url}
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              {/* 4 ── Display Settings */}
              <Section
                title="Display Settings"
                description="Visibility, ordering and tags"
                accent="from-gray-500 to-gray-600"
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                <div className="grid gap-5">
                  {/* Status */}
                  <Field label="Status" required>
                    <div className="flex gap-2">
                      {(["draft", "active", "archived"] as PostStatus[]).map((s) => {
                        const labels: Record<PostStatus, string> = {
                          draft: "Draft",
                          active: "Active",
                          archived: "Archived",
                        };
                        const active_cls: Record<PostStatus, string> = {
                          draft: "border-gray-400 bg-gray-100 text-gray-700 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200",
                          active: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-400",
                          archived: "border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-400",
                        };
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateField("status", s)}
                            className={`flex-1 rounded-xl border-2 py-2 text-sm font-medium transition ${
                              form.status === s
                                ? active_cls[s]
                                : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500"
                            }`}
                          >
                            {labels[s]}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Sort order */}
                    <Field label="Sort Order" error={errors.sort_order} hint="Lower numbers appear first">
                      <Input
                        type="number"
                        min="0"
                        value={form.sort_order}
                        onChange={(e) => updateField("sort_order", e.target.value)}
                        placeholder="0"
                        has_error={!!errors.sort_order}
                      />
                    </Field>

                    {/* Tags */}
                    <Field label="Tags" hint="Comma-separated, e.g. seo, local-search, tips">
                      <Input
                        value={form.tags}
                        onChange={(e) => updateField("tags", e.target.value)}
                        placeholder="seo, promo, february"
                      />
                    </Field>
                  </div>

                  {/* Featured toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700/50">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Featured Post</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Featured posts are highlighted at the top of the website feed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField("is_featured", !form.is_featured)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                        form.is_featured ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          form.is_featured ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </Section>

              {/* Submit error */}
              {submit_error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {submit_error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <Link
                  href="/admin/news"
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
                >
                  {submitting && (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {mode === "create" ? "Create Post" : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Right column — live preview */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Live Preview
                </p>
                <PreviewCard form={form} />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
