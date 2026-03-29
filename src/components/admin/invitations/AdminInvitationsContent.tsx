"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  listAdminInvitations,
  sendAdminInvitation,
  revokeAdminInvitation,
} from "@/services/admin/invitation.service";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/roles";
import { useDebounce } from "@/hooks/useDebounce";
import type {
  AdminInvitation,
  AdminInvitationFilters,
  InvitationRole,
  InvitationSortField,
  InvitationStatus,
  SendAdminInvitationData,
  SortDirection,
} from "@/types/admin";
import type { ApiError } from "@/types/auth";
import InvitationFiltersBar from "./InvitationFiltersBar";

// ── Constants ─────────────────────────────────────────────────────────────────

const available_roles = [
  { value: ROLES.STAFF, label: "Staff" },
  { value: ROLES.ADMIN, label: "Admin" },
];

// ── Sort icon for table headers ────────────────────────────────────────────────

type SortableHeader = InvitationSortField;

function SortIcon({
  field,
  active_field,
  direction,
}: {
  field: SortableHeader;
  active_field: InvitationSortField | undefined;
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminInvitationsContent() {
  const { isAdmin } = useAuth();

  // Table data
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);

  // Filter & sort state
  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<InvitationStatus | "">("");
  const [role_filter, setRoleFilter] = useState<InvitationRole | "">("");
  const [sort_field, setSortField] = useState<InvitationSortField | undefined>("created_at");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");

  // Debounce search — avoids firing a request on every keystroke
  const debounced_search = useDebounce(search_input, 450);

  // Send invitation form
  const [form, setForm] = useState<SendAdminInvitationData>({ email: "", role: "staff" });
  const [is_sending, setIsSending] = useState(false);
  const [send_error, setSendError] = useState<string | null>(null);
  const [send_success, setSendSuccess] = useState(false);
  const [show_confirm_dialog, setShowConfirmDialog] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchInvitations = useCallback(async (filters: AdminInvitationFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAdminInvitations(filters);
      setInvitations(data.data);
      setTotal(data.total);
      setLastPage(data.last_page);
    } catch {
      setError("Failed to load invitations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations({
      page,
      search: debounced_search,
      status: status_filter || undefined,
      role: role_filter || undefined,
      sort_field,
      sort_direction,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
    });
  }, [fetchInvitations, page, debounced_search, status_filter, role_filter, sort_field, sort_direction, date_from, date_to]);

  // ── Filter handlers ────────────────────────────────────────────────────────

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function handleStatusChange(status: InvitationStatus | "") {
    setStatusFilter(status);
    setPage(1);
  }

  function handleRoleChange(role: InvitationRole | "") {
    setRoleFilter(role);
    setPage(1);
  }

  function handleSortChange(field: InvitationSortField, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(1);
  }

  function handleColumnSort(field: InvitationSortField) {
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
    setRoleFilter("");
    setSortField("created_at");
    setSortDirection("desc");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  // ── Send invitation handlers ───────────────────────────────────────────────

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmDialog(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmDialog(false);
    setSendError(null);
    setSendSuccess(false);
    setIsSending(true);

    try {
      await sendAdminInvitation(form);
      setSendSuccess(true);
      setForm({ email: "", role: "staff" });
      fetchInvitations({
        page,
        search: debounced_search,
        status: status_filter || undefined,
        role: role_filter || undefined,
        sort_field,
        sort_direction,
        date_from: date_from || undefined,
        date_to: date_to || undefined,
      });
    } catch (err: unknown) {
      const api_err = err as ApiError;
      setSendError(api_err.message || "Failed to send invitation.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await revokeAdminInvitation(id);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      setError("Failed to revoke invitation.");
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isExpired = (expires_at: string) => new Date(expires_at) < new Date();

  const getInvitationStatus = (inv: AdminInvitation): InvitationStatus => {
    if (inv.accepted_at) return "accepted";
    if (isExpired(inv.expires_at)) return "expired";
    return "pending";
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Team Invitations
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Invite new staff members to the platform. Only invited users can
          register as staff or admin.
        </p>
      </div>

      {/* Send invitation form — admins only */}
      {isAdmin && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
            Send Invitation
          </h2>

          {send_success && (
            <div className="mb-4 rounded-lg bg-success-50 p-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
              Invitation sent successfully.
            </div>
          )}
          {send_error && (
            <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              {send_error}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="invite_email"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email address
              </label>
              <input
                id="invite_email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="colleague@company.com"
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
            <div className="w-full sm:w-48">
              <label
                htmlFor="invite_role"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Role
              </label>
              <select
                id="invite_role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as InvitationRole }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {available_roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={is_sending}
              className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {is_sending ? "Sending..." : "Send Invite"}
            </button>
          </form>
        </div>
      )}

      {/* Filters bar */}
      <InvitationFiltersBar
        search_value={search_input}
        on_search_change={handleSearchChange}
        status_filter={status_filter}
        on_status_change={handleStatusChange}
        role_filter={role_filter}
        on_role_change={handleRoleChange}
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

      {/* Invitations table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">

                {/* Email — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("email")}
                >
                  <span className="inline-flex items-center">
                    Email
                    <SortIcon field="email" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                {/* Role — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("role")}
                >
                  <span className="inline-flex items-center">
                    Role
                    <SortIcon field="role" active_field={sort_field} direction={sort_direction} />
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

                {/* Invited by */}
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Invited By
                </th>

                {/* Invited At — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("created_at")}
                >
                  <span className="inline-flex items-center">
                    Invited At
                    <SortIcon field="created_at" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                {/* Expires — sortable */}
                <th
                  className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => handleColumnSort("expires_at")}
                >
                  <span className="inline-flex items-center">
                    Expires
                    <SortIcon field="expires_at" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>

                {isAdmin && (
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {is_loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: isAdmin ? 7 : 6 }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                : invitations.length === 0
                  ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 7 : 6}
                        className="px-6 py-12 text-center"
                      >
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
                              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0L12 13.5 2.25 6.75"
                            />
                          </svg>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            No invitations found
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                  : invitations.map((inv) => {
                    const status = getInvitationStatus(inv);
                    return (
                      <tr
                        key={inv.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        {/* Email */}
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {inv.email}
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            inv.role === "admin"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                              : "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              inv.role === "admin" ? "bg-purple-500" : "bg-brand-500"
                            }`} />
                            {inv.role === "admin" ? "Admin" : "Staff"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              status === "accepted"
                                ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                                : status === "expired"
                                  ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                                  : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              status === "accepted"
                                ? "bg-success-500"
                                : status === "expired"
                                  ? "bg-error-500"
                                  : "bg-warning-500"
                            }`} />
                            {status === "accepted" ? "Accepted" : status === "expired" ? "Expired" : "Pending"}
                          </span>
                        </td>

                        {/* Invited By */}
                        <td className="px-6 py-4">
                          {inv.inviter ? (
                            <div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {inv.inviter.first_name} {inv.inviter.last_name}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {inv.inviter.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Invited At */}
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </td>

                        {/* Expires */}
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            {status === "pending" && (
                              <button
                                onClick={() => handleRevoke(inv.id)}
                                className="text-xs font-medium text-error-500 transition-colors hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!is_loading && last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {last_page} &middot; {total} total
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

      {/* Confirmation dialog */}
      {show_confirm_dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowConfirmDialog(false)}
          />
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
              <svg
                className="h-6 w-6 text-brand-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0L12 13.5 2.25 6.75"
                />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Confirm Invitation
            </h3>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              You&apos;re about to send an invitation to{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {form.email}
              </span>{" "}
              granting them access to the administration panel as a{" "}
              <span className="font-medium capitalize text-brand-600 dark:text-brand-400">
                {form.role}
              </span>
              .
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Once accepted, they will become an active member of this
              organization.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                Yes, send invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
