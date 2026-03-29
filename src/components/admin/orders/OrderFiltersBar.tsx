"use client";

import React from "react";
import type { OrderStatus, OrderSortField, SortDirection } from "@/types/admin";

interface SortOption {
  field: OrderSortField;
  label: string;
  icon: React.ReactNode;
}

const SORT_OPTIONS: SortOption[] = [
  {
    field: "created_at",
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
    field: "order_title",
    label: "Title",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
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

const STATUS_OPTIONS: { value: OrderStatus | ""; label: string; dot_class: string }[] = [
  { value: "", label: "All", dot_class: "bg-gray-400" },
  { value: "pending", label: "Pending", dot_class: "bg-warning-500" },
  { value: "processing", label: "Processing", dot_class: "bg-brand-500" },
  { value: "completed", label: "Completed", dot_class: "bg-success-500" },
  { value: "cancelled", label: "Cancelled", dot_class: "bg-error-500" },
];

interface OrderFiltersBarProps {
  search_value: string;
  on_search_change: (value: string) => void;
  status_filter: OrderStatus | "";
  on_status_change: (status: OrderStatus | "") => void;
  sort_field: OrderSortField | undefined;
  sort_direction: SortDirection;
  on_sort_change: (field: OrderSortField, direction: SortDirection) => void;
  total: number;
  is_loading: boolean;
  on_clear_all: () => void;
}

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

export default function OrderFiltersBar({
  search_value,
  on_search_change,
  status_filter,
  on_status_change,
  sort_field,
  sort_direction,
  on_sort_change,
  total,
  is_loading,
  on_clear_all,
}: OrderFiltersBarProps) {
  const has_active_filters =
    search_value.length > 0 || status_filter !== "" || sort_field !== undefined;

  function handleSortClick(field: OrderSortField) {
    if (sort_field === field) {
      on_sort_change(field, sort_direction === "asc" ? "desc" : "asc");
    } else {
      on_sort_change(field, "desc");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Search row */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            {is_loading && search_value.length > 0 ? (
              <svg
                className="h-4 w-4 animate-spin text-brand-500"
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
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={search_value}
            onChange={(e) => on_search_change(e.target.value)}
            placeholder="Search by order title, customer name, or email…"
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

        {/* Total count */}
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {is_loading ? (
              <span className="inline-block h-3 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            ) : (
              <span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span>
                {" "}order{total !== 1 ? "s" : ""}
              </span>
            )}
          </span>
        </div>

        {/* Clear all */}
        {has_active_filters && (
          <button
            onClick={on_clear_all}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status pills */}
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-gray-400 dark:text-gray-500">
            Status
          </span>
          <div className="flex flex-wrap gap-1">
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
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      is_active ? "bg-white/70" : opt.dot_class
                    }`}
                  />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-gray-400 dark:text-gray-500">
            Sort by
          </span>
          <div className="flex flex-wrap gap-1">
            {SORT_OPTIONS.map((opt) => {
              const is_active = sort_field === opt.field;
              return (
                <button
                  key={opt.field}
                  onClick={() => handleSortClick(opt.field)}
                  className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    is_active
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className={`${is_active ? "text-white dark:text-gray-900" : "text-gray-400"}`}>
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
      </div>
    </div>
  );
}
