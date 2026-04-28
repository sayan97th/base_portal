import { apiClient } from "@/lib/api-client";
import type {
  AdminContentRefreshTier,
  CreateContentRefreshTierPayload,
  UpdateContentRefreshTierPayload,
} from "@/types/admin/content-refresh";

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
