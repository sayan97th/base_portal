import { apiClient } from "@/lib/api-client";
import type {
  ContentBriefTier,
  ContentBriefTiersResponse,
  CreateContentBriefOrderPayload,
  CreateContentBriefOrderResponse,
} from "@/types/client/content-briefs";

interface CreateOrderApiResponse {
  data: CreateContentBriefOrderResponse;
}

export const contentBriefsService = {
  async fetchTiers(): Promise<ContentBriefTier[]> {
    const response = await apiClient.get<ContentBriefTiersResponse>(
      "/api/content-brief-tiers"
    );
    return response.data;
  },

  async createOrder(
    payload: CreateContentBriefOrderPayload
  ): Promise<CreateContentBriefOrderResponse> {
    const response = await apiClient.post<CreateOrderApiResponse>(
      "/api/content-briefs/orders",
      payload
    );
    return response.data;
  },
};
