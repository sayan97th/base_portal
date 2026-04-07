import { apiClient } from "@/lib/api-client";
import type {
  BacklinkOrderRow,
  BacklinkOrderPayload,
  BacklinkOrdersResponse,
  BacklinkOrderMutationResponse,
  BacklinkOrderDeleteResponse,
  BacklinkOrderFilters,
  DashboardSummary,
  TeamCapacityResponse,
  TeamHealthResponse,
} from "@/types/admin/backlink-order";

// ── Dashboard aggregate endpoints ──────────────────────────────────────────────

/**
 * GET /api/admin/dashboard/summary
 * Returns all KPI counts in a single request.
 * Replaces the four parallel listAdminOrders/listAdminClients/listAdminInvoices calls.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient.get<DashboardSummary>("/api/admin/dashboard/summary");
}

/**
 * GET /api/admin/dashboard/team-capacity
 * Returns capacity metrics per staff member computed from assigned backlink orders.
 */
export async function getTeamCapacity(): Promise<TeamCapacityResponse> {
  return apiClient.get<TeamCapacityResponse>("/api/admin/dashboard/team-capacity");
}

/**
 * GET /api/admin/dashboard/team-health
 * Returns on-track vs delayed link counts per staff member.
 */
export async function getTeamHealth(): Promise<TeamHealthResponse> {
  return apiClient.get<TeamHealthResponse>("/api/admin/dashboard/team-health");
}

// ── Backlink Orders ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/backlink-orders
 * Returns a paginated, searchable, sortable list of backlink order rows.
 */
export async function listBacklinkOrders(
  filters: BacklinkOrderFilters = {}
): Promise<BacklinkOrdersResponse> {
  const params = new URLSearchParams();

  if (filters.page)             params.set("page",           String(filters.page));
  if (filters.per_page)         params.set("per_page",       String(filters.per_page));
  if (filters.search?.trim())   params.set("search",         filters.search.trim());
  if (filters.status)           params.set("status",         filters.status);
  if (filters.client)           params.set("client",         filters.client);
  if (filters.link_builder)     params.set("link_builder",   filters.link_builder);
  if (filters.sort_field)       params.set("sort_field",     filters.sort_field);
  if (filters.sort_direction)   params.set("sort_direction", filters.sort_direction);

  const query = params.toString();
  return apiClient.get<BacklinkOrdersResponse>(
    `/api/admin/backlink-orders${query ? `?${query}` : ""}`
  );
}

/**
 * POST /api/admin/backlink-orders
 * Creates a new backlink order row. Returns the persisted row including
 * server-computed fields (days_left, projected_health, id).
 */
export async function createBacklinkOrder(
  payload: BacklinkOrderPayload
): Promise<BacklinkOrderMutationResponse> {
  return apiClient.post<BacklinkOrderMutationResponse>(
    "/api/admin/backlink-orders",
    payload
  );
}

/**
 * PUT /api/admin/backlink-orders/{id}
 * Full replacement update of an existing row. Returns the updated row
 * with recomputed days_left and projected_health.
 */
export async function updateBacklinkOrder(
  id: string,
  payload: BacklinkOrderPayload
): Promise<BacklinkOrderMutationResponse> {
  return apiClient.put<BacklinkOrderMutationResponse>(
    `/api/admin/backlink-orders/${id}`,
    payload
  );
}

/**
 * DELETE /api/admin/backlink-orders/{id}
 * Permanently removes a backlink order row.
 */
export async function deleteBacklinkOrder(
  id: string
): Promise<BacklinkOrderDeleteResponse> {
  return apiClient.delete<BacklinkOrderDeleteResponse>(
    `/api/admin/backlink-orders/${id}`
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Strips server-only / computed fields from a row before sending it as a payload.
 */
export function buildPayload(row: BacklinkOrderRow): BacklinkOrderPayload {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, days_left: _dl, projected_health: _ph, created_at: _ca, updated_at: _ua, ...payload } = row;
  return payload;
}

/**
 * Builds a server-side CSV export URL (includes auth token as query param
 * so the browser download works without extra headers).
 * The token is read from localStorage the same way api-client does it.
 */
export function buildExportUrl(filters: BacklinkOrderFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.search?.trim())   params.set("search",       filters.search.trim());
  if (filters.status)           params.set("status",       filters.status);
  if (filters.client)           params.set("client",       filters.client);
  if (filters.link_builder)     params.set("link_builder", filters.link_builder);

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) params.set("token", token);
  }

  const query = params.toString();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  return `${base}/api/admin/backlink-orders/export${query ? `?${query}` : ""}`;
}
