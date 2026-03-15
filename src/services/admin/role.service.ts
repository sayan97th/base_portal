import { apiClient } from "@/lib/api-client";
import type {
  RolesListResponse,
  AssignRoleData,
  RoleActionResponse,
} from "@/types/admin";

/**
 * List all roles with their permissions.
 * Roles allowed: super_admin, owner.
 * NOT paginated — returns all roles.
 */
export async function listRoles(): Promise<RolesListResponse> {
  return apiClient.get<RolesListResponse>("/api/admin/roles");
}

/**
 * Assign a role to a user.
 * Roles allowed: super_admin, owner.
 */
export async function assignRole(
  user_id: number,
  data: AssignRoleData
): Promise<RoleActionResponse> {
  return apiClient.post<RoleActionResponse>(
    `/api/admin/roles/users/${user_id}/assign`,
    data
  );
}

/**
 * Revoke a role from a user.
 * Roles allowed: super_admin, owner.
 */
export async function revokeRole(
  user_id: number,
  data: AssignRoleData
): Promise<RoleActionResponse> {
  return apiClient.post<RoleActionResponse>(
    `/api/admin/roles/users/${user_id}/revoke`,
    data
  );
}
