"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import { listAdminContentRefreshOrders } from "@/services/admin/content-refresh.service";
import type { AdminOrder, OrderStatus, PaginatedResponse } from "@/types/admin";
import type { AdminContentRefreshOrderFilters } from "@/types/admin/content-refresh";
import { useDebounce } from "@/hooks/useDebounce";

type StatusFilter = OrderStatus | "";
type SortField = "created_at" | "total_amount" | "status" | "order_title" | "customer";
type SortDirection = "asc" | "desc";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  pending: {
    label: "Pending",
    dot: "bg-warning-500",
    bg: "bg-warning-50 dark:bg-warning-500/10",
    text: "text-warning-700 dark:text-warning-400",
  },
  processing: {
    label: "Processing",
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    dot: "bg-success-500",
    bg: "bg-success-50 dark:bg-success-500/10",
    text: "text-success-700 dark:text-success-400",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-error-500",
    bg: "bg-error-50 dark:bg-error-500/10",
    text: "text-error-700 dark:text-error-400",
  },
};

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// ── Date picker ────────────────────────────────────────────────────────────────

interface DatePickerInputProps {
  value: string;
  placeholder: string;
  max_date?: string;
  min_date?: string;
  on_change: (value: string) => void;
}

function DatePickerInput({ value, placeholder, max_date, min_date, on_change }: DatePickerInputProps) {
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
    return () => fp_ref.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fp_ref.current) return;
    if (value) fp_ref.current.setDate(value, false);
    else fp_ref.current.clear(false);
  }, [value]);

  useEffect(() => { fp_ref.current?.set("maxDate", max_date || undefined); }, [max_date]);
  useEffect(() => { fp_ref.current?.set("minDate", min_date || undefined); }, [min_date]);

  return (
    <div className="relative">
      <input
        ref={input_ref}
        readOnly
        placeholder={placeholder}
        className={`h-9 w-full cursor-pointer rounded-xl border pl-9 pr-3 text-sm transition-colors focus:outline-none focus:ring-3 ${
          value
            ? "border-amber-300 bg-amber-50 text-amber-700 focus:border-amber-400 focus:ring-amber-500/10 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
            : "border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:border-amber-400 focus:ring-amber-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:placeholder-gray-500"
        }`}
      />
      <svg
        className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${value ? "text-amber-500 dark:text-amber-400" : "text-gray-400"}`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
      {value && (
        <button
          type="button"
          onClick={() => on_change("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <tr className="border-b border-gray-100 dark:border-gray-800">
    {[...Array(6)].map((_, i) => (
      <td key={i} className="px-5 py-4">
        <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" style={{ width: i === 1 ? "70%" : i === 4 ? "40%" : "60%" }} />
      </td>
    ))}
  </tr>
);

// ── Stats strip ────────────────────────────────────────────────────────────────

interface StatsStripProps {
  orders: AdminOrder[];
  total_from_api: number;
}

function StatsStrip({ orders, total_from_api }: StatsStripProps) {
  const pending_count = orders.filter((o) => o.status === "pending").length;
  const processing_count = orders.filter((o) => o.status === "processing").length;
  const completed_count = orders.filter((o) => o.status === "completed").length;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/5">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Total:{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{total_from_api}</span>
        </span>
      </div>
      <div className="h-4 w-px bg-amber-200 dark:bg-amber-800" />
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-warning-500" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Pending:{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{pending_count}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Processing:{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{processing_count}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-success-500" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Completed:{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{completed_count}</span>
        </span>
      </div>
    </div>
  );
}

// ── Sort button ────────────────────────────────────────────────────────────────

interface SortButtonProps {
  field: SortField;
  current_field: SortField;
  direction: SortDirection;
  label: string;
  on_sort: (field: SortField) => void;
}

function SortButton({ field, current_field, direction, label, on_sort }: SortButtonProps) {
  const is_active = field === current_field;
  return (
    <button
      type="button"
      onClick={() => on_sort(field)}
      className="flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    >
      {label}
      <span className={`ml-0.5 transition-opacity ${is_active ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>
        {is_active && direction === "asc" ? (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        ) : (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </span>
    </button>
  );
}

function getTotalArticles(order: AdminOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminContentRefreshOrdersContent() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedResponse<AdminOrder>, "data">>({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<StatusFilter>("");
  const [sort_field, setSortField] = useState<SortField>("created_at");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");
  const [current_page, setCurrentPage] = useState(1);

  const debounced_search = useDebounce(search_input, 400);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: AdminContentRefreshOrderFilters = {
        page: current_page,
        per_page: 15,
        sort_field,
        sort_direction,
      };
      if (debounced_search.trim()) filters.search = debounced_search.trim();
      if (status_filter) filters.status = status_filter;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;

      const result = await listAdminContentRefreshOrders(filters);
      setOrders(result.data);
      setPagination({ current_page: result.current_page, last_page: result.last_page, total: result.total });
    } catch {
      setError("Failed to load orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [current_page, sort_field, sort_direction, debounced_search, status_filter, date_from, date_to]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debounced_search, status_filter, sort_field, sort_direction, date_from, date_to]);

  const handleSort = (field: SortField) => {
    if (field === sort_field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const has_active_filters = !!(debounced_search || status_filter || date_from || date_to);

  const clearFilters = () => {
    setSearchInput("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 dark:border-amber-500/30 dark:bg-amber-500/10">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Content Refresh
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Content Refresh Orders</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review and manage client content refresh orders.
          </p>
        </div>
        <Link
          href="/admin/link-building"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/4 dark:text-gray-300 dark:hover:bg-white/[0.07]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Manage Tiers
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <span>{error}</span>
          <button
            onClick={fetchOrders}
            className="ml-4 rounded-lg border border-error-200 px-3 py-1 text-xs font-medium transition-colors hover:bg-error-100 dark:border-error-800 dark:hover:bg-error-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats strip */}
      {!is_loading && !error && (
        <StatsStrip orders={orders} total_from_api={pagination.total} />
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search_input}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by order title or customer..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-amber-400 focus:outline-none focus:ring-3 focus:ring-amber-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  status_filter === f.value
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Date range:</span>
          <div className="flex items-center gap-2">
            <div className="w-40">
              <DatePickerInput
                value={date_from}
                placeholder="From"
                max_date={date_to || undefined}
                on_change={setDateFrom}
              />
            </div>
            <span className="text-gray-300 dark:text-gray-600">–</span>
            <div className="w-40">
              <DatePickerInput
                value={date_to}
                placeholder="To"
                min_date={date_from || undefined}
                on_change={setDateTo}
              />
            </div>
          </div>
          {has_active_filters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Orders table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className="group px-5 py-3.5 text-left">
                  <SortButton field="order_title" current_field={sort_field} direction={sort_direction} label="Order" on_sort={handleSort} />
                </th>
                <th className="group px-5 py-3.5 text-left">
                  <SortButton field="customer" current_field={sort_field} direction={sort_direction} label="Customer" on_sort={handleSort} />
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Articles
                </th>
                <th className="group px-5 py-3.5 text-right">
                  <SortButton field="total_amount" current_field={sort_field} direction={sort_direction} label="Total" on_sort={handleSort} />
                </th>
                <th className="group px-5 py-3.5 text-left">
                  <SortButton field="status" current_field={sort_field} direction={sort_direction} label="Status" on_sort={handleSort} />
                </th>
                <th className="group px-5 py-3.5 text-left">
                  <SortButton field="created_at" current_field={sort_field} direction={sort_direction} label="Placed" on_sort={handleSort} />
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {is_loading ? (
                [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
                        <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">No orders found</p>
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                          {has_active_filters ? "Try adjusting your search or filters." : "Content refresh orders will appear here once placed."}
                        </p>
                      </div>
                      {has_active_filters && (
                        <button
                          onClick={clearFilters}
                          className="mt-1 text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const status_cfg = STATUS_CONFIG[order.status];
                  const total_articles = getTotalArticles(order);

                  return (
                    <tr
                      key={order.id}
                      className="group transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      {/* Order title */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-gray-900 transition-colors group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400">
                            {order.order_title || "—"}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                            {order.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                            {order.user.first_name[0]}{order.user.last_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/80">
                              {order.user.first_name} {order.user.last_name}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{order.user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Articles count */}
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                          {total_articles}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(order.total_amount)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status_cfg.bg} ${status_cfg.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status_cfg.dot} ${order.status === "processing" ? "animate-pulse" : ""}`} />
                          {status_cfg.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(order.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/content-refresh/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 opacity-0 transition-all group-hover:opacity-100 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:border-amber-700 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                        >
                          View
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{pagination.current_page}</span>{" "}
              of{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{pagination.last_page}</span>
              {" "}·{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{pagination.total}</span> orders
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={current_page === 1 || is_loading}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => {
                const page_num = pagination.last_page <= 7
                  ? i + 1
                  : current_page <= 4
                    ? i + 1
                    : current_page >= pagination.last_page - 3
                      ? pagination.last_page - 6 + i
                      : current_page - 3 + i;

                return (
                  <button
                    key={page_num}
                    onClick={() => setCurrentPage(page_num)}
                    disabled={is_loading}
                    className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      page_num === current_page
                        ? "bg-amber-500 text-white shadow-sm"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    {page_num}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={current_page === pagination.last_page || is_loading}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
