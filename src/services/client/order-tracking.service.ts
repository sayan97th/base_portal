import { apiClient } from "@/lib/api-client";
import type { OrderUpdatesListResponse } from "@/types/client/link-building";
import type { CartProductType } from "@/types/client/unified-cart";

const PRODUCT_BASE_PATHS: Record<CartProductType, string> = {
  link_building: "link-building",
  new_content: "new-content",
  content_optimization: "content-optimization",
  content_brief: "content-briefs",
};

export async function fetchOrderUpdates(
  order_id: string
): Promise<OrderUpdatesListResponse> {
  return apiClient.get<OrderUpdatesListResponse>(
    `/api/link-building/orders/${order_id}/updates`
  );
}

export async function fetchOrderUpdatesByType(
  order_id: string,
  product_type: CartProductType
): Promise<OrderUpdatesListResponse> {
  const base = PRODUCT_BASE_PATHS[product_type];
  return apiClient.get<OrderUpdatesListResponse>(
    `/api/${base}/orders/${order_id}/updates`
  );
}
