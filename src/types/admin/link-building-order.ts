// ── Link Building Order Row ────────────────────────────────────────────────────

export interface LinkBuildingOrderRow {
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
  /** Optional: links this standalone admin row to a specific client user account. */
  user_id?: number | null;
  /** Admin team responsible for this placement (UUID of admin_teams record). */
  admin_team_id?: string | null;
  /** Derived: team name, returned by API but not sent in payloads. */
  admin_team_name?: string | null;
  /** Derived: team hex color, returned by API but not sent in payloads. */
  admin_team_color?: string | null;
  /** Admin-side user assigned to own this order. */
  assigned_admin_user_id?: number | null;
  /** Derived: full name of the assigned admin user, returned by API but not sent in payloads. */
  assigned_admin_user_name?: string | null;
  /** Derived: avatar URL of the assigned admin user, returned by API but not sent in payloads. */
  assigned_admin_user_avatar?: string | null;
  /** Derived: status of the parent LinkBuildingOrder (only for client-purchased placements). */
  parent_order_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Fields sent to the backend — computed/derived fields and id are excluded. */
export type LinkBuildingOrderPayload = Omit<
  LinkBuildingOrderRow,
  | "id"
  | "admin_team_name"
  | "admin_team_color"
  | "assigned_admin_user_name"
  | "assigned_admin_user_avatar"
  | "created_at"
  | "updated_at"
>;

// ── API response shapes ────────────────────────────────────────────────────────

export interface LinkBuildingOrdersResponse {
  data: LinkBuildingOrderRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface LinkBuildingOrderMutationResponse {
  message: string;
  data: LinkBuildingOrderRow;
}

export interface LinkBuildingOrderDeleteResponse {
  message: string;
}

// ── Search / filter / sort payload (sent as POST body) ────────────────────────

export interface SortRulePayload {
  key: string;
  direction: "asc" | "desc";
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

export interface LinkBuildingOrderSearchBody {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  link_type?: string;
  client?: string;
  link_builder?: string;
  sort_rules?: SortRulePayload[];
  column_filters?: ColumnFilterPayload[];
}
