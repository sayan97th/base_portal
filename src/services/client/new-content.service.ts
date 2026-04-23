import { apiClient } from "@/lib/api-client";
import type {
  NewContentTier,
  NewContentTiersResponse,
  CreateNewContentOrderPayload,
  CreateNewContentOrderResponse,
} from "@/types/client/new-content";

interface CreateOrderApiResponse {
  data: CreateNewContentOrderResponse;
}

export const newContentService = {
  async fetchTiers(): Promise<NewContentTier[]> {
    const response = await apiClient.get<NewContentTiersResponse>(
      "/api/new-content-tiers"
    );
    return response.data;
  },

  async createOrder(
    payload: CreateNewContentOrderPayload
  ): Promise<CreateNewContentOrderResponse> {
    const response = await apiClient.post<CreateOrderApiResponse>(
      "/api/new-content/orders",
      payload
    );
    return response.data;
  },
};
