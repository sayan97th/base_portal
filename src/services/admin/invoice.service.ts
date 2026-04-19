import { apiClient } from "@/lib/api-client";
import type {
  AdminInvoice,
  AdminInvoiceFilters,
  PaginatedResponse,
  CreateInvoicePayload,
  InvoiceHistoryEntry,
} from "@/types/admin";

/**
 * List all invoices — staff portal view (paginated, filterable, sortable).
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminInvoices(
  filters: AdminInvoiceFilters = {}
): Promise<PaginatedResponse<AdminInvoice>> {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.sort_field) params.set("sort_field", filters.sort_field);
  if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);

  const query = params.toString();
  return apiClient.get<PaginatedResponse<AdminInvoice>>(
    `/api/admin/invoices${query ? `?${query}` : ""}`
  );
}

/**
 * Fetch a single invoice by unique_id — admin detail view.
 * Roles allowed: super_admin, admin, staff.
 */
export async function getAdminInvoice(invoice_id: string): Promise<AdminInvoice> {
  return apiClient.get<AdminInvoice>(`/api/admin/invoices/${invoice_id}`);
}

/**
 * Create a new invoice — admin only.
 * Roles allowed: super_admin, admin, staff.
 */
export async function createAdminInvoice(payload: CreateInvoicePayload): Promise<AdminInvoice> {
  return apiClient.post<AdminInvoice>("/api/admin/invoices", payload);
}

/**
 * Fetch the activity history for a single invoice.
 * Roles allowed: super_admin, admin, staff.
 */
export async function getAdminInvoiceHistory(invoice_id: string): Promise<InvoiceHistoryEntry[]> {
  return apiClient.get<InvoiceHistoryEntry[]>(`/api/admin/invoices/${invoice_id}/history`);
}
