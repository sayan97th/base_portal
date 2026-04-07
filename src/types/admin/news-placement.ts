// ── News Placement Row ──────────────────────────────────────────────────────────

export interface NewsPlacementRow {
  id: string;
  domain: string;
  dr: string;
  traffic: string;
  category: string;
  price: string;
  types_of_content: string;
  do_follow_no_follow: string;
  indexable: string;
  well_known_site: string;
  links_allowed: string;
  additional_notes: string;
  price_1: string;
  poc_1: string;
  price_2: string;
  poc_2: string;
  tier: string;
  pbn_check: string;
  used_domain: string;
  within_budget: string;
  ref_domains: string;
  created_at?: string;
  updated_at?: string;
}

/** Fields sent to the backend — id and timestamps excluded. */
export type NewsPlacementPayload = Omit<
  NewsPlacementRow,
  "id" | "created_at" | "updated_at"
>;

// ── API response shapes ────────────────────────────────────────────────────────

export interface NewsPlacementsResponse {
  data: NewsPlacementRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface NewsPlacementMutationResponse {
  message: string;
  data: NewsPlacementRow;
}

export interface NewsPlacementDeleteResponse {
  message: string;
}

// ── Filter / query params ──────────────────────────────────────────────────────

export interface NewsPlacementFilters {
  page?: number;
  per_page?: number;
  search?: string;
  tier?: string;
  sort_field?: string;
  sort_direction?: "asc" | "desc";
}
