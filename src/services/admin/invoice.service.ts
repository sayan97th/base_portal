import { apiClient } from "@/lib/api-client";
import type { AdminInvoice, PaginatedResponse } from "@/types/admin";

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

/**
 * Fetch a single invoice by unique_id — admin detail view.
 * Roles allowed: super_admin, admin, staff.
 */
export async function getAdminInvoice(invoice_id: string): Promise<AdminInvoice> {
  return apiClient.get<AdminInvoice>(`/api/admin/invoices/${invoice_id}`);
}
