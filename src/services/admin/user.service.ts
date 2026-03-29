import { apiClient } from "@/lib/api-client";
import type { AdminUser, AdminUserFilters, AdminClientFilters, AdminUserOrderSummary, PaginatedResponse } from "@/types/admin";

export interface BanUserResponse {
  message: string;
  user: AdminUser;
}

export type UserTypeFilter = "staff" | "client";

/**
 * List users (paginated), optionally filtered by type, search, sort, and date range.
 * - user_type "staff"  → returns super_admin, admin, staff accounts
 * - user_type "client" → returns client accounts
 * - omitted            → returns all users
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminUsers(
  filters: AdminUserFilters = {},
  user_type?: UserTypeFilter
): Promise<PaginatedResponse<AdminUser>> {
  const params = new URLSearchParams({ page: String(filters.page ?? 1) });
  if (user_type) params.set("type", user_type);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.sort_field) params.set("sort_field", filters.sort_field);
  if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.role) params.set("role", filters.role);
  return apiClient.get<PaginatedResponse<AdminUser>>(
    `/api/admin/users?${params.toString()}`
  );
}

/**
 * List client accounts (paginated) with search, sort, date range,
 * email verification status, and account status filters.
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminClients(
  filters: AdminClientFilters = {}
): Promise<PaginatedResponse<AdminUser>> {
  const params = new URLSearchParams({ page: String(filters.page ?? 1) });
  params.set("type", "client");
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.sort_field) params.set("sort_field", filters.sort_field);
  if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.email_status) params.set("email_status", filters.email_status);
  if (filters.account_status) params.set("account_status", filters.account_status);
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
 * Disable a user account (ban). Optionally provide a reason.
 * Roles allowed: super_admin, admin.
 */
export async function banUser(
  user_id: number,
  reason?: string
): Promise<BanUserResponse> {
  return apiClient.patch<BanUserResponse>(`/api/admin/users/${user_id}/ban`, { reason });
}

/**
 * Re-enable a previously disabled user account (unban).
 * Roles allowed: super_admin, admin.
 */
export async function unbanUser(user_id: number): Promise<BanUserResponse> {
  return apiClient.patch<BanUserResponse>(`/api/admin/users/${user_id}/unban`);
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
