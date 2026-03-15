import { apiClient } from "@/lib/api-client";
import type { OrderUpdatesListResponse } from "@/types/client/link-building";

/**
 * Fetch all tracking updates for a client's order.
 * Authenticated as the order owner.
 */
export async function fetchOrderUpdates(
  order_id: string
): Promise<OrderUpdatesListResponse> {
  return apiClient.get<OrderUpdatesListResponse>(
    `/api/link-building/orders/${order_id}/updates`
  );
}
