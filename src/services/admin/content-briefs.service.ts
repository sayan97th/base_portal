import { apiClient } from "@/lib/api-client";
import type {
  AdminContentBriefTier,
  CreateContentBriefTierPayload,
  UpdateContentBriefTierPayload,
} from "@/types/admin/content-briefs";
import type { AdminOrder, OrderStatus, PaginatedResponse } from "@/types/admin";

export interface AdminContentBriefOrderFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: OrderStatus | "";
  sort_field?: string;
  sort_direction?: "asc" | "desc";
  date_from?: string;
  date_to?: string;
}

export async function listAdminContentBriefTiers(): Promise<AdminContentBriefTier[]> {
  return apiClient.get<AdminContentBriefTier[]>("/api/admin/content-brief-tiers");
}

export async function getAdminContentBriefTier(id: string): Promise<AdminContentBriefTier> {
  return apiClient.get<AdminContentBriefTier>(`/api/admin/content-brief-tiers/${id}`);
}

export async function createAdminContentBriefTier(
  payload: CreateContentBriefTierPayload
): Promise<AdminContentBriefTier> {
  return apiClient.post<AdminContentBriefTier>("/api/admin/content-brief-tiers", payload);
}

export async function updateAdminContentBriefTier(
  id: string,
  payload: UpdateContentBriefTierPayload
): Promise<AdminContentBriefTier> {
  return apiClient.patch<AdminContentBriefTier>(
    `/api/admin/content-brief-tiers/${id}`,
    payload
  );
}

export async function toggleAdminContentBriefTierStatus(
  id: string,
  is_active: boolean
): Promise<AdminContentBriefTier> {
  return apiClient.patch<AdminContentBriefTier>(
    `/api/admin/content-brief-tiers/${id}`,
    { is_active }
  );
}

export async function deleteAdminContentBriefTier(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/content-brief-tiers/${id}`);
}

// ── Content Brief Orders ────────────────────────────────────────────────────────

export async function listAdminContentBriefOrders(
  filters: AdminContentBriefOrderFilters = {}
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
  params.set("product_type", "content_brief");
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

export async function getAdminContentBriefOrder(order_id: string): Promise<AdminOrder> {
  return apiClient.get<AdminOrder>(`/api/admin/orders/${order_id}`);
}

export async function updateAdminContentBriefOrderStatus(
  order_id: string,
  status: OrderStatus
): Promise<AdminOrder> {
  return apiClient.patch<AdminOrder>(
    `/api/admin/content-briefs/orders/${order_id}`,
    { status }
  );
}
