const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

export async function createInvoicePaymentIntent(
  amount_cents: number,
  invoice_unique_id: string,
  token: string
): Promise<PaymentIntentResponse> {
  const response = await fetch("/api/stripe/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount_cents,
      metadata: { invoice_unique_id, token },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to initialize payment.");
  }
  return data as PaymentIntentResponse;
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
