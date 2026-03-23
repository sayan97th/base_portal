"use client";

import { useState, useEffect, useRef } from "react";
import type { CreateReportRowPayload, ReportRowStatus } from "@/types/admin/order-report";

interface InlineAddRowProps {
  order_id: string;
  is_saving: boolean;
  onSave: (payload: CreateReportRowPayload) => Promise<void>;
  onCancel: () => void;
}

interface InlineRowForm {
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

const INITIAL_FORM: InlineRowForm = {
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


const cell_input =
  "w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-400";

const STATUS_COLORS: Record<ReportRowStatus, string> = {
  pending: "text-warning-600 dark:text-warning-400",
  live: "text-success-600 dark:text-success-400",
  rejected: "text-error-600 dark:text-error-400",
};

export default function InlineAddRow({
  order_id,
  is_saving,
  onSave,
  onCancel,
}: InlineAddRowProps) {
  const [form, setForm] = useState<InlineRowForm>(INITIAL_FORM);
  const first_input_ref = useRef<HTMLInputElement>(null);

  // Auto-focus the first field when the row mounts
  useEffect(() => {
    first_input_ref.current?.focus();
  }, []);

  // Escape key cancels
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  function setField<K extends keyof InlineRowForm>(key: K, value: InlineRowForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (is_saving) return;

    const payload: CreateReportRowPayload = {
      order_number: order_id,
      status: form.status,
      exact_match: form.exact_match,
    };

    if (form.link_type.trim()) payload.link_type = form.link_type.trim();
    if (form.keyword.trim()) payload.keyword = form.keyword.trim();
    if (form.landing_page.trim()) payload.landing_page = form.landing_page.trim();
    if (form.request_date) payload.request_date = form.request_date;
    if (form.live_link.trim()) payload.live_link = form.live_link.trim();
    if (form.live_link_date) payload.live_link_date = form.live_link_date;
    const dr_num =
      form.dr !== "" && !isNaN(Number(form.dr)) ? Number(form.dr) : undefined;
    if (dr_num !== undefined) payload.dr = dr_num;

    await onSave(payload);
  }

  // Allow Enter key in text inputs to save
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  }

  const dr_num =
    form.dr !== "" && !isNaN(Number(form.dr)) ? Number(form.dr) : null;

  return (
    <tr className="border-t-2 border-brand-200 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/5">
      {/* Order # — uses the order ID, read-only */}
      <td className="px-4 py-2.5">
        <span
          className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          title={order_id}
        >
          {order_id.length > 8 ? `${order_id.slice(0, 8)}…` : order_id}
        </span>
      </td>

      {/* Link Type */}
      <td className="px-2 py-2.5">
        <input
          ref={first_input_ref}
          type="text"
          value={form.link_type}
          onChange={(e) => setField("link_type", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Link type…"
          className={cell_input}
          style={{ minWidth: "100px" }}
        />
      </td>

      {/* Keyword */}
      <td className="px-2 py-2.5">
        <input
          type="text"
          value={form.keyword}
          onChange={(e) => setField("keyword", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Keyword…"
          className={cell_input}
          style={{ minWidth: "110px" }}
        />
      </td>

      {/* Landing Page */}
      <td className="px-2 py-2.5">
        <input
          type="text"
          value={form.landing_page}
          onChange={(e) => setField("landing_page", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://…"
          className={cell_input}
          style={{ minWidth: "140px" }}
        />
      </td>

      {/* Exact Match — toggle badge */}
      <td className="px-3 py-2.5 text-center">
        <button
          type="button"
          onClick={() => setField("exact_match", !form.exact_match)}
          title="Toggle exact match"
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
            form.exact_match
              ? "bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-500/20 dark:text-success-400"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          {form.exact_match ? "Yes" : "No"}
        </button>
      </td>

      {/* Request Date */}
      <td className="px-2 py-2.5">
        <input
          type="date"
          value={form.request_date}
          onChange={(e) => setField("request_date", e.target.value)}
          className={`${cell_input} dark:scheme-dark`}
          style={{ minWidth: "120px" }}
        />
      </td>

      {/* Status — native select, minimal styling */}
      <td className="px-2 py-2.5">
        <select
          value={form.status}
          onChange={(e) => setField("status", e.target.value as ReportRowStatus)}
          className={`${cell_input} ${STATUS_COLORS[form.status]} font-medium`}
          style={{ minWidth: "100px" }}
        >
          <option value="pending" className="text-warning-600">Pending</option>
          <option value="live" className="text-success-600">Live</option>
          <option value="rejected" className="text-error-600">Rejected</option>
        </select>
      </td>

      {/* Live Link */}
      <td className="px-2 py-2.5">
        <input
          type="text"
          value={form.live_link}
          onChange={(e) => setField("live_link", e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://…"
          className={cell_input}
          style={{ minWidth: "140px" }}
        />
      </td>

      {/* Live Date */}
      <td className="px-2 py-2.5">
        <input
          type="date"
          value={form.live_link_date}
          onChange={(e) => setField("live_link_date", e.target.value)}
          className={`${cell_input} dark:scheme-dark`}
          style={{ minWidth: "120px" }}
        />
      </td>

      {/* DR */}
      <td className="px-2 py-2.5">
        <div className="relative" style={{ minWidth: "70px" }}>
          <input
            type="number"
            min={0}
            max={100}
            value={form.dr}
            onChange={(e) => setField("dr", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="DR"
            className={cell_input}
          />
          {dr_num !== null && (
            <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
              <span
                className={`text-[9px] font-bold ${
                  dr_num >= 70
                    ? "text-success-500"
                    : dr_num >= 40
                    ? "text-warning-500"
                    : "text-gray-400"
                }`}
              >
                {dr_num >= 70 ? "H" : dr_num >= 40 ? "M" : "L"}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Actions — save / cancel */}
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-1">
          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={is_saving}
            title="Save row (Enter)"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {is_saving ? (
              <svg
                className="h-3.5 w-3.5 animate-spin"
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
            ) : (
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            )}
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            disabled={is_saving}
            title="Cancel (Esc)"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
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
      </td>
    </tr>
  );
}
