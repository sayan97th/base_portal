/**
 * Invoice Card Payment Service
 *
 * Card-only payment flow for the invoice pay page (/invoices/{id}/pay):
 *   1. POST /api/invoices/{unique_id}/payment-intent → server creates a card-only,
 *      manual-capture PaymentIntent for the invoice total.
 *   2. Stripe.js confirms the card on the client (handles 3D Secure).
 *   3. POST /api/invoices/{unique_id}/pay → server verifies, records and captures.
 *
 * Authenticated requests go through apiClient (bearer token → owner flow with
 * saved cards). Share-link requests use a plain fetch without an Authorization
 * header so the API always runs the public token flow, even when the viewer
 * happens to be logged in.
 */

import { apiClient } from "@/lib/api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface InvoicePaymentIntent {
  client_secret: string;
  payment_intent_id: string;
}

export interface CreateAuthenticatedPaymentIntentPayload {
  /** Saved card (PaymentProfile id) to pay with. Omit to pay with a new card. */
  payment_profile_id?: string;
  /** Set up the new card for future payments. Ignored with payment_profile_id. */
  save_card?: boolean;
}

export interface InvoicePaymentApiError {
  message?: string;
  status_code?: number;
}

interface PaymentIntentResponse {
  data: InvoicePaymentIntent;
}

async function postPublic<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const response_data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw {
      message: response_data?.message ?? "An unexpected error occurred.",
      status_code: response.status,
    } satisfies InvoicePaymentApiError;
  }

  return response_data as T;
}

export const invoiceCardPaymentService = {
  async createAuthenticatedPaymentIntent(
    unique_id: string,
    payload: CreateAuthenticatedPaymentIntentPayload
  ): Promise<InvoicePaymentIntent> {
    const response = await apiClient.post<PaymentIntentResponse>(
      `/api/invoices/${encodeURIComponent(unique_id)}/payment-intent`,
      payload
    );
    return response.data;
  },

  async createPublicPaymentIntent(unique_id: string, token: string): Promise<InvoicePaymentIntent> {
    const response = await postPublic<PaymentIntentResponse>(
      `/api/invoices/${encodeURIComponent(unique_id)}/payment-intent`,
      { token }
    );
    return response.data;
  },

  async confirmAuthenticatedPayment(unique_id: string, payment_intent_id: string): Promise<void> {
    await apiClient.post(`/api/invoices/${encodeURIComponent(unique_id)}/pay`, {
      payment_method: "credit_card",
      payment_intent_id,
    });
  },

  async confirmPublicPayment(unique_id: string, token: string, payment_intent_id: string): Promise<void> {
    await postPublic(`/api/invoices/${encodeURIComponent(unique_id)}/pay`, {
      payment_intent_id,
      token,
    });
  },
};
