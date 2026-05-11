import type {
  CartItem,
  CartAppliedCoupon,
  CartIntakeRow,
  ContentOptimizationIntakeRow,
  CartKeywordRow,
} from "@/types/client/unified-cart";

export interface LbReviewRow {
  dr_tier_name: string;
  keyword: string;
  landing_page: string;
  exact_match: boolean;
  unit_price: number;
}

export interface NcReviewRow {
  instance_label: string;
  keyword_phrase: string;
  secondary_keywords: string;
  type_of_content: string;
  notes: string;
  unit_price: number;
}

export interface CoReviewRow {
  tier_name: string;
  primary_keyword: string;
  secondary_keywords: string;
  content_page_url: string;
  notes: string;
  unit_price: number;
}

export interface OrderPricingSummary {
  subtotal: number;
  bulk_discount_amount: number;
  total_discount: number;
  total: number;
  applied_coupons: CartAppliedCoupon[];
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function buildLbReviewRows(
  lb_items: CartItem[],
  getKeywordDataForTier: (tier_id: string) => CartKeywordRow[]
): LbReviewRow[] {
  const rows: LbReviewRow[] = [];
  for (const item of lb_items) {
    const keyword_data = getKeywordDataForTier(item.tier_id);
    for (let i = 0; i < item.quantity; i++) {
      const kw = keyword_data[i];
      rows.push({
        dr_tier_name: item.tier_name,
        keyword: kw?.keyword ?? "",
        landing_page: kw?.landing_page ?? "",
        exact_match: kw?.exact_match ?? false,
        unit_price: item.unit_price,
      });
    }
  }
  return rows;
}

export function buildNcReviewRows(
  nc_items: CartItem[],
  getIntakeDataForTier: (tier_id: string) => CartIntakeRow[][]
): NcReviewRow[] {
  const rows: NcReviewRow[] = [];
  for (const item of nc_items) {
    const stored = getIntakeDataForTier(item.tier_id);
    for (let i = 0; i < item.quantity; i++) {
      const instance_rows = stored[i] ?? [];
      const row = instance_rows[0];
      rows.push({
        instance_label:
          item.quantity > 1
            ? `${item.tier_name} (${i + 1} of ${item.quantity})`
            : item.tier_name,
        keyword_phrase: row?.keyword_phrase ?? "",
        secondary_keywords: row?.secondary_keywords ?? "",
        type_of_content: row?.type_of_content ?? "",
        notes: row?.notes ?? "",
        unit_price: item.unit_price,
      });
    }
  }
  return rows;
}

export function buildCoReviewRows(
  items: CartItem[],
  getIntakeData: (tier_id: string) => ContentOptimizationIntakeRow[]
): CoReviewRow[] {
  const rows: CoReviewRow[] = [];
  for (const item of items) {
    const stored = getIntakeData(item.tier_id);
    for (let i = 0; i < item.quantity; i++) {
      const row = stored[i];
      rows.push({
        tier_name: item.tier_name,
        primary_keyword: row?.primary_keyword ?? "",
        secondary_keywords: row?.secondary_keywords ?? "",
        content_page_url: row?.content_page_url ?? "",
        notes: row?.notes ?? "",
        unit_price: item.unit_price,
      });
    }
  }
  return rows;
}

export function computeLbSubtotal(lb_items: CartItem[]): number {
  return lb_items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
}

export function computeProductSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
}
