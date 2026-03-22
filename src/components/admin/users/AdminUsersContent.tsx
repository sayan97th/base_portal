"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { listAdminUsers, banUser, unbanUser } from "@/services/admin/user.service";
import type { AdminUser } from "@/types/admin";
import type { ApiError } from "@/types/auth";
import BanUserModal from "@/components/admin/users/BanUserModal";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(first_name: string, last_name: string): string {
  return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
];

function getAvatarColor(user_id: number): string {
  return AVATAR_COLORS[user_id % AVATAR_COLORS.length];
}

function getRoleBadgeClass(role_name: string): string {
  switch (role_name) {
    case "super_admin":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20";
    case "admin":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20";
    case "staff":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20";
    default:
      return "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20";
  }
}

function formatRoleLabel(role_name: string): string {
  return role_name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function UserAvatar({ user }: { user: AdminUser }) {
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColor(user.id)}`}>
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

export default function AdminUsersContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Ban modal state ──────────────────────────────────────────────────────
  const [ban_target, setBanTarget] = useState<AdminUser | null>(null);
  const [ban_mode, setBanMode] = useState<"ban" | "unban">("ban");
  const [is_ban_loading, setIsBanLoading] = useState(false);
  const [ban_error, setBanError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listAdminUsers(page, "staff")
      .then((data) => {
        if (!cancelled) {
          setUsers(data.data);
          setLastPage(data.last_page);
          setTotal(data.total);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load users. Please try again.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  const openBanModal = (user: AdminUser) => {
    setBanMode(user.is_active ? "ban" : "unban");
    setBanTarget(user);
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

      setUsers((prev) =>
        prev.map((u) => (u.id === ban_target.id ? response.user : u))
      );
      setBanTarget(null);
    } catch (err: unknown) {
      const api_error = err as ApiError;
      setBanError(api_error.message || "Something went wrong. Please try again.");
    } finally {
      setIsBanLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            App Users
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {is_loading
              ? "Loading internal team accounts…"
              : `${total} internal team member${total !== 1 ? "s" : ""} — admins & staff`}
          </p>
        </div>

        {/* Legend */}
        {!is_loading && (
          <div className="hidden items-center gap-3 sm:flex">
            {[
              { label: "Super Admin", cls: "bg-violet-500" },
              { label: "Admin", cls: "bg-blue-500" },
              { label: "Staff", cls: "bg-emerald-500" },
            ].map(({ label, cls }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className={`h-2 w-2 rounded-full ${cls}`} />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Ban action error ── */}
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
                {["User", "Roles", "Organization", "Joined", "Actions"].map((col) => (
                  <th
                    key={col}
                    className={`px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 ${col === "Actions" ? "text-right" : "text-left"}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {is_loading ? (
                <SkeletonRows />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">No app users found</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Users with admin or staff roles will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`transition-colors hover:bg-gray-50/70 dark:hover:bg-white/2 ${!user.is_active ? "bg-red-50/30 dark:bg-red-500/3" : ""}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <UserAvatar user={user} />
                          {!user.is_active && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-1 ring-white dark:ring-gray-900">
                              <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                                <path d="M4 0a4 4 0 100 8A4 4 0 004 0zm1.5 5.5l-1-1-1 1-.7-.7 1-1-1-1 .7-.7 1 1 1-1 .7.7-1 1 1 1-.7.7z"/>
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-gray-900 dark:text-white">
                              {user.first_name} {user.last_name}
                            </p>
                            <AccountStatusBadge is_active={user.is_active} />
                          </div>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span
                            key={role.id}
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(role.name)}`}
                          >
                            {formatRoleLabel(role.name)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                      {user.organization?.name ?? <span className="text-gray-400 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/5"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => openBanModal(user)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-xs transition-colors ${
                            user.is_active
                              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                              : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                          }`}
                        >
                          {user.is_active ? (
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

        {/* Pagination */}
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
