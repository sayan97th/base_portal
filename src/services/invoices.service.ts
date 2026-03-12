import { apiClient } from "@/lib/api-client";
import type { InvoiceDetail, InvoiceSummary } from "@/components/invoices/invoiceData";

interface InvoiceListResponse {
  data: InvoiceSummary[];
}

interface InvoiceDetailResponse {
  data: InvoiceDetail;
}

interface CreateInvoicePayload {
  order_id: string;
}

interface CreateInvoiceResponse {
  data: { unique_id: string };
}

export const invoicesService = {
  async getInvoiceList(): Promise<InvoiceSummary[]> {
    const response = await apiClient.get<InvoiceListResponse>("/api/invoices");
    return response.data;
  },

  async getInvoiceDetail(unique_id: string): Promise<InvoiceDetail> {
    const response = await apiClient.get<InvoiceDetailResponse>(
      `/api/invoices/${unique_id}`
    );
    return response.data;
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<{ unique_id: string }> {
    const response = await apiClient.post<CreateInvoiceResponse>(
      "/api/invoices",
      payload
    );
    return response.data;
  },
};
