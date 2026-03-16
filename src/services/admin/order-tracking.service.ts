import { apiClient, getToken } from "@/lib/api-client";
import type {
  OrderUpdate,
  OrderUpdatesResponse,
  CreateOrderUpdatePayload,
  TrackingOrdersResponse,
} from "@/types/admin";
import type { OrderStatus } from "@/types/admin";

/**
 * List orders with tracking metadata.
 * - Pass `status` to filter by order status.
 * - Pass `needs_update: true` to return only orders with zero tracking updates (any status).
 * Returns updates_count and last_update_at per order, sorted by urgency.
 * Roles allowed: super_admin, admin, staff.
 */
export async function listTrackingOrders(
  filter?: { status?: OrderStatus; needs_update?: boolean }
): Promise<TrackingOrdersResponse> {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.needs_update) params.set("needs_update", "true");
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
