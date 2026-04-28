import { apiClient } from "@/lib/api-client";
import type {
  NewContentTier,
  NewContentTiersResponse,
  NewContentOrderSummary,
  NewContentOrdersResponse,
  NewContentOrderDetail,
  CreateNewContentOrderPayload,
  CreateNewContentOrderResponse,
} from "@/types/client/new-content";

interface CreateOrderApiResponse {
  data: CreateNewContentOrderResponse;
}

export const newContentService = {
  async fetchNewContentTiers(): Promise<NewContentTier[]> {
    const response = await apiClient.get<NewContentTiersResponse>(
      "/api/new-content-tiers"
    );
    return response.data;
  },

  async fetchMyOrders(): Promise<NewContentOrderSummary[]> {
    const response = await apiClient.get<NewContentOrdersResponse>(
      "/api/new-content/orders"
    );
    return response.data;
  },

  async fetchOrderDetail(order_id: string): Promise<NewContentOrderDetail> {
    const response = await apiClient.get<{ data: NewContentOrderDetail }>(
      `/api/new-content/orders/${order_id}`
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
