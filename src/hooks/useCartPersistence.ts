"use client";

import { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from "react";
import type { KeywordData } from "@/components/link-building/KeywordEntryStep";
import type { AppliedCouponItem } from "@/components/link-building/LinkBuildingOrderSummary";
import type { CartPayload } from "@/types/client/link-building";
import { linkBuildingService } from "@/services/client/link-building.service";

// ── localStorage layer ────────────────────────────────────────────────────────

const CART_STORAGE_KEY = "link_building_cart_v1";
const CART_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Debounce window for server saves — avoids a PUT on every keystroke. */
const SERVER_SYNC_DEBOUNCE_MS = 1500;

interface CartSnapshot extends CartPayload {
  version: 1;
  expires_at: number;
}

function readLocalSnapshot(): CartSnapshot | null {
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

function writeLocalSnapshot(payload: CartPayload): void {
  try {
    const entry: CartSnapshot = {
      version: 1,
      expires_at: Date.now() + CART_EXPIRY_MS,
      ...payload,
    };
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Quota exceeded or private browsing — silently ignore
  }
}

function removeLocalSnapshot(): void {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

// ── Hook public interface ─────────────────────────────────────────────────────

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
  clearCart: () => void;
}

/**
 * Manages link-building cart state with a two-layer persistence strategy:
 *
 * 1. **localStorage** — written synchronously on every change; read instantly
 *    on mount for zero-latency restore on the same device. Expires after 7 days.
 *
 * 2. **Laravel API**  — debounced write (1.5 s) so keystrokes don't hammer the
 *    server; read on mount to enable cross-device access. Server data always
 *    takes precedence over a local snapshot when both are present.
 *
 * Loading sequence on mount:
 *   a. Apply the localStorage snapshot immediately (no network wait).
 *   b. Fetch the server cart asynchronously.
 *   c. If the server has items → override local state and refresh localStorage.
 *   d. If the server is empty but localStorage has items → push local → server.
 *
 * Clearing: cancels any pending debounced save, wipes localStorage synchronously,
 * and fires a DELETE to the server so the next login on any device starts clean.
 */
export function useCartPersistence(): UseCartPersistenceReturn {
  const [selected_quantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [keyword_data, setKeywordData] = useState<KeywordData>({});
  const [order_title, setOrderTitle] = useState("");
  const [order_notes, setOrderNotes] = useState("");
  const [applied_coupons, setAppliedCoupons] = useState<AppliedCouponItem[]>([]);
  const [coupon_input_code, setCouponInputCode] = useState("");

  /**
   * Becomes true once the full load sequence (localStorage + server) has
   * completed. The sync effect is gated on this flag to prevent the initial
   * empty state from overwriting a valid snapshot before it has been applied.
   */
  const [is_ready, setIsReady] = useState(false);

  /** Holds the pending debounced-save timer ID. */
  const save_timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Step 1 — Apply localStorage immediately for instant restore
      const local = readLocalSnapshot();
      if (local && Object.keys(local.selected_quantities).length > 0) {
        setSelectedQuantities(local.selected_quantities);
        setKeywordData(local.keyword_data ?? {});
        setOrderTitle(local.order_title ?? "");
        setOrderNotes(local.order_notes ?? "");
        setAppliedCoupons(local.applied_coupons ?? []);
        setCouponInputCode(local.coupon_input_code ?? "");
      }

      // Step 2 — Fetch from server; server data is the source of truth for
      // cross-device sync
      try {
        const server = await linkBuildingService.fetchCart();

        if (server && Object.keys(server.selected_quantities).length > 0) {
          // Server has items → override local state and refresh localStorage
          setSelectedQuantities(server.selected_quantities);
          setKeywordData(server.keyword_data ?? {});
          setOrderTitle(server.order_title ?? "");
          setOrderNotes(server.order_notes ?? "");
          setAppliedCoupons(server.applied_coupons ?? []);
          setCouponInputCode(server.coupon_input_code ?? "");
          writeLocalSnapshot(server);
        } else if (local && Object.keys(local.selected_quantities).length > 0) {
          // Server is empty but we have a local snapshot → push it to the server
          // so it becomes available from other devices going forward
          const local_payload: CartPayload = {
            selected_quantities: local.selected_quantities,
            keyword_data: local.keyword_data ?? {},
            order_title: local.order_title ?? "",
            order_notes: local.order_notes ?? "",
            applied_coupons: local.applied_coupons ?? [],
            coupon_input_code: local.coupon_input_code ?? "",
          };
          linkBuildingService.saveCart(local_payload).catch(() => {});
        }
      } catch {
        // Server unavailable — localStorage fallback already applied above
      }

      setIsReady(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cancel debounce timer on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (save_timer.current) clearTimeout(save_timer.current);
    };
  }, []);

  // ── Sync every state change to localStorage + debounced server save ─────────
  useEffect(() => {
    if (!is_ready) return;

    const current_payload: CartPayload = {
      selected_quantities,
      keyword_data,
      order_title,
      order_notes,
      applied_coupons,
      coupon_input_code,
    };

    const cart_is_empty =
      Object.keys(selected_quantities).length === 0 &&
      applied_coupons.length === 0 &&
      !order_title &&
      !order_notes;

    if (cart_is_empty) {
      removeLocalSnapshot();
      if (save_timer.current) clearTimeout(save_timer.current);
      linkBuildingService.deleteCart().catch(() => {});
      return;
    }

    // Immediate localStorage write (synchronous, zero latency)
    writeLocalSnapshot(current_payload);

    // Debounced server save (avoids a PUT on every keystroke)
    if (save_timer.current) clearTimeout(save_timer.current);
    save_timer.current = setTimeout(() => {
      linkBuildingService.saveCart(current_payload).catch(() => {});
    }, SERVER_SYNC_DEBOUNCE_MS);
  }, [
    is_ready,
    selected_quantities,
    keyword_data,
    order_title,
    order_notes,
    applied_coupons,
    coupon_input_code,
  ]);

  // ── Clear cart ───────────────────────────────────────────────────────────────
  const clearCart = useCallback(() => {
    setSelectedQuantities({});
    setKeywordData({});
    setOrderTitle("");
    setOrderNotes("");
    setAppliedCoupons([]);
    setCouponInputCode("");

    // Cancel any pending debounced save before clearing
    if (save_timer.current) clearTimeout(save_timer.current);

    // Synchronous localStorage removal + immediate server DELETE so the next
    // login on any device starts with a clean slate
    removeLocalSnapshot();
    linkBuildingService.deleteCart().catch(() => {});
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
    clearCart,
  };
}
