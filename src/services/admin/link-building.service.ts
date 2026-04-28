import { apiClient } from "@/lib/api-client";
import type {
  AdminLinkBuildingService,
  AdminDrTier,
  AdminDrTierDetail,
  CreateLinkBuildingServicePayload,
  UpdateLinkBuildingServicePayload,
  CreateDrTierPayload,
  UpdateDrTierPayload,
} from "@/types/admin/link-building";
import type {
  AdminContentRefreshTier,
  CreateContentRefreshTierPayload,
  UpdateContentRefreshTierPayload,
} from "@/types/admin/content-refresh";

export async function listAdminLinkBuildingServices(): Promise<AdminLinkBuildingService[]> {
  return apiClient.get<AdminLinkBuildingService[]>("/api/admin/services");
}

export async function getAdminLinkBuildingService(id: string): Promise<AdminLinkBuildingService> {
  return apiClient.get<AdminLinkBuildingService>(`/api/admin/services/${id}`);
}

export async function createAdminLinkBuildingService(
  payload: CreateLinkBuildingServicePayload
): Promise<AdminLinkBuildingService> {
  return apiClient.post<AdminLinkBuildingService>("/api/admin/services", payload);
}

export async function updateAdminLinkBuildingService(
  id: string,
  payload: UpdateLinkBuildingServicePayload
): Promise<AdminLinkBuildingService> {
  return apiClient.patch<AdminLinkBuildingService>(`/api/admin/services/${id}`, payload);
}

export async function toggleAdminLinkBuildingServiceStatus(
  id: string,
  is_active: boolean
): Promise<AdminLinkBuildingService> {
  return apiClient.patch<AdminLinkBuildingService>(`/api/admin/services/${id}`, {
    is_active,
  });
}

export async function deleteAdminLinkBuildingService(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/services/${id}`);
}

// ── DR Tiers ──────────────────────────────────────────────────────────────────

export async function listAdminDrTiers(): Promise<AdminDrTier[]> {
  return apiClient.get<AdminDrTier[]>("/api/admin/dr-tiers");
}

export async function getAdminDrTierDetail(
  id: string
): Promise<AdminDrTierDetail> {
  return apiClient.get<AdminDrTierDetail>(`/api/admin/dr-tiers/${id}`);
}

export async function createAdminDrTier(
  payload: CreateDrTierPayload
): Promise<AdminDrTier> {
  return apiClient.post<AdminDrTier>("/api/admin/dr-tiers", payload);
}

export async function updateAdminDrTier(
  id: string,
  payload: UpdateDrTierPayload
): Promise<AdminDrTier> {
  return apiClient.patch<AdminDrTier>(`/api/admin/dr-tiers/${id}`, payload);
}

export async function toggleAdminDrTierStatus(
  id: string,
  is_active: boolean
): Promise<AdminDrTier> {
  return apiClient.patch<AdminDrTier>(`/api/admin/dr-tiers/${id}`, {
    is_active,
  });
}

export async function hideAdminDrTier(id: string): Promise<AdminDrTier> {
  return apiClient.patch<AdminDrTier>(`/api/admin/dr-tiers/${id}`, {
    is_hidden: true,
  });
}

export async function unhideAdminDrTier(id: string): Promise<AdminDrTier> {
  return apiClient.patch<AdminDrTier>(`/api/admin/dr-tiers/${id}`, {
    is_hidden: false,
  });
}

export async function deleteAdminDrTier(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/dr-tiers/${id}`);
}

// ── Content Refresh Tiers ──────────────────────────────────────────────────────

export async function listAdminContentRefreshTiers(): Promise<AdminContentRefreshTier[]> {
  return apiClient.get<AdminContentRefreshTier[]>("/api/admin/content-refresh-tiers");
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
  return apiClient.patch<AdminContentRefreshTier>(`/api/admin/content-refresh-tiers/${id}`, { is_active });
}

export async function deleteAdminContentRefreshTier(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/content-refresh-tiers/${id}`);
}
