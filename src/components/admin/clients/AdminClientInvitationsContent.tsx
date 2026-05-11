"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  listClientInvitations,
  revokeClientInvitation,
  resendClientInvitation,
} from "@/services/admin/client-invitation.service";
import type {
  ClientInvitation,
  ClientInvitationStatus,
  ClientInvitationSortField,
  SortDirection,
} from "@/types/admin";
import type { ApiError } from "@/types/auth";
import { useDebounce } from "@/hooks/useDebounce";
import SendClientInvitationModal from "@/components/admin/clients/SendClientInvitationModal";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRelativeExpiry(iso: string): string {
  const diff_ms = new Date(iso).getTime() - Date.now();
  if (diff_ms <= 0) return "Expired";
  const diff_days = Math.ceil(diff_ms / (1000 * 60 * 60 * 24));
  if (diff_days === 1) return "Expires in 1 day";
  return `Expires in ${diff_days} days`;
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ClientInvitationStatus }) {
  const configs: Record<
    ClientInvitationStatus,
    { label: string; dot_class: string; badge_class: string }
  > = {
    pending: {
      label: "Pending",
      dot_class: "bg-teal-500",
      badge_class:
        "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/20",
    },
    expired: {
      label: "Expired",
      dot_class: "bg-amber-500",
      badge_class:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    },
    accepted: {
      label: "Accepted",
      dot_class: "bg-emerald-500",
      badge_class:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    },
  };
  const { label, dot_class, badge_class } = configs[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${badge_class}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot_class}`} />
      {label}
    </span>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          <td className="px-5 py-3.5">
            <div className="h-3.5 w-44 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="px-5 py-3.5">
            <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="px-5 py-3.5">
            <div className="space-y-1.5">
              <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </td>
          <td className="px-5 py-3.5">
            <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="px-5 py-3.5">
            <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="px-5 py-3.5 text-right">
            <div className="ml-auto h-7 w-36 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Sort indicator ─────────────────────────────────────────────────────────────

function SortIndicator({
  column_key,
  sort_field,
  sort_direction,
}: {
  column_key: ClientInvitationSortField;
  sort_field: ClientInvitationSortField | undefined;
  sort_direction: SortDirection;
}) {
  const is_active = sort_field === column_key;
  return (
    <span
      className={`ml-1 inline-flex flex-col gap-px transition-opacity ${
        is_active ? "opacity-100" : "opacity-30 group-hover:opacity-60"
      }`}
    >
      <svg
        className={`h-2.5 w-2.5 ${is_active && sort_direction === "asc" ? "text-brand-500" : "text-current"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <svg
        className={`h-2.5 w-2.5 ${is_active && sort_direction === "desc" ? "text-brand-500" : "text-current"}`}
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

// ── Confirm dialog ─────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  is_open: boolean;
  title: string;
  description: string;
  confirm_label: string;
  confirm_class: string;
  is_loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmDialog({
  is_open,
  title,
  description,
  confirm_label,
  confirm_class,
  is_loading,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!is_open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!is_loading ? onClose : undefined} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="px-6 py-5">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={is_loading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={is_loading}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 ${confirm_class}`}
          >
            {is_loading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {confirm_label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status filter tabs ─────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: ClientInvitationStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "accepted", label: "Accepted" },
];

// ── Sortable columns ───────────────────────────────────────────────────────────

type SortableCol = { key: ClientInvitationSortField; label: string; sortable: true };
type StaticCol = { key: string; label: string; sortable: false; align_right?: boolean };
type TableCol = SortableCol | StaticCol;

const TABLE_COLUMNS: TableCol[] = [
  { key: "email", label: "Email", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "expires_at", label: "Expires", sortable: true },
  { key: "invited_by_name", label: "Invited By", sortable: false },
  { key: "created_at", label: "Sent", sortable: true },
  { key: "actions", label: "Actions", sortable: false, align_right: true },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminClientInvitationsContent() {
  const [invitations, setInvitations] = useState<ClientInvitation[]>([]);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<ClientInvitationStatus | "">("");
  const [sort_field, setSortField] = useState<ClientInvitationSortField | undefined>(undefined);
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");

  const debounced_search = useDebounce(search_input, 450);

  const [show_send_modal, setShowSendModal] = useState(false);
  const [refresh_counter, setRefreshCounter] = useState(0);

  const [revoke_target, setRevokeTarget] = useState<ClientInvitation | null>(null);
  const [is_revoking, setIsRevoking] = useState(false);
  const [revoke_error, setRevokeError] = useState<string | null>(null);

  const [resend_target, setResendTarget] = useState<ClientInvitation | null>(null);
  const [is_resending, setIsResending] = useState(false);
  const [resend_error, setResendError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debounced_search, status_filter, sort_field, sort_direction, date_from, date_to]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listClientInvitations({
      page,
      search: debounced_search,
      status: status_filter || undefined,
      sort_field,
      sort_direction,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
    })
      .then((data) => {
        if (!cancelled) {
          setInvitations(data.data);
          setLastPage(data.last_page);
          setTotal(data.total);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load invitations. Please try again.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, debounced_search, status_filter, sort_field, sort_direction, date_from, date_to, refresh_counter]);

  function handleColumnSort(field: ClientInvitationSortField) {
    if (sort_field === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function handleClearFilters() {
    setSearchInput("");
    setStatusFilter("");
    setSortField(undefined);
    setSortDirection("desc");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const handleRevokeConfirm = async () => {
    if (!revoke_target) return;
    setIsRevoking(true);
    setRevokeError(null);
    try {
      await revokeClientInvitation(revoke_target.id);
      setInvitations((prev) => prev.filter((inv) => inv.id !== revoke_target.id));
      setTotal((t) => t - 1);
      setRevokeTarget(null);
    } catch (err: unknown) {
      const api_error = err as ApiError;
      setRevokeError(api_error.message || "Failed to revoke invitation.");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleResendConfirm = async () => {
    if (!resend_target) return;
    setIsResending(true);
    setResendError(null);
    try {
      const { invitation } = await resendClientInvitation(resend_target.id);
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === invitation.id ? invitation : inv))
      );
      setResendTarget(null);
    } catch (err: unknown) {
      const api_error = err as ApiError;
      setResendError(api_error.message || "Failed to resend invitation.");
    } finally {
      setIsResending(false);
    }
  };

  const has_active_filters = !!(debounced_search || status_filter || date_from || date_to);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/clients"
              className="text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              Clients
            </Link>
            <svg className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invitations</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
            Client Invitations
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {is_loading
              ? "Loading invitations…"
              : `${total} invitation${total !== 1 ? "s" : ""} sent`}
          </p>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Send Invitation
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="space-y-3">
        {/* Status tabs + search row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  status_filter === value
                    ? "bg-teal-600 text-white dark:bg-teal-500"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search_input}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3.5 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
            />
          </div>

          {/* Date from */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">From</label>
            <input
              type="date"
              value={date_from}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">To</label>
            <input
              type="date"
              value={date_to}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
            />
          </div>

          {has_active_filters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/40">
                {TABLE_COLUMNS.map((col) => {
                  if (col.sortable) {
                    const is_sorted = sort_field === col.key;
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleColumnSort(col.key as ClientInvitationSortField)}
                        className="group cursor-pointer select-none px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {col.label}
                          <SortIndicator
                            column_key={col.key as ClientInvitationSortField}
                            sort_field={sort_field}
                            sort_direction={sort_direction}
                          />
                          {is_sorted && (
                            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-500/10 text-brand-500 dark:bg-brand-400/10 dark:text-brand-400">
                              <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  }
                  return (
                    <th
                      key={col.key}
                      className={`px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 ${
                        (col as StaticCol).align_right ? "text-right" : "text-left"
                      }`}
                    >
                      {col.label}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {is_loading ? (
                <SkeletonRows />
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        No invitations found
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {has_active_filters
                          ? "Try adjusting your search or filters."
                          : "Send your first client invitation to get started."}
                      </p>
                      {!has_active_filters && (
                        <button
                          onClick={() => setShowSendModal(true)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Send Invitation
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr
                    key={inv.id}
                    className="transition-colors hover:bg-gray-50/70 dark:hover:bg-white/2"
                  >
                    {/* Email */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{inv.email}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>

                    {/* Expires */}
                    <td className="px-5 py-3.5">
                      {inv.status === "accepted" ? (
                        <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {formatDate(inv.expires_at)}
                          </p>
                          <p
                            className={`mt-0.5 text-xs ${
                              inv.status === "expired"
                                ? "text-amber-500"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {inv.status === "expired" ? "Expired" : getRelativeExpiry(inv.expires_at)}
                          </p>
                        </div>
                      )}
                    </td>

                    {/* Invited by */}
                    <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                      {inv.inviter ? (
                        <span>
                          {inv.inviter.first_name} {inv.inviter.last_name}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>

                    {/* Sent date */}
                    <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                      {inv.status === "accepted" && inv.accepted_at ? (
                        <div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Accepted</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(inv.accepted_at)}</p>
                        </div>
                      ) : (
                        formatDateTime(inv.created_at)
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      {inv.status === "accepted" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                          Account created
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              setResendTarget(inv);
                              setResendError(null);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Resend
                          </button>
                          <button
                            onClick={() => {
                              setRevokeTarget(inv);
                              setRevokeError(null);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 shadow-xs transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Revoke
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!is_loading && last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{page}</span>
              {" "}of{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{last_page}</span>
              {" "}&middot; {total} total
            </p>
            <div className="flex gap-1.5">
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

      {/* ── Revoke confirm ── */}
      <ConfirmDialog
        is_open={!!revoke_target}
        title="Revoke invitation?"
        description={`The invitation sent to ${revoke_target?.email ?? ""} will be permanently revoked. They will no longer be able to use the invitation link.`}
        confirm_label={is_revoking ? "Revoking…" : "Revoke"}
        confirm_class="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        is_loading={is_revoking}
        error={revoke_error}
        onConfirm={handleRevokeConfirm}
        onClose={() => !is_revoking && setRevokeTarget(null)}
      />

      {/* ── Resend confirm ── */}
      <ConfirmDialog
        is_open={!!resend_target}
        title="Resend invitation?"
        description={`A new invitation email will be sent to ${resend_target?.email ?? ""}. The invitation will be reset with a new 7-day expiration.`}
        confirm_label={is_resending ? "Sending…" : "Resend"}
        confirm_class="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
        is_loading={is_resending}
        error={resend_error}
        onConfirm={handleResendConfirm}
        onClose={() => !is_resending && setResendTarget(null)}
      />

      {/* ── Send invitation modal ── */}
      <SendClientInvitationModal
        is_open={show_send_modal}
        onClose={() => setShowSendModal(false)}
        onSuccess={() => {
          setShowSendModal(false);
          setPage(1);
          setRefreshCounter((c) => c + 1);
        }}
      />
    </div>
  );
}
