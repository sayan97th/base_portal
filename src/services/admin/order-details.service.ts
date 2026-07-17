import { apiClient } from "@/lib/api-client";
import type {
  LinkBuildingDetailsPlacement,
  NewContentDetailsItem,
  KeywordUrlDetailsItem,
  OrderDetailsResult,
} from "@/services/client/order-details.service";

interface OrderDetailsResponse {
  data: OrderDetailsResult;
}

/**
 * Admin-side submission of an order's deferred intake details. Lets an admin
 * fill keyword / target URL / content details on the client's behalf. Targets
 * the `/api/admin/orders/{id}/{product}-details` endpoints, which run the same
 * status-transition and turnaround logic as the client flow.
 */
export const adminOrderDetailsService = {
  async submitLinkBuilding(
    order_id: string,
    placements: LinkBuildingDetailsPlacement[]
  ): Promise<OrderDetailsResult> {
    const response = await apiClient.put<OrderDetailsResponse>(
      `/api/admin/orders/${order_id}/link-building-details`,
      { placements }
    );
    return response.data;
  },

  async submitNewContent(
    order_id: string,
    items: NewContentDetailsItem[]
  ): Promise<OrderDetailsResult> {
    const response = await apiClient.put<OrderDetailsResponse>(
      `/api/admin/orders/${order_id}/new-content-details`,
      { items }
    );
    return response.data;
  },

  async submitContentOptimization(
    order_id: string,
    items: KeywordUrlDetailsItem[]
  ): Promise<OrderDetailsResult> {
    const response = await apiClient.put<OrderDetailsResponse>(
      `/api/admin/orders/${order_id}/content-optimization-details`,
      { items }
    );
    return response.data;
  },

  async submitContentBrief(
    order_id: string,
    items: KeywordUrlDetailsItem[]
  ): Promise<OrderDetailsResult> {
    const response = await apiClient.put<OrderDetailsResponse>(
      `/api/admin/orders/${order_id}/content-brief-details`,
      { items }
    );
    return response.data;
  },
};
