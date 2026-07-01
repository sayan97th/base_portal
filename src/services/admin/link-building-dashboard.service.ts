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

export function parseApiErrorMessage(
  err: unknown,
  field_labels?: Record<string, string>
): string {
  if (err && typeof err === "object") {
    const body = err as Partial<LaravelErrorBody>;
    if (body.errors && Object.keys(body.errors).length > 0) {
      const field_messages = Object.entries(body.errors)
        .map(([field, msgs]) => {
          const label = field_labels?.[field] ?? field.replace(/_/g, " ");
          return `${label}: ${msgs.join(", ")}`;
        })
        .join("; ");
      return field_messages;
    }
    if (typeof body.message === "string" && body.message) {
      return body.message;
    }
  }
  return "An unexpected error occurred. Please try again.";
}

// ── Admin teams for select dropdowns ──────────────────────────────────────────

export interface AdminTeamOption {
  id: string;
  name: string;
  color: string;
  max_capacity: number;
}

/**
 * GET /api/admin/teams/for-select
 * Returns the lightweight list of active admin teams used in the LBO assign-team dropdown.
 */
export async function listTeamsForSelect(): Promise<AdminTeamOption[]> {
  const res = await apiClient.get<{ data: AdminTeamOption[] }>("/api/admin/teams/for-select");
  return res.data;
}

// ── Admin users for assignable-user dropdown ───────────────────────────────────

