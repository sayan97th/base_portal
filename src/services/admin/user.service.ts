import { apiClient } from "@/lib/api-client";
import type { AdminUser, AdminUserOrderSummary, PaginatedResponse } from "@/types/admin";

export type UserTypeFilter = "staff" | "client";

/**
 * List users (paginated), optionally filtered by type.
 * - user_type "staff"  → returns super_admin, admin, staff accounts
 * - user_type "client" → returns client accounts
 * - omitted            → returns all users
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminUsers(
  page: number = 1,
  user_type?: UserTypeFilter
): Promise<PaginatedResponse<AdminUser>> {
  const params = new URLSearchParams({ page: String(page) });
  if (user_type) params.set("type", user_type);
  return apiClient.get<PaginatedResponse<AdminUser>>(
    `/api/admin/users?${params.toString()}`
  );
}

/**
 * Fetch a single user by ID — admin detail view.
 * Roles allowed: super_admin, admin, staff.
 */
export async function getAdminUser(user_id: number): Promise<AdminUser> {
  return apiClient.get<AdminUser>(`/api/admin/users/${user_id}`);
}

/**
 * List orders belonging to a specific user (paginated).
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminUserOrders(
  user_id: number,
  page: number = 1
): Promise<PaginatedResponse<AdminUserOrderSummary>> {
  return apiClient.get<PaginatedResponse<AdminUserOrderSummary>>(
    `/api/admin/users/${user_id}/orders?page=${page}`
  );
}
