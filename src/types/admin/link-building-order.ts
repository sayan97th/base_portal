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
  /** Internal-only notes — not visible to clients. */
  internal_notes: string;
  request_date: string;
  estimated_delivery_date: string;
  estimated_turnaround_days: string;
  link_builder: string;
  pen_name: string;
  partnership: string;
  /** Status of the partnership check process. */
  partnership_check: string;
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
  /** Currency for pricing fields: USD or EUR. */
  currency: string;
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

/**
 * Spreadsheet style "Filter by values". `include` keeps only the listed values,
 * `exclude` hides them and keeps everything else. An empty string means "(Blanks)".
 */
export interface ValuesColumnFilterPayload {
  key: string;
  type: "values";
  mode: "include" | "exclude";
  values: string[];
}

export type FilterConditionOperator =
  | "is_empty"
  | "is_not_empty"
  | "text_contains"
  | "text_not_contains"
  | "text_starts_with"
  | "text_ends_with"
  | "text_is_exactly"
  | "date_is"
  | "date_is_before"
  | "date_is_after"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "is_equal_to"
  | "is_not_equal_to"
  | "is_between"
  | "is_not_between";

/** Spreadsheet style "Filter by condition". Dates are sent as YYYY-MM-DD. */
export interface ConditionColumnFilterPayload {
  key: string;
  type: "condition";
  operator: FilterConditionOperator;
  value?: string;
  /** Upper bound, only used by the "is_between" and "is_not_between" operators. */
  value_to?: string;
}

export type ColumnFilterPayload =
  | TextColumnFilterPayload
  | SelectColumnFilterPayload
  | NumberColumnFilterPayload
  | DateColumnFilterPayload
  | ValuesColumnFilterPayload
  | ConditionColumnFilterPayload;

/** One distinct value of a column, as listed by the "Filter by values" checklist. */
export interface LinkBuildingOrderFilterValue {
  value: string;
  count: number;
}

export interface LinkBuildingOrderFilterValuesResponse {
  data: LinkBuildingOrderFilterValue[];
  /** Distinct values matching the request, which may exceed `data.length`. */
  total_distinct: number;
  has_more: boolean;
}

export interface LinkBuildingOrderSearchBody {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  link_type?: string;
  client?: string;
  link_builder?: string;
  /** Filter by assigned client account (user_id). */
  client_user_id?: number | null;
  /** Filter by assigned admin user (assigned_admin_user_id). */
  assigned_user_id?: number | null;
  /** When true, restricts results to "Live" orders whose lb_tl_approval is still empty. */
  needs_lb_tl_approval?: boolean;
  sort_rules?: SortRulePayload[];
  column_filters?: ColumnFilterPayload[];
}