export interface AdminUserOption {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

/**
 * GET /api/admin/link-building-orders/assignable-users
 * Returns admin-side users (super_admin, admin, staff) for the "Assigned To" dropdown.
 */
export async function listAdminUsersForSelect(): Promise<AdminUserOption[]> {
  const res = await apiClient.get<{ data: AdminUserOption[] }>("/api/admin/link-building-orders/assignable-users");
  return res.data;
}

// ── Client users for client-account dropdown ──────────────────────────────────

export interface ClientUserOption {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  company: string;
}

/**
 * GET /api/admin/link-building-orders/assignable-clients
 * Returns client-role users for the "Client Account" dropdown.
 */
export async function listClientUsersForSelect(): Promise<ClientUserOption[]> {
  const res = await apiClient.get<{ data: ClientUserOption[] }>("/api/admin/link-building-orders/assignable-clients");
  return res.data;
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
 *
 * order_id is only included by the caller when the admin explicitly edited that
 * cell (see persistRowUpdate in LinkBuildingOrdersTable.tsx) — omitting it otherwise
 * avoids accidentally persisting a client-purchased row's UUID-derived fallback
 * display ID as a side effect of editing an unrelated field.
 */
export async function updateLinkBuildingOrder(
  id: string,
  payload: Partial<LinkBuildingOrderPayload>
): Promise<LinkBuildingOrderMutationResponse> {
  return apiClient.put<LinkBuildingOrderMutationResponse>(
    `/api/admin/link-building-orders/${id}`,
    payload
  );
}

/**
 * POST /api/admin/link-building-orders/batch-update
 * Updates one or more fields across multiple rows atomically.
 */
export async function batchUpdateLinkBuildingOrders(
  row_ids: string[],
  updates: Partial<Record<keyof LinkBuildingOrderRow, string | null>>
): Promise<{ message: string; updated_count: number }> {
  return apiClient.post("/api/admin/link-building-orders/batch-update", {
    row_ids,
    updates,
  });
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
  "live_link",
];

/**
 * Strips server-only / computed fields from a row before sending it as a payload.
 * URL fields are normalized to include a protocol prefix if missing.
 */
export function buildLboPayload(row: LinkBuildingOrderRow): LinkBuildingOrderPayload {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    id: _id,
    admin_team_name: _atn,
    admin_team_color: _atc,
    assigned_admin_user_name: _aaun,
    assigned_admin_user_avatar: _aaav,
    created_at: _ca,
    updated_at: _ua,
    ...payload
  } = row;

  for (const field of URL_FIELDS) {
    if (typeof payload[field] === "string") {
      (payload as unknown as Record<string, string>)[field] = normalizeUrl(payload[field] as string);
    }
  }

  if (payload.admin_team_id === "") {
    payload.admin_team_id = null;
  }

  if ((payload.assigned_admin_user_id as unknown as string) === "") {
    payload.assigned_admin_user_id = null;
  }

  return payload;
}

// ── Import ─────────────────────────────────────────────────────────────────────

export interface ImportStatus {
  status: "queued" | "processing" | "completed" | "failed";
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  /** Number of rows whose "Link Builder" column matched an admin user and were auto-assigned. */
  assigned?: number;
  errors: Array<{ order_id: string; message: string }>;
  /** Per-row skip details (up to 100 entries). Explains exactly why each record was not imported. */
  skipped_records?: Array<{ order_id: string; reason: string }>;
}

export interface ImportStartResponse {
  message: string;
  import_id: string;
  total: number;
}

export interface ImportOptions {
  /** When false, no date filtering is applied. Defaults to true. */
  apply_date_filter: boolean;
  /** Lower bound in MM/DD/YYYY format. Only used when apply_date_filter is true. */
  date_from?: string;
  /** Upper bound in MM/DD/YYYY format. Only used when apply_date_filter is true. */
  date_to?: string;
  /** Controls which link types are imported. Defaults to 'external_only'. */
  link_type_filter: "external_only" | "internal_only" | "all";
  /** When true, rows whose order_id already exists are left untouched and counted as skipped instead of being updated. Defaults to false. */
  only_new_records: boolean;
}

/**
 * POST /api/admin/link-building-orders/import
 * Uploads a CSV file and starts a background batch-import job.
 * Calls onUploadProgress(0-100) during the file transfer phase.
 * Returns an import_id that can be polled via getLinkBuildingImportStatus().
 */
export function importLinkBuildingOrders(
  file: File,
  options: ImportOptions,
  onUploadProgress?: (percent: number) => void
): Promise<ImportStartResponse> {
  return new Promise((resolve, reject) => {
    const base  = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    const token = getToken();

    const form_data = new FormData();
    form_data.append("file", file);
    form_data.append("apply_date_filter", options.apply_date_filter ? "1" : "0");
    if (options.apply_date_filter && options.date_from) {
      form_data.append("date_from", options.date_from);
    }
    if (options.apply_date_filter && options.date_to) {
      form_data.append("date_to", options.date_to);
    }
    form_data.append("link_type_filter", options.link_type_filter);
    form_data.append("only_new_records", options.only_new_records ? "1" : "0");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/api/admin/link-building-orders/import`);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    xhr.setRequestHeader("Accept", "application/json");

    if (onUploadProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as ImportStartResponse);
        } catch {
          reject(new Error("Invalid response from server."));
        }
      } else {
        try {
          reject(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}.`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload was cancelled.")));

    xhr.send(form_data);
  });
}

/**
 * GET /api/admin/link-building-orders/import-status/{import_id}
 * Returns the current progress of a running or completed import job.
 */
export async function getLinkBuildingImportStatus(
  import_id: string
): Promise<ImportStatus> {
  return apiClient.get<ImportStatus>(
    `/api/admin/link-building-orders/import-status/${import_id}`
  );
}

export interface ResolveAssignmentsResult {
  message: string;
  resolved: number;
  unchanged: number;
}

/**
 * POST /api/admin/link-building-orders/resolve-assignments
 *
 * Scans all existing placements that have a link_builder value and tries to
 * match each one to an admin-side user by name. Useful for mass-updating
 * records imported before the auto-assign feature was introduced.
 */
export async function resolveAssignments(): Promise<ResolveAssignmentsResult> {
  return apiClient.post<ResolveAssignmentsResult>(
    "/api/admin/link-building-orders/resolve-assignments",
    {}
  );
}

/**
 * POST /api/admin/link-building-orders/export
 * Triggers a CSV file download in the browser.
 *
 * When `row_ids` is provided, only those specific rows are exported and
 * all filter parameters from `body` are ignored by the backend.
 */
export async function exportLinkBuildingOrders(
  body: LinkBuildingOrderSearchBody = {},
  row_ids?: string[]
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const token = getToken();

  const request_body =
    row_ids && row_ids.length > 0 ? { row_ids } : body;

  const response = await fetch(`${base}/api/admin/link-building-orders/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/csv",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request_body),
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
