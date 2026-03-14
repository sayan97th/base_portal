"use client";

import React, { useEffect, useState, useCallback } from "react";
import { listRoles } from "@/services/admin/roleService";
import type { RoleWithPermissions } from "@/services/admin/types";

export default function AdminRolesContent() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listRoles();
      setRoles(data.roles);
    } catch {
      setError("Failed to load roles. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Roles &amp; Permissions
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View all roles and their associated permissions.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          No roles found.
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {role.display_name}
                </h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {role.name}
                </span>
              </div>
              {role.description && (
                <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                  {role.description}
                </p>
              )}
              {role.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((perm) => (
                    <span
                      key={perm.id}
                      title={perm.name}
                      className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                    >
                      {perm.display_name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No permissions assigned.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
