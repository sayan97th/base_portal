export interface CreditBalance {
  balance: number;
}

export interface CreditTransaction {
  id: number;
  amount: number;
  type: "credit" | "debit";
  description: string | null;
  created_at: string;
}

export interface CreditTransactionListResponse {
  data: CreditTransaction[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface PayWithCreditsPayload {
  amount: number;
  description?: string;
}

export interface PayWithCreditsResponse {
  success: boolean;
  remaining_balance: number;
  transaction_id: number;
}

export interface ApplyCreditsDiscountPayload {
  amount: number;
  payment_intent_id?: string;
  description?: string;
}

export interface ApplyCreditsDiscountResponse {
  success: boolean;
  credits_applied: number;
  remaining_balance: number;
  transaction_id: number;
}

export interface CreditBalanceSummary {
  balance: number;
  dollar_value: number;
  recent_transactions: CreditTransaction[];
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  original_price: number;
  discount_pct: number;
  description: string;
  is_popular?: boolean;
}

export interface CreditPurchase {
  id: number;
  package_id: string;
  package_name: string;
  credits_amount: number;
  amount_paid: number;
  payment_intent_id: string | null;
  status: "completed" | "pending" | "failed" | "refunded";
  created_at: string;
}

export interface CreditPurchaseListResponse {
  data: CreditPurchase[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface PurchaseCreditsPayload {
  package_id: string;
  credits_amount: number;
  amount_paid: number;
  payment_intent_id: string;
}

export interface PurchaseCreditsResponse {
  success: boolean;
  new_balance: number;
  purchase_id: number;
  message: string;
}
