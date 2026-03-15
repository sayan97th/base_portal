import { apiClient } from "@/lib/api-client";
import type {
  AdminOrder,
  AdminLinkBuildingOrder,
  LinkBuildingOrderFilters,
  PaginatedResponse,
  LaravelPaginatedResponse,
  OrderStatus,
} from "@/types/admin";

/**
 * List all orders — staff portal view (paginated).
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminOrders(
  page: number = 1
): Promise<PaginatedResponse<AdminOrder>> {
  return apiClient.get<PaginatedResponse<AdminOrder>>(
    `/api/admin/orders?page=${page}`
  );
}

/**
 * Fetch a single order by ID — admin detail view.
 * Roles allowed: super_admin, admin, staff.
 */
export async function getAdminOrder(order_id: string): Promise<AdminOrder> {
  return apiClient.get<AdminOrder>(`/api/admin/orders/${order_id}`);
}

/**
 * List link-building orders — admin filtered view (paginated).
 * Roles allowed: super_admin only.
 * Supports per_page and optional status filter.
 */
export async function listLinkBuildingOrders(
  filters: LinkBuildingOrderFilters = {}
): Promise<LaravelPaginatedResponse<AdminLinkBuildingOrder>> {
  const { page = 1, per_page = 15, status } = filters;
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("per_page", String(per_page));
  if (status) params.set("status", status as OrderStatus);
  return apiClient.get<LaravelPaginatedResponse<AdminLinkBuildingOrder>>(
    `/api/admin/link-building/orders?${params.toString()}`
  );
}
