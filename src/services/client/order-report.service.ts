import { apiClient } from "@/lib/api-client";
import type { OrderReport } from "@/types/admin/order-report";
import type { CartProductType } from "@/types/client/unified-cart";

const PRODUCT_BASE_PATHS: Record<CartProductType, string> = {
  link_building: "link-building",
  new_content: "new-content",
  content_optimization: "content-optimization",
  content_brief: "content-briefs",
};

export async function fetchClientOrderReport(
  order_id: string
): Promise<OrderReport> {
  return apiClient.get<OrderReport>(
    `/api/link-building/orders/${order_id}/report`
  );
}

export async function fetchOrderReportByType(
  order_id: string,
  product_type: CartProductType
): Promise<OrderReport> {
  const base = PRODUCT_BASE_PATHS[product_type];
  return apiClient.get<OrderReport>(`/api/${base}/orders/${order_id}/report`);
}
