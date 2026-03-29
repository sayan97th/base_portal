"use client";

import React from "react";
import type {
  ClientSortField,
  ClientEmailStatusFilter,
  ClientAccountStatusFilter,
  SortDirection,
} from "@/types/admin";
import FilterDatePicker from "@/components/admin/users/FilterDatePicker";

// ── Sort options config ────────────────────────────────────────────────────────

interface SortFieldOption {
  value: ClientSortField;
  label: string;
  asc_label: string;
  desc_label: string;
  icon: React.ReactNode;
}

const SORT_OPTIONS: SortFieldOption[] = [
  {
    value: "first_name",
    label: "Name",
    asc_label: "A → Z",
    desc_label: "Z → A",
    icon: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    value: "organization",
    label: "Organization",
    asc_label: "A → Z",
    desc_label: "Z → A",
    icon: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    value: "email",
    label: "Email",
    asc_label: "A → Z",
    desc_label: "Z → A",
    icon: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    value: "created_at",
    label: "Joined",
    asc_label: "Oldest",
    desc_label: "Newest",
    icon: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
];

// ── Status filter options ──────────────────────────────────────────────────────

interface EmailStatusOption {
  value: ClientEmailStatusFilter;
  label: string;
  dot_class: string;
  active_class: string;
}

const EMAIL_STATUS_OPTIONS: EmailStatusOption[] = [
  {
    value: "",
    label: "All",
    dot_class: "bg-gray-400",
    active_class: "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900",
  },
  {
    value: "verified",
    label: "Verified",
    dot_class: "bg-emerald-500",
    active_class: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
  },
  {
    value: "unverified",
    label: "Unverified",
    dot_class: "bg-amber-500",
    active_class: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
  },
];

interface AccountStatusOption {
  value: ClientAccountStatusFilter;
  label: string;
  dot_class: string;
  active_class: string;
}

const ACCOUNT_STATUS_OPTIONS: AccountStatusOption[] = [
  {
    value: "",
    label: "All",
    dot_class: "bg-gray-400",
    active_class: "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900",
  },
  {
    value: "active",
    label: "Active",
    dot_class: "bg-teal-500",
    active_class: "bg-teal-500 text-white shadow-sm shadow-teal-500/30",
  },
  {
    value: "disabled",
    label: "Disabled",
    dot_class: "bg-red-500",
    active_class: "bg-red-500 text-white shadow-sm shadow-red-500/30",
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface ClientFiltersBarProps {
  search_value: string;
  on_search_change: (value: string) => void;
  email_status: ClientEmailStatusFilter;
  on_email_status_change: (status: ClientEmailStatusFilter) => void;
  account_status: ClientAccountStatusFilter;
  on_account_status_change: (status: ClientAccountStatusFilter) => void;
  sort_field: ClientSortField | undefined;
  sort_direction: SortDirection;
  on_sort_change: (field: ClientSortField, direction: SortDirection) => void;
  date_from: string;
  date_to: string;
  on_date_from_change: (value: string) => void;
  on_date_to_change: (value: string) => void;
  total: number;
  is_loading: boolean;
  on_clear_all: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClientFiltersBar({
  search_value,
  on_search_change,
  email_status,
  on_email_status_change,
  account_status,
  on_account_status_change,
  sort_field,
  sort_direction,
  on_sort_change,
  date_from,
  date_to,
  on_date_from_change,
  on_date_to_change,
  total,
  is_loading,
  on_clear_all,
}: ClientFiltersBarProps) {
  const has_search = search_value.length > 0;
  const has_email_status = email_status !== "";
  const has_account_status = account_status !== "";
  const has_date = date_from.length > 0 || date_to.length > 0;
  const has_sort = sort_field !== undefined;
  const has_active_filters =
    has_search || has_email_status || has_account_status || has_date || has_sort;
  const active_filter_count = [
    has_search,
    has_email_status,
    has_account_status,
    has_date,
    has_sort,
  ].filter(Boolean).length;

  function handleSortClick(field: ClientSortField) {
    if (sort_field === field) {
      on_sort_change(field, sort_direction === "asc" ? "desc" : "asc");
    } else {
      on_sort_change(field, "asc");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">

      {/* ── Row 1: Search + result count + active filter badge ── */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            {is_loading && has_search ? (
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
            placeholder="Search by name, email, or organization…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:bg-gray-800"
          />
          {has_search && (
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
            <span className="inline-block h-3 w-14 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span>
              {" "}client{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Active filter badge + clear all */}
        {has_active_filters && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
              {active_filter_count} active
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

      {/* ── Row 2: Email status + Account status pills ── */}
      <div className="flex flex-col gap-x-4 gap-y-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center dark:border-gray-800">

        {/* Email status */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="mr-1 flex shrink-0 items-center gap-1">
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Email</span>
          </div>
          {EMAIL_STATUS_OPTIONS.map((opt) => {
            const is_active = email_status === opt.value;
            return (
              <button
                key={opt.value || "all-email"}
                onClick={() => on_email_status_change(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  is_active
                    ? opt.active_class
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${is_active ? "bg-white/70" : opt.dot_class}`} />
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="hidden h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-700 sm:block" />

        {/* Account status */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="mr-1 flex shrink-0 items-center gap-1">
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Account</span>
          </div>
          {ACCOUNT_STATUS_OPTIONS.map((opt) => {
            const is_active = account_status === opt.value;
            return (
              <button
                key={opt.value || "all-account"}
                onClick={() => on_account_status_change(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  is_active
                    ? opt.active_class
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${is_active ? "bg-white/70" : opt.dot_class}`} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Row 3: Sort pills + Date range ── */}
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

        {/* Sort pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="mr-1 flex shrink-0 items-center gap-1">
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 12h12M9 17h6" />
            </svg>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Sort</span>
          </div>

          {SORT_OPTIONS.map((opt) => {
            const is_active = sort_field === opt.value;
            const direction_label = is_active
              ? sort_direction === "asc"
                ? opt.asc_label
                : opt.desc_label
              : null;

            return (
              <button
                key={opt.value}
                onClick={() => handleSortClick(opt.value)}
                className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ${
                  is_active
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/25 dark:bg-brand-400 dark:text-gray-900"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <span className={`transition-colors ${is_active ? "text-white/80 dark:text-gray-900/70" : "text-gray-400 dark:text-gray-500"}`}>
                  {opt.icon}
                </span>
                {opt.label}

                {/* Active: direction label + animated arrow */}
                {is_active && direction_label && (
                  <>
                    <span className="h-3 w-px bg-white/30 dark:bg-gray-900/20" />
                    <span className="text-[10px] font-normal opacity-90">{direction_label}</span>
                    <svg
                      className={`h-2.5 w-2.5 transition-transform duration-200 ${sort_direction === "desc" ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                )}

                {/* Inactive: ghost arrow on hover */}
                {!is_active && (
                  <svg
                    className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Date range */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">Joined</span>
          </div>

          <FilterDatePicker
            id="client-filter-date-from"
            placeholder="From date"
            value={date_from}
            max_date={date_to || undefined}
            on_change={on_date_from_change}
          />

          <svg className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>

          <FilterDatePicker
            id="client-filter-date-to"
            placeholder="To date"
            value={date_to}
            min_date={date_from || undefined}
            on_change={on_date_to_change}
          />
        </div>
      </div>
    </div>
  );
}
