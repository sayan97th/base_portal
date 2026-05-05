import { apiClient } from "@/lib/api-client";
import type {
  AdminNewContentTier,
  CreateNewContentTierPayload,
  UpdateNewContentTierPayload,
  AdminNewContentOrderFilters,
} from "@/types/admin/new-content";
import type { AdminOrder, OrderStatus, PaginatedResponse } from "@/types/admin";

export async function listAdminNewContentTiers(): Promise<AdminNewContentTier[]> {
  return apiClient.get<AdminNewContentTier[]>("/api/admin/new-content-tiers");
}

export async function getAdminNewContentTier(id: number | string): Promise<AdminNewContentTier> {
  return apiClient.get<AdminNewContentTier>(`/api/admin/new-content-tiers/${id}`);
}

export async function createAdminNewContentTier(
  payload: CreateNewContentTierPayload
): Promise<AdminNewContentTier> {
  return apiClient.post<AdminNewContentTier>("/api/admin/new-content-tiers", payload);
}

export async function updateAdminNewContentTier(
  id: number | string,
  payload: UpdateNewContentTierPayload
): Promise<AdminNewContentTier> {
  return apiClient.patch<AdminNewContentTier>(
    `/api/admin/new-content-tiers/${id}`,
    payload
  );
}

export async function toggleAdminNewContentTierStatus(
  id: number | string,
  is_active: boolean
): Promise<AdminNewContentTier> {
  return apiClient.patch<AdminNewContentTier>(
    `/api/admin/new-content-tiers/${id}`,
    {
      is_active,
    }
  );
}

export async function deleteAdminNewContentTier(id: number | string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/new-content-tiers/${id}`);
}

// ── New Content Orders ─────────────────────────────────────────────────────────

export async function listAdminNewContentOrders(
  filters: AdminNewContentOrderFilters = {}
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
  params.set("product_type", "new_content");
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

export async function getAdminNewContentOrder(order_id: string): Promise<AdminOrder> {
  return apiClient.get<AdminOrder>(`/api/admin/orders/${order_id}`);
}

export async function updateAdminNewContentOrderStatus(
  order_id: string,
  status: OrderStatus
): Promise<AdminOrder> {
  return apiClient.patch<AdminOrder>(`/api/admin/new-content/orders/${order_id}`, { status });
}
