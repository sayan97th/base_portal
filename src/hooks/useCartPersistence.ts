"use client";

import { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from "react";
import type { KeywordData } from "@/components/link-building/KeywordEntryStep";
import type { AppliedCouponItem } from "@/components/link-building/LinkBuildingOrderSummary";

const CART_STORAGE_KEY = "link_building_cart_v1";
const CART_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CartSnapshot {
  version: 1;
  expires_at: number;
  selected_quantities: Record<string, number>;
  keyword_data: KeywordData;
  order_title: string;
  order_notes: string;
  applied_coupons: AppliedCouponItem[];
  coupon_input_code: string;
}

function readSnapshot(): CartSnapshot | null {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as CartSnapshot;
    if (snap.version !== 1 || Date.now() > snap.expires_at) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return null;
    }
    return snap;
  } catch {
    return null;
  }
}

function writeSnapshot(snap: Omit<CartSnapshot, "version" | "expires_at">): void {
  try {
    const entry: CartSnapshot = {
      version: 1,
      expires_at: Date.now() + CART_EXPIRY_MS,
      ...snap,
    };
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Quota exceeded or private browsing — silently ignore
  }
}

export interface UseCartPersistenceReturn {
  selected_quantities: Record<string, number>;
  setSelectedQuantities: Dispatch<SetStateAction<Record<string, number>>>;
  keyword_data: KeywordData;
  setKeywordData: Dispatch<SetStateAction<KeywordData>>;
  order_title: string;
  setOrderTitle: Dispatch<SetStateAction<string>>;
  order_notes: string;
  setOrderNotes: Dispatch<SetStateAction<string>>;
  applied_coupons: AppliedCouponItem[];
  setAppliedCoupons: Dispatch<SetStateAction<AppliedCouponItem[]>>;
  coupon_input_code: string;
  setCouponInputCode: Dispatch<SetStateAction<string>>;
  is_cart_restored: boolean;
  clearCart: () => void;
  dismissRestoredNotice: () => void;
}

/**
 * Persists link-building cart state to localStorage so items survive
 * navigation and page reloads. The snapshot expires after 7 days.
 */
export function useCartPersistence(): UseCartPersistenceReturn {
  const [selected_quantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [keyword_data, setKeywordData] = useState<KeywordData>({});
  const [order_title, setOrderTitle] = useState("");
  const [order_notes, setOrderNotes] = useState("");
  const [applied_coupons, setAppliedCoupons] = useState<AppliedCouponItem[]>([]);
  const [coupon_input_code, setCouponInputCode] = useState("");
  const [is_cart_restored, setIsCartRestored] = useState(false);

  /**
   * Skip the sync effect on the very first render cycle so that the
   * initial empty state is never written over a valid stored snapshot.
   * The flag turns false after the first effect run; every subsequent
   * state change is then persisted normally.
   */
  const is_first_render = useRef(true);

  // ── Load snapshot on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const snap = readSnapshot();
    if (snap && Object.keys(snap.selected_quantities).length > 0) {
      setSelectedQuantities(snap.selected_quantities);
      setKeywordData(snap.keyword_data ?? {});
      setOrderTitle(snap.order_title ?? "");
      setOrderNotes(snap.order_notes ?? "");
      setAppliedCoupons(snap.applied_coupons ?? []);
      setCouponInputCode(snap.coupon_input_code ?? "");
      setIsCartRestored(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync every change to localStorage ──────────────────────────────────────
  useEffect(() => {
    // Skip the initial render to avoid overwriting the snapshot before the
    // load effect has had a chance to apply it.
    if (is_first_render.current) {
      is_first_render.current = false;
      return;
    }

    const cart_is_empty =
      Object.keys(selected_quantities).length === 0 &&
      applied_coupons.length === 0 &&
      !order_title &&
      !order_notes;

    if (cart_is_empty) {
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch {
        // Ignore
      }
      return;
    }

    writeSnapshot({
      selected_quantities,
      keyword_data,
      order_title,
      order_notes,
      applied_coupons,
      coupon_input_code,
    });
  }, [
    selected_quantities,
    keyword_data,
    order_title,
    order_notes,
    applied_coupons,
    coupon_input_code,
  ]);

  // ── Clears all cart state and removes the stored snapshot ──────────────────
  const clearCart = useCallback(() => {
    setSelectedQuantities({});
    setKeywordData({});
    setOrderTitle("");
    setOrderNotes("");
    setAppliedCoupons([]);
    setCouponInputCode("");
    setIsCartRestored(false);
    // Remove immediately so a pending navigation cannot restore a stale cart
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const dismissRestoredNotice = useCallback(() => {
    setIsCartRestored(false);
  }, []);

  return {
    selected_quantities,
    setSelectedQuantities,
    keyword_data,
    setKeywordData,
    order_title,
    setOrderTitle,
    order_notes,
    setOrderNotes,
    applied_coupons,
    setAppliedCoupons,
    coupon_input_code,
    setCouponInputCode,
    is_cart_restored,
    clearCart,
    dismissRestoredNotice,
  };
}
