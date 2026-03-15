import { apiClient } from "@/lib/api-client";
import type {
  AdminService,
  AdminDrTier,
  AdminDrTierDetail,
  CreateServicePayload,
  UpdateServicePayload,
  CreateDrTierPayload,
  UpdateDrTierPayload,
} from "@/types/admin/services";

export async function listAdminServices(): Promise<AdminService[]> {
  return apiClient.get<AdminService[]>("/api/admin/services");
}

export async function getAdminService(id: string): Promise<AdminService> {
  return apiClient.get<AdminService>(`/api/admin/services/${id}`);
}

export async function createAdminService(
  payload: CreateServicePayload
): Promise<AdminService> {
  return apiClient.post<AdminService>("/api/admin/services", payload);
}

export async function updateAdminService(
  id: string,
  payload: UpdateServicePayload
): Promise<AdminService> {
  return apiClient.patch<AdminService>(`/api/admin/services/${id}`, payload);
}

export async function toggleAdminServiceStatus(
  id: string,
  is_active: boolean
): Promise<AdminService> {
  return apiClient.patch<AdminService>(`/api/admin/services/${id}`, {
    is_active,
  });
}

export async function deleteAdminService(id: string): Promise<void> {
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
