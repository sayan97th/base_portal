"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReportRow, ReportRowStatus, UpdateReportRowPayload } from "@/types/admin/order-report";

interface RowEditorModalProps {
  is_open: boolean;
  is_saving: boolean;
  row: ReportRow | null;
  onClose: () => void;
  onSave: (payload: UpdateReportRowPayload) => Promise<void>;
}

interface DeliveryForm {
  status: ReportRowStatus;
  live_link: string;
  live_link_date: string;
  dr: number | undefined;
}

const STATUS_OPTIONS: { value: ReportRowStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "live", label: "Live" },
  { value: "rejected", label: "Rejected" },
];

function truncateUrl(url: string, max = 50): string {
  try {
    const parsed = new URL(url);
    const full = parsed.hostname + parsed.pathname;
    return full.length > max ? full.slice(0, max) + "…" : full;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

function ReadOnlyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/60">
        {children}
      </div>
    </div>
  );
}

export default function RowEditorModal({
  is_open,
  is_saving,
  row,
  onClose,
  onSave,
}: RowEditorModalProps) {
  const [form, setForm] = useState<DeliveryForm>({
    status: "pending",
    live_link: "",
    live_link_date: "",
    dr: undefined,
  });

  useEffect(() => {
    if (is_open && row) {
      setForm({
        status: row.status,
        live_link: row.live_link ?? "",
        live_link_date: row.live_link_date ?? "",
        dr: row.dr ?? undefined,
      });
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

  function setField<K extends keyof DeliveryForm>(key: K, value: DeliveryForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: UpdateReportRowPayload = {
      status: form.status,
      live_link: form.live_link.trim() || undefined,
      live_link_date: form.live_link_date.trim() || undefined,
      dr: form.dr !== undefined && String(form.dr) !== "" ? Number(form.dr) : undefined,
    };
    await onSave(payload);
  }

  if (!is_open || !row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <svg
                className="h-4 w-4 text-brand-600 dark:text-brand-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Edit Delivery Details
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Update status, live link and domain rating
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

        <form onSubmit={handleSubmit} className="max-h-[calc(100vh-160px)] overflow-y-auto">
          <div className="space-y-5 px-6 py-5">
            {/* Read-only order info */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Order Information
              </p>
              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyField label="Order #">
                  <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
                    {row.order_number}
                  </span>
                </ReadOnlyField>
                <ReadOnlyField label="Link Type">
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {row.link_type}
                  </span>
                </ReadOnlyField>
              </div>
              <div className="mt-3 space-y-3">
                <ReadOnlyField label="Keyword">
                  <span className="text-xs font-medium text-gray-800 dark:text-white/90">
                    {row.keyword}
                  </span>
                </ReadOnlyField>
                <ReadOnlyField label="Landing Page">
                  <a
                    href={row.landing_page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                    title={row.landing_page}
                  >
                    {truncateUrl(row.landing_page)}
                  </a>
                </ReadOnlyField>
                <div className="grid grid-cols-2 gap-3">
                  <ReadOnlyField label="Exact Match">
                    <span className={`text-xs font-medium ${row.exact_match ? "text-success-600 dark:text-success-400" : "text-gray-600 dark:text-gray-400"}`}>
                      {row.exact_match ? "Yes" : "No"}
                    </span>
                  </ReadOnlyField>
                  <ReadOnlyField label="Request Date">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(row.request_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </ReadOnlyField>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

            {/* Editable delivery fields */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Delivery Details
              </p>
              <div className="space-y-4">
                {/* Status */}
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

                {/* Live Link + Live Date */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Live Link URL
                    </label>
                    <input
                      type="url"
                      value={form.live_link}
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
                      value={form.live_link_date}
                      onChange={(e) => setField("live_link_date", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400"
                    />
                  </div>
                </div>

                {/* DR */}
                <div className="w-1/3 space-y-1.5">
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
              {is_saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
