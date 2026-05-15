import { apiClient, getToken } from "@/lib/api-client";
import type {
  LinkBuildingOrderRow,
  LinkBuildingOrderPayload,
  LinkBuildingOrdersResponse,
  LinkBuildingOrderMutationResponse,
  LinkBuildingOrderDeleteResponse,
  LinkBuildingOrderSearchBody,
} from "@/types/admin/link-building-order";

// ── Validation ─────────────────────────────────────────────────────────────────

export const REQUIRED_LBO_FIELDS: (keyof LinkBuildingOrderPayload)[] = [
  "link_type",
  "client",
  "keyword",
  "landing_page",
];

export function getMissingLboFields(
  payload: Partial<LinkBuildingOrderPayload>
): (keyof LinkBuildingOrderPayload)[] {
  return REQUIRED_LBO_FIELDS.filter(
    (key) => !payload[key] || String(payload[key]).trim() === ""
  );
}

// ── Laravel error parsing ──────────────────────────────────────────────────────

interface LaravelErrorBody {
  message: string;
  errors?: Record<string, string[]>;
}

export function parseApiErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const body = err as Partial<LaravelErrorBody>;
    if (body.errors) {
      const field_messages = Object.entries(body.errors)
        .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
        .join("; ");
      return field_messages;
    }
    if (typeof body.message === "string" && body.message) {
      return body.message;
    }
  }
  return "An unexpected error occurred. Please try again.";
}

// ── Link Building Orders Dashboard ────────────────────────────────────────────

/**
 * POST /api/admin/link-building-orders/search
 * Returns a paginated, filtered, and sorted list of link building order rows.
 */
export async function listLinkBuildingOrders(
  body: LinkBuildingOrderSearchBody = {}
): Promise<LinkBuildingOrdersResponse> {
  return apiClient.post<LinkBuildingOrdersResponse>(
    "/api/admin/link-building-orders/search",
    body
  );
}

/**
 * POST /api/admin/link-building-orders
 * Creates a new link building order row.
 */
export async function createLinkBuildingOrder(
  payload: LinkBuildingOrderPayload
): Promise<LinkBuildingOrderMutationResponse> {
  return apiClient.post<LinkBuildingOrderMutationResponse>(
    "/api/admin/link-building-orders",
    payload
  );
}

/**
 * PUT /api/admin/link-building-orders/{id}
 * Full replacement update of an existing row.
 */
export async function updateLinkBuildingOrder(
  id: string,
  payload: LinkBuildingOrderPayload
): Promise<LinkBuildingOrderMutationResponse> {
  return apiClient.put<LinkBuildingOrderMutationResponse>(
    `/api/admin/link-building-orders/${id}`,
    payload
  );
}

/**
 * DELETE /api/admin/link-building-orders/{id}
 * Permanently removes a link building order row.
 */
export async function deleteLinkBuildingOrder(
  id: string
): Promise<LinkBuildingOrderDeleteResponse> {
  return apiClient.delete<LinkBuildingOrderDeleteResponse>(
    `/api/admin/link-building-orders/${id}`
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeUrl(value: string): string {
  if (!value || value.trim() === "") return value;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

const URL_FIELDS: (keyof LinkBuildingOrderPayload)[] = [
  "landing_page",
  "partnership",
  "article",
  "live_link",
];

/**
 * Strips server-only / computed fields from a row before sending it as a payload.
 * URL fields are normalized to include a protocol prefix if missing.
 */
export function buildLboPayload(row: LinkBuildingOrderRow): LinkBuildingOrderPayload {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, days_left: _dl, projected_health: _ph, created_at: _ca, updated_at: _ua, ...payload } = row;

  for (const field of URL_FIELDS) {
    if (typeof payload[field] === "string") {
      (payload as Record<string, string>)[field] = normalizeUrl(payload[field] as string);
    }
  }

  return payload;
}

/**
 * POST /api/admin/link-building-orders/export
 * Triggers a CSV file download in the browser.
 */
export async function exportLinkBuildingOrders(
  body: LinkBuildingOrderSearchBody = {}
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const token = getToken();

  const response = await fetch(`${base}/api/admin/link-building-orders/export`, {
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
  anchor.download = `link-building-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
