import { apiClient } from "@/lib/api-client";
import type { InvoiceDetail, InvoiceSummary } from "@/components/invoices/invoiceData";

export interface InvoiceListFilters {
  page?: number;
  per_page?: number;
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

export const invoicesService = {
  async getInvoiceList(filters: InvoiceListFilters = {}): Promise<PaginatedInvoiceListResponse> {
    const { page = 1, per_page = 10 } = filters;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(per_page));
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
};
