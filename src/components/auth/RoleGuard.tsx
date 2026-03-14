"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import type { RoleName } from "@/lib/roles";

type RoleGuardProps = {
  /** One or more roles — the user must have at least one of them (OR logic). */
  roles?: RoleName[];
  /** One or more permissions — the user must have ALL of them (AND logic). */
  permissions?: string[];
  /** Rendered when the user does not satisfy the guard. Defaults to null. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Conditionally renders children based on the current user's roles or permissions.
 *
 * @example — role-based
 * <RoleGuard roles={["admin", "staff"]}>
 *   <AdminMenu />
 * </RoleGuard>
 *
 * @example — permission-based
 * <RoleGuard permissions={["users.manage"]} fallback={<p>Access denied</p>}>
 *   <UsersTable />
 * </RoleGuard>
 */
export default function RoleGuard({
  roles,
  permissions,
  fallback = null,
  children,
}: RoleGuardProps) {
  const { hasRole, hasPermission, isLoading } = useAuth();

  if (isLoading) return null;

  const role_ok = roles
    ? roles.some((r) => hasRole(r))
    : true;

  const perm_ok = permissions
    ? hasPermission(...permissions)
    : true;

  if (!role_ok || !perm_ok) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
