import { apiClient } from "@/lib/api-client";
import type {
  OrderUpdate,
  OrderUpdatesResponse,
  CreateOrderUpdatePayload,
} from "@/types/admin";
import type { OrderStatus } from "@/types/admin";

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
 * Update the status of an order directly (without creating a tracking entry).
 * Roles allowed: super_admin, admin, staff.
 */
export async function updateOrderStatus(
  order_id: string,
  status: OrderStatus
): Promise<{ message: string; status: OrderStatus }> {
  return apiClient.patch<{ message: string; status: OrderStatus }>(
    `/api/admin/orders/${order_id}/status`,
    { status }
  );
}
