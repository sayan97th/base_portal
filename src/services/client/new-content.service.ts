import { apiClient } from "@/lib/api-client";
import type {
  ArticleTier,
  CreateOrderPayload,
  CreateOrderResponse,
  NewContentOrderDetail,
  NewContentOrderSummary,
} from "@/types/client/new-content";

interface ArticleTiersResponse {
  data: ArticleTier[];
}

interface CreateOrderApiResponse {
  data: CreateOrderResponse;
}

interface OrdersListResponse {
  data: NewContentOrderSummary[];
}

interface OrderDetailResponse {
  data: NewContentOrderDetail;
}

export const newContentService = {
  async fetchArticleTiers(): Promise<ArticleTier[]> {
    const response = await apiClient.get<ArticleTiersResponse>(
      "/api/article-tiers"
    );
    return response.data;
  },

  async fetchAllOrders(): Promise<NewContentOrderSummary[]> {
    const response = await apiClient.get<OrdersListResponse>(
      "/api/new-content/orders"
    );
    return response.data;
  },

  async createNewContentOrder(
    payload: CreateOrderPayload
  ): Promise<CreateOrderResponse> {
    const response = await apiClient.post<CreateOrderApiResponse>(
      "/api/new-content/orders",
      payload
    );
    return response.data;
  },

  async fetchNewContentOrderDetail(
    order_id: string
  ): Promise<NewContentOrderDetail> {
    const response = await apiClient.get<OrderDetailResponse>(
      `/api/new-content/orders/${order_id}`
    );
    return response.data;
  },
};
