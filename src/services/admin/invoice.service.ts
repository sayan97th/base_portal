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
  notes?: string;
  send_update_notification?: boolean;
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

export async function markAdminInvoiceAsUnpaid(invoice_id: string): Promise<AdminInvoice> {
  return apiClient.post<AdminInvoice>(`/api/admin/invoices/${invoice_id}/mark-unpaid`, {});
}

export async function markAdminInvoiceAsOverdue(invoice_id: string): Promise<AdminInvoice> {
  return apiClient.post<AdminInvoice>(`/api/admin/invoices/${invoice_id}/mark-overdue`, {});
}

export async function refundAdminInvoice(invoice_id: string): Promise<AdminInvoice> {
  return apiClient.post<AdminInvoice>(`/api/admin/invoices/${invoice_id}/refund`, {});
}

export async function emailAdminInvoice(invoice_id: string): Promise<void> {
  return apiClient.post<void>(`/api/admin/invoices/${invoice_id}/send-reminder`, {});
}

export interface InvoiceShareLinks {
  sharing_enabled: boolean;
  private_link: string;
  public_link: string;
  payment_link: string;
}

function applyShareDomain(link: string): string {
  const site_url = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!site_url) return link;
  try {
    const { pathname, search, hash } = new URL(link);
    return `${site_url}${pathname}${search}${hash}`;
  } catch {
    const clean_path = link.startsWith("/") ? link : `/${link}`;
    return `${site_url}${clean_path}`;
  }
}

function derivePaymentLink(public_link: string): string {
  return public_link.replace(/\/view(\?|#|$)/, "/pay$1");
}

function normalizeShareLinks(raw: InvoiceShareLinks): InvoiceShareLinks {
  const normalized_public = applyShareDomain(raw.public_link);
  return {
    ...raw,
    private_link: applyShareDomain(raw.private_link),
    public_link: normalized_public,
    payment_link: derivePaymentLink(normalized_public),
  };
}

export async function getAdminInvoiceShareLinks(invoice_id: string): Promise<InvoiceShareLinks> {
  const raw = await apiClient.get<InvoiceShareLinks>(`/api/admin/invoices/${invoice_id}/share-links`);
  return normalizeShareLinks(raw);
}

export async function toggleAdminInvoiceSharing(
  invoice_id: string,
  enabled: boolean
): Promise<InvoiceShareLinks> {
  const raw = await apiClient.patch<InvoiceShareLinks>(`/api/admin/invoices/${invoice_id}/share-links`, {
    sharing_enabled: enabled,
  });
  return normalizeShareLinks(raw);
}
