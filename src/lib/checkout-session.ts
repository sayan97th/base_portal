import type { CartProductType } from "@/types/client/unified-cart";

export interface CheckoutSessionOrder {
  order_id: string;
  product_type: CartProductType;
  total_amount: number;
}

export interface CheckoutSession {
  session_id: string;
  created_at: string;
  order_title: string | null;
  total_amount: number;
  orders: CheckoutSessionOrder[];
}

const STORAGE_KEY = "checkout_sessions";
const MAX_SESSIONS = 20;

function getSessions(): CheckoutSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CheckoutSession[];
  } catch {
    return [];
  }
}

export function saveCheckoutSession(session: CheckoutSession): void {
  if (typeof window === "undefined") return;
  try {
    const sessions = getSessions();
    const updated = [
      session,
      ...sessions.filter((s) => s.session_id !== session.session_id),
    ];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated.slice(0, MAX_SESSIONS))
    );
  } catch {
    // localStorage unavailable or quota exceeded
  }
}

export function getCheckoutSession(session_id: string): CheckoutSession | null {
  const sessions = getSessions();
  return sessions.find((s) => s.session_id === session_id) ?? null;
}

export function findSessionByOrderId(order_id: string): CheckoutSession | null {
  const sessions = getSessions();
  return (
    sessions.find((s) => s.orders.some((o) => o.order_id === order_id)) ?? null
  );
}
