"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { listAdminClients, banUser, unbanUser } from "@/services/admin/user.service";
import type { AdminUser, ClientSortField, ClientEmailStatusFilter, ClientAccountStatusFilter, SortDirection } from "@/types/admin";
import type { ApiError } from "@/types/auth";
import { useDebounce } from "@/hooks/useDebounce";
import BanUserModal from "@/components/admin/users/BanUserModal";
import ClientFiltersBar from "@/components/admin/clients/ClientFiltersBar";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(first_name: string, last_name: string): string {
  return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
}

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
];

function getAvatarColor(user_id: number): string {
  return AVATAR_COLORS[user_id % AVATAR_COLORS.length];
}

// ── Column header config ───────────────────────────────────────────────────────

type SortableColumn = { key: ClientSortField; label: string; sortable: true };
type NonSortableColumn = { key: string; label: string; sortable: false; align_right?: boolean };
type TableColumn = SortableColumn | NonSortableColumn;

const TABLE_COLUMNS: TableColumn[] = [
  { key: "first_name", label: "Client", sortable: true },
  { key: "organization", label: "Organization", sortable: true },
  { key: "email_status", label: "Email Status", sortable: false },
  { key: "created_at", label: "Joined", sortable: true },
  { key: "actions", label: "Actions", sortable: false, align_right: true },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function ClientAvatar({ user }: { user: AdminUser }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColor(user.id)}`}
    >
      {getInitials(user.first_name, user.last_name)}
    </div>
  );
}

function AccountStatusBadge({ is_active }: { is_active: boolean }) {
  if (is_active) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Disabled
    </span>
  );
}

function SortIndicator({
  column_key,
  sort_field,
  sort_direction,
}: {
  column_key: ClientSortField;
  sort_field: ClientSortField | undefined;
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
        className={`h-2.5 w-2.5 transition-colors ${
          is_active && sort_direction === "asc" ? "text-brand-500" : "text-current"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <svg
        className={`h-2.5 w-2.5 transition-colors ${
          is_active && sort_direction === "desc" ? "text-brand-500" : "text-current"
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

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          <td className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-36 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          </td>
          {Array.from({ length: 3 }).map((__, j) => (
            <td key={j} className="px-5 py-3.5">
              <div className="h-3.5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </td>
          ))}
          <td className="px-5 py-3.5 text-right">
            <div className="ml-auto h-7 w-28 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminClientsContent() {
  const [clients, setClients] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [search_input, setSearchInput] = useState("");
  const [sort_field, setSortField] = useState<ClientSortField | undefined>(undefined);
  const [sort_direction, setSortDirection] = useState<SortDirection>("asc");
  const [email_status, setEmailStatus] = useState<ClientEmailStatusFilter>("");
  const [account_status, setAccountStatus] = useState<ClientAccountStatusFilter>("");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");

  const debounced_search = useDebounce(search_input, 450);

  // ── Ban modal state ──────────────────────────────────────────────────────
  const [ban_target, setBanTarget] = useState<AdminUser | null>(null);
  const [ban_mode, setBanMode] = useState<"ban" | "unban">("ban");
  const [is_ban_loading, setIsBanLoading] = useState(false);
  const [ban_error, setBanError] = useState<string | null>(null);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [debounced_search, sort_field, sort_direction, email_status, account_status, date_from, date_to]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listAdminClients({
      page,
      search: debounced_search,
      sort_field,
      sort_direction,
      email_status: email_status || undefined,
      account_status: account_status || undefined,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
    })
      .then((data) => {
        if (!cancelled) {
          setClients(data.data);
          setLastPage(data.last_page);
          setTotal(data.total);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load clients. Please try again.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, debounced_search, sort_field, sort_direction, email_status, account_status, date_from, date_to]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleColumnSort(field: ClientSortField) {
    if (sort_field === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function handleSortChange(field: ClientSortField, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
  }

  function handleClearAll() {
    setSearchInput("");
    setSortField(undefined);
    setSortDirection("asc");
    setEmailStatus("");
    setAccountStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const openBanModal = (client: AdminUser) => {
    setBanMode(client.is_active ? "ban" : "unban");
    setBanTarget(client);
    setBanError(null);
  };

  const closeBanModal = () => {
    if (!is_ban_loading) setBanTarget(null);
  };

  const handleBanConfirm = async (reason?: string) => {
    if (!ban_target) return;
    setIsBanLoading(true);
    setBanError(null);

    try {
      const response = ban_target.is_active
        ? await banUser(ban_target.id, reason)
        : await unbanUser(ban_target.id);

      setClients((prev) =>
        prev.map((c) => (c.id === ban_target.id ? response.user : c))
      );
      setBanTarget(null);
    } catch (err: unknown) {
      const api_error = err as ApiError;
      setBanError(api_error.message || "Something went wrong. Please try again.");
    } finally {
      setIsBanLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const has_filters =
    debounced_search || email_status || account_status || date_from || date_to;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Clients
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {is_loading
              ? "Loading client accounts…"
              : `${total} registered client${total !== 1 ? "s" : ""} on the platform`}
          </p>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <ClientFiltersBar
        search_value={search_input}
        on_search_change={setSearchInput}
        email_status={email_status}
        on_email_status_change={setEmailStatus}
        account_status={account_status}
        on_account_status_change={setAccountStatus}
        sort_field={sort_field}
        sort_direction={sort_direction}
        on_sort_change={handleSortChange}
        date_from={date_from}
        date_to={date_to}
        on_date_from_change={setDateFrom}
        on_date_to_change={setDateTo}
        total={total}
        is_loading={is_loading}
        on_clear_all={handleClearAll}
      />

      {/* ── Error states ── */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}
      {ban_error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {ban_error}
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
                        onClick={() => handleColumnSort(col.key as ClientSortField)}
                        className="group cursor-pointer select-none px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {col.label}
                          <SortIndicator
                            column_key={col.key as ClientSortField}
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
                        (col as NonSortableColumn).align_right ? "text-right" : "text-left"
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
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        No clients found
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {has_filters
                          ? "Try adjusting your search, filters, or date range."
                          : "Registered client accounts will appear here."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className={`transition-colors hover:bg-gray-50/70 dark:hover:bg-white/2 ${
                      !client.is_active ? "bg-red-50/30 dark:bg-red-500/3" : ""
                    }`}
                  >
                    {/* Client column */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <ClientAvatar user={client} />
                          {!client.is_active && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-1 ring-white dark:ring-gray-900">
                              <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                                <path d="M4 0a4 4 0 100 8A4 4 0 004 0zm1.5 5.5l-1-1-1 1-.7-.7 1-1-1-1 .7-.7 1 1 1-1 .7.7-1 1 1 1-.7.7z" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-gray-900 dark:text-white">
                              {client.first_name} {client.last_name}
                            </p>
                            <AccountStatusBadge is_active={client.is_active} />
                          </div>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {client.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Organization column */}
                    <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                      {client.organization?.name ?? (
                        <span className="text-gray-400 dark:text-gray-600">—</span>
                      )}
                    </td>

                    {/* Email status column */}
                    <td className="px-5 py-3.5">
                      {client.email_verified_at ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Unverified
                        </span>
                      )}
                    </td>

                    {/* Joined column */}
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {new Date(client.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions column */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/users/${client.id}?from=clients`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => openBanModal(client)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-xs transition-colors ${
                            client.is_active
                              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                              : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                          }`}
                        >
                          {client.is_active ? (
                            <>
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              Disable
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                              Enable
                            </>
                          )}
                        </button>
                      </div>
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

      {/* ── Ban / Unban modal ── */}
      {ban_target && (
        <BanUserModal
          user={ban_target}
          mode={ban_mode}
          is_open={!!ban_target}
          is_loading={is_ban_loading}
          onConfirm={handleBanConfirm}
          onClose={closeBanModal}
        />
      )}
    </div>
  );
}
