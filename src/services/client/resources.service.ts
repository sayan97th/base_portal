import { apiClient } from "@/lib/api-client";
import type { Resource, ResourceListFilters, ResourceListResponse } from "@/types/client/resources";

export const resourcesService = {
  /**
   * Fetch a paginated list of resources for the authenticated client.
   * Hits GET /api/resources
   */
  async fetchResources(filters: ResourceListFilters = {}): Promise<ResourceListResponse> {
    const { page = 1, per_page = 12, search, category } = filters;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(per_page));
    if (search?.trim()) params.set("search", search.trim());
    if (category && category !== "all") params.set("category", category);

    return apiClient.get<ResourceListResponse>(`/api/resources?${params.toString()}`);
  },

  /**
   * Fetch a single resource with its files.
   * Hits GET /api/resources/{id}
   */
  async fetchResource(id: number): Promise<Resource> {
    return apiClient.get<Resource>(`/api/resources/${id}`);
  },

  /**
   * Fetch the most recent resources for the dashboard widget.
   * Hits GET /api/resources?per_page={limit}&page=1
   */
  async fetchLatestResources(limit: number = 3): Promise<Resource[]> {
    const response = await resourcesService.fetchResources({ page: 1, per_page: limit });
    return response.data;
  },
};
