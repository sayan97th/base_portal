import { apiClient, getToken } from "@/lib/api-client";
import type {
  BacklinkOrderRow,
  BacklinkOrderPayload,
  BacklinkOrdersResponse,
  BacklinkOrderMutationResponse,
  BacklinkOrderDeleteResponse,
  BacklinkOrderSearchBody,
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
 * POST /api/admin/backlink-orders/search
 * Returns a paginated, filtered, and multi-column sorted list of backlink order rows.
 * All filter and sort state is sent as a JSON body so complex column filters
 * (number ranges, date ranges, multi-select) are cleanly supported.
 */
export async function listBacklinkOrders(
  body: BacklinkOrderSearchBody = {}
): Promise<BacklinkOrdersResponse> {
  return apiClient.post<BacklinkOrdersResponse>(
    "/api/admin/backlink-orders/search",
    body
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
 * POST /api/admin/backlink-orders/export
 * Sends the full filter + sort body and triggers a CSV file download in the browser.
 * Uses fetch directly so the response blob can be turned into a download link.
 */
export async function exportBacklinkOrders(
  body: BacklinkOrderSearchBody = {}
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const token = getToken();

  const response = await fetch(`${base}/api/admin/backlink-orders/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/csv",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Export failed" }));
    throw error;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `backlink-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
