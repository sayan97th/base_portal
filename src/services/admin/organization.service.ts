import { apiClient } from "@/lib/api-client";
import type { Organization, PaginatedResponse } from "./types";

/**
 * List all organizations (paginated).
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminOrganizations(
  page: number = 1
): Promise<PaginatedResponse<Organization>> {
  return apiClient.get<PaginatedResponse<Organization>>(
    `/api/admin/organizations?page=${page}`
  );
}
