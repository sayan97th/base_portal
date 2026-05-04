import { apiClient } from "@/lib/api-client";
import type {
  AdminContentOptimizationTier,
  AdminContentOptimizationOrderFilters,
  CreateContentOptimizationTierPayload,
  UpdateContentOptimizationTierPayload,
} from "@/types/admin/content-optimization";
import type { AdminOrder, OrderStatus, PaginatedResponse } from "@/types/admin";

export async function listAdminContentOptimizationTiers(): Promise<AdminContentOptimizationTier[]> {
  return apiClient.get<AdminContentOptimizationTier[]>("/api/admin/content-optimization-tiers");
}

export async function getAdminContentOptimizationTier(
  id: number | string
): Promise<AdminContentOptimizationTier> {
  return apiClient.get<AdminContentOptimizationTier>(
    `/api/admin/content-optimization-tiers/${id}`
  );
}

export async function createAdminContentOptimizationTier(
  payload: CreateContentOptimizationTierPayload
): Promise<AdminContentOptimizationTier> {
  return apiClient.post<AdminContentOptimizationTier>(
    "/api/admin/content-optimization-tiers",
    payload
  );
}

export async function updateAdminContentOptimizationTier(
  id: number | string,
  payload: UpdateContentOptimizationTierPayload
): Promise<AdminContentOptimizationTier> {
  return apiClient.patch<AdminContentOptimizationTier>(
    `/api/admin/content-optimization-tiers/${id}`,
    payload
  );
}

export async function toggleAdminContentOptimizationTierStatus(
  id: number | string,
  is_active: boolean
): Promise<AdminContentOptimizationTier> {
  return apiClient.patch<AdminContentOptimizationTier>(
    `/api/admin/content-optimization-tiers/${id}`,
    { is_active }
  );
}

export async function deleteAdminContentOptimizationTier(id: number | string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/content-optimization-tiers/${id}`);
}

// ── Content Optimization Orders ────────────────────────────────────────────────

export async function listAdminContentOptimizationOrders(
  filters: AdminContentOptimizationOrderFilters = {}
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
  params.set("product_type", "content_optimization");
  if (search?.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  if (sort_field) params.set("sort_field", sort_field);
  if (sort_direction) params.set("sort_direction", sort_direction);
  if (date_from) params.set("date_from", date_from);
  if (date_to) params.set("date_to", date_to);

  return apiClient.get<PaginatedResponse<AdminOrder>>(
    `/api/admin/orders?${params.toString()}`
  );
}

export async function getAdminContentOptimizationOrder(order_id: string): Promise<AdminOrder> {
  return apiClient.get<AdminOrder>(`/api/admin/orders/${order_id}`);
}

export async function updateAdminContentOptimizationOrderStatus(
  order_id: string,
  status: OrderStatus
): Promise<AdminOrder> {
  return apiClient.patch<AdminOrder>(
    `/api/admin/content-optimization/orders/${order_id}`,
    { status }
  );
}
