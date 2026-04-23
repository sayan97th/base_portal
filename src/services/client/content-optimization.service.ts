import { apiClient } from "@/lib/api-client";
import type {
  ContentOptimizationTier,
  ContentOptimizationTiersResponse,
  CreateContentOptimizationOrderPayload,
  CreateContentOptimizationOrderResponse,
  ContentOptimizationOrderSummary,
} from "@/types/client/content-optimization";

interface CreateOrderApiResponse {
  data: CreateContentOptimizationOrderResponse;
}

interface OrdersListApiResponse {
  data: ContentOptimizationOrderSummary[];
}

export const contentOptimizationService = {
  async fetchTiers(): Promise<ContentOptimizationTier[]> {
    const response = await apiClient.get<ContentOptimizationTiersResponse>(
      "/api/content-optimization-tiers"
    );
    return response.data;
  },

  async createOrder(
    payload: CreateContentOptimizationOrderPayload
  ): Promise<CreateContentOptimizationOrderResponse> {
    const response = await apiClient.post<CreateOrderApiResponse>(
      "/api/content-optimization/orders",
      payload
    );
    return response.data;
  },

  async fetchMyOrders(): Promise<ContentOptimizationOrderSummary[]> {
    const response = await apiClient.get<OrdersListApiResponse>(
      "/api/content-optimization/orders"
    );
    return response.data;
  },
};
