import { apiClient } from "@/lib/api-client";
import type {
  AdminOrder,
  AdminLinkBuildingOrder,
  AdminOrderFilters,
  LinkBuildingOrderFilters,
  PaginatedResponse,
  LaravelPaginatedResponse,
  OrderStatus,
} from "@/types/admin";

/**
 * List all orders — staff portal view (paginated).
 * Supports search, status filter, and sort.
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminOrders(
  filters: AdminOrderFilters = {}
): Promise<PaginatedResponse<AdminOrder>> {
  const {
    page = 1,
    per_page = 15,
    search,
    status,
    sort_field,
    sort_direction,
    date_from,
    date_to,
  } = filters;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("per_page", String(per_page));
  if (search && search.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  if (sort_field) params.set("sort_field", sort_field);
  if (sort_direction) params.set("sort_direction", sort_direction);
  if (date_from) params.set("date_from", date_from);
  if (date_to) params.set("date_to", date_to);

  return apiClient.get<PaginatedResponse<AdminOrder>>(
    `/api/admin/orders?${params.toString()}`
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
