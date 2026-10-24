import { apiClient, getToken } from "@/lib/api-client";
import type {
  LinkBuildingOrderRow,
  LinkBuildingOrderPayload,
  LinkBuildingOrdersResponse,
  LinkBuildingOrderMutationResponse,
  LinkBuildingOrderDeleteResponse,
  LinkBuildingOrderSearchBody,
  LinkBuildingOrderFilterValuesResponse,
  LinkBuildingOrderQuickFilterValuesResponse,
  LinkBuildingOrderRowsResponse,
  ArticleDocTitle,
} from "@/types/admin/link-building-order";
import type { LinkBuildingChangeSource } from "@/types/admin/link-building-order-history";

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

/**
 * GET /api/admin/link-building-orders/pen-names
 * Returns every distinct pen name already used on the dashboard, sorted
 * alphabetically, for the Pen Name cell dropdown.
 */
export async function listPenNamesForSelect(): Promise<string[]> {
  const res = await apiClient.get<{ data: string[] }>("/api/admin/link-building-orders/pen-names");
  return res.data;
}

/**
 * GET /api/admin/link-building-orders/article-doc-title
 * Returns the title of the Google Doc linked in an Article cell, read on the
 * server from the doc's public page and cached there.
 */
export async function getArticleDocTitle(url: string): Promise<ArticleDocTitle> {
  const res = await apiClient.get<{ data: ArticleDocTitle }>(
    `/api/admin/link-building-orders/article-doc-title?url=${encodeURIComponent(url)}`
  );
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

/**
 * GET /api/admin/link-building-orders/needs-approval-count
 * Returns the number of "Live" orders that still have no LB TL Approval value,
 * used to badge the "Needs LB TL Approval" filter toggle.
 */
export async function getNeedsLbTlApprovalCount(): Promise<number> {
  const res = await apiClient.get<{ count: number }>("/api/admin/link-building-orders/needs-approval-count");
  return res.count;
}

/**
 * POST /api/admin/link-building-orders/quick-filter-values
 * Distinct values and row counts of several columns in one request, for the
 * Quick filters panel. Each column's list ignores its own filter only, and
 * `value_search` narrows the value columns to values containing it.
 */
export async function getLinkBuildingOrderQuickFilterValues(
  columns: string[],
  body: LinkBuildingOrderSearchBody = {},
  limit?: number,
  value_search?: string
): Promise<LinkBuildingOrderQuickFilterValuesResponse> {
  const { page: _page, per_page: _per_page, sort_rules: _sort_rules, ...filters } = body;

  return apiClient.post<LinkBuildingOrderQuickFilterValuesResponse>(
    "/api/admin/link-building-orders/quick-filter-values",
    { ...filters, columns, limit, value_search: value_search || undefined }
  );
}

// ── Link Building Orders Dashboard ────────────────────────────────────────────

/**
 * POST /api/admin/link-building-orders/search
 * Returns a paginated, filtered, and sorted list of link building order rows.
 * With include_row_index it also lists every matching row id, see loadAllLinkBuildingOrderRows.
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
 * POST /api/admin/link-building-orders/rows
 * Dashboard rows by id, in the order given (at most 1000 per request). Ids deleted
 * in the meantime are left out of the response.
 */
export async function getLinkBuildingOrderRowsByIds(ids: string[]): Promise<LinkBuildingOrderRow[]> {
  const res = await apiClient.post<LinkBuildingOrderRowsResponse>("/api/admin/link-building-orders/rows", { ids });
  return res.data;
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
 * Updates one or more fields across multiple rows atomically. change_source is
 * what the edit history calls the change (the API defaults to "fill").
 */
export async function batchUpdateLinkBuildingOrders(
  row_ids: string[],
  updates: Partial<Record<keyof LinkBuildingOrderRow, string | null>>,
  change_source?: LinkBuildingChangeSource
): Promise<{ message: string; updated_count: number; data: LinkBuildingOrderRow[] }> {
  return apiClient.post("/api/admin/link-building-orders/batch-update", {
    row_ids,
    updates,
    change_source,
  });
}

/**
 * POST /api/admin/link-building-orders/batch-update-cells
 * Applies a per-row map of field → value updates in a single request. Used when
 * pasting a multi-row/multi-column block of clipboard data (e.g. copied from
 * Excel or Google Sheets) into the dashboard grid, where each row may end up
 * with different values instead of one shared value applied to every row.
 * change_source is what the edit history calls the change (the API defaults to
 * "paste"), so undo, fill and formula updates show up as such.
 */
export async function batchUpdateLinkBuildingOrderCells(
  updates: {
    id: string;
    fields: Partial<Record<keyof LinkBuildingOrderRow, string | null>>;
    /** When present, replaces the row's whole formulas map (null removes them all). */
    cell_formulas?: Record<string, string> | null;
  }[],
  change_source?: LinkBuildingChangeSource
): Promise<{ message: string; updated_count: number; data: LinkBuildingOrderRow[] }> {
  return apiClient.post("/api/admin/link-building-orders/batch-update-cells", {
    updates,
    change_source,
  });
}

/**
 * POST /api/admin/link-building-orders/column-values
 * Returns every non-empty value found in a single column across rows matching
 * the current search/filters, or an explicit row_ids list when provided. Used
 * to copy an entire column (e.g. Landing Page) to the clipboard for pasting
 * into an external tool such as Ahrefs.
 */
export async function getLinkBuildingOrderColumnValues(
  column: keyof LinkBuildingOrderRow,
  body: LinkBuildingOrderSearchBody = {},
  row_ids?: string[]
): Promise<string[]> {
  const request_body =
    row_ids && row_ids.length > 0 ? { column, row_ids } : { column, ...body };

  const res = await apiClient.post<{ data: string[]; count: number }>(
    "/api/admin/link-building-orders/column-values",
    request_body
  );
  return res.data;
}

/**
 * POST /api/admin/link-building-orders/filter-values
 * Distinct values (with row counts) of one column for the "Filter by values"
 * checklist. The backend applies every filter in `body` except the ones that
 * target `column` itself, the same way a spreadsheet filter behaves.
 */
export async function getLinkBuildingOrderFilterValues(
  column: keyof LinkBuildingOrderRow,
  body: LinkBuildingOrderSearchBody = {},
  value_search = "",
  limit?: number
): Promise<LinkBuildingOrderFilterValuesResponse> {
  const { page: _page, per_page: _per_page, sort_rules: _sort_rules, ...filters } = body;

  return apiClient.post<LinkBuildingOrderFilterValuesResponse>(
    "/api/admin/link-building-orders/filter-values",
    {
      ...filters,
      column,
      value_search: value_search.trim() || undefined,
      limit,
    }
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
    recent_domain_usage: _rdu,
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

/**
 * Posts a multipart import form with XMLHttpRequest instead of fetch, so the
 * file transfer can report its progress (0-100) through onUploadProgress.
 * Rejects with the parsed API error body when the server answers with an error.
 */
function uploadImportFile(
  path: string,
  form_data: FormData,
  onUploadProgress?: (percent: number) => void
): Promise<ImportStartResponse> {
  return new Promise((resolve, reject) => {
    const base  = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    const token = getToken();

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}${path}`);

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
  /** Partnership metrics update only: matched rows whose values were already up to date. */
  unchanged?: number;
  /** Partnership metrics update only: rows whose partnership is no longer in the partner list. */
  site_removed?: number;
  /** Partnership metrics update only: rows left untouched because their Request Date is outside the range. */
  out_of_range?: number;
  /** Partnership metrics update only: domains read from the uploaded file. */
  reference_rows?: number;
  /** Partnership metrics update only: reference columns found in the uploaded file. */
  reference_columns?: PartnershipReferenceColumn[];
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

  return uploadImportFile("/api/admin/link-building-orders/import", form_data, onUploadProgress);
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

// ── Metrics-only bulk update ──────────────────────────────────────────────────

/**
 * Columns eligible for the metrics-only bulk updater. Kept in sync with
 * ProcessLinkBuildingMetricsImportJob::TARGET_COLUMNS on the backend.
 */
export const METRIC_COLUMN_OPTIONS = [
  { key: "current_traffic", label: "Current Traffic" },
  { key: "dr_formula",      label: "DR Formula" },
  { key: "current_poc",     label: "Current POC" },
  { key: "current_price",   label: "Current Price" },
  { key: "dr_lbs",          label: "DR (LBs)" },
  { key: "posting_fee_lbs", label: "Posting Fee (LBs)" },
  { key: "lb_tl_approval",  label: "LB TL Approval" },
  { key: "approval_date",   label: "Approval Date" },
  { key: "final_price",     label: "Final Price" },
] as const;

export type MetricColumnKey = (typeof METRIC_COLUMN_OPTIONS)[number]["key"];

export interface MetricsImportDateRange {
  /** Lower bound in MM/DD/YYYY format. Omit (along with date_to) to use the backend default of one year ago. */
  date_from?: string;
  /** Upper bound in MM/DD/YYYY format. Optional even when date_from is set. */
  date_to?: string;
}

/**
 * POST /api/admin/link-building-orders/metrics-import
 *
 * Uploads a CSV file (same shape as the full order export) and starts a background job
 * that updates only the selected target_columns on rows matched by Order ID. Existing
 * rows are updated in place; unmatched Order IDs are skipped and never created. Returns
 * an import_id pollable via getLinkBuildingImportStatus() — same status shape as the
 * full CSV import.
 *
 * When date_range is omitted, the backend defaults to records from the last year.
 */
export function metricsImportLinkBuildingOrders(
  file: File,
  target_columns: MetricColumnKey[],
  date_range?: MetricsImportDateRange,
  onUploadProgress?: (percent: number) => void
): Promise<ImportStartResponse> {
  const form_data = new FormData();
  form_data.append("file", file);
  target_columns.forEach((col) => form_data.append("target_columns[]", col));
  if (date_range?.date_from) form_data.append("date_from", date_range.date_from);
  if (date_range?.date_to) form_data.append("date_to", date_range.date_to);

  return uploadImportFile("/api/admin/link-building-orders/metrics-import", form_data, onUploadProgress);
}

// ── Partnership metrics (VLOOKUP by Partnership) ───────────────────────────────

/**
 * Link Table columns filled from the partner metrics list, matched by the
 * Partnership column. Kept in sync with
 * LinkBuildingPartnerMetricsService::PLACEMENT_COLUMNS on the backend.
 */
export const PARTNERSHIP_METRIC_COLUMN_OPTIONS = [
  { key: "dr_formula",      label: "DR Formula",      source: "DR" },
  { key: "current_traffic", label: "Current Traffic", source: "Traffic" },
  { key: "current_poc",     label: "Current POC",     source: "POC" },
  { key: "current_price",   label: "Current Price",   source: "Price" },
] as const;

export type PartnershipMetricColumnKey = (typeof PARTNERSHIP_METRIC_COLUMN_OPTIONS)[number]["key"];

/** Reference list fields the backend recognised in an uploaded partnership metrics file. */
export type PartnershipReferenceColumn = "dr" | "traffic" | "current_poc" | "current_price";

/** Value the backend writes to Current POC and Current Price when a partnership left the partner list. */
export const SITE_REMOVED_VALUE = "SITE REMOVED";

export interface PartnershipMetricsImportOptions {
  /** Lower bound of Request Date in MM/DD/YYYY format. Defaults to two months ago on the backend. */
  date_from?: string;
  /** Upper bound of Request Date in MM/DD/YYYY format. */
  date_to?: string;
  /** When the file has POC or price columns, partnerships missing from it are marked SITE REMOVED. */
  mark_missing_as_removed: boolean;
}

export interface PartnershipMetricsSummary {
  total_domains: number;
  metrics_domains: number;
  listed_partners: number;
  /** ISO 8601 date of the last upload with DR or traffic values, null when none yet. */
  last_metrics_sync: string | null;
  /** ISO 8601 date of the last upload with POC or price values, null when none yet. */
  last_partner_sync: string | null;
}

/**
 * POST /api/admin/link-building-orders/partnership-metrics-import
 *
 * Uploads the latest domain metrics and/or partner list (Partnership, DR, Traffic,
 * Current POC, Current Price) and starts a background job that saves them as the
 * reference list and updates the selected columns of every row whose Partnership
 * matches, like the VLOOKUPs of the BASE Google Sheet. Pollable via
 * getLinkBuildingImportStatus().
 */
export function importPartnershipMetrics(
  file: File,
  target_columns: PartnershipMetricColumnKey[],
  options: PartnershipMetricsImportOptions,
  onUploadProgress?: (percent: number) => void
): Promise<ImportStartResponse> {
  const form_data = new FormData();
  form_data.append("file", file);
  target_columns.forEach((col) => form_data.append("target_columns[]", col));
  if (options.date_from) form_data.append("date_from", options.date_from);
  if (options.date_to) form_data.append("date_to", options.date_to);
  form_data.append("mark_missing_as_removed", options.mark_missing_as_removed ? "1" : "0");

  return uploadImportFile("/api/admin/link-building-orders/partnership-metrics-import", form_data, onUploadProgress);
}

/**
 * GET /api/admin/link-building-orders/partnership-metrics/summary
 * Size and freshness of the partner metrics reference list.
 */
export async function getPartnershipMetricsSummary(): Promise<PartnershipMetricsSummary> {
  const res = await apiClient.get<{ data: PartnershipMetricsSummary }>(
    "/api/admin/link-building-orders/partnership-metrics/summary"
  );
  return res.data;
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
