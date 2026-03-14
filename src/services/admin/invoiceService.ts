import { apiClient } from "@/lib/api-client";
import type { AdminInvoice, PaginatedResponse } from "./types";

/**
 * List all invoices — staff portal view (paginated).
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminInvoices(
  page: number = 1
): Promise<PaginatedResponse<AdminInvoice>> {
  return apiClient.get<PaginatedResponse<AdminInvoice>>(
    `/api/admin/invoices?page=${page}`
  );
}
