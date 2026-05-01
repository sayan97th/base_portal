import type { CartProductType } from "@/types/client/unified-cart";

export interface PurchaseGroupOrder {
  order_id: string;
  product_type: CartProductType;
  total_amount: number;
}

export interface PurchaseGroup {
  purchase_group_id: string;
  order_title: string | null;
  total_amount: number;
  created_at: string;
  orders: PurchaseGroupOrder[];
}

export interface CreatePurchaseGroupPayload {
  purchase_group_id: string;
  order_title: string | null;
  total_amount: number;
  created_at: string;
  orders: PurchaseGroupOrder[];
}
