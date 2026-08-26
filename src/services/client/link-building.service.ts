import { apiClient } from "@/lib/api-client";
import type {
  AdminAssignedPlacementDetail,
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

interface PaginatedOrdersListResponse extends ClientPaginatedResponse<LinkBuildingOrderSummary> {}

interface OrderDetailResponse {
  data: LinkBuildingOrderDetail;
}

interface CreateOrderApiResponse {
  data: CreateOrderResponse;
}

/** Bound used by fetchAllOrders() to keep the dashboard's single order-history request a prudent size. */
const ORDERS_FETCH_LIMIT = 100;

export const linkBuildingService = {
  async fetchDrTiers(): Promise<DrTier[]> {
    const response = await apiClient.get<DrTiersResponse>("/api/dr-tiers");
    return response.data;
  },

  async fetchContentRefreshTiers(): Promise<ContentRefreshTier[]> {
    const response = await apiClient.get<ContentRefreshTiersResponse>("/api/content-refresh-tiers");
    return response.data;
  },

  /**
   * Fetches the client's order history for the dashboard's Order History
   * widget and stats cards, in a single bounded request. The previous
   * implementation called GET /api/link-building/orders with no page or
   * per_page, which silently truncated to the endpoint's default of 10 and
   * made any order older than the 10 most recent disappear.
   *
   * ORDERS_FETCH_LIMIT is intentionally a single, prudent page rather than
   * a loop that walks every page of a client's full history. Order History
   * only ever displays the last 6 months, so this stays a fixed, single
   * request even for accounts with years of orders.
   */
  async fetchAllOrders(): Promise<LinkBuildingOrderSummary[]> {
    const result = await linkBuildingService.fetchMyOrders({
      page: 1,
      per_page: ORDERS_FETCH_LIMIT,
    });

    return result.data;
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
  /**
   * Fetches the detail of a single admin-assigned placement.
   * Hits GET /api/link-building/order-placements/{placement_id}.
   * Only succeeds for placements linked directly to the authenticated user via user_id.
   */
  async fetchAssignedPlacementDetail(
    placement_id: string
  ): Promise<AdminAssignedPlacementDetail> {
    const response = await apiClient.get<{ data: AdminAssignedPlacementDetail }>(
      `/api/link-building/order-placements/${placement_id}`
    );
    return response.data;
  },

  async fetchMyOrderPlacements(
    filters: OrderPlacementFilters = {}
  ): Promise<ClientPaginatedResponse<OrderPlacementRow>> {
    const { page = 1, per_page = 10, search, status, date_from, date_to, dr_type, sort_by, sort_direction } = filters;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(per_page));
    if (search?.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (date_from) params.set("date_from", date_from);
    if (date_to) params.set("date_to", date_to);
    if (dr_type) params.set("dr_type", dr_type);
    if (sort_by) params.set("sort_by", sort_by);
    if (sort_by && sort_direction) params.set("sort_direction", sort_direction);

    return apiClient.get<ClientPaginatedResponse<OrderPlacementRow>>(
      `/api/link-building/order-placements?${params.toString()}`
    );
  },
};
