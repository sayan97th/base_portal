import type { CartProductType } from "@/types/client/unified-cart";
import type { PurchaseGroup } from "@/types/client/purchase-groups";

export type { PurchaseGroup };

// Legacy shape stored in localStorage before the purchase-groups API was introduced.
// Used only for one-time migration.
interface LegacyCheckoutSession {
  session_id: string;
  created_at: string;
  order_title: string | null;
  total_amount: number;
  orders: { order_id: string; product_type: CartProductType; total_amount: number }[];
}

// Kept for any code that still imports CheckoutSessionOrder
export interface CheckoutSessionOrder {
  order_id: string;
  product_type: CartProductType;
  total_amount: number;
}

// Backwards-compat alias: CheckoutSession is now PurchaseGroup
export type CheckoutSession = PurchaseGroup;

const STORAGE_KEY = "purchase_groups";
const LEGACY_STORAGE_KEY = "checkout_sessions";
const MAX_GROUPS = 20;

function normalizeLegacy(legacy: LegacyCheckoutSession): PurchaseGroup {
  return {
    purchase_group_id: legacy.session_id,
    created_at: legacy.created_at,
    order_title: legacy.order_title,
    total_amount: legacy.total_amount,
    orders: legacy.orders,
  };
}

function getStoredGroups(): PurchaseGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PurchaseGroup[];

    // One-time migration from old checkout_sessions key
    const legacy_raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy_raw) {
      const migrated = (JSON.parse(legacy_raw) as LegacyCheckoutSession[]).map(
        normalizeLegacy
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {}
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

export function savePurchaseGroup(group: PurchaseGroup): void {
  if (typeof window === "undefined") return;
  try {
    const groups = getStoredGroups();
    const updated = [
      group,
      ...groups.filter((g) => g.purchase_group_id !== group.purchase_group_id),
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, MAX_GROUPS)));
  } catch {}
}

// Called after a successful fetchPurchaseGroups() API response to keep the
// local cache in sync so that order-detail pages can fall back to it.
export function cachePurchaseGroups(groups: PurchaseGroup[]): void {
  if (typeof window === "undefined") return;
  try {
    const local_groups = getStoredGroups();
    const api_ids = new Set(groups.map((g) => g.purchase_group_id));
    // Preserve any local-only groups not yet synced to the API
    const local_only = local_groups.filter((g) => !api_ids.has(g.purchase_group_id));
    const merged = [...groups, ...local_only].slice(0, MAX_GROUPS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
}

export function getPurchaseGroup(purchase_group_id: string): PurchaseGroup | null {
  const groups = getStoredGroups();
  return groups.find((g) => g.purchase_group_id === purchase_group_id) ?? null;
}

export function findGroupByOrderId(order_id: string): PurchaseGroup | null {
  const groups = getStoredGroups();
  return groups.find((g) => g.orders.some((o) => o.order_id === order_id)) ?? null;
}

// ─── Backwards-compat aliases ─────────────────────────────────────────────────
// These keep OrderDetailPage and any other unconverted code compiling.

export function saveCheckoutSession(session: {
  session_id: string;
  created_at: string;
  order_title: string | null;
  total_amount: number;
  orders: { order_id: string; product_type: CartProductType; total_amount: number }[];
}): void {
  savePurchaseGroup(normalizeLegacy(session as LegacyCheckoutSession));
}

export function getCheckoutSession(session_id: string): PurchaseGroup | null {
  return getPurchaseGroup(session_id);
}

export function findSessionByOrderId(order_id: string): PurchaseGroup | null {
  return findGroupByOrderId(order_id);
}
