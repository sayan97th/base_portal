/**
 * Credits Service (client-side)
 *
 * Required Laravel API endpoints:
 *   GET  /api/credits/balance          → returns the authenticated user's credit balance
 *   GET  /api/credits/transactions     → paginated list of the user's credit transactions
 *   POST /api/credits/pay              → deduct credits to pay for an order (full payment)
 *   POST /api/credits/apply-discount   → deduct a partial credit amount linked to a Stripe PI (hybrid payment)
 */

import { apiClient } from "@/lib/api-client";
import type {
  CreditBalance,
  CreditBalanceSummary,
  CreditTransactionListResponse,
  PayWithCreditsPayload,
  PayWithCreditsResponse,
  ApplyCreditsDiscountPayload,
  ApplyCreditsDiscountResponse,
  CreditPackage,
  CreditPurchaseListResponse,
  PurchaseCreditsPayload,
  PurchaseCreditsResponse,
} from "@/types/client/credits";

export const creditsService = {
  async fetchCreditBalance(): Promise<CreditBalance> {
    return apiClient.get<CreditBalance>("/api/credits/balance");
  },

  async fetchBalanceSummary(): Promise<CreditBalanceSummary> {
    return apiClient.get<CreditBalanceSummary>("/api/credits/balance-summary");
  },

  async fetchTransactions(page: number = 1): Promise<CreditTransactionListResponse> {
    return apiClient.get<CreditTransactionListResponse>(
      `/api/credits/transactions?page=${page}`
    );
  },

  /** Full payment using account credits (no card required). */
  async payWithCredits(payload: PayWithCreditsPayload): Promise<PayWithCreditsResponse> {
    return apiClient.post<PayWithCreditsResponse>("/api/credits/pay", payload);
  },

  /**
   * Deduct a partial credit amount as a discount, linked to a Stripe PaymentIntent.
   * Used in hybrid checkout: Stripe charges the remaining amount, credits cover the rest.
   * The backend should atomically record the credit deduction and the PI reference.
   */
  async applyCreditsDiscount(payload: ApplyCreditsDiscountPayload): Promise<ApplyCreditsDiscountResponse> {
    return apiClient.post<ApplyCreditsDiscountResponse>("/api/credits/apply-discount", payload);
  },

  /**
   * Fetch available credit packages for purchase.
   * Required Laravel endpoint: GET /api/credits/packages
   */
  async fetchCreditPackages(): Promise<CreditPackage[]> {
    return apiClient.get<CreditPackage[]>("/api/credits/packages");
  },

  /**
   * Record a completed credit purchase, add credits to the user's account,
   * and trigger the purchase confirmation email.
   * Required Laravel endpoint: POST /api/credits/purchase
   */
  async purchaseCredits(payload: PurchaseCreditsPayload): Promise<PurchaseCreditsResponse> {
    return apiClient.post<PurchaseCreditsResponse>("/api/credits/purchase", payload);
  },

  /**
   * Paginated list of all credit purchases made by the authenticated user.
   * Required Laravel endpoint: GET /api/credits/purchases?page={page}
   */
  async fetchPurchaseHistory(page: number = 1): Promise<CreditPurchaseListResponse> {
    return apiClient.get<CreditPurchaseListResponse>(
      `/api/credits/purchases?page=${page}`
    );
  },
};
