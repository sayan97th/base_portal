"use client";

import React, { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import type { InvoiceStatus, InvoiceSortField, SortDirection } from "@/types/admin";

// ── Inline Date Picker ─────────────────────────────────────────────────────────

interface InvoiceDatePickerInputProps {
  value: string;
  placeholder: string;
  max_date?: string;
  min_date?: string;
  on_change: (value: string) => void;
  is_active?: boolean;
}

function InvoiceDatePickerInput({
  value,
  placeholder,
  max_date,
  min_date,
  on_change,
  is_active,
}: InvoiceDatePickerInputProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const fp_ref = useRef<FlatpickrInstance | null>(null);
  const on_change_ref = useRef(on_change);
  on_change_ref.current = on_change;

  useEffect(() => {
    if (!input_ref.current) return;
    fp_ref.current = flatpickr(input_ref.current, {
      dateFormat: "Y-m-d",
      appendTo: document.body,
      disableMobile: true,
      maxDate: max_date || undefined,
      minDate: min_date || undefined,
      onChange: (_, date_str) => on_change_ref.current(date_str),
    });
    return () => {
      fp_ref.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fp_ref.current) return;
    if (value) {
      fp_ref.current.setDate(value, false);
    } else {
      fp_ref.current.clear(false);
    }
  }, [value]);

  useEffect(() => {
    if (!fp_ref.current) return;
    fp_ref.current.set("maxDate", max_date || undefined);
  }, [max_date]);

  useEffect(() => {
    if (!fp_ref.current) return;
    fp_ref.current.set("minDate", min_date || undefined);
  }, [min_date]);

  return (
    <div className="relative">
      <input
        ref={input_ref}
        readOnly
        placeholder={placeholder}
        className={`h-8 w-36 cursor-pointer rounded-lg border px-3 pr-8 text-xs outline-none transition placeholder:text-gray-400 ${
          is_active
            ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
            : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600"
        }`}
      />
      <span
        className={`pointer-events-none absolute inset-y-0 right-2 flex items-center ${
          is_active ? "text-brand-500 dark:text-brand-400" : "text-gray-400"
        }`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V9.75z" />
        </svg>
      </span>
    </div>
  );
}

// ── Sort options ───────────────────────────────────────────────────────────────

interface SortOption {
  field: InvoiceSortField;
  label: string;
  icon: React.ReactNode;
}

const SORT_OPTIONS: SortOption[] = [
  {
    field: "date_issued",
    label: "Date",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    field: "total_amount",
    label: "Amount",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    field: "customer",
    label: "Customer",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    field: "invoice_number",
    label: "Invoice #",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    field: "status",
    label: "Status",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// ── Status options ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: InvoiceStatus | ""; label: string; dot_class: string }[] = [
  { value: "", label: "All", dot_class: "bg-gray-400" },
  { value: "paid", label: "Paid", dot_class: "bg-success-500" },
  { value: "void", label: "Void", dot_class: "bg-error-500" },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface InvoiceFiltersBarProps {
  search_value: string;
  on_search_change: (value: string) => void;
  status_filter: InvoiceStatus | "";
  on_status_change: (status: InvoiceStatus | "") => void;
  sort_field: InvoiceSortField | undefined;
  sort_direction: SortDirection;
  on_sort_change: (field: InvoiceSortField, direction: SortDirection) => void;
  date_from: string;
  date_to: string;
  on_date_range_change: (date_from: string, date_to: string) => void;
  total: number;
  is_loading: boolean;
  on_clear_all: () => void;
}

// ── Sort direction arrow ───────────────────────────────────────────────────────

function SortDirectionIcon({ direction }: { direction: SortDirection }) {
  return direction === "asc" ? (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function InvoiceFiltersBar({
  search_value,
  on_search_change,
  status_filter,
  on_status_change,
  sort_field,
  sort_direction,
  on_sort_change,
  date_from,
  date_to,
  on_date_range_change,
  total,
  is_loading,
  on_clear_all,
}: InvoiceFiltersBarProps) {
  const has_date_range = date_from !== "" || date_to !== "";
  const has_active_filters =
    search_value.length > 0 ||
    status_filter !== "" ||
    sort_field !== undefined ||
    has_date_range;

  function handleSortClick(field: InvoiceSortField) {
    if (sort_field === field) {
      on_sort_change(field, sort_direction === "asc" ? "desc" : "asc");
    } else {
      on_sort_change(field, "desc");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

      {/* Row 1 — Search */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            {is_loading && search_value.length > 0 ? (
              <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={search_value}
            onChange={(e) => on_search_change(e.target.value)}
            placeholder="Search by invoice number, customer name, or email…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:bg-gray-800"
          />
          {search_value.length > 0 && (
            <button
              onClick={() => on_search_change("")}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="hidden shrink-0 sm:block">
          {is_loading ? (
            <span className="inline-block h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span>
              {" "}invoice{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {has_active_filters && (
          <button
            onClick={on_clear_all}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Row 2 — Status + Sort */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">
            Status
          </span>
          {STATUS_OPTIONS.map((opt) => {
            const is_active = status_filter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => on_status_change(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  is_active
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${is_active ? "bg-white/70" : opt.dot_class}`} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Sort pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">
            Sort by
          </span>
          {SORT_OPTIONS.map((opt) => {
            const is_active = sort_field === opt.field;
            return (
              <button
                key={opt.field}
                onClick={() => handleSortClick(opt.field)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  is_active
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <span className={is_active ? "text-white dark:text-gray-900" : "text-gray-400"}>
                  {opt.icon}
                </span>
                {opt.label}
                {is_active && (
                  <span className="text-white dark:text-gray-900">
                    <SortDirectionIcon direction={sort_direction} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3 — Date Range */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className={`flex items-center gap-1.5 ${has_date_range ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"}`}>
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="shrink-0 text-xs font-medium">Date range</span>
        </div>

        <div className="flex items-center gap-2">
          <InvoiceDatePickerInput
            value={date_from}
            placeholder="From date"
            max_date={date_to || undefined}
            on_change={(val) => on_date_range_change(val, date_to)}
            is_active={date_from !== ""}
          />

          <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>

          <InvoiceDatePickerInput
            value={date_to}
            placeholder="To date"
            min_date={date_from || undefined}
            on_change={(val) => on_date_range_change(date_from, val)}
            is_active={date_to !== ""}
          />

          {has_date_range && (
            <button
              onClick={() => on_date_range_change("", "")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Clear date range"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
