import { apiClient } from "@/lib/api-client";
import type { InvoiceDetail, InvoiceSummary } from "@/components/invoices/invoiceData";

export interface InvoiceListFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
}

interface PaginatedInvoiceListResponse {
  data: InvoiceSummary[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface InvoiceDetailResponse {
  data: InvoiceDetail;
}

export interface CreateInvoicePayload {
  order_id: string;
  payment_method?: "Account Balance" | "Credit Card";
  currency_type?: "usd" | "credits";
  credit_amount?: number;
}

interface CreateInvoiceResponse {
  data: InvoiceDetail;
}

export interface PayInvoicePayload {
  payment_method: "account_balance" | "credit_card";
  stripe_token?: string;
  payment_intent_id?: string;
}

interface PayInvoiceResponse {
  data: InvoiceDetail;
  message?: string;
}

export interface CreateInvoicePaymentIntentPayload {
  /** Pay with one of the client's saved cards. */
  payment_profile_id?: string;
  /** Save the new card entered on the pay page for future payments. */
  save_card?: boolean;
}

export interface InvoicePaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount_cents: number;
}

export const invoicesService = {
  async getInvoiceList(filters: InvoiceListFilters = {}): Promise<PaginatedInvoiceListResponse> {
    const { page = 1, per_page = 10, search, status } = filters;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(per_page));
    if (search?.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    return apiClient.get<PaginatedInvoiceListResponse>(`/api/invoices?${params.toString()}`);
  },

  async getInvoiceDetail(unique_id: string): Promise<InvoiceDetail> {
    const response = await apiClient.get<InvoiceDetailResponse>(
      `/api/invoices/${unique_id}`
    );
    return response.data;
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<InvoiceDetail> {
    const response = await apiClient.post<CreateInvoiceResponse>(
      "/api/invoices",
      payload
    );
    return response.data;
  },

  async payClientInvoice(unique_id: string, payload: PayInvoicePayload): Promise<InvoiceDetail> {
    const response = await apiClient.post<PayInvoiceResponse>(
      `/api/invoices/${unique_id}/pay`,
      payload
    );
    return response.data;
  },

  /**
   * Creates a card-only PaymentIntent for the invoice. The amount is taken
   * from the invoice server-side.
   */
  async createInvoicePaymentIntent(
    unique_id: string,
    payload: CreateInvoicePaymentIntentPayload = {}
  ): Promise<InvoicePaymentIntentResponse> {
    return apiClient.post<InvoicePaymentIntentResponse>(
      `/api/invoices/${unique_id}/payment-intent`,
      payload
    );
  },

  async sendInvoicePaymentNotification(unique_id: string): Promise<void> {
    return apiClient.post<void>(`/api/invoices/${unique_id}/send-notification`, {});
  },
};
