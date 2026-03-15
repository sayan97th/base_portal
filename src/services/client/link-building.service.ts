import { apiClient } from "@/lib/api-client";
import type {
  CreateOrderPayload,
  CreateOrderResponse,
  DrTier,
  LinkBuildingOrderDetail,
  LinkBuildingOrderSummary,
} from "@/types/client/link-building";

interface DrTiersResponse {
  data: DrTier[];
}

interface OrdersListResponse {
  data: LinkBuildingOrderSummary[];
}

interface OrderDetailResponse {
  data: LinkBuildingOrderDetail;
}

interface CreateOrderApiResponse {
  data: CreateOrderResponse;
}

export const linkBuildingService = {
  async fetchDrTiers(): Promise<DrTier[]> {
    const response = await apiClient.get<DrTiersResponse>("/api/dr-tiers");
    return response.data;
  },

  async fetchAllOrders(): Promise<LinkBuildingOrderSummary[]> {
    const response = await apiClient.get<OrdersListResponse>(
      "/api/link-building/orders"
    );
    return response.data;
  },

  async fetchMyOrders(): Promise<LinkBuildingOrderSummary[]> {
    const response = await apiClient.get<OrdersListResponse>(
      "/api/link-building/orders"
    );
    return response.data;
  },

  async createLinkBuildingOrder(
    payload: CreateOrderPayload
  ): Promise<CreateOrderResponse> {
    const response = await apiClient.post<CreateOrderApiResponse>(
      "/api/link-building/orders",
      payload
    );
    return response.data;
  },

  async fetchLinkBuildingOrderDetail(
    order_id: string
  ): Promise<LinkBuildingOrderDetail> {
    const response = await apiClient.get<OrderDetailResponse>(
      `/api/link-building/orders/${order_id}`
    );
    return response.data;
  },
};
