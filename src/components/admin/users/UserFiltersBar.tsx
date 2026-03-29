"use client";

import React from "react";
import type { UserRoleFilter } from "@/types/admin";
import FilterDatePicker from "@/components/admin/users/FilterDatePicker";

// ── Role config ───────────────────────────────────────────────────────────────

interface RoleOption {
  value: UserRoleFilter;
  label: string;
  dot_class: string;
  active_class: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "",
    label: "All Roles",
    dot_class: "bg-gray-400",
    active_class: "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900",
  },
  {
    value: "super_admin",
    label: "Super Admin",
    dot_class: "bg-violet-500",
    active_class: "bg-violet-500 text-white shadow-sm shadow-violet-500/30",
  },
  {
    value: "admin",
    label: "Admin",
    dot_class: "bg-blue-500",
    active_class: "bg-blue-500 text-white shadow-sm shadow-blue-500/30",
  },
  {
    value: "staff",
    label: "Staff",
    dot_class: "bg-emerald-500",
    active_class: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserFiltersBarProps {
  search_value: string;
  on_search_change: (value: string) => void;
  role_filter: UserRoleFilter;
  on_role_change: (role: UserRoleFilter) => void;
  date_from: string;
  date_to: string;
  on_date_from_change: (value: string) => void;
  on_date_to_change: (value: string) => void;
  total: number;
  is_loading: boolean;
  on_clear_all: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UserFiltersBar({
  search_value,
  on_search_change,
  role_filter,
  on_role_change,
  date_from,
  date_to,
  on_date_from_change,
  on_date_to_change,
  total,
  is_loading,
  on_clear_all,
}: UserFiltersBarProps) {
  const has_search = search_value.length > 0;
  const has_role = role_filter !== "";
  const has_date = date_from.length > 0 || date_to.length > 0;
  const has_active_filters = has_search || has_role || has_date;
  const active_filter_count = [has_search, has_role, has_date].filter(Boolean).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">

      {/* ── Row 1: Search ── */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="relative flex-1">
          {/* Icon: spinner when loading with search, magnifier otherwise */}
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
            placeholder="Search by name or email…"
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
              {" "}user{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Active filter badge + clear */}
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

      {/* ── Row 2: Role filter + Date range ── */}
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

        {/* Role pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">Role</span>
          {ROLE_OPTIONS.map((opt) => {
            const is_active = role_filter === opt.value;
            return (
              <button
                key={opt.value || "all"}
                onClick={() => on_role_change(opt.value)}
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

        {/* Date range */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">Joined</span>

          <FilterDatePicker
            id="user-filter-date-from"
            placeholder="From date"
            value={date_from}
            max_date={date_to || undefined}
            on_change={on_date_from_change}
          />

          <svg className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>

          <FilterDatePicker
            id="user-filter-date-to"
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
