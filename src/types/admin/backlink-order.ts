// ── Backlink Order Row ─────────────────────────────────────────────────────────

export interface BacklinkOrderRow {
  id: string;
  order_id: string;
  team_specific_link_id: string;
  link_type: string;
  client: string;
  keyword: string;
  landing_page: string;
  exact_match: string;
  notes: string;
  request_date: string;
  estimated_delivery_date: string;
  estimated_turnaround_days: string;
  /** Computed by the backend: (estimated_delivery_date - today) in days, signed string e.g. "-114" */
  days_left: string;
  /** Computed by the backend: (days_left / estimated_turnaround_days) * 100, e.g. "-280%" */
  projected_health: string;
  link_builder: string;
  pen_name: string;
  partnership: string;
  article_title: string;
  article: string;
  status: string;
  live_link: string;
  live_link_date: string;
  dr_lbs: string;
  posting_fee_lbs: string;
  current_traffic: string;
  dr_formula: string;
  current_poc: string;
  current_price: string;
  lb_tl_approval: string;
  approval_date: string;
  final_price: string;
  created_at?: string;
  updated_at?: string;
}

/** Fields sent to the backend — computed fields and id are excluded. */
export type BacklinkOrderPayload = Omit<
  BacklinkOrderRow,
  "id" | "days_left" | "projected_health" | "created_at" | "updated_at"
>;

// ── API response shapes ────────────────────────────────────────────────────────

export interface BacklinkOrdersResponse {
  data: BacklinkOrderRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface BacklinkOrderMutationResponse {
  message: string;
  data: BacklinkOrderRow;
}

export interface BacklinkOrderDeleteResponse {
  message: string;
}

// ── Search / filter / sort payload (sent as POST body) ────────────────────────

export interface SortRulePayload {
  key: string;
  direction: "asc" | "desc";
  /**
   * When true the backend must place NULL / empty-string rows at the bottom
   * regardless of sort direction. Defaults to true so that columns with
   * sparse data (partnership, article, live_link, etc.) sort predictably.
   */
  nulls_last?: boolean;
}

export interface TextColumnFilterPayload {
  key: string;
  type: "text";
  value: string;
}

export interface SelectColumnFilterPayload {
  key: string;
  type: "select";
  values: string[];
}

export interface NumberColumnFilterPayload {
  key: string;
  type: "number";
  min: string;
  max: string;
}

export interface DateColumnFilterPayload {
  key: string;
  type: "date";
  from: string;
  to: string;
}

export type ColumnFilterPayload =
  | TextColumnFilterPayload
  | SelectColumnFilterPayload
  | NumberColumnFilterPayload
  | DateColumnFilterPayload;

/**
 * Full POST body for the backlink orders search endpoint.
 * Replaces the old BacklinkOrderFilters (query-string only).
 */
export interface BacklinkOrderSearchBody {
  page?: number;
  per_page?: number;
  /** Global keyword search across order_id, client, keyword, link_builder, status, partnership. */
  search?: string;
  /** Quick toolbar filters — convenience aliases handled by the backend. */
  status?: string;
  link_type?: string;
  client?: string;
  link_builder?: string;
  /** Ordered list of sort rules (primary first). */
  sort_rules?: SortRulePayload[];
  /** Per-column filters applied after the toolbar quick filters. */
  column_filters?: ColumnFilterPayload[];
}

// ── Dashboard summary ──────────────────────────────────────────────────────────

export interface DashboardSummary {
  total_orders: number;
  pending_orders: number;
  total_clients: number;
  total_paid_invoices: number;
}

// ── Team widgets ───────────────────────────────────────────────────────────────

export interface TeamMemberCapacity {
  user_id: number;
  name: string;
  capacity_pct: number;
  total_assigned: number;
  max_capacity: number;
}

export interface TeamMemberHealth {
  user_id: number;
  name: string;
  health_pct: number;
  links_on_track: number;
  total_links: number;
  links_delayed: number;
}

export interface TeamCapacityResponse {
  data: TeamMemberCapacity[];
}

export interface TeamHealthResponse {
  data: TeamMemberHealth[];
}
