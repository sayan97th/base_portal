import { apiClient } from "@/lib/api-client";
import type {
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
