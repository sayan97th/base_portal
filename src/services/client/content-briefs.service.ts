import { apiClient } from "@/lib/api-client";
import type {
  ContentBriefTier,
  ContentBriefTiersResponse,
  ContentBriefOrderSummary,
  ContentBriefOrderDetail,
  CreateContentBriefOrderPayload,
  CreateContentBriefOrderResponse,
} from "@/types/client/content-briefs";

interface CreateOrderApiResponse {
  data: CreateContentBriefOrderResponse;
}

interface OrdersListApiResponse {
  data: ContentBriefOrderSummary[];
}

export const contentBriefsService = {
  async fetchTiers(): Promise<ContentBriefTier[]> {
    const response = await apiClient.get<ContentBriefTiersResponse>(
      "/api/content-brief-tiers"
    );
    return response.data;
  },

  async fetchMyOrders(): Promise<ContentBriefOrderSummary[]> {
    const response = await apiClient.get<OrdersListApiResponse>(
      "/api/content-briefs/orders"
    );
    return response.data;
  },

  async fetchOrderDetail(order_id: string): Promise<ContentBriefOrderDetail> {
    const response = await apiClient.get<{ data: ContentBriefOrderDetail }>(
      `/api/content-briefs/orders/${order_id}`
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
