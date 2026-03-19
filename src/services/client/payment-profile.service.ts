/**
 * Payment Profile Service
 *
 * Communicates with the Laravel API to manage saved payment methods.
 *
 * Required Laravel API endpoints:
 *   GET    /api/payment-profiles          → list user's profiles
 *   POST   /api/payment-profiles          → store new profile (calls Stripe to get card details)
 *   DELETE /api/payment-profiles/{id}     → delete profile + detach from Stripe
 *   PATCH  /api/payment-profiles/{id}/default → set as default
 *
 * See backend/ directory for the Laravel migration and controller stubs.
 */

import { apiClient } from "@/lib/api-client";
import type {
  PaymentProfile,
  CreatePaymentProfilePayload,
  PaymentProfileListResponse,
  PaymentProfileResponse,
} from "@/types/client/payment-profile";

export const paymentProfileService = {
  async fetchPaymentProfiles(): Promise<PaymentProfile[]> {
    const response = await apiClient.get<PaymentProfileListResponse>(
      "/api/payment-profiles"
    );
    return response.data;
  },

  async createPaymentProfile(
    payload: CreatePaymentProfilePayload
  ): Promise<PaymentProfile> {
    const response = await apiClient.post<PaymentProfileResponse>(
      "/api/payment-profiles",
      payload
    );
    return response.data;
  },

  async deletePaymentProfile(id: string): Promise<void> {
    await apiClient.delete(`/api/payment-profiles/${id}`);
  },

  async setDefaultPaymentProfile(id: string): Promise<PaymentProfile> {
    const response = await apiClient.patch<PaymentProfileResponse>(
      `/api/payment-profiles/${id}/default`,
      { is_default: true }
    );
    return response.data;
  },
};
