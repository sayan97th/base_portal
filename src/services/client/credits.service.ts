/**
 * Credits Service (client-side)
 *
 * Required Laravel API endpoints:
 *   GET  /api/credits/balance          → returns the authenticated user's credit balance
 *   GET  /api/credits/transactions     → paginated list of the user's credit transactions
 *   POST /api/credits/pay              → deduct credits to pay for an order
 */

import { apiClient } from "@/lib/api-client";
import type {
  CreditBalance,
  CreditTransactionListResponse,
  PayWithCreditsPayload,
  PayWithCreditsResponse,
} from "@/types/client/credits";

export const creditsService = {
  async fetchCreditBalance(): Promise<CreditBalance> {
    return apiClient.get<CreditBalance>("/api/credits/balance");
  },

  async fetchTransactions(page: number = 1): Promise<CreditTransactionListResponse> {
    return apiClient.get<CreditTransactionListResponse>(
      `/api/credits/transactions?page=${page}`
    );
  },

  async payWithCredits(payload: PayWithCreditsPayload): Promise<PayWithCreditsResponse> {
    return apiClient.post<PayWithCreditsResponse>("/api/credits/pay", payload);
  },
};
