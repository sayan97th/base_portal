import { apiClient } from "@/lib/api-client";
import type {
  NewsPlacementRow,
  NewsPlacementPayload,
  NewsPlacementsResponse,
  NewsPlacementMutationResponse,
  NewsPlacementDeleteResponse,
  NewsPlacementFilters,
} from "@/types/admin/news-placement";

// ── News Placements ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/news-placements
 * Returns a paginated, searchable, sortable list of news placement rows.
 */
export async function listNewsPlacements(
  filters: NewsPlacementFilters = {}
): Promise<NewsPlacementsResponse> {
  const params = new URLSearchParams();

  if (filters.page)           params.set("page",           String(filters.page));
  if (filters.per_page)       params.set("per_page",       String(filters.per_page));
  if (filters.search?.trim()) params.set("search",         filters.search.trim());
  if (filters.tier)           params.set("tier",           filters.tier);
  if (filters.sort_field)     params.set("sort_field",     filters.sort_field);
  if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);

  const query = params.toString();
  return apiClient.get<NewsPlacementsResponse>(
    `/api/admin/news-placements${query ? `?${query}` : ""}`
  );
}

/**
 * POST /api/admin/news-placements
 * Creates a new news placement row.
 */
export async function createNewsPlacement(
  payload: NewsPlacementPayload
): Promise<NewsPlacementMutationResponse> {
  return apiClient.post<NewsPlacementMutationResponse>(
    "/api/admin/news-placements",
    payload
  );
}

/**
 * PUT /api/admin/news-placements/{id}
 * Full replacement update of an existing row.
 */
export async function updateNewsPlacement(
  id: string,
  payload: NewsPlacementPayload
): Promise<NewsPlacementMutationResponse> {
  return apiClient.put<NewsPlacementMutationResponse>(
    `/api/admin/news-placements/${id}`,
    payload
  );
}

/**
 * DELETE /api/admin/news-placements/{id}
 * Permanently removes a news placement row.
 */
export async function deleteNewsPlacement(
  id: string
): Promise<NewsPlacementDeleteResponse> {
  return apiClient.delete<NewsPlacementDeleteResponse>(
    `/api/admin/news-placements/${id}`
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Strips server-only fields from a row before sending it as a payload.
 */
export function buildPayload(row: NewsPlacementRow): NewsPlacementPayload {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _ca, updated_at: _ua, ...payload } = row;
  return payload;
}

/**
 * Builds a server-side CSV export URL with auth token.
 */
export function buildExportUrl(filters: NewsPlacementFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.tier)           params.set("tier",   filters.tier);

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) params.set("token", token);
  }

  const query = params.toString();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  return `${base}/api/admin/news-placements/export${query ? `?${query}` : ""}`;
}
