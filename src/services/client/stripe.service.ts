interface CreatePaymentIntentPayload {
  amount_cents: number;
  metadata?: Record<string, string>;
}

interface CreatePaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

export async function createPaymentIntent(
  payload: CreatePaymentIntentPayload
): Promise<CreatePaymentIntentResponse> {
  const response = await fetch("/api/stripe/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to create payment intent.");
  }

  return data as CreatePaymentIntentResponse;
}
