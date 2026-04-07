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

// ── Filter / query params ──────────────────────────────────────────────────────

export interface BacklinkOrderFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  client?: string;
  link_builder?: string;
  sort_field?: string;
  sort_direction?: "asc" | "desc";
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
