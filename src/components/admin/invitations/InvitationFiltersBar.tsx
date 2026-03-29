"use client";

import React, { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import type {
  InvitationStatus,
  InvitationSortField,
  InvitationRole,
  SortDirection,
} from "@/types/admin";

// ── Inline Date Picker ─────────────────────────────────────────────────────────

interface DatePickerInputProps {
  value: string;
  placeholder: string;
  max_date?: string;
  min_date?: string;
  on_change: (value: string) => void;
  is_active?: boolean;
}

function DatePickerInput({
  value,
  placeholder,
  max_date,
  min_date,
  on_change,
  is_active,
}: DatePickerInputProps) {
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

// ── Sort direction icon ────────────────────────────────────────────────────────

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

// ── Sort options ───────────────────────────────────────────────────────────────

interface SortOption {
  field: InvitationSortField;
  label: string;
  icon: React.ReactNode;
}

const SORT_OPTIONS: SortOption[] = [
  {
    field: "created_at",
    label: "Invited",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    field: "expires_at",
    label: "Expires",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    field: "email",
    label: "Email",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0L12 13.5 2.25 6.75" />
      </svg>
    ),
  },
  {
    field: "role",
    label: "Role",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
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

// ── Status filter options ──────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: InvitationStatus | ""; label: string; dot_class: string }[] = [
  { value: "", label: "All", dot_class: "bg-gray-400" },
  { value: "pending", label: "Pending", dot_class: "bg-warning-500" },
  { value: "accepted", label: "Accepted", dot_class: "bg-success-500" },
  { value: "expired", label: "Expired", dot_class: "bg-error-500" },
];

// ── Role filter options ────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: InvitationRole | ""; label: string }[] = [
  { value: "", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
];

// ── Props ──────────────────────────────────────────────────────────────────────

export interface InvitationFiltersBarProps {
  search_value: string;
  on_search_change: (value: string) => void;
  status_filter: InvitationStatus | "";
  on_status_change: (status: InvitationStatus | "") => void;
  role_filter: InvitationRole | "";
  on_role_change: (role: InvitationRole | "") => void;
  sort_field: InvitationSortField | undefined;
  sort_direction: SortDirection;
  on_sort_change: (field: InvitationSortField, direction: SortDirection) => void;
  date_from: string;
  date_to: string;
  on_date_range_change: (date_from: string, date_to: string) => void;
  total: number;
  is_loading: boolean;
  on_clear_all: () => void;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function InvitationFiltersBar({
  search_value,
  on_search_change,
  status_filter,
  on_status_change,
  role_filter,
  on_role_change,
  sort_field,
  sort_direction,
  on_sort_change,
  date_from,
  date_to,
  on_date_range_change,
  total,
  is_loading,
  on_clear_all,
}: InvitationFiltersBarProps) {
  const has_date_range = date_from !== "" || date_to !== "";
  const has_active_filters =
    search_value.length > 0 ||
    status_filter !== "" ||
    role_filter !== "" ||
    sort_field !== undefined ||
    has_date_range;

  const active_filter_count = [
    search_value.length > 0,
    status_filter !== "",
    role_filter !== "",
    sort_field !== undefined,
    has_date_range,
  ].filter(Boolean).length;

  function handleSortClick(field: InvitationSortField) {
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
            placeholder="Search by email address…"
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

        {/* Result count */}
        <div className="hidden shrink-0 sm:block">
          {is_loading ? (
            <span className="inline-block h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span>
              {" "}invitation{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Active filter badge + clear */}
        {has_active_filters && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              {active_filter_count}
            </span>
            <button
              onClick={on_clear_all}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Row 2 — Status + Role */}
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
                key={opt.value || "all"}
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

        {/* Role pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">
            Role
          </span>
          {ROLE_OPTIONS.map((opt) => {
            const is_active = role_filter === opt.value;
            return (
              <button
                key={opt.value || "all"}
                onClick={() => on_role_change(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  is_active
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {opt.value && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      opt.value === "admin"
                        ? is_active ? "bg-purple-300" : "bg-purple-400"
                        : is_active ? "bg-blue-300" : "bg-blue-400"
                    }`}
                  />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3 — Sort */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
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

      {/* Row 4 — Date Range */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className={`flex items-center gap-1.5 ${has_date_range ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"}`}>
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="shrink-0 text-xs font-medium">Date range</span>
        </div>

        <div className="flex items-center gap-2">
          <DatePickerInput
            value={date_from}
            placeholder="From date"
            max_date={date_to || undefined}
            on_change={(val) => on_date_range_change(val, date_to)}
            is_active={date_from !== ""}
          />

          <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>

          <DatePickerInput
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
