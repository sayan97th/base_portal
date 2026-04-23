import { apiClient } from "@/lib/api-client";
import type {
  CreateContentBriefOrderPayload,
  CreateContentBriefOrderResponse,
} from "@/types/client/content-briefs";

interface CreateOrderApiResponse {
  data: CreateContentBriefOrderResponse;
}

export const contentBriefsService = {
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
