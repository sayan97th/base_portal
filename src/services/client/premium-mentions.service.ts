import { apiClient } from "@/lib/api-client";
import type {
  PremiumMentionsPlan,
  PremiumMentionsPlansResponse,
  CreatePremiumMentionsOrderPayload,
  CreatePremiumMentionsOrderResponse,
} from "@/types/client/premium-mentions";

interface CreateOrderApiResponse {
  data: CreatePremiumMentionsOrderResponse;
}

export const premiumMentionsService = {
  async fetchPlans(): Promise<PremiumMentionsPlan[]> {
    const response = await apiClient.get<PremiumMentionsPlansResponse>(
      "/api/premium-mentions/plans"
    );
    return response.data;
  },

  async createOrder(
    payload: CreatePremiumMentionsOrderPayload
  ): Promise<CreatePremiumMentionsOrderResponse> {
    const response = await apiClient.post<CreateOrderApiResponse>(
      "/api/premium-mentions/orders",
      payload
    );
    return response.data;
  },
};
