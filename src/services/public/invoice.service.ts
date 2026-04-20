import type { InvoiceDetail } from "@/components/invoices/invoiceData";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface InvoiceDetailResponse {
  data: InvoiceDetail;
}

export async function getPublicInvoice(
  invoice_id: string,
  token: string
): Promise<InvoiceDetail> {
  const url = `${API_BASE_URL}/api/invoices/${encodeURIComponent(invoice_id)}/view?token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error_data = await response.json().catch(() => ({
      message: "An unexpected error occurred",
    }));
    throw { ...error_data, status_code: response.status };
  }

  const json: InvoiceDetail | InvoiceDetailResponse = await response.json();

  if (json && typeof json === "object" && "data" in json) {
    return (json as InvoiceDetailResponse).data;
  }

  return json as InvoiceDetail;
}
