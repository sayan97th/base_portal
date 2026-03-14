"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { User } from "@/types/auth";

type UsersResponse = {
  data: User[];
  current_page: number;
  last_page: number;
  total: number;
};

export default function StaffUsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);

  const fetchUsers = useCallback(async (current_page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<UsersResponse>(
        `/api/staff/users?page=${current_page}`
      );
      setUsers(data.data);
      setTotal(data.total);
      setLastPage(data.last_page);
    } catch {
      setError("Failed to load users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page);
  }, [fetchUsers, page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Users
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {total > 0 ? `${total} registered users` : "Manage all platform users"}
          </p>
        </div>
      </div>

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
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                : users.map((user) => {
                    const role_names = user.roles.map((r) =>
                      typeof r === "string" ? r : r.name
                    );
                    return (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {user.first_name} {user.last_name}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {user.email}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {role_names.map((r) => (
                              <span
                                key={r}
                                className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {user.organization?.name ?? (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && last_page > 1 && (
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
