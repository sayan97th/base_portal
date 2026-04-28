import { apiClient } from "@/lib/api-client";
import type {
  ContentRefreshTier,
  ContentRefreshTiersResponse,
  CreateContentRefreshOrderPayload,
  CreateContentRefreshOrderResponse,
} from "@/types/client/content-refresh";

interface CreateOrderApiResponse {
  data: CreateContentRefreshOrderResponse;
}

export const contentRefreshService = {
  async fetchTiers(): Promise<ContentRefreshTier[]> {
    const response = await apiClient.get<ContentRefreshTiersResponse>(
      "/api/content-refresh-tiers"
    );
    return response.data;
  },

  async createOrder(
    payload: CreateContentRefreshOrderPayload
  ): Promise<CreateContentRefreshOrderResponse> {
    const response = await apiClient.post<CreateOrderApiResponse>(
      "/api/content-refresh/orders",
      payload
    );
    return response.data;
  },
};
