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

const STATUS_OPTIONS: { value: ReportRowStatus; label: string; dot: string }[] = [
  { value: "pending", label: "Pending", dot: "bg-warning-500" },
  { value: "live", label: "Live", dot: "bg-success-500" },
  { value: "rejected", label: "Rejected", dot: "bg-error-500" },
];

function truncateUrl(url: string, max = 52): string {
  try {
    const parsed = new URL(url);
    const full = parsed.hostname + parsed.pathname;
    return full.length > max ? full.slice(0, max) + "…" : full;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <div>{children}</div>
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
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
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

  const current_status = STATUS_OPTIONS.find((o) => o.value === form.status);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          is_open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Slide-over panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 ${
          is_open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
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
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
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

        {/* Scrollable body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* ── Order Information (read-only) ── */}
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Order Information
                </span>
                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40">
                {/* Order # + Link Type */}
                <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                  <div className="px-4 py-3">
                    <InfoRow label="Order #">
                      <span className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {row?.order_number}
                      </span>
                    </InfoRow>
                  </div>
                  <div className="px-4 py-3">
                    <InfoRow label="Link Type">
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        {row?.link_type}
                      </span>
                    </InfoRow>
                  </div>
                </div>

                {/* Keyword */}
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <InfoRow label="Keyword">
                    <span className="text-xs font-medium text-gray-800 dark:text-white/90">
                      {row?.keyword}
                    </span>
                  </InfoRow>
                </div>

                {/* Landing Page */}
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <InfoRow label="Landing Page">
                    {row?.landing_page ? (
                      <a
                        href={row.landing_page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                        title={row.landing_page}
                      >
                        {truncateUrl(row.landing_page)}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </InfoRow>
                </div>

                {/* Exact Match + Request Date */}
                <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
                  <div className="px-4 py-3">
                    <InfoRow label="Exact Match">
                      <span
                        className={`text-xs font-medium ${
                          row?.exact_match
                            ? "text-success-600 dark:text-success-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {row?.exact_match ? "Yes" : "No"}
                      </span>
                    </InfoRow>
                  </div>
                  <div className="px-4 py-3">
                    <InfoRow label="Request Date">
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        {row?.request_date
                          ? new Date(row.request_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </InfoRow>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Delivery Details (editable) ── */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Delivery Details
                </span>
                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
              </div>

              <div className="space-y-5">
                {/* Status */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setField("status", opt.value)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                          form.status === opt.value
                            ? opt.value === "pending"
                              ? "border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400"
                              : opt.value === "live"
                              ? "border-success-300 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
                              : "border-error-300 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
                            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${form.status === opt.value ? opt.dot : "bg-gray-300 dark:bg-gray-600"}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {current_status && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Current status:{" "}
                      <span className="font-medium text-gray-600 dark:text-gray-300">
                        {current_status.label}
                      </span>
                    </p>
                  )}
                </div>

                {/* Live Link URL */}
                <div className="space-y-2">
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
                  {form.live_link && (
                    <a
                      href={form.live_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      Preview link
                    </a>
                  )}
                </div>

                {/* Live Date + DR side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
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

                  <div className="space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      DR (Domain Rating)
                    </label>
                    <div className="relative">
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
                      {form.dr !== undefined && (
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                          <span
                            className={`text-xs font-bold ${
                              form.dr >= 70
                                ? "text-success-500"
                                : form.dr >= 50
                                ? "text-warning-500"
                                : "text-gray-400"
                            }`}
                          >
                            {form.dr >= 70 ? "High" : form.dr >= 50 ? "Med" : "Low"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Footer — always visible */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex gap-3">
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
                {is_saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
