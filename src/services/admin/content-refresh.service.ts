import { apiClient } from "@/lib/api-client";
import type {
  AdminContentRefreshTier,
  AdminContentRefreshOrderFilters,
  CreateContentRefreshTierPayload,
  UpdateContentRefreshTierPayload,
} from "@/types/admin/content-refresh";
import type { AdminOrder, OrderStatus, PaginatedResponse } from "@/types/admin";

export async function listAdminContentRefreshTiers(): Promise<AdminContentRefreshTier[]> {
  return apiClient.get<AdminContentRefreshTier[]>("/api/admin/content-refresh-tiers");
}

export async function getAdminContentRefreshTier(id: string): Promise<AdminContentRefreshTier> {
  return apiClient.get<AdminContentRefreshTier>(`/api/admin/content-refresh-tiers/${id}`);
}

export async function createAdminContentRefreshTier(
  payload: CreateContentRefreshTierPayload
): Promise<AdminContentRefreshTier> {
  return apiClient.post<AdminContentRefreshTier>("/api/admin/content-refresh-tiers", payload);
}

export async function updateAdminContentRefreshTier(
  id: string,
  payload: UpdateContentRefreshTierPayload
): Promise<AdminContentRefreshTier> {
  return apiClient.patch<AdminContentRefreshTier>(`/api/admin/content-refresh-tiers/${id}`, payload);
}

export async function toggleAdminContentRefreshTierStatus(
  id: string,
  is_active: boolean
): Promise<AdminContentRefreshTier> {
  return apiClient.patch<AdminContentRefreshTier>(`/api/admin/content-refresh-tiers/${id}`, {
    is_active,
  });
}

export async function deleteAdminContentRefreshTier(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/content-refresh-tiers/${id}`);
}

// ── Content Refresh Orders ─────────────────────────────────────────────────────

export async function listAdminContentRefreshOrders(
  filters: AdminContentRefreshOrderFilters = {}
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
  params.set("product_type", "content_refresh");
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

export async function getAdminContentRefreshOrder(order_id: string): Promise<AdminOrder> {
  return apiClient.get<AdminOrder>(`/api/admin/orders/${order_id}`);
}

export async function updateAdminContentRefreshOrderStatus(
  order_id: string,
  status: OrderStatus
): Promise<AdminOrder> {
  return apiClient.patch<AdminOrder>(
    `/api/admin/content-refresh/orders/${order_id}`,
    { status }
  );
}
