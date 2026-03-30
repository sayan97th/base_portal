import { apiClient } from "@/lib/api-client";
import type {
  NewsPost,
  CreateNewsPostPayload,
  UpdateNewsPostPayload,
  AdminNewsFilters,
} from "@/types/admin/news";

export async function listAdminNewsPosts(filters?: AdminNewsFilters): Promise<NewsPost[]> {
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.per_page) params.set("per_page", String(filters.per_page));
  if (filters?.search) params.set("search", filters.search);
  if (filters?.type && filters.type !== "all") params.set("type", filters.type);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);

  const query = params.toString();
  const url = query ? `/api/admin/news?${query}` : "/api/admin/news";
  const response = await apiClient.get<{ data: NewsPost[] }>(url);
  return response.data;
}

export async function getAdminNewsPost(id: string): Promise<NewsPost> {
  const response = await apiClient.get<{ data: NewsPost }>(`/api/admin/news/${id}`);
  return response.data;
}

export async function createAdminNewsPost(payload: CreateNewsPostPayload): Promise<NewsPost> {
  const response = await apiClient.post<{ data: NewsPost }>("/api/admin/news", payload);
  return response.data;
}

export async function updateAdminNewsPost(
  id: string,
  payload: UpdateNewsPostPayload
): Promise<NewsPost> {
  const response = await apiClient.patch<{ data: NewsPost }>(`/api/admin/news/${id}`, payload);
  return response.data;
}

export async function toggleAdminNewsPostStatus(
  id: string,
  status: "active" | "draft" | "archived"
): Promise<NewsPost> {
  const response = await apiClient.patch<{ data: NewsPost }>(`/api/admin/news/${id}`, { status });
  return response.data;
}

export async function deleteAdminNewsPost(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/news/${id}`);
}

export interface NewsImageUploadResponse {
  url: string;
  path: string;
}

export async function uploadAdminNewsImage(file: File): Promise<NewsImageUploadResponse> {
  const form_data = new FormData();
  form_data.append("image", file);
  return apiClient.postFormData<NewsImageUploadResponse>("/api/admin/news/upload", form_data);
}
