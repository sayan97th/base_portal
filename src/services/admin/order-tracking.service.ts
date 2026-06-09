import { apiClient, getToken } from "@/lib/api-client";
import type {
  OrderUpdate,
  OrderUpdatesResponse,
  CreateOrderUpdatePayload,
  TrackingOrdersResponse,
} from "@/types/admin";
import type { AdminOrderProductType, OrderStatus } from "@/types/admin";

/**
 * List orders with tracking metadata across all product types.
 * - Pass `status` to filter by order status.
 * - Pass `needs_update: true` to return only orders with zero tracking updates.
 * - Pass `product_type` to filter by a specific product (link_building, new_content, content_optimization, content_brief).
 * Returns updates_count and last_update_at per order, sorted by urgency.
 * Roles allowed: super_admin, admin, staff.
 */
export async function listTrackingOrders(
  filter?: { status?: OrderStatus; needs_update?: boolean; product_type?: AdminOrderProductType }
): Promise<TrackingOrdersResponse> {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.needs_update) params.set("needs_update", "true");
  if (filter?.product_type) params.set("product_type", filter.product_type);
  const query = params.toString();
  return apiClient.get<TrackingOrdersResponse>(
    query ? `/api/admin/tracking/orders?${query}` : `/api/admin/tracking/orders`
  );
}

/**
 * List all tracking updates for a given order — admin view.
 * Roles allowed: super_admin, admin, staff.
 */
export async function listOrderUpdates(
  order_id: string
): Promise<OrderUpdatesResponse> {
  return apiClient.get<OrderUpdatesResponse>(
    `/api/admin/orders/${order_id}/updates`
  );
}

/**
 * Create a new tracking update for an order.
 * Optionally changes the order status and triggers an email to the client.
 * Roles allowed: super_admin, admin, staff.
 */
export async function createOrderUpdate(
  order_id: string,
  payload: CreateOrderUpdatePayload
): Promise<OrderUpdate> {
  return apiClient.post<OrderUpdate>(
    `/api/admin/orders/${order_id}/updates`,
    payload
  );
}

/**
 * Delete a tracking update by ID.
 * Roles allowed: super_admin, admin.
 */
export async function deleteOrderUpdate(
  order_id: string,
  update_id: string
): Promise<void> {
  return apiClient.delete<void>(
    `/api/admin/orders/${order_id}/updates/${update_id}`
  );
}

/**
 * List orders that need an update: status is "pending" and no tracking update
 * has been sent yet (updates_count = 0).
 * Calls the dedicated Next.js API route at /api/admin/tracking/needs-update.
 * Roles allowed: super_admin, admin, staff.
 */
export async function listNeedsUpdateOrders(): Promise<TrackingOrdersResponse> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch("/api/admin/tracking/needs-update", { headers });
  if (!response.ok) {
    const error_data = await response.json().catch(() => ({
      message: "Failed to load needs-update orders",
    }));
    throw error_data;
  }
  return response.json() as Promise<TrackingOrdersResponse>;
}

/**
 * Fetch a single order tracking summary by ID, searching across all product types.
 * Roles allowed: super_admin, admin, staff.
 */
export async function getTrackingOrder(
  order_id: string
): Promise<{ data: import("@/types/admin").TrackingOrderSummary }> {
  return apiClient.get<{ data: import("@/types/admin").TrackingOrderSummary }>(
    `/api/admin/tracking/orders/${order_id}`
  );
}

/**
 * Update the status of an order directly (without creating a tracking entry).
 * Pass notify_user: true to trigger an email notification to the client.
 * Roles allowed: super_admin, admin, staff.
 */
export async function updateOrderStatus(
  order_id: string,
  status: OrderStatus,
  notify_user: boolean = false
): Promise<{ message: string; status: OrderStatus }> {
  return apiClient.patch<{ message: string; status: OrderStatus }>(
    `/api/admin/orders/${order_id}/status`,
    { status, notify_user }
  );
}
