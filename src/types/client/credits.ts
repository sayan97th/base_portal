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
