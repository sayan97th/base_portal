import { apiClient } from "@/lib/api-client";
import type {
  AdminContentBriefTier,
  CreateContentBriefTierPayload,
  UpdateContentBriefTierPayload,
} from "@/types/admin/content-briefs";

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
