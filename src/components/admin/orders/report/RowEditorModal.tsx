"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { ReportRow, ReportRowStatus, CreateReportRowPayload } from "@/types/admin/order-report";

interface RowEditorModalProps {
  is_open: boolean;
  is_saving: boolean;
  /** When provided, the modal is in edit mode. */
  row?: ReportRow | null;
  onClose: () => void;
  onSave: (payload: CreateReportRowPayload) => Promise<void>;
}

const EMPTY_FORM: CreateReportRowPayload = {
  order_number: "",
  link_type: "",
  keyword: "",
  landing_page: "",
  exact_match: true,
  request_date: "",
  status: "pending",
  live_link: "",
  live_link_date: "",
  dr: undefined,
};

const STATUS_OPTIONS: { value: ReportRowStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "live", label: "Live" },
  { value: "rejected", label: "Rejected" },
];

const LINK_TYPE_OPTIONS = [
  "DR 30+ External",
  "DR 40+ External",
  "DR 50+ External",
  "DR 60+ External",
  "DR 70+ External",
  "DR 80+ External",
  "DR 90+ External",
  "Guest Post",
  "Niche Edit",
  "Other",
];

export default function RowEditorModal({
  is_open,
  is_saving,
  row,
  onClose,
  onSave,
}: RowEditorModalProps) {
  const [form, setForm] = useState<CreateReportRowPayload>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateReportRowPayload, string>>>({});

  const is_edit = Boolean(row);

  useEffect(() => {
    if (is_open) {
      if (row) {
        setForm({
          order_number: row.order_number,
          link_type: row.link_type,
          keyword: row.keyword,
          landing_page: row.landing_page,
          exact_match: row.exact_match,
          request_date: row.request_date,
          status: row.status,
          live_link: row.live_link ?? "",
          live_link_date: row.live_link_date ?? "",
          dr: row.dr ?? undefined,
        });
      } else {
        setForm({ ...EMPTY_FORM, request_date: new Date().toISOString().split("T")[0] });
      }
      setErrors({});
    }
  }, [is_open, row]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (is_open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [is_open, handleKeyDown]);

  function setField<K extends keyof CreateReportRowPayload>(
    key: K,
    value: CreateReportRowPayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const new_errors: Partial<Record<keyof CreateReportRowPayload, string>> = {};
    if (!form.order_number.trim()) new_errors.order_number = "Required";
    if (!form.link_type.trim()) new_errors.link_type = "Required";
    if (!form.keyword.trim()) new_errors.keyword = "Required";
    if (!form.landing_page.trim()) new_errors.landing_page = "Required";
    if (!form.request_date) new_errors.request_date = "Required";
    setErrors(new_errors);
    return Object.keys(new_errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: CreateReportRowPayload = {
      ...form,
      live_link: form.live_link?.trim() || undefined,
      live_link_date: form.live_link_date?.trim() || undefined,
      dr: form.dr !== undefined && form.dr !== null && String(form.dr) !== "" ? Number(form.dr) : undefined,
    };
    await onSave(payload);
  }

  if (!is_open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <svg
                className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {is_edit ? "Edit Row" : "Add Row"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="max-h-[calc(100vh-160px)] overflow-y-auto">
          <div className="space-y-4 px-6 py-5">
            {/* Row 1: Order Number + Link Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Order Number <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.order_number}
                  onChange={(e) => setField("order_number", e.target.value)}
                  placeholder="BL-24131"
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                    errors.order_number
                      ? "border-error-400 focus:border-error-500 focus:ring-error-500/20"
                      : "border-gray-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-400"
                  }`}
                />
                {errors.order_number && (
                  <p className="text-xs text-error-500">{errors.order_number}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Link Type <span className="text-error-500">*</span>
                </label>
                <select
                  value={form.link_type}
                  onChange={(e) => setField("link_type", e.target.value)}
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white ${
                    errors.link_type
                      ? "border-error-400 focus:border-error-500 focus:ring-error-500/20"
                      : "border-gray-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-400"
                  }`}
                >
                  <option value="">Select link type...</option>
                  {LINK_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {errors.link_type && (
                  <p className="text-xs text-error-500">{errors.link_type}</p>
                )}
              </div>
            </div>

            {/* Row 2: Keyword */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Keyword <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={form.keyword}
                onChange={(e) => setField("keyword", e.target.value)}
                placeholder="e.g. hotel waste management"
                className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                  errors.keyword
                    ? "border-error-400 focus:border-error-500 focus:ring-error-500/20"
                    : "border-gray-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-400"
                }`}
              />
              {errors.keyword && (
                <p className="text-xs text-error-500">{errors.keyword}</p>
              )}
            </div>

            {/* Row 3: Landing Page */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Landing Page <span className="text-error-500">*</span>
              </label>
              <input
                type="url"
                value={form.landing_page}
                onChange={(e) => setField("landing_page", e.target.value)}
                placeholder="https://example.com/page"
                className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                  errors.landing_page
                    ? "border-error-400 focus:border-error-500 focus:ring-error-500/20"
                    : "border-gray-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-400"
                }`}
              />
              {errors.landing_page && (
                <p className="text-xs text-error-500">{errors.landing_page}</p>
              )}
            </div>

            {/* Row 4: Exact Match + Request Date + Status */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Exact Match
                </label>
                <div className="flex h-[42px] items-center">
                  <label className="relative inline-flex cursor-pointer items-center gap-3">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={form.exact_match}
                        onChange={(e) => setField("exact_match", e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="h-5 w-9 rounded-full bg-gray-200 transition peer-checked:bg-brand-500 dark:bg-gray-700 dark:peer-checked:bg-brand-500" />
                      <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {form.exact_match ? "Yes" : "No"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Request Date <span className="text-error-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.request_date}
                  onChange={(e) => setField("request_date", e.target.value)}
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 dark:bg-gray-800 dark:text-white ${
                    errors.request_date
                      ? "border-error-400 focus:border-error-500 focus:ring-error-500/20"
                      : "border-gray-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-400"
                  }`}
                />
                {errors.request_date && (
                  <p className="text-xs text-error-500">{errors.request_date}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value as ReportRowStatus)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-gray-200 pt-1 dark:border-gray-700">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Live Link Details
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Live Link URL
                  </label>
                  <input
                    type="url"
                    value={form.live_link ?? ""}
                    onChange={(e) => setField("live_link", e.target.value)}
                    placeholder="https://publisher.com/article"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Live Date
                  </label>
                  <input
                    type="date"
                    value={form.live_link_date ?? ""}
                    onChange={(e) => setField("live_link_date", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400"
                  />
                </div>
              </div>

              <div className="mt-4 w-1/3 space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  DR (Domain Rating)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.dr ?? ""}
                  onChange={(e) =>
                    setField("dr", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  placeholder="0–100"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-400"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={is_saving}
              className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {is_saving ? "Saving..." : is_edit ? "Save Changes" : "Add Row"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
