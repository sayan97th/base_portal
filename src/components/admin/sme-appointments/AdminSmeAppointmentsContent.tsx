"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminSmeAppointmentService } from "@/services/admin/sme-appointment.service";
import type {
  AdminAppointment,
  AdminAppointmentFilters,
  AppointmentStatus,
  AppointmentServiceType,
  AppointmentSortField,
  SortDirection,
} from "@/services/admin/sme-appointment.service";
import { useDebounce } from "@/hooks/useDebounce";
import FilterDatePicker from "@/components/admin/users/FilterDatePicker";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: "Pending",
    badge: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
    dot: "bg-warning-500",
  },
  confirmed: {
    label: "Confirmed",
    badge: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    dot: "bg-success-500",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    dot: "bg-error-500",
  },
  completed: {
    label: "Completed",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
};

const SERVICE_TYPE_CONFIG: Record<
  AppointmentServiceType,
  { label: string; badge: string }
> = {
  authored: {
    label: "Authored",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  },
  collaboration: {
    label: "Collaboration",
    badge: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  },
  enhanced: {
    label: "Enhanced",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
};

const SORTABLE_COLS: { field: AppointmentSortField; label: string }[] = [
  { field: "scheduled_at", label: "Scheduled" },
  { field: "created_at", label: "Created" },
  { field: "service_type", label: "Service" },
  { field: "status", label: "Status" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SortIcon({
  field,
  active_field,
  direction,
}: {
  field: AppointmentSortField;
  active_field?: AppointmentSortField;
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
        className={`h-2.5 w-2.5 ${is_active && direction === "asc" ? "text-brand-500" : "text-gray-400"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <svg
        className={`-mt-1 h-2.5 w-2.5 ${is_active && direction === "desc" ? "text-brand-500" : "text-gray-400"}`}
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminSmeAppointmentsContent() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);

  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<AppointmentStatus | "">("");
  const [service_type_filter, setServiceTypeFilter] = useState<AppointmentServiceType | "">("");
  const [sort_field, setSortField] = useState<AppointmentSortField>("scheduled_at");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");

  const debounced_search = useDebounce(search_input, 450);

  const fetchAppointments = useCallback(async (filters: AdminAppointmentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminSmeAppointmentService.fetchAppointments(filters);
      setAppointments(data.data);
      setTotal(data.total);
      setLastPage(data.last_page);
    } catch {
      setError("Failed to load appointments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments({
      page,
      search: debounced_search || undefined,
      status: status_filter || undefined,
      service_type: service_type_filter || undefined,
      sort_field,
      sort_direction,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
    });
  }, [fetchAppointments, page, debounced_search, status_filter, service_type_filter, sort_field, sort_direction, date_from, date_to]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function handleStatusFilter(value: AppointmentStatus | "") {
    setStatusFilter(value);
    setPage(1);
  }

  function handleServiceTypeFilter(value: AppointmentServiceType | "") {
    setServiceTypeFilter(value);
    setPage(1);
  }

  function handleColumnSort(field: AppointmentSortField) {
    if (sort_field === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput("");
    setStatusFilter("");
    setServiceTypeFilter("");
    setSortField("scheduled_at");
    setSortDirection("desc");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const has_active_filters =
    !!search_input || !!status_filter || !!service_type_filter || !!date_from || !!date_to;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            SME Appointments
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {total > 0 ? `${total} total appointments` : "Manage all Subject Matter Expert appointments"}
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search_input}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by client, email, or event..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={status_filter}
          onChange={(e) => handleStatusFilter(e.target.value as AppointmentStatus | "")}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Service type filter */}
        <select
          value={service_type_filter}
          onChange={(e) => handleServiceTypeFilter(e.target.value as AppointmentServiceType | "")}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <option value="">All Services</option>
          <option value="authored">Authored</option>
          <option value="collaboration">Collaboration</option>
          <option value="enhanced">Enhanced</option>
        </select>

        {/* Date range */}
        <FilterDatePicker
          id="date-from"
          placeholder="From date"
          value={date_from}
          max_date={date_to || undefined}
          on_change={(v) => { setDateFrom(v); setPage(1); }}
        />
        <span className="text-xs text-gray-400">–</span>
        <FilterDatePicker
          id="date-to"
          placeholder="To date"
          value={date_to}
          min_date={date_from || undefined}
          on_change={(v) => { setDateTo(v); setPage(1); }}
        />

        {has_active_filters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
          <button onClick={() => fetchAppointments({ page })} className="ml-auto underline underline-offset-2 hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ID
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Client
                </th>
                {SORTABLE_COLS.map(({ field, label }) => (
                  <th
                    key={field}
                    onClick={() => handleColumnSort(field)}
                    className="group cursor-pointer px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <span className="inline-flex items-center">
                      {label}
                      <SortIcon field={field} active_field={sort_field} direction={sort_direction} />
                    </span>
                  </th>
                ))}
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {is_loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                : appointments.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                            <svg className="h-7 w-7 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            No appointments found
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {has_active_filters ? "Try adjusting your search or filters." : "Appointments will appear here once clients schedule sessions."}
                          </p>
                          {has_active_filters && (
                            <button
                              onClick={handleClearFilters}
                              className="mt-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                : appointments.map((apt) => {
                    const status_cfg = STATUS_CONFIG[apt.status];
                    const service_cfg = SERVICE_TYPE_CONFIG[apt.service_type];
                    return (
                      <tr
                        key={apt.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-white/2"
                      >
                        <td className="px-5 py-4">
                          <Link href={`/admin/sme-appointments/${apt.id}`} className="block">
                            <span className="font-mono text-xs font-medium text-gray-500 dark:text-gray-400">
                              #{apt.id}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <Link href={`/admin/sme-appointments/${apt.id}`} className="block">
                            {apt.user ? (
                              <>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {apt.user.first_name} {apt.user.last_name}
                                </p>
                                <p className="text-xs text-gray-400">{apt.user.email}</p>
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <Link href={`/admin/sme-appointments/${apt.id}`} className="block">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {apt.scheduled_at
                                ? new Date(apt.scheduled_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : <span className="text-gray-400">—</span>}
                            </p>
                            {apt.scheduled_at && (
                              <p className="text-xs text-gray-400">
                                {new Date(apt.scheduled_at).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <Link href={`/admin/sme-appointments/${apt.id}`} className="block">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(apt.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <Link href={`/admin/sme-appointments/${apt.id}`} className="block">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${service_cfg.badge}`}>
                              {service_cfg.label}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <Link href={`/admin/sme-appointments/${apt.id}`} className="block">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status_cfg.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
                              {status_cfg.label}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/sme-appointments/${apt.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                          >
                            View
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!is_loading && last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {last_page} &middot; {total} appointments
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
