import { apiClient } from "@/lib/api-client";
import type {
  AdminContentOptimizationTier,
  CreateContentOptimizationTierPayload,
  UpdateContentOptimizationTierPayload,
} from "@/types/admin/content-optimization";

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
