import { apiClient } from "@/lib/api-client";
import type { ClientPaginatedResponse } from "@/types/client/link-building";
import type { DeliverableListFilters, DeliverableSummary } from "@/types/client/deliverables";

export const deliverablesService = {
  /**
   * Fetch a paginated list of all deliverables for the authenticated client.
   * Each entry is an order that has an associated report, with aggregated
   * link counts (total, live, pending) and report metadata.
   *
   * Hits GET /api/link-building/deliverables
   */
  async fetchDeliverables(
    filters: DeliverableListFilters = {}
  ): Promise<ClientPaginatedResponse<DeliverableSummary>> {
    const { page = 1, per_page = 10, search, status } = filters;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(per_page));
    if (search?.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);

    return apiClient.get<ClientPaginatedResponse<DeliverableSummary>>(
      `/api/link-building/deliverables?${params.toString()}`
    );
  },
};
