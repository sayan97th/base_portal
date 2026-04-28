import { apiClient } from "@/lib/api-client";
import type {
  UnifiedCartPayload,
  UnifiedCheckoutPayload,
  UnifiedCheckoutResponse,
} from "@/types/client/unified-cart";

interface FetchCartApiResponse {
  data: UnifiedCartPayload | null;
}

interface CheckoutApiResponse {
  data: UnifiedCheckoutResponse;
}

export const unifiedCartService = {
  /**
   * GET /api/cart
   * Returns the authenticated user's saved unified cart, or null if none exists.
   */
  async fetchCart(): Promise<UnifiedCartPayload | null> {
    const response = await apiClient.get<FetchCartApiResponse>("/api/cart");
    return response.data;
  },

  /**
   * PUT /api/cart
   * Creates or fully replaces the user's unified cart on the server.
   */
  async saveCart(payload: UnifiedCartPayload): Promise<void> {
    await apiClient.put("/api/cart", payload);
  },

  /**
   * DELETE /api/cart
   * Removes the user's unified cart from the server.
   * Called after order completion or when the user clears the cart.
   */
  async deleteCart(): Promise<void> {
    await apiClient.delete("/api/cart");
  },

  /**
   * POST /api/cart/checkout
   * Submits the unified cart for payment processing and order creation.
   * The Laravel backend creates one order per product type present in the payload,
   * all tied to the same Stripe payment method ID.
   */
  async checkout(payload: UnifiedCheckoutPayload): Promise<UnifiedCheckoutResponse> {
    const response = await apiClient.post<CheckoutApiResponse>(
      "/api/cart/checkout",
      payload
    );
    return response.data;
  },
};
