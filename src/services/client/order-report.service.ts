import { apiClient } from "@/lib/api-client";
import type { OrderReport } from "@/types/admin/order-report";

/**
 * Fetch the full report for a client's order (all tables + rows).
 * Authenticated as the order owner.
 */
export async function fetchClientOrderReport(
  order_id: string
): Promise<OrderReport> {
  return apiClient.get<OrderReport>(
    `/api/link-building/orders/${order_id}/report`
  );
}
