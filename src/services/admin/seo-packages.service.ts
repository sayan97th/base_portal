import { apiClient } from "@/lib/api-client";
import type {
  AdminSeoPackage,
  CreateSeoPackagePayload,
  UpdateSeoPackagePayload,
} from "@/types/admin/seo-packages";

export async function listAdminSeoPackages(): Promise<AdminSeoPackage[]> {
  return apiClient.get<AdminSeoPackage[]>("/api/admin/seo-packages");
}

export async function getAdminSeoPackage(id: string): Promise<AdminSeoPackage> {
  return apiClient.get<AdminSeoPackage>(`/api/admin/seo-packages/${id}`);
}

export async function createAdminSeoPackage(
  payload: CreateSeoPackagePayload
): Promise<AdminSeoPackage> {
  return apiClient.post<AdminSeoPackage>("/api/admin/seo-packages", payload);
}

export async function updateAdminSeoPackage(
  id: string,
  payload: UpdateSeoPackagePayload
): Promise<AdminSeoPackage> {
  return apiClient.patch<AdminSeoPackage>(`/api/admin/seo-packages/${id}`, payload);
}

export async function toggleAdminSeoPackageStatus(
  id: string,
  is_active: boolean
): Promise<AdminSeoPackage> {
  return apiClient.patch<AdminSeoPackage>(`/api/admin/seo-packages/${id}`, {
    is_active,
  });
}

export async function deleteAdminSeoPackage(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/seo-packages/${id}`);
}
