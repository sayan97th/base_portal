"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import { listAdminOrders } from "@/services/admin/order.service";
import type {
  AdminOrder,
  AdminOrderFilters,
  OrderStatus,
  OrderSortField,
  SortDirection,
} from "@/types/admin";
import { useDebounce } from "@/hooks/useDebounce";
import OrderFiltersBar from "./OrderFiltersBar";

// ── Date picker input ──────────────────────────────────────────────────────────

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
    return () => fp_ref.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fp_ref.current) return;
    if (value) fp_ref.current.setDate(value, false);
    else fp_ref.current.clear(false);
  }, [value]);

  useEffect(() => {
    fp_ref.current?.set("maxDate", max_date || undefined);
  }, [max_date]);

  useEffect(() => {
    fp_ref.current?.set("minDate", min_date || undefined);
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
            : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:border-gray-600"
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

// ── Status styles ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  processing: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  completed: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  cancelled: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
};

// ── Sort icon ──────────────────────────────────────────────────────────────────

type SortableColumn = "order_title" | "status" | "total_amount" | "created_at" | "customer";

function SortIcon({
  field,
  active_field,
  direction,
}: {
  field: SortableColumn;
  active_field: OrderSortField | undefined;
  direction: SortDirection;
}) {
  const is_active = active_field === field;
  return (
    <span className={`ml-1 inline-flex flex-col gap-px ${is_active ? "opacity-100" : "opacity-30 group-hover:opacity-70"}`}>
      <svg
        className={`h-2.5 w-2.5 transition-colors ${is_active && direction === "asc" ? "text-brand-500" : "text-gray-400"}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <svg
        className={`-mt-1 h-2.5 w-2.5 transition-colors ${is_active && direction === "desc" ? "text-brand-500" : "text-gray-400"}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminOrdersContent() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);

  // Filter & sort state
  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<OrderStatus | "">("");
  const [sort_field, setSortField] = useState<OrderSortField | undefined>("created_at");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");

  const debounced_search = useDebounce(search_input, 450);

  const fetchOrders = useCallback(async (filters: AdminOrderFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAdminOrders(filters);
      setOrders(data.data);
      setTotal(data.total);
      setLastPage(data.last_page);
    } catch {
      setError("Failed to load orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders({
      page,
      search: debounced_search,
      status: status_filter || undefined,
      sort_field,
      sort_direction,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
    });
  }, [fetchOrders, page, debounced_search, status_filter, sort_field, sort_direction, date_from, date_to]);

  function handleSearchChange(value: string) { setSearchInput(value); setPage(1); }
  function handleStatusChange(status: OrderStatus | "") { setStatusFilter(status); setPage(1); }
  function handleSortChange(field: OrderSortField, direction: SortDirection) {
    setSortField(field); setSortDirection(direction); setPage(1);
  }
  function handleColumnSort(field: SortableColumn) {
    if (sort_field === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDirection("desc"); }
    setPage(1);
  }
  function handleDateRangeChange(from: string, to: string) {
    setDateFrom(from); setDateTo(to); setPage(1);
  }
  function handleClearAll() {
    setSearchInput(""); setStatusFilter(""); setSortField("created_at");
    setSortDirection("desc"); setDateFrom(""); setDateTo(""); setPage(1);
  }

  const has_date_range = date_from !== "" || date_to !== "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Orders</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage and track all platform orders
        </p>
      </div>

      {/* Filters bar — search, status, sort pills */}
      <OrderFiltersBar
        search_value={search_input}
        on_search_change={handleSearchChange}
        status_filter={status_filter}
        on_status_change={handleStatusChange}
        sort_field={sort_field}
        sort_direction={sort_direction}
        on_sort_change={handleSortChange}
        total={total}
        is_loading={is_loading}
        on_clear_all={handleClearAll}
      />

      {error && (
        <div className="rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

        {/* Date range toolbar — inside the table card */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-3">
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
                on_change={(val) => handleDateRangeChange(val, date_to)}
                is_active={date_from !== ""}
              />

              <svg className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>

              <DatePickerInput
                value={date_to}
                placeholder="To date"
                min_date={date_from || undefined}
                on_change={(val) => handleDateRangeChange(date_from, val)}
                is_active={date_to !== ""}
              />

              {has_date_range && (
                <button
                  onClick={() => handleDateRangeChange("", "")}
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

          {has_date_range && (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              {date_from && date_to
                ? `${date_from} → ${date_to}`
                : date_from
                  ? `From ${date_from}`
                  : `Until ${date_to}`}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("order_title")}
                >
                  <span className="inline-flex items-center">
                    Order
                    <SortIcon field="order_title" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("customer")}
                >
                  <span className="inline-flex items-center">
                    Customer
                    <SortIcon field="customer" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("status")}
                >
                  <span className="inline-flex items-center">
                    Status
                    <SortIcon field="status" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("total_amount")}
                >
                  <span className="inline-flex items-center">
                    Total
                    <SortIcon field="total_amount" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("created_at")}
                >
                  <span className="inline-flex items-center">
                    Date
                    <SortIcon field="created_at" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {is_loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                : orders.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <svg
                            className="h-8 w-8 text-gray-300 dark:text-gray-700"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No orders found</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  )
                  : orders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/2">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{order.order_title}</p>
                        <p className="font-mono text-xs text-gray-400">{order.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        <p>{order.user.first_name} {order.user.last_name}</p>
                        <p className="text-xs text-gray-400">{order.user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        ${order.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!is_loading && last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {last_page}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(last_page, p + 1))}
                disabled={page === last_page}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
