"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AdminTeam } from "@/types/admin/teams";
import {
  listAdminTeams,
  deleteAdminTeam,
  toggleAdminTeamStatus,
} from "@/services/admin/teams.service";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(date_str: string): string {
  return new Date(date_str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(first_name: string, last_name: string): string {
  return `${first_name[0] ?? ""}${last_name[0] ?? ""}`.toUpperCase();
}

// ── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ is_active }: { is_active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        is_active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30"
          : "bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:ring-gray-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
      {is_active ? "Active" : "Inactive"}
    </span>
  );
}

// ── Team Card ──────────────────────────────────────────────────────────────────

interface TeamCardProps {
  team: AdminTeam;
  toggle_loading: boolean;
  on_view: () => void;
  on_edit: () => void;
  on_delete: () => void;
  on_toggle: () => void;
}

function TeamCard({ team, toggle_loading, on_view, on_edit, on_delete, on_toggle }: TeamCardProps) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:border-gray-200 hover:shadow-md dark:border-gray-800 dark:bg-white/3 dark:hover:border-gray-700">
      {/* Color accent bar */}
      <div className="h-1 w-full" style={{ backgroundColor: team.color }} />

      <div className="flex flex-1 flex-col p-5">
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: team.color }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{team.name}</h3>
              {team.description && (
                <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{team.description}</p>
              )}
            </div>
          </div>
          <StatusBadge is_active={team.is_active} />
        </div>

        {/* Stats row */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span className="font-medium text-gray-700 dark:text-gray-300">{team.members_count}</span>
            <span>{team.members_count === 1 ? "member" : "members"}</span>
          </div>
          {team.creator && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              <span>
                {team.creator.first_name} {team.creator.last_name}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-3 dark:border-gray-800/60">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Created {formatDate(team.created_at)}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={on_toggle}
              disabled={toggle_loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title={team.is_active ? "Deactivate" : "Activate"}
            >
              {toggle_loading ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : team.is_active ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <button
              onClick={on_view}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
              title="View team"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
            <button
              onClick={on_edit}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Edit team"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </button>
            <button
              onClick={on_delete}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              title="Delete team"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Delete Modal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({
  team,
  on_confirm,
  on_cancel,
  is_loading,
}: {
  team: AdminTeam;
  on_confirm: () => void;
  on_cancel: () => void;
  is_loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
          <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Delete Team</h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-300">{team.name}</span>?
          All members will be removed. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={on_cancel}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={on_confirm}
            disabled={is_loading}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {is_loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pagination Controls ────────────────────────────────────────────────────────

function Pagination({
  current_page,
  last_page,
  total,
  per_page,
  on_page_change,
}: {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  on_page_change: (page: number) => void;
}) {
  const from = (current_page - 1) * per_page + 1;
  const to = Math.min(current_page * per_page, total);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Showing <span className="font-medium text-gray-600 dark:text-gray-300">{from}–{to}</span> of{" "}
        <span className="font-medium text-gray-600 dark:text-gray-300">{total}</span> teams
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => on_page_change(current_page - 1)}
          disabled={current_page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        {Array.from({ length: last_page }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === last_page || Math.abs(p - current_page) <= 1)
          .reduce<(number | "...")[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => on_page_change(p as number)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  p === current_page
                    ? "bg-brand-500 text-white"
                    : "border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {p}
              </button>
            )
          )}
        <button
          onClick={() => on_page_change(current_page + 1)}
          disabled={current_page >= last_page}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Content ───────────────────────────────────────────────────────────────

export default function AdminTeamsContent() {
  const router = useRouter();

  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  const [current_page, setCurrentPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const per_page = 12;

  const [search, setSearch] = useState("");
  const [search_input, setSearchInput] = useState("");
  const search_timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deleting, setDeleting] = useState<AdminTeam | null>(null);
  const [delete_loading, setDeleteLoading] = useState(false);
  const [toggle_loading_id, setToggleLoadingId] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const loadTeams = useCallback(
    async (page: number, search_query: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listAdminTeams(page, per_page, search_query);
        setTeams(result.data);
        setCurrentPage(result.current_page);
        setLastPage(result.last_page);
        setTotal(result.total);
      } catch {
        setError("Failed to load teams. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [per_page]
  );

  useEffect(() => {
    loadTeams(current_page, search);
  }, [loadTeams, current_page, search]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (search_timeout.current) clearTimeout(search_timeout.current);
    search_timeout.current = setTimeout(() => {
      setSearch(value);
      setCurrentPage(1);
    }, 400);
  };

  const handleToggle = async (team: AdminTeam) => {
    setToggleLoadingId(team.id);
    try {
      const updated = await toggleAdminTeamStatus(team.id, !team.is_active);
      setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showSuccess(`Team "${updated.name}" ${updated.is_active ? "activated" : "deactivated"}.`);
    } catch {
      setError("Failed to update team status.");
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteAdminTeam(deleting.id);
      setDeleting(null);
      showSuccess(`Team "${deleting.name}" deleted.`);
      loadTeams(teams.length === 1 && current_page > 1 ? current_page - 1 : current_page, search);
    } catch {
      setError("Failed to delete team.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const active_count = teams.filter((t) => t.is_active).length;
  const total_members = teams.reduce((sum, t) => sum + t.members_count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Teams</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Organize your staff into teams to manage access and collaboration.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/teams/new")}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Team
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Teams</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{total}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">across all pages</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Active</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{active_count}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">on this page</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-5 sm:col-span-1 dark:border-gray-800 dark:bg-white/3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Members</p>
          <p className="text-3xl font-bold text-brand-500">{total_members}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">on this page</p>
        </div>
      </div>

      {/* Toasts */}
      {success_message && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{success_message}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
          <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search teams by name or description…"
          value={search_input}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-500 sm:max-w-sm"
        />
      </div>

      {/* Team grid / states */}
      {is_loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="mb-3 h-8 w-8 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm">Loading teams…</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 dark:border-gray-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {search ? "No teams match your search" : "No teams created yet"}
          </p>
          <p className="mb-5 text-xs text-gray-400 dark:text-gray-500">
            {search ? "Try adjusting your search terms." : "Create your first team to start organizing your staff."}
          </p>
          {!search && (
            <button
              onClick={() => router.push("/admin/teams/new")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create First Team
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                toggle_loading={toggle_loading_id === team.id}
                on_view={() => router.push(`/admin/teams/${team.id}`)}
                on_edit={() => router.push(`/admin/teams/${team.id}/edit`)}
                on_delete={() => setDeleting(team)}
                on_toggle={() => handleToggle(team)}
              />
            ))}
          </div>

          {last_page > 1 && (
            <Pagination
              current_page={current_page}
              last_page={last_page}
              total={total}
              per_page={per_page}
              on_page_change={(page) => setCurrentPage(page)}
            />
          )}
        </>
      )}

      {/* Delete modal */}
      {deleting && (
        <ConfirmDeleteModal
          team={deleting}
          on_confirm={handleDelete}
          on_cancel={() => setDeleting(null)}
          is_loading={delete_loading}
        />
      )}
    </div>
  );
}
