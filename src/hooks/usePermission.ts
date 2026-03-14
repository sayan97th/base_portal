"use client";

import { useAuth } from "@/context/AuthContext";
import type { RoleName } from "@/lib/roles";

/**
 * Convenience hook for checking roles and permissions in components.
 *
 * @example
 * const { can, hasRole } = usePermission();
 * if (can("users.view")) { ... }
 * if (hasRole("admin")) { ... }
 */
export function usePermission() {
  const { hasRole, hasPermission, isStaff, isAdmin, permissions } = useAuth();

  return {
    /** Check if the user has ALL of the supplied roles. */
    hasRole: (...roles: RoleName[]) => hasRole(...roles),
    /** Check if the user has ALL of the supplied permissions. */
    can: (...perms: string[]) => hasPermission(...perms),
    /** True when the user belongs to the internal staff team. */
    isStaff,
    /** True when the user is an admin or super_admin. */
    isAdmin,
    /** Full list of permission strings the current user holds. */
    permissions,
  };
}
