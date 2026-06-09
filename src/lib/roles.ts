/**
 * Role constants — must match the role names defined in the backend.
 */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  STAFF: "staff",
  CLIENT: "client",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/**
 * Roles that belong to the internal team (staff area access).
 */
export const STAFF_ROLES: RoleName[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.STAFF,
];

/**
 * Cookie name used to store the primary role for middleware routing.
 * Not httpOnly — intentionally readable by JS and middleware.
 */
export const ROLE_COOKIE_NAME = "user_primary_role";

/**
 * Returns true when the given role name belongs to the internal staff team.
 */
export function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as string[]).includes(role);
}

/**
 * Extracts the primary role name from the roles array returned by the API.
 * Prefers the highest-privilege role present.
 */
export function getPrimaryRole(
  roles: Array<{ name: string } | string>
): RoleName | null {
  if (!roles || roles.length === 0) return null;

  const priority: RoleName[] = [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.STAFF,
    ROLES.CLIENT,
  ];

  const role_names = roles.map((r) =>
    typeof r === "string" ? r : r.name
  );

  for (const preferred of priority) {
    if (role_names.includes(preferred)) return preferred;
  }

  const first = role_names[0];
  return first as RoleName;
}

/**
 * Sets the primary role cookie (readable by Next.js middleware).
 */
export function setPrimaryRoleCookie(role: RoleName | null): void {
  if (typeof document === "undefined") return;
  if (role) {
    document.cookie = `${ROLE_COOKIE_NAME}=${role}; path=/; SameSite=Lax`;
  } else {
    document.cookie = `${ROLE_COOKIE_NAME}=; path=/; max-age=0`;
  }
}
