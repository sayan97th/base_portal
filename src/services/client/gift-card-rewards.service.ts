import { apiClient } from "@/lib/api-client";
import type {
  GiftCardReward,
  GiftCardRewardLookupParams,
  SubmitGiftCardRewardPayload,
} from "@/types/client/gift-card-rewards";

export const giftCardRewardsService = {
  /**
   * GET /api/gift-card-rewards/lookup
   * Returns the promo gift card earned by a checkout session or order, or
   * null when that order did not use a money back promo code (or the promo
   * ended before the client filled in the form).
   */
  async lookup(params: GiftCardRewardLookupParams): Promise<GiftCardReward | null> {
    const query = new URLSearchParams();
    if (params.session_id) query.set("session_id", params.session_id);
    if (params.order_id) query.set("order_id", params.order_id);

    const response = await apiClient.get<{ data: GiftCardReward | null }>(
      `/api/gift-card-rewards/lookup?${query.toString()}`
    );
    return response.data;
  },

  /**
   * PUT /api/gift-card-rewards/{id}
   * Saves where the gift card should be sent and notifies the BASE team.
   */
  async submit(id: string, payload: SubmitGiftCardRewardPayload): Promise<GiftCardReward> {
    const response = await apiClient.put<{ data: GiftCardReward }>(
      `/api/gift-card-rewards/${id}`,
      payload
    );
    return response.data;
  },
};
