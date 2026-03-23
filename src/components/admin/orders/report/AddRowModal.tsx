"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { CreateReportRowPayload, ReportRowStatus } from "@/types/admin/order-report";

interface AddRowModalProps {
  is_open: boolean;
  is_saving: boolean;
  table_title: string;
  onClose: () => void;
  onSave: (payload: CreateReportRowPayload) => Promise<void>;
}

const STATUS_OPTIONS: { value: ReportRowStatus; label: string; description: string; color: string }[] = [
  {
    value: "pending",
    label: "Pending",
    description: "Awaiting link placement",
    color: "text-warning-600 dark:text-warning-400",
  },
  {
    value: "live",
    label: "Live",
    description: "Link is live and active",
    color: "text-success-600 dark:text-success-400",
  },
  {
    value: "rejected",
    label: "Rejected",
    description: "Link placement was rejected",
    color: "text-error-600 dark:text-error-400",
  },
];

const INITIAL_FORM: CreateReportRowPayload = {
  order_number: "",
  link_type: "",
  keyword: "",
  landing_page: "",
  exact_match: false,
  request_date: new Date().toISOString().split("T")[0],
  status: "pending",
  live_link: "",
  live_link_date: "",
  dr: undefined,
};

export default function AddRowModal({
  is_open,
  is_saving,
  table_title,
  onClose,
  onSave,
}: AddRowModalProps) {
  const [form, setForm] = useState<CreateReportRowPayload>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateReportRowPayload, string>>>({});

  useEffect(() => {
    if (is_open) {
      setForm(INITIAL_FORM);
      setErrors({});
    }
  }, [is_open]);

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

  function validate(): boolean {
    const new_errors: Partial<Record<keyof CreateReportRowPayload, string>> = {};
    if (!form.order_number.trim()) new_errors.order_number = "Order number is required.";
    if (!form.link_type.trim()) new_errors.link_type = "Link type is required.";
    if (!form.keyword.trim()) new_errors.keyword = "Keyword is required.";
    if (!form.landing_page.trim()) new_errors.landing_page = "Landing page is required.";
    if (!form.request_date) new_errors.request_date = "Request date is required.";
    if (form.dr !== undefined && (form.dr < 0 || form.dr > 100)) {
      new_errors.dr = "DR must be between 0 and 100.";
    }
    setErrors(new_errors);
    return Object.keys(new_errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: CreateReportRowPayload = {
      ...form,
      order_number: form.order_number.trim(),
      link_type: form.link_type.trim(),
      keyword: form.keyword.trim(),
      landing_page: form.landing_page.trim(),
      live_link: form.live_link?.trim() || undefined,
      live_link_date: form.live_link_date?.trim() || undefined,
      dr: form.dr !== undefined && form.dr !== null && String(form.dr) !== "" ? Number(form.dr) : undefined,
    };

    await onSave(payload);
  }

  if (!is_open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
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
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Add Row
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {table_title}
              </p>
            </div>
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
        <form onSubmit={handleSubmit} className="divide-y divide-gray-100 dark:divide-gray-800">
          {/* Section: Order Info */}
          <div className="space-y-4 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Order Information
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Order Number */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Order # <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.order_number}
                  onChange={(e) => setForm((f) => ({ ...f, order_number: e.target.value }))}
                  placeholder="e.g. ORD-001"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:text-white dark:placeholder-gray-500 ${
                    errors.order_number
                      ? "border-error-300 bg-error-50 focus:border-error-500 focus:ring-error-500/20 dark:border-error-500/40 dark:bg-error-500/5"
                      : "border-gray-200 bg-white focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-400"
                  }`}
                />
                {errors.order_number && (
                  <p className="text-xs text-error-500">{errors.order_number}</p>
                )}
              </div>

              {/* Link Type */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Link Type <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.link_type}
                  onChange={(e) => setForm((f) => ({ ...f, link_type: e.target.value }))}
                  placeholder="e.g. Guest Post, Niche Edit"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:text-white dark:placeholder-gray-500 ${
                    errors.link_type
                      ? "border-error-300 bg-error-50 focus:border-error-500 focus:ring-error-500/20 dark:border-error-500/40 dark:bg-error-500/5"
                      : "border-gray-200 bg-white focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-400"
                  }`}
                />
                {errors.link_type && (
                  <p className="text-xs text-error-500">{errors.link_type}</p>
                )}
              </div>

              {/* Keyword */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Keyword <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.keyword}
                  onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
                  placeholder="Target keyword"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:text-white dark:placeholder-gray-500 ${
                    errors.keyword
                      ? "border-error-300 bg-error-50 focus:border-error-500 focus:ring-error-500/20 dark:border-error-500/40 dark:bg-error-500/5"
                      : "border-gray-200 bg-white focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-400"
                  }`}
                />
                {errors.keyword && (
                  <p className="text-xs text-error-500">{errors.keyword}</p>
                )}
              </div>

              {/* Request Date */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Request Date <span className="text-error-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.request_date}
                  onChange={(e) => setForm((f) => ({ ...f, request_date: e.target.value }))}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 dark:text-white dark:bg-gray-800 dark:[color-scheme:dark] ${
                    errors.request_date
                      ? "border-error-300 bg-error-50 focus:border-error-500 focus:ring-error-500/20 dark:border-error-500/40 dark:bg-error-500/5"
                      : "border-gray-200 bg-white focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-400"
                  }`}
                />
                {errors.request_date && (
                  <p className="text-xs text-error-500">{errors.request_date}</p>
                )}
              </div>
            </div>

            {/* Landing Page */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Landing Page <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={form.landing_page}
                onChange={(e) => setForm((f) => ({ ...f, landing_page: e.target.value }))}
                placeholder="https://example.com/target-page"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:text-white dark:placeholder-gray-500 ${
                  errors.landing_page
                    ? "border-error-300 bg-error-50 focus:border-error-500 focus:ring-error-500/20 dark:border-error-500/40 dark:bg-error-500/5"
                    : "border-gray-200 bg-white focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-400"
                }`}
              />
              {errors.landing_page && (
                <p className="text-xs text-error-500">{errors.landing_page}</p>
              )}
            </div>

            {/* Exact Match */}
            <label className="flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.exact_match}
                  onChange={(e) => setForm((f) => ({ ...f, exact_match: e.target.checked }))}
                  className="sr-only"
                />
                <div
                  className={`h-5 w-5 rounded-md border-2 transition-colors ${
                    form.exact_match
                      ? "border-brand-500 bg-brand-500"
                      : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                  }`}
                >
                  {form.exact_match && (
                    <svg className="h-full w-full p-0.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exact Match</span>
                <p className="text-xs text-gray-400 dark:text-gray-500">The keyword matches exactly as specified</p>
              </div>
            </label>
          </div>

          {/* Section: Delivery Details */}
          <div className="space-y-4 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Delivery Details
            </p>

            {/* Status */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: opt.value }))}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-all ${
                      form.status === opt.value
                        ? "border-brand-300 bg-brand-50 ring-2 ring-brand-500/20 dark:border-brand-500/40 dark:bg-brand-500/10"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <span className={`block text-xs font-semibold ${opt.color}`}>
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Live Link */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Live Link{" "}
                  <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.live_link || ""}
                  onChange={(e) => setForm((f) => ({ ...f, live_link: e.target.value }))}
                  placeholder="https://domain.com/article"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-400"
                />
              </div>

              {/* Live Date */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Live Date{" "}
                  <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={form.live_link_date || ""}
                  onChange={(e) => setForm((f) => ({ ...f, live_link_date: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:[color-scheme:dark] dark:focus:border-brand-400"
                />
              </div>

              {/* DR */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Domain Rating (DR){" "}
                  <span className="text-xs font-normal text-gray-400">(optional, 0–100)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.dr !== undefined && form.dr !== null ? form.dr : ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        dr: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="e.g. 45"
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 dark:text-white dark:placeholder-gray-500 ${
                      errors.dr
                        ? "border-error-300 bg-error-50 focus:border-error-500 focus:ring-error-500/20 dark:border-error-500/40 dark:bg-error-500/5"
                        : "border-gray-200 bg-white focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-brand-400"
                    }`}
                  />
                  {form.dr !== undefined && form.dr !== null && String(form.dr) !== "" && (
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <span
                        className={`text-xs font-semibold ${
                          form.dr >= 70
                            ? "text-success-500"
                            : form.dr >= 40
                            ? "text-warning-500"
                            : "text-gray-400"
                        }`}
                      >
                        {form.dr >= 70 ? "High" : form.dr >= 40 ? "Med" : "Low"}
                      </span>
                    </div>
                  )}
                </div>
                {errors.dr && (
                  <p className="text-xs text-error-500">{errors.dr}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={is_saving}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={is_saving}
              className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {is_saving ? "Adding..." : "Add Row"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
