"use client";

import React, { useState, useEffect } from "react";
import ModalShell from "@/components/ui/modal/ModalShell";
import type { CreateReportRowPayload, ReportRowStatus } from "@/types/admin/order-report";

interface AddRowModalProps {
  is_open: boolean;
  is_saving: boolean;
  table_title: string;
  onClose: () => void;
  onSave: (payload: CreateReportRowPayload) => Promise<void>;
}

interface RowForm {
  link_type: string;
  keyword: string;
  landing_page: string;
  exact_match: boolean;
  request_date: string;
  status: ReportRowStatus;
  live_link: string;
  live_link_date: string;
  dr: string;
}

const INITIAL_FORM: RowForm = {
  link_type: "",
  keyword: "",
  landing_page: "",
  exact_match: false,
  request_date: "",
  status: "pending",
  live_link: "",
  live_link_date: "",
  dr: "",
};

const STATUS_OPTIONS: {
  value: ReportRowStatus;
  label: string;
  active_classes: string;
  dot: string;
}[] = [
  {
    value: "pending",
    label: "Pending",
    active_classes:
      "border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400",
    dot: "bg-warning-500",
  },
  {
    value: "live",
    label: "Live",
    active_classes:
      "border-success-300 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400",
    dot: "bg-success-500",
  },
  {
    value: "rejected",
    label: "Rejected",
    active_classes:
      "border-error-300 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400",
    dot: "bg-error-500",
  },
];

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `R-${ts}${rand}`;
}

// ── Shared input class helper ──────────────────────────────────────────────────

const input_base =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-400";

// ── Field wrapper ──────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {hint && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {children}
      </span>
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

// ── DR indicator badge ─────────────────────────────────────────────────────────

function DrBadge({ value }: { value: number }) {
  const label = value >= 70 ? "High" : value >= 40 ? "Med" : "Low";
  const color =
    value >= 70
      ? "text-success-500"
      : value >= 40
      ? "text-warning-500"
      : "text-gray-400";
  return (
    <span className={`text-xs font-semibold ${color}`}>{label}</span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddRowModal({
  is_open,
  is_saving,
  table_title,
  onClose,
  onSave,
}: AddRowModalProps) {
  const [form, setForm] = useState<RowForm>(INITIAL_FORM);

  useEffect(() => {
    if (is_open) {
      setForm(INITIAL_FORM);
    }
  }, [is_open]);

  function setField<K extends keyof RowForm>(key: K, value: RowForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const dr_num =
      form.dr !== "" && !isNaN(Number(form.dr)) ? Number(form.dr) : undefined;

    const payload: CreateReportRowPayload = {
      order_number: generateOrderNumber(),
      status: form.status,
    };

    if (form.link_type.trim()) payload.link_type = form.link_type.trim();
    if (form.keyword.trim()) payload.keyword = form.keyword.trim();
    if (form.landing_page.trim()) payload.landing_page = form.landing_page.trim();
    if (form.request_date) payload.request_date = form.request_date;
    if (form.live_link.trim()) payload.live_link = form.live_link.trim();
    if (form.live_link_date) payload.live_link_date = form.live_link_date;
    if (dr_num !== undefined) payload.dr = dr_num;
    payload.exact_match = form.exact_match;

    await onSave(payload);
  }

  const dr_value =
    form.dr !== "" && !isNaN(Number(form.dr)) ? Number(form.dr) : null;

  return (
    <ModalShell is_open={is_open} max_width="max-w-xl" on_close={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <svg
              className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Add Row
            </h2>
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">
              {table_title}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-5 px-5 py-5">
          {/* ── Placement Info ───────────────────────────────────── */}
          <SectionHeading>Placement Info</SectionHeading>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Link Type" hint="(optional)">
              <input
                type="text"
                value={form.link_type}
                onChange={(e) => setField("link_type", e.target.value)}
                placeholder="e.g. Guest Post"
                className={input_base}
              />
            </Field>

            <Field label="Keyword" hint="(optional)">
              <input
                type="text"
                value={form.keyword}
                onChange={(e) => setField("keyword", e.target.value)}
                placeholder="Target keyword"
                className={input_base}
              />
            </Field>
          </div>

          <Field label="Landing Page" hint="(optional)">
            <input
              type="text"
              value={form.landing_page}
              onChange={(e) => setField("landing_page", e.target.value)}
              placeholder="https://example.com/page"
              className={input_base}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Request Date" hint="(optional)">
              <input
                type="date"
                value={form.request_date}
                onChange={(e) => setField("request_date", e.target.value)}
                className={`${input_base} dark:scheme-dark`}
              />
            </Field>

            {/* Exact Match toggle */}
            <Field label="Exact Match">
              <button
                type="button"
                onClick={() => setField("exact_match", !form.exact_match)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-all ${
                  form.exact_match
                    ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600"
                }`}
              >
                {/* Custom checkbox */}
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    form.exact_match
                      ? "border-brand-500 bg-brand-500"
                      : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                  }`}
                >
                  {form.exact_match && (
                    <svg
                      className="h-2.5 w-2.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </span>
                <span className="font-medium">
                  {form.exact_match ? "Exact" : "Partial"}
                </span>
              </button>
            </Field>
          </div>

          {/* ── Status & Delivery ─────────────────────────────────── */}
          <SectionHeading>Status &amp; Delivery</SectionHeading>

          {/* Status selector */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const is_active = form.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField("status", opt.value)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition-all ${
                      is_active
                        ? opt.active_classes
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        is_active ? opt.dot : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Live Link" hint="(optional)">
            <input
              type="text"
              value={form.live_link}
              onChange={(e) => setField("live_link", e.target.value)}
              placeholder="https://publisher.com/article"
              className={input_base}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Live Date" hint="(optional)">
              <input
                type="date"
                value={form.live_link_date}
                onChange={(e) => setField("live_link_date", e.target.value)}
                className={`${input_base} dark:scheme-dark`}
              />
            </Field>

            <Field label="Domain Rating (DR)" hint="(optional)">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.dr}
                  onChange={(e) => setField("dr", e.target.value)}
                  placeholder="0–100"
                  className={input_base}
                />
                {dr_value !== null && (
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <DrBadge value={dr_value} />
                  </div>
                )}
              </div>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
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
            {is_saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Adding...
              </span>
            ) : (
              "Add Row"
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
