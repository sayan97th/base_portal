import { apiClient } from "@/lib/api-client";
import type { Organization, PaginatedResponse } from "@/types/admin";

export interface UpdateOrganizationData {
  name: string;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_link: string | null;
  logo_light: string | null;
  logo_dark: string | null;
  icon_light: string | null;
  icon_dark: string | null;
  mobile_app_icon: string | null;
  primary_color: string | null;
  accent_color: string | null;
  timezone: string;
  is_active: boolean;
}

export type OrgAssetField =
  | "logo_light"
  | "logo_dark"
  | "icon_light"
  | "icon_dark"
  | "mobile_app_icon";

export interface AssetUploadResponse {
  url: string;
  path: string;
  field: OrgAssetField;
}

/**
 * List all organizations (paginated).
 * Roles allowed: super_admin, admin, staff.
 */
export async function listAdminOrganizations(
  page: number = 1
): Promise<PaginatedResponse<Organization>> {
  return apiClient.get<PaginatedResponse<Organization>>(
    `/api/admin/organizations?page=${page}`
  );
}

/**
 * Get a single organization by ID.
 */
export async function getAdminOrganization(id: number): Promise<Organization> {
  return apiClient.get<Organization>(`/api/admin/organizations/${id}`);
}

/**
 * Update organization details.
 */
export async function updateAdminOrganization(
  id: number,
  data: UpdateOrganizationData
): Promise<Organization> {
  return apiClient.put<Organization>(`/api/admin/organizations/${id}`, data);
}

/**
 * Upload a single brand asset (logo or icon) for an organization.
 * Returns the stored file URL and server-side path.
 */
export async function uploadOrganizationAsset(
  id: number,
  field: OrgAssetField,
  file: File
): Promise<AssetUploadResponse> {
  const form_data = new FormData();
  form_data.append("field", field);
  form_data.append("file", file);
  return apiClient.postFormData<AssetUploadResponse>(
    `/api/admin/organizations/${id}/assets`,
    form_data
  );
}
