import { apiClient } from "@/lib/api-client";
import type {
  AdminResource,
  AdminResourceFile,
  CreateResourcePayload,
  UpdateResourcePayload,
  AdminResourceFilters,
  AdminResourcePaginatedResponse,
} from "@/types/admin/resources";

/**
 * Fetch a paginated list of all resources (admin view, all orgs).
 * Hits GET /api/admin/resources
 */
export async function listAdminResources(
  filters: AdminResourceFilters = {}
): Promise<AdminResourcePaginatedResponse> {
  const { page = 1, per_page = 15, search, category, status } = filters;
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("per_page", String(per_page));
  if (search?.trim()) params.set("search", search.trim());
  if (category && category !== "all") params.set("category", category);
  if (status && status !== "all") params.set("status", status);

  return apiClient.get<AdminResourcePaginatedResponse>(
    `/api/admin/resources?${params.toString()}`
  );
}

/**
 * Fetch a single resource with all its files.
 * Hits GET /api/admin/resources/{id}
 */
export async function getAdminResource(id: number): Promise<AdminResource> {
  const response = await apiClient.get<{ data: AdminResource }>(
    `/api/admin/resources/${id}`
  );
  return response.data;
}

/**
 * Create a new resource (metadata only — files are uploaded separately).
 * Hits POST /api/admin/resources
 */
export async function createAdminResource(
  payload: CreateResourcePayload
): Promise<AdminResource> {
  const response = await apiClient.post<{ data: AdminResource }>(
    "/api/admin/resources",
    payload
  );
  return response.data;
}

/**
 * Update an existing resource's metadata.
 * Hits PATCH /api/admin/resources/{id}
 */
export async function updateAdminResource(
  id: number,
  payload: UpdateResourcePayload
): Promise<AdminResource> {
  const response = await apiClient.patch<{ data: AdminResource }>(
    `/api/admin/resources/${id}`,
    payload
  );
  return response.data;
}

/**
 * Toggle a resource's status between published and draft.
 * Hits PATCH /api/admin/resources/{id}
 */
export async function toggleAdminResourceStatus(
  id: number,
  status: "published" | "draft"
): Promise<AdminResource> {
  const response = await apiClient.patch<{ data: AdminResource }>(
    `/api/admin/resources/${id}`,
    { status }
  );
  return response.data;
}

/**
 * Delete a resource and all its associated files.
 * Hits DELETE /api/admin/resources/{id}
 */
export async function deleteAdminResource(id: number): Promise<void> {
  return apiClient.delete<void>(`/api/admin/resources/${id}`);
}

/**
 * Upload a single file attachment to an existing resource.
 * Hits POST /api/admin/resources/{id}/files (multipart/form-data)
 * Returns the newly created ResourceFile record.
 */
export async function uploadAdminResourceFile(
  resource_id: number,
  file: File
): Promise<AdminResourceFile> {
  const form_data = new FormData();
  form_data.append("file", file);
  const response = await apiClient.postFormData<{ data: AdminResourceFile }>(
    `/api/admin/resources/${resource_id}/files`,
    form_data
  );
  return response.data;
}

/**
 * Delete a single file attachment from a resource.
 * Hits DELETE /api/admin/resources/{id}/files/{file_id}
 */
export async function deleteAdminResourceFile(
  resource_id: number,
  file_id: number
): Promise<void> {
  return apiClient.delete<void>(
    `/api/admin/resources/${resource_id}/files/${file_id}`
  );
}
