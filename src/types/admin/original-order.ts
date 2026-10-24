// ── Original Order ─────────────────────────────────────────────────────────────
// Read only copy of a Link Building order exactly as the client submitted it,
// kept by the API at checkout whatever the payment method, and again each time
// the details of a deferred order are submitted. Mirrors OriginalOrderController.

import type { OrderStatus } from "./index";

export type OriginalOrderSnapshotType = "placed" | "details_submitted";

export interface OriginalOrderPlacement {
  id: string;
  /** BL- order id the placement had when the copy was taken. */
  order_id: string;
  row_index: number | null;
  keyword: string | null;
  landing_page: string | null;
  exact_match: boolean;
  link_type: string | null;
  client: string | null;
  status: string | null;
  request_date: string | null;
}

export interface OriginalOrderItem {
  id: string;
  dr_tier_id: string;
  dr_tier_label: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  placements: OriginalOrderPlacement[];
}

export interface OriginalOrderPayload {
  schema_version: number;
  order: {
    id: string;
    order_title: string | null;
    order_notes: string | null;
    status: OrderStatus;
    subtotal_before_discount: number | null;
    total_amount: number;
    session_id: string | null;
    session_title: string | null;
    created_at: string | null;
  };
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    company: string | null;
  } | null;
  billing: {
    company: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
  } | null;
  coupons: {
    code: string;
    discount_type: string;
    discount_value: number;
    discount_amount: number;
  }[];
  items: OriginalOrderItem[];
}

export interface OriginalOrderSnapshot {
  id: string;
  type: OriginalOrderSnapshotType;
  payment_method: string | null;
  /** Taken from existing data when copies were introduced, not at checkout. */
  is_backfilled: boolean;
  captured_at: string;
  captured_by: { id: number; name: string } | null;
  payload: OriginalOrderPayload;
}

/** Values a placement has now, to compare against the original copy. */
export type CurrentPlacementValues = Pick<
  OriginalOrderPlacement,
  "order_id" | "keyword" | "landing_page" | "exact_match" | "link_type" | "client" | "status" | "request_date"
>;

export interface OriginalOrderDetails {
  order: {
    id: string;
    order_title: string | null;
    status: OrderStatus;
    session_id: string | null;
    created_at: string;
    product_type: "link_building";
    user: { id: number; first_name: string; last_name: string; email: string; company: string | null } | null;
  };
  invoice: { invoice_number: string | null; status: string; payment_method: string | null } | null;
  /** Oldest first: the checkout copy, then one per details submission. */
  snapshots: OriginalOrderSnapshot[];
  /** Keyed by placement id. A placement missing here was deleted from the table. */
  current_placements: Record<string, CurrentPlacementValues>;
}
