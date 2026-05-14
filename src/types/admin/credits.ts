export interface AdminCreditUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  credit_balance: number;
}

export interface AdminCreditTransaction {
  id: number;
  user_id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  amount: number;
  type: "credit" | "debit";
  description: string | null;
  created_by: number | null;
  created_at: string;
}

export interface AssignCreditsPayload {
  user_id: number;
  amount: number;
  type: "credit" | "debit";
  description?: string;
}

export interface AssignCreditsResponse {
  success: boolean;
  new_balance: number;
  transaction: AdminCreditTransaction;
}

export interface AdminCreditsStats {
  total_credits_issued: number;
  users_with_credits: number;
  credits_used_this_month: number;
}

export interface AdminCreditsTransactionFilters {
  page?: number;
  user_id?: number;
  type?: "credit" | "debit" | "";
}

export interface AdminCreditsClientFilters {
  page?: number;
  search?: string;
  sort_by?: "first_name" | "credit_balance";
  sort_dir?: "asc" | "desc";
}

export type CreditPurchaseStatus = "completed" | "pending" | "failed" | "refunded";

export interface AdminCreditPurchase {
  id: number;
  package_id: string;
  package_name: string;
  credits_amount: number;
  amount_paid: number;
  payment_intent_id: string | null;
  status: CreditPurchaseStatus;
  created_at: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface AdminCreditPurchaseFilters {
  page?: number;
  search?: string;
  status?: CreditPurchaseStatus | "";
  date_from?: string;
  date_to?: string;
}
