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
  /** Niche of the partnership domain. Filled by the API from the domain catalog when
   *  the Partnership changes, and saved to that catalog when an admin sets it. */
  niche?: string;
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

/** Values of one column in the Quick filters panel. */
export interface LinkBuildingOrderQuickFilterColumnValues {
  values: LinkBuildingOrderFilterValue[];
  has_more: boolean;
}

export interface LinkBuildingOrderQuickFilterValuesResponse {
  data: Partial<Record<string, LinkBuildingOrderQuickFilterColumnValues>>;
  /** Every dashboard row, ignoring all filters, for "Showing X of Y orders". */
  total: number;
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
  /** Filter by assigned admin user (assigned_admin_user_id), 0 for unassigned rows. */
  assigned_user_id?: number | null;
  /** When true, restricts results to "Live" orders whose lb_tl_approval is still empty. */
  needs_lb_tl_approval?: boolean;
  sort_rules?: SortRulePayload[];
  column_filters?: ColumnFilterPayload[];
  advanced_filters?: AdvancedFiltersPayload;
}

// ── In-table find (Ctrl/Cmd+F) ─────────────────────────────────────────────────

export interface LinkBuildingOrderFindPagesBody extends LinkBuildingOrderSearchBody {
  /** Normalized find terms, a row matches when any of its cells contains any term. */
  find_terms: string[];
  /** Visible columns to look through, computed only columns are ignored by the API. */
  find_columns?: string[];
}

/** One page of the current result set holding rows that match the find terms. */
export interface LinkBuildingOrderFindPage {
  page: number;
  row_count: number;
}

export interface LinkBuildingOrderFindPagesResponse {
  /** Only pages with matches, ascending. */
  pages: LinkBuildingOrderFindPage[];
  matched_row_count: number;
  total_rows: number;
}

// ── Saved filters ──────────────────────────────────────────────────────────────

/** One column's spreadsheet style filter, as stored inside a saved filter. */
export interface SavedSheetColumnFilter {
  condition: { operator: FilterConditionOperator; value: string; value_to: string } | null;
  values: { mode: "include" | "exclude"; values: string[] } | null;
}

// ── Advanced filters ───────────────────────────────────────────────────────────

/** How the rules of an advanced filter level (top level or one condition group) are combined. */
export type AdvancedFilterJoinOperator = "and" | "or";

/**
 * Condition of one advanced filter rule: every spreadsheet condition, plus
 * "is any of" / "is none of", which match a list of values like monday's "is" / "is not".
 */
export type AdvancedFilterOperator = FilterConditionOperator | "is_any_of" | "is_none_of";

/**
 * One "Where [column] [condition] [value]" row of the Advanced filters panel. A rule
 * stays in the view while it is half built, but only complete, enabled rules filter rows.
 */
export interface AdvancedFilterRule {
  id: string;
  key: string | null;
  operator: AdvancedFilterOperator | null;
  value: string;
  /** Upper bound, only used by "is_between" and "is_not_between". */
  value_to: string;
  /** Picked values, only used by "is_any_of" and "is_none_of". "" stands for "(Blanks)". */
  values: string[];
  /** A paused rule stays in the panel without narrowing the table. */
  is_disabled: boolean;
}

export interface AdvancedFilterGroup {
  id: string;
  operator: AdvancedFilterJoinOperator;
  rules: AdvancedFilterRule[];
}

export interface LinkBuildingOrderAdvancedFilters {
  /** Joins the top level rules and groups. */
  operator: AdvancedFilterJoinOperator;
  rules: AdvancedFilterRule[];
  groups: AdvancedFilterGroup[];
}

/** What the search endpoint receives: only complete, enabled rules, as column filter payloads. */
export interface AdvancedFiltersPayload {
  operator: AdvancedFilterJoinOperator;
  rules: ColumnFilterPayload[];
  groups: { operator: AdvancedFilterJoinOperator; rules: ColumnFilterPayload[] }[];
}

/**
 * Snapshot of everything that shapes the Link Building Orders table: toolbar
 * filters, spreadsheet column filters, advanced filters, sort rules and hidden
 * columns. Saved filters store this exact shape so it can be restored without
 * any mapping.
 */
export interface LinkBuildingOrderFilterState {
  search: string;
  status: string;
  link_type: string;
  client: string;
  client_user_id: number | null;
  assigned_user_id: number | null;
  needs_lb_tl_approval: boolean;
  sort_rules: SortRulePayload[];
  sheet_filters: Partial<Record<string, SavedSheetColumnFilter>>;
  hidden_columns: string[];
  advanced_filters: LinkBuildingOrderAdvancedFilters;
}

export interface LinkBuildingOrderSavedFilter {
  id: string;
  name: string;
  filters: LinkBuildingOrderFilterState;
  /** When true, every admin side user can apply this filter. Only the owner can edit it. */
  is_shared: boolean;
  is_owner: boolean;
  /** Owners can always delete; super admins can also delete filters others shared. */
  can_delete: boolean;
  owner_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LinkBuildingOrderSavedFilterPayload {
  name?: string;
  filters?: LinkBuildingOrderFilterState;
  is_shared?: boolean;
}

/**
 * The user's own auto saved view of the table, restored on every visit.
 * `filters` is null until the user changes the default view for the first time.
 */
export interface LinkBuildingOrderFilterPreference {
  filters: LinkBuildingOrderFilterState | null;
  /** The saved filter the current view came from, null when none is applied. */
  applied_saved_filter_id: string | null;
  updated_at: string | null;
}
