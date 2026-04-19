import { apiClient } from "@/lib/api-client";
import type {
  AdminInvoice,
  AdminInvoiceFilters,
  PaginatedResponse,
  CreateInvoicePayload,
  CreateInvoiceLineItemPayload,
  InvoiceHistoryEntry,
} from "@/types/admin";

export interface UpdateInvoicePayload {
  date_due?: string;
  line_items?: CreateInvoiceLineItemPayload[];
}

export interface UpdateInvoiceBillingPayload {
  company_name?: string | null;
  company_description?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  state?: string | null;
  country?: string | null;
}

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

export async function getAdminInvoice(invoice_id: string): Promise<AdminInvoice> {
  return apiClient.get<AdminInvoice>(`/api/admin/invoices/${invoice_id}`);
}

export async function createAdminInvoice(payload: CreateInvoicePayload): Promise<AdminInvoice> {
  return apiClient.post<AdminInvoice>("/api/admin/invoices", payload);
}

export async function getAdminInvoiceHistory(invoice_id: string): Promise<InvoiceHistoryEntry[]> {
  return apiClient.get<InvoiceHistoryEntry[]>(`/api/admin/invoices/${invoice_id}/history`);
}

export async function updateAdminInvoice(
  invoice_id: string,
  payload: UpdateInvoicePayload
): Promise<AdminInvoice> {
  return apiClient.patch<AdminInvoice>(`/api/admin/invoices/${invoice_id}`, payload);
}

export async function updateAdminInvoiceBilling(
  invoice_id: string,
  payload: UpdateInvoiceBillingPayload
): Promise<AdminInvoice> {
  return apiClient.patch<AdminInvoice>(`/api/admin/invoices/${invoice_id}/billing`, payload);
}

export async function markAdminInvoiceAsPaid(invoice_id: string): Promise<AdminInvoice> {
  return apiClient.post<AdminInvoice>(`/api/admin/invoices/${invoice_id}/mark-paid`, {});
}

export async function duplicateAdminInvoice(invoice_id: string): Promise<AdminInvoice> {
  return apiClient.post<AdminInvoice>(`/api/admin/invoices/${invoice_id}/duplicate`, {});
}

export async function deleteAdminInvoice(invoice_id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/invoices/${invoice_id}`);
}

export async function voidAdminInvoice(invoice_id: string): Promise<AdminInvoice> {
  return apiClient.post<AdminInvoice>(`/api/admin/invoices/${invoice_id}/void`, {});
}

export async function emailAdminInvoice(invoice_id: string): Promise<void> {
  return apiClient.post<void>(`/api/admin/invoices/${invoice_id}/send-reminder`, {});
}

export interface InvoiceShareLinks {
  sharing_enabled: boolean;
  private_link: string;
  public_link: string;
}

export async function getAdminInvoiceShareLinks(invoice_id: string): Promise<InvoiceShareLinks> {
  return apiClient.get<InvoiceShareLinks>(`/api/admin/invoices/${invoice_id}/share-links`);
}

export async function toggleAdminInvoiceSharing(
  invoice_id: string,
  enabled: boolean
): Promise<InvoiceShareLinks> {
  return apiClient.patch<InvoiceShareLinks>(`/api/admin/invoices/${invoice_id}/share-links`, {
    sharing_enabled: enabled,
  });
}
