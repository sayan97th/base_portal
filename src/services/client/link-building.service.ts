import { apiClient } from "@/lib/api-client";
import type {
  CartPayload,
  CartResponse,
  ClientPaginatedResponse,
  ContentRefreshTier,
  CreateOrderPayload,
  CreateOrderResponse,
  DrTier,
  LinkBuildingOrderDetail,
  LinkBuildingOrderSummary,
  OrderListFilters,
  OrderPlacementFilters,
  OrderPlacementRow,
} from "@/types/client/link-building";

interface DrTiersResponse {
  data: DrTier[];
}

interface ContentRefreshTiersResponse {
  data: ContentRefreshTier[];
}

interface OrdersListResponse {
  data: LinkBuildingOrderSummary[];
}

interface PaginatedOrdersListResponse extends ClientPaginatedResponse<LinkBuildingOrderSummary> {}

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

  async fetchContentRefreshTiers(): Promise<ContentRefreshTier[]> {
    const response = await apiClient.get<ContentRefreshTiersResponse>("/api/content-refresh-tiers");
    return response.data;
  },

  async fetchAllOrders(): Promise<LinkBuildingOrderSummary[]> {
    const response = await apiClient.get<OrdersListResponse>(
      "/api/link-building/orders"
    );
    return response.data;
  },

  async fetchMyOrders(
    filters: OrderListFilters = {}
  ): Promise<PaginatedOrdersListResponse> {
    const { page = 1, per_page = 10, search } = filters;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(per_page));
    if (search?.trim()) params.set("search", search.trim());
    return apiClient.get<PaginatedOrdersListResponse>(
      `/api/link-building/orders?${params.toString()}`
    );
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

  // ── Cart ───────────────────────────────────────────────────────────────────

  /**
   * GET /api/link-building/cart
   * Returns the authenticated user's saved cart, or null if none exists.
   */
  async fetchCart(): Promise<CartPayload | null> {
    const response = await apiClient.get<CartResponse>("/api/link-building/cart");
    return response.data;
  },

  /**
   * PUT /api/link-building/cart
   * Creates or fully replaces the user's saved cart on the server.
   */
  async saveCart(payload: CartPayload): Promise<void> {
    await apiClient.put("/api/link-building/cart", payload);
  },

  /**
   * DELETE /api/link-building/cart
   * Removes the user's saved cart from the server (called after order completion
   * or when the user explicitly clears the cart).
   */
  async deleteCart(): Promise<void> {
    await apiClient.delete("/api/link-building/cart");
  },

  /**
   * Fetches paginated, flat placement rows for the dashboard table.
   * Hits GET /api/link-building/order-placements — a Laravel endpoint that
   * joins orders → items (with dr_tier) → placements and returns a standard
   * paginator response.
   *
   * Query params forwarded to the backend:
   *   page, per_page, search (order_id / keyword / status), status
   */
  async fetchMyOrderPlacements(
    filters: OrderPlacementFilters = {}
  ): Promise<ClientPaginatedResponse<OrderPlacementRow>> {
    const { page = 1, per_page = 10, search, status } = filters;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(per_page));
    if (search?.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);

    return apiClient.get<ClientPaginatedResponse<OrderPlacementRow>>(
      `/api/link-building/order-placements?${params.toString()}`
    );
  },
};
