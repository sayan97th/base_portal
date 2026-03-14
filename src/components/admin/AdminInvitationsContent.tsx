"use client";

import React, { useEffect, useState, useCallback } from "react";
import { invitationService } from "@/services/invitation.service";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/roles";
import type { Invitation, SendInvitationData, ApiError } from "@/types/auth";

const available_roles = [
  { value: ROLES.STAFF, label: "Staff" },
  { value: ROLES.ADMIN, label: "Admin" },
];

export default function AdminInvitationsContent() {
  const { isAdmin } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SendInvitationData>({ email: "", role: ROLES.STAFF });
  const [isSending, setIsSending] = useState(false);
  const [send_error, setSendError] = useState<string | null>(null);
  const [send_success, setSendSuccess] = useState(false);

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await invitationService.listInvitations();
      setInvitations(data);
    } catch {
      setError("Failed to load invitations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(false);
    setIsSending(true);

    try {
      await invitationService.sendInvitation(form);
      setSendSuccess(true);
      setForm({ email: "", role: ROLES.STAFF });
      fetchInvitations();
    } catch (err: unknown) {
      const api_err = err as ApiError;
      setSendError(api_err.message || "Failed to send invitation.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await invitationService.revokeInvitation(id);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch {
      setError("Failed to revoke invitation.");
    }
  };

  const isExpired = (expires_at: string) =>
    new Date(expires_at) < new Date();

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

          <form onSubmit={handleSend} className="flex flex-col gap-4 sm:flex-row sm:items-end">
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
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
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
              disabled={isSending}
              className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Send Invite"}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      {/* Invitations list */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Expires
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 4 }).map((__, j) => (
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
                        colSpan={isAdmin ? 5 : 4}
                        className="px-6 py-8 text-center text-sm text-gray-400"
                      >
                        No invitations sent yet.
                      </td>
                    </tr>
                  )
                  : invitations.map((inv) => {
                      const expired = isExpired(inv.expires_at);
                      const accepted = !!inv.accepted_at;
                      return (
                        <tr
                          key={inv.id}
                          className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {inv.email}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                              {inv.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                accepted
                                  ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                                  : expired
                                    ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                                    : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400"
                              }`}
                            >
                              {accepted ? "Accepted" : expired ? "Expired" : "Pending"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                            {new Date(inv.expires_at).toLocaleDateString()}
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 text-right">
                              {!accepted && (
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
      </div>
    </div>
  );
}
