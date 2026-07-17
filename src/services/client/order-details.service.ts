import { apiClient } from "@/lib/api-client";

// ── Payload shapes (shared with the admin order-details service) ──────────────

export interface LinkBuildingDetailsPlacement {
  id: string;
  keyword: string | null;
  landing_page: string | null;
  exact_match: boolean;
}

export interface NewContentDetailsRow {
  keyword_phrase: string | null;
  secondary_keywords: string | null;
  type_of_content: string | null;
  notes: string | null;
}

export interface KeywordUrlDetailsRow {
  primary_keyword: string | null;
  secondary_keywords: string | null;
  content_page_url: string | null;
  notes: string | null;
}

export interface NewContentDetailsItem {
  item_id: string;
  intake_rows: NewContentDetailsRow[];
}

export interface KeywordUrlDetailsItem {
  item_id: string;
  intake_rows: KeywordUrlDetailsRow[];
}

export interface OrderDetailsResult {
  id: string;
  status: string;
  is_pending: boolean;
}

interface OrderDetailsResponse {
  data: OrderDetailsResult;
}

/**
 * Client-side submission of the intake details for an order purchased with
 * details deferred (status `pending_details`). Mirrors the admin service so the
 * same fill-in-later view can target either endpoint.
 */
export const orderDetailsService = {
  async submitLinkBuilding(
    order_id: string,
    placements: LinkBuildingDetailsPlacement[]
  ): Promise<OrderDetailsResult> {
    const response = await apiClient.put<OrderDetailsResponse>(
      `/api/link-building/orders/${order_id}/details`,
      { placements }
    );
    return response.data;
  },

  async submitNewContent(
    order_id: string,
    items: NewContentDetailsItem[]
  ): Promise<OrderDetailsResult> {
    const response = await apiClient.put<OrderDetailsResponse>(
      `/api/new-content/orders/${order_id}/details`,
      { items }
    );
    return response.data;
  },

  async submitContentOptimization(
    order_id: string,
    items: KeywordUrlDetailsItem[]
  ): Promise<OrderDetailsResult> {
    const response = await apiClient.put<OrderDetailsResponse>(
      `/api/content-optimization/orders/${order_id}/details`,
      { items }
    );
    return response.data;
  },

  async submitContentBrief(
    order_id: string,
    items: KeywordUrlDetailsItem[]
  ): Promise<OrderDetailsResult> {
    const response = await apiClient.put<OrderDetailsResponse>(
      `/api/content-briefs/orders/${order_id}/details`,
      { items }
    );
    return response.data;
  },
};
