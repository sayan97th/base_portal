import { apiClient } from "@/lib/api-client";
import type { NewsPost, PostType } from "@/types/admin/news";

export interface PublicNewsFilters {
  limit?: number;
  type?: PostType;
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
};
