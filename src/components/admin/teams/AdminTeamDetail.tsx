"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { AdminTeamDetail as TeamDetail, AdminTeamMember, AdminTeamMemberRole } from "@/types/admin/teams";
import type { AdminUser } from "@/types/admin";
import {
  getAdminTeam,
  removeAdminTeamMember,
  addAdminTeamMember,
  updateAdminTeamMemberRole,
  deleteAdminTeam,
  fetchStaffUsersForTeam,
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

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({
  photo_url,
  first_name,
  last_name,
  size = "md",
  color,
}: {
  photo_url: string | null;
  first_name: string;
  last_name: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
  if (photo_url) {
    return (
      <img
        src={photo_url}
        alt={`${first_name} ${last_name}`}
        className={`${sizes[size]} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${sizes[size]} shrink-0 inline-flex items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: color ?? "#6366F1" }}
    >
      {getInitials(first_name, last_name)}
    </div>
  );
}

// ── Role Badge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: AdminTeamMemberRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        role === "lead"
          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30"
          : "bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
      }`}
    >
      {role === "lead" ? "Lead" : "Member"}
    </span>
  );
}

// ── Add Member Modal ───────────────────────────────────────────────────────────

function AddMemberModal({
  team_id,
  team_color,
  existing_member_ids,
  on_close,
  on_added,
}: {
  team_id: string;
  team_color: string;
  existing_member_ids: number[];
  on_close: () => void;
  on_added: (team: TeamDetail) => void;
}) {
  const [staff_users, setStaffUsers] = useState<AdminUser[]>([]);
  const [is_loading_users, setIsLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [selected_user, setSelectedUser] = useState<AdminUser | null>(null);
  const [selected_role, setSelectedRole] = useState<AdminTeamMemberRole>("member");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStaffUsersForTeam()
      .then((users) => setStaffUsers(users))
      .catch(() => setError("Failed to load users."))
      .finally(() => setIsLoadingUsers(false));
  }, []);

  const filtered_users = useMemo(() => {
    const q = search.toLowerCase();
    return staff_users.filter((u) => {
      if (existing_member_ids.includes(u.id)) return false;
      if (!q) return true;
      return (
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [staff_users, search, existing_member_ids]);

  const handleAdd = async () => {
    if (!selected_user) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await addAdminTeamMember(team_id, {
        user_id: selected_user.id,
        role: selected_role,
      });
      on_added(updated);
      on_close();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to add member.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Add Team Member</h3>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              Search staff users to add to this team.
            </p>
          </div>
          <button
            onClick={on_close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-gray-100 p-4 dark:border-gray-800">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-2">
          {is_loading_users ? (
            <div className="flex items-center justify-center py-10">
              <svg className="h-6 w-6 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : filtered_users.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {search ? "No users match your search." : "All staff users are already in this team."}
              </p>
            </div>
          ) : (
            filtered_users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUser(selected_user?.id === user.id ? null : user)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  selected_user?.id === user.id
                    ? "bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/30"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Avatar
                  photo_url={user.profile_photo_url ?? null}
                  first_name={user.first_name}
                  last_name={user.last_name}
                  color={team_color}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="truncate text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
                </div>
                {selected_user?.id === user.id && (
                  <svg className="h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>

        {/* Role + actions */}
        {selected_user && (
          <div className="border-t border-gray-100 p-4 dark:border-gray-800">
            <div className="mb-3">
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Role for <span className="text-gray-700 dark:text-gray-200">{selected_user.first_name} {selected_user.last_name}</span>
              </p>
              <div className="flex gap-2">
                {(["member", "lead"] as AdminTeamMemberRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-medium capitalize transition-colors ${
                      selected_role === r
                        ? r === "lead"
                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400"
                          : "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="mb-3 text-xs text-red-500">{error}</p>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={is_submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {is_submitting && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {is_submitting ? "Adding…" : `Add ${selected_user.first_name} as ${selected_role}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Confirm Remove Modal ───────────────────────────────────────────────────────

function ConfirmRemoveMemberModal({
  member,
  on_confirm,
  on_cancel,
  is_loading,
}: {
  member: AdminTeamMember;
  on_confirm: () => void;
  on_cancel: () => void;
  is_loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">Remove Member</h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Remove{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {member.first_name} {member.last_name}
          </span>{" "}
          from this team?
        </p>
        <div className="flex gap-3">
          <button
            onClick={on_cancel}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={on_confirm}
            disabled={is_loading}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {is_loading ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Delete Team Modal ──────────────────────────────────────────────────

function ConfirmDeleteTeamModal({
  team_name,
  on_confirm,
  on_cancel,
  is_loading,
}: {
  team_name: string;
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
          <span className="font-semibold text-gray-700 dark:text-gray-300">{team_name}</span>?
          All members will be removed. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={on_cancel} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={on_confirm} disabled={is_loading} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60">
            {is_loading ? "Deleting…" : "Delete Team"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Detail Component ──────────────────────────────────────────────────────

export default function AdminTeamDetail({ team_id }: { team_id: string }) {
  const router = useRouter();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  const [show_add_modal, setShowAddModal] = useState(false);
  const [removing_member, setRemovingMember] = useState<AdminTeamMember | null>(null);
  const [remove_loading, setRemoveLoading] = useState(false);
  const [role_updating_id, setRoleUpdatingId] = useState<number | null>(null);
  const [show_delete_team, setShowDeleteTeam] = useState(false);
  const [delete_team_loading, setDeleteTeamLoading] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const loadTeam = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminTeam(team_id);
      setTeam(data);
    } catch {
      setError("Failed to load team.");
    } finally {
      setIsLoading(false);
    }
  }, [team_id]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleRemoveMember = async () => {
    if (!removing_member || !team) return;
    setRemoveLoading(true);
    try {
      await removeAdminTeamMember(team.id, removing_member.id);
      setTeam((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((m) => m.id !== removing_member.id),
              members_count: prev.members_count - 1,
            }
          : prev
      );
      setRemovingMember(null);
      showSuccess(`${removing_member.first_name} removed from team.`);
    } catch {
      setError("Failed to remove member.");
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleRoleChange = async (member: AdminTeamMember, new_role: AdminTeamMemberRole) => {
    if (!team) return;
    setRoleUpdatingId(member.id);
    try {
      const updated = await updateAdminTeamMemberRole(team.id, member.id, { role: new_role });
      setTeam(updated);
      showSuccess(`${member.first_name}'s role updated to ${new_role}.`);
    } catch {
      setError("Failed to update role.");
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    setDeleteTeamLoading(true);
    try {
      await deleteAdminTeam(team.id);
      router.push("/admin/teams");
    } catch {
      setError("Failed to delete team.");
      setDeleteTeamLoading(false);
    }
  };

  if (is_loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <svg className="h-8 w-8 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/30 dark:bg-red-500/10">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {error ?? "Team not found."}
          </p>
          <button
            onClick={() => router.push("/admin/teams")}
            className="mt-3 text-sm font-medium text-red-600 underline hover:no-underline dark:text-red-400"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  const existing_member_ids = team.members.map((m) => m.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      {/* Back */}
      <button
        onClick={() => router.push("/admin/teams")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to Teams
      </button>

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

      {/* Team Header Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="h-1.5 w-full" style={{ backgroundColor: team.color }} />
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow"
                style={{ backgroundColor: team.color }}
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      team.is_active
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30"
                        : "bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:ring-gray-700"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${team.is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
                    {team.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {team.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
                )}
              </div>
            </div>

            {/* Edit / Delete buttons */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => router.push(`/admin/teams/${team.id}/edit`)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setShowDeleteTeam(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Delete
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-50 pt-5 dark:border-gray-800/60">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              <span className="font-medium text-gray-600 dark:text-gray-300">{team.members_count}</span>
              <span>{team.members_count === 1 ? "member" : "members"}</span>
            </div>
            {team.creator && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                <span>Created by</span>
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {team.creator.first_name} {team.creator.last_name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <span>{formatDate(team.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-white/3">
        {/* Members header */}
        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4 dark:border-gray-800/60">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Members</h2>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {team.members.length} {team.members.length === 1 ? "person" : "people"} on this team
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Member
          </button>
        </div>

        {/* Members list */}
        {team.members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No members yet</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Add staff members to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {team.members.map((member) => (
              <div
                key={member.id}
                className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/2"
              >
                <Avatar
                  photo_url={member.profile_photo_url}
                  first_name={member.first_name}
                  last_name={member.last_name}
                  size="md"
                  color={team.color}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {member.first_name} {member.last_name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <p className="truncate text-xs text-gray-400 dark:text-gray-500">{member.email}</p>
                    {member.job_title && (
                      <>
                        <span className="text-gray-300 dark:text-gray-700">·</span>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{member.job_title}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Role selector */}
                <div className="flex shrink-0 items-center gap-3">
                  <div className="relative">
                    {role_updating_id === member.id ? (
                      <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value as AdminTeamMemberRole)}
                        className="appearance-none rounded-lg border border-gray-200 bg-transparent py-1 pl-2 pr-6 text-xs font-medium text-gray-600 outline-none transition-colors hover:border-gray-300 focus:border-brand-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
                      >
                        <option value="member">Member</option>
                        <option value="lead">Lead</option>
                      </select>
                    )}
                  </div>

                  <span className="text-xs text-gray-300 dark:text-gray-600">
                    Joined {formatDate(member.joined_at)}
                  </span>

                  <button
                    onClick={() => setRemovingMember(member)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    title="Remove member"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {show_add_modal && (
        <AddMemberModal
          team_id={team.id}
          team_color={team.color}
          existing_member_ids={existing_member_ids}
          on_close={() => setShowAddModal(false)}
          on_added={(updated) => setTeam(updated)}
        />
      )}
      {removing_member && (
        <ConfirmRemoveMemberModal
          member={removing_member}
          on_confirm={handleRemoveMember}
          on_cancel={() => setRemovingMember(null)}
          is_loading={remove_loading}
        />
      )}
      {show_delete_team && (
        <ConfirmDeleteTeamModal
          team_name={team.name}
          on_confirm={handleDeleteTeam}
          on_cancel={() => setShowDeleteTeam(false)}
          is_loading={delete_team_loading}
        />
      )}
    </div>
  );
}
