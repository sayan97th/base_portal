import { getToken } from "@/lib/api-client";

interface CreatePaymentIntentPayload {
  amount_cents: number;
  metadata?: Record<string, string>;
  /** When paying with a saved card, pass its Stripe PM ID so the server can
   *  attach the correct Stripe Customer to the PaymentIntent. */
  stripe_payment_method_id?: string;
  /** When true the server creates or finds the user's Stripe Customer and
   *  creates the PaymentIntent with setup_future_usage: 'off_session' so
   *  the resulting PaymentMethod is automatically attached to the Customer
   *  and can be saved for future purchases. */
  save_for_future?: boolean;
}

interface CreatePaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

export async function createPaymentIntent(
  payload: CreatePaymentIntentPayload
): Promise<CreatePaymentIntentResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Forward the bearer token when saving the card so the PI route can
  // find/create the Stripe Customer for this authenticated user.
  if (payload.save_for_future) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch("/api/stripe/create-payment-intent", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to create payment intent.");
  }

  return data as CreatePaymentIntentResponse;
}
