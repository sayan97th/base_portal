"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listAdminInvoices } from "@/services/admin/invoice.service";
import type {
  AdminInvoice,
  AdminInvoiceFilters,
  InvoiceStatus,
  InvoiceSortField,
  SortDirection,
} from "@/types/admin";
import { useDebounce } from "@/hooks/useDebounce";
import InvoiceFiltersBar from "./InvoiceFiltersBar";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  paid: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  void: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
};

type SortableColumn = "invoice_number" | "customer" | "status" | "total_amount" | "date_issued";

function SortIcon({
  field,
  active_field,
  direction,
}: {
  field: SortableColumn;
  active_field: InvoiceSortField | undefined;
  direction: SortDirection;
}) {
  const is_active = active_field === field;
  return (
    <span
      className={`ml-1 inline-flex flex-col gap-px transition-opacity ${
        is_active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
      }`}
    >
      <svg
        className={`h-2.5 w-2.5 transition-colors ${
          is_active && direction === "asc" ? "text-brand-500" : "text-gray-400"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <svg
        className={`-mt-1 h-2.5 w-2.5 transition-colors ${
          is_active && direction === "desc" ? "text-brand-500" : "text-gray-400"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
}

export default function AdminInvoicesContent() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);

  // Filter & sort state
  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [sort_field, setSortField] = useState<InvoiceSortField | undefined>("date_issued");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");

  // Debounce the search so we don't fire a request on every keystroke
  const debounced_search = useDebounce(search_input, 450);

  const fetchInvoices = useCallback(async (filters: AdminInvoiceFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAdminInvoices(filters);
      setInvoices(data.data);
      setTotal(data.total);
      setLastPage(data.last_page);
    } catch {
      setError("Failed to load invoices. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch whenever page, debounced search, status, sort, or date range changes
  useEffect(() => {
    fetchInvoices({
      page,
      search: debounced_search,
      status: status_filter || undefined,
      sort_field,
      sort_direction,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
    });
  }, [fetchInvoices, page, debounced_search, status_filter, sort_field, sort_direction, date_from, date_to]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function handleStatusChange(status: InvoiceStatus | "") {
    setStatusFilter(status);
    setPage(1);
  }

  function handleSortChange(field: InvoiceSortField, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(1);
  }

  function handleColumnSort(field: SortableColumn) {
    if (sort_field === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(1);
  }

  function handleDateRangeChange(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
  }

  function handleClearAll() {
    setSearchInput("");
    setStatusFilter("");
    setSortField("date_issued");
    setSortDirection("desc");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {total > 0 ? `${total} total invoices` : "Manage all platform invoices"}
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/invoices/create")}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98] dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Generate Invoice
        </button>
      </div>

      {/* Filters */}
      <InvoiceFiltersBar
        search_value={search_input}
        on_search_change={handleSearchChange}
        status_filter={status_filter}
        on_status_change={handleStatusChange}
        sort_field={sort_field}
        sort_direction={sort_direction}
        on_sort_change={handleSortChange}
        date_from={date_from}
        date_to={date_to}
        on_date_range_change={handleDateRangeChange}
        total={total}
        is_loading={is_loading}
        on_clear_all={handleClearAll}
      />

      {error && (
        <div className="rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                {/* Invoice — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("invoice_number")}
                >
                  <span className="inline-flex items-center">
                    Invoice
                    <SortIcon field="invoice_number" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                {/* Customer — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("customer")}
                >
                  <span className="inline-flex items-center">
                    Customer
                    <SortIcon field="customer" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                {/* Status — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("status")}
                >
                  <span className="inline-flex items-center">
                    Status
                    <SortIcon field="status" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Payment Method
                </th>

                {/* Total — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("total_amount")}
                >
                  <span className="inline-flex items-center">
                    Total
                    <SortIcon field="total_amount" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                {/* Date Issued — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("date_issued")}
                >
                  <span className="inline-flex items-center">
                    Date Issued
                    <SortIcon field="date_issued" active_field={sort_field} direction={sort_direction} />
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
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                : invoices.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <svg
                            className="h-8 w-8 text-gray-300 dark:text-gray-700"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            No invoices found
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                  : invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/2"
                    >
                      <td className="px-6 py-4">
                        <Link href={`/admin/invoices/${invoice.unique_id}`} className="block">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {invoice.invoice_number}
                          </p>
                          <p className="font-mono text-xs text-gray-400">
                            {invoice.unique_id}
                          </p>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        <Link href={`/admin/invoices/${invoice.unique_id}`} className="block">
                          <p>{invoice.user.first_name} {invoice.user.last_name}</p>
                          <p className="text-xs text-gray-400">{invoice.user.email}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/admin/invoices/${invoice.unique_id}`} className="block">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[invoice.status]}`}>
                            {invoice.status}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        <Link href={`/admin/invoices/${invoice.unique_id}`} className="block">
                          {invoice.payment_method}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        <Link href={`/admin/invoices/${invoice.unique_id}`} className="block">
                          ${invoice.total_amount.toFixed(2)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        <Link href={`/admin/invoices/${invoice.unique_id}`} className="block">
                          {invoice.date_issued
                            ? new Date(invoice.date_issued).toLocaleDateString()
                            : <span className="text-gray-400">—</span>}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/invoices/${invoice.unique_id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                        >
                          View Details
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
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
