import { apiClient } from "@/lib/api-client";
import type { AdminUser, PaginatedResponse } from "./types";

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
