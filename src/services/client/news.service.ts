import { apiClient } from "@/lib/api-client";
import type { NewsPost, PostType } from "@/types/admin/news";

export interface PublicNewsFilters {
  limit?: number;
  type?: PostType;
}

export interface PublicNewsPaginatedFilters {
  page?: number;
  per_page?: number;
  type?: PostType | "all";
}

export interface PublicNewsPaginatedResponse {
  posts: NewsPost[];
  current_page: number;
  last_page: number;
  total: number;
}

/**
 * Client-side service for the public-facing news & promos feed.
 * Calls GET /api/news — a Laravel endpoint that returns only active posts,
 * sorted by sort_order ASC then updated_at DESC.
 */
export const newsPublicService = {
  async fetchActivePosts(filters?: PublicNewsFilters): Promise<NewsPost[]> {
    const params = new URLSearchParams();
    params.set("status", "active");
    if (filters?.limit) params.set("per_page", String(filters.limit));
    if (filters?.type) params.set("type", filters.type);
    const response = await apiClient.get<{ data: NewsPost[] }>(
      `/api/news?${params.toString()}`
    );
    return response.data;
  },

  async fetchActivePost(id: string): Promise<NewsPost> {
    const response = await apiClient.get<{ data: NewsPost }>(`/api/news/${id}`);
    return response.data;
  },

  async fetchActivePostsPaginated(
    filters?: PublicNewsPaginatedFilters
  ): Promise<PublicNewsPaginatedResponse> {
    const params = new URLSearchParams();
    params.set("status", "active");
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.per_page) params.set("per_page", String(filters.per_page));
    if (filters?.type && filters.type !== "all") params.set("type", filters.type);
    const response = await apiClient.get<{
      data: NewsPost[];
      current_page: number;
      last_page: number;
      total: number;
    }>(`/api/news?${params.toString()}`);
    return {
      posts: response.data,
      current_page: response.current_page,
      last_page: response.last_page,
      total: response.total,
    };
  },
};
