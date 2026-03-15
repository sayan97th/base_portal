import { apiClient } from "@/lib/api-client";
import type { AdminUser, AdminUserOrderSummary, PaginatedResponse } from "./types";

/**
 * List all users (paginated).
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminUsers(
  page: number = 1
): Promise<PaginatedResponse<AdminUser>> {
  return apiClient.get<PaginatedResponse<AdminUser>>(
    `/api/admin/users?page=${page}`
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
