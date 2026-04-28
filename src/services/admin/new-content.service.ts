import { apiClient } from "@/lib/api-client";
import type {
  AdminNewContentTier,
  CreateNewContentTierPayload,
  UpdateNewContentTierPayload,
} from "@/types/admin/new-content";

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
