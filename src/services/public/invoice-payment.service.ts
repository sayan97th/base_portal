const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface PublicPaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount_cents: number;
}

/**
 * Creates a card-only PaymentIntent for a public (share-link) invoice payment.
 * The amount is resolved from the invoice by the API — it is never sent from
 * the browser — and access is authorized by the share token.
 */
export async function createInvoicePaymentIntent(
  invoice_id: string,
  token: string
): Promise<PublicPaymentIntentResponse> {
  const url = `${API_BASE_URL}/api/invoices/${encodeURIComponent(invoice_id)}/payment-intent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw {
      message: data.message ?? "Failed to initialize payment.",
      status_code: response.status,
    };
  }
  return data as PublicPaymentIntentResponse;
}

export async function confirmInvoicePayment(
  invoice_id: string,
  token: string,
  payment_intent_id: string
): Promise<void> {
  const url = `${API_BASE_URL}/api/invoices/${encodeURIComponent(invoice_id)}/pay`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ payment_intent_id, token }),
  });

  if (!response.ok) {
    const error_data = await response
      .json()
      .catch(() => ({ message: "Payment confirmation failed." }));
    throw { ...error_data, status_code: response.status };
  }
}
