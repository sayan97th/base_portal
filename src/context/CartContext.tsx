"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Dispatch,
  SetStateAction,
} from "react";
import type {
  CartItem,
  CartAppliedCoupon,
  CartProductType,
  UnifiedCartPayload,
  CartKeywordRow,
  CartIntakeRow,
} from "@/types/client/unified-cart";
import { unifiedCartService } from "@/services/client/unified-cart.service";

const CART_STORAGE_KEY = "unified_cart_v1";
const CART_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const SERVER_SYNC_DEBOUNCE_MS = 1500;
const BULK_DISCOUNT_THRESHOLD = 10;
const BULK_DISCOUNT_RATE = 0.1;

interface CartSnapshot extends UnifiedCartPayload {
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

function writeLocalSnapshot(payload: UnifiedCartPayload): void {
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

function generateCartItemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export interface CartContextType {
  items: CartItem[];
  applied_coupons: CartAppliedCoupon[];
  coupon_input_code: string;
  order_title: string;
  order_notes: string;
  is_cart_ready: boolean;

  setItemQuantity: (
    product_type: CartProductType,
    tier_id: string,
    tier_name: string,
    unit_price: number,
    quantity: number
  ) => void;
  updateLinkBuildingKeywords: (
    tier_id: string,
    keyword_data: CartKeywordRow[]
  ) => void;
  updateNewContentIntakeData: (
    tier_id: string,
    intake_data: CartIntakeRow[][]
  ) => void;
  getIntakeDataForTier: (tier_id: string) => CartIntakeRow[][];
  clearCart: () => void;
  setAppliedCoupons: Dispatch<SetStateAction<CartAppliedCoupon[]>>;
  setCouponInputCode: Dispatch<SetStateAction<string>>;
  setOrderTitle: Dispatch<SetStateAction<string>>;
  setOrderNotes: Dispatch<SetStateAction<string>>;

  getQuantitiesForProductType: (
    product_type: CartProductType
  ) => Record<string, number>;
  getKeywordDataForTier: (tier_id: string) => CartKeywordRow[];

  subtotal: number;
  link_building_subtotal: number;
  total_links: number;
  bulk_discount_amount: number;
  subtotal_after_bulk: number;
  total_discount: number;
  total: number;
  item_count: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [applied_coupons, setAppliedCoupons] = useState<CartAppliedCoupon[]>([]);
  const [coupon_input_code, setCouponInputCode] = useState("");
  const [order_title, setOrderTitle] = useState("");
  const [order_notes, setOrderNotes] = useState("");
  const [is_cart_ready, setIsCartReady] = useState(false);

  const save_timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Loading sequence: localStorage first (instant), then server (cross-device sync).
  useEffect(() => {
    (async () => {
      const local = readLocalSnapshot();
      if (local && local.items.length > 0) {
        setItems(local.items);
        setAppliedCoupons(local.applied_coupons ?? []);
        setCouponInputCode(local.coupon_input_code ?? "");
        setOrderTitle(local.order_title ?? "");
        setOrderNotes(local.order_notes ?? "");
      }

      try {
        const server = await unifiedCartService.fetchCart();

        if (server && server.items.length > 0) {
          setItems(server.items);
          setAppliedCoupons(server.applied_coupons ?? []);
          setCouponInputCode(server.coupon_input_code ?? "");
          setOrderTitle(server.order_title ?? "");
          setOrderNotes(server.order_notes ?? "");
          writeLocalSnapshot(server);
        } else if (local && local.items.length > 0) {
          // Server is empty but we have a local snapshot — push it up so other
          // devices can see it on their next login.
          unifiedCartService
            .saveCart({
              items: local.items,
              applied_coupons: local.applied_coupons ?? [],
              coupon_input_code: local.coupon_input_code ?? "",
              order_title: local.order_title ?? "",
              order_notes: local.order_notes ?? "",
            })
            .catch(() => {});
        }
      } catch {
        // Server unavailable — localStorage fallback already applied above.
      }

      setIsCartReady(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (save_timer.current) clearTimeout(save_timer.current);
    };
  }, []);

  // Sync every state change to localStorage + debounced server save.
  useEffect(() => {
    if (!is_cart_ready) return;

    const payload: UnifiedCartPayload = {
      items,
      applied_coupons,
      coupon_input_code,
      order_title,
      order_notes,
    };

    const cart_is_empty =
      items.length === 0 &&
      applied_coupons.length === 0 &&
      !order_title &&
      !order_notes;

    if (cart_is_empty) {
      removeLocalSnapshot();
      if (save_timer.current) clearTimeout(save_timer.current);
      unifiedCartService.deleteCart().catch(() => {});
      return;
    }

    writeLocalSnapshot(payload);

    if (save_timer.current) clearTimeout(save_timer.current);
    save_timer.current = setTimeout(() => {
      unifiedCartService.saveCart(payload).catch(() => {});
    }, SERVER_SYNC_DEBOUNCE_MS);
  }, [is_cart_ready, items, applied_coupons, coupon_input_code, order_title, order_notes]);

  const setItemQuantity = useCallback(
    (
      product_type: CartProductType,
      tier_id: string,
      tier_name: string,
      unit_price: number,
      quantity: number
    ) => {
      setItems((prev) => {
        const existing_index = prev.findIndex(
          (item) => item.product_type === product_type && item.tier_id === tier_id
        );

        if (quantity <= 0) {
          return existing_index >= 0
            ? prev.filter((_, i) => i !== existing_index)
            : prev;
        }

        if (existing_index >= 0) {
          const updated = [...prev];
          updated[existing_index] = { ...updated[existing_index], quantity };
          return updated;
        }

        return [
          ...prev,
          {
            cart_item_id: generateCartItemId(),
            product_type,
            tier_id,
            tier_name,
            quantity,
            unit_price,
          },
        ];
      });
    },
    []
  );

  const updateLinkBuildingKeywords = useCallback(
    (tier_id: string, keyword_data: CartKeywordRow[]) => {
      setItems((prev) =>
        prev.map((item) =>
          item.product_type === "link_building" && item.tier_id === tier_id
            ? { ...item, keyword_data }
            : item
        )
      );
    },
    []
  );

  const updateNewContentIntakeData = useCallback(
    (tier_id: string, intake_data: CartIntakeRow[][]) => {
      setItems((prev) =>
        prev.map((item) =>
          item.product_type === "new_content" && item.tier_id === tier_id
            ? { ...item, intake_data }
            : item
        )
      );
    },
    []
  );

  const getIntakeDataForTier = useCallback(
    (tier_id: string): CartIntakeRow[][] => {
      const item = items.find(
        (i) => i.product_type === "new_content" && i.tier_id === tier_id
      );
      return item?.intake_data ?? [];
    },
    [items]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedCoupons([]);
    setCouponInputCode("");
    setOrderTitle("");
    setOrderNotes("");
    if (save_timer.current) clearTimeout(save_timer.current);
    removeLocalSnapshot();
    unifiedCartService.deleteCart().catch(() => {});
  }, []);

  const getQuantitiesForProductType = useCallback(
    (product_type: CartProductType): Record<string, number> => {
      const result: Record<string, number> = {};
      items
        .filter((item) => item.product_type === product_type)
        .forEach((item) => {
          result[item.tier_id] = item.quantity;
        });
      return result;
    },
    [items]
  );

  const getKeywordDataForTier = useCallback(
    (tier_id: string): CartKeywordRow[] => {
      const item = items.find(
        (i) => i.product_type === "link_building" && i.tier_id === tier_id
      );
      return item?.keyword_data ?? [];
    },
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [items]
  );

  const total_links = useMemo(
    () =>
      items
        .filter((item) => item.product_type === "link_building")
        .reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const link_building_subtotal = useMemo(
    () =>
      items
        .filter((item) => item.product_type === "link_building")
        .reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [items]
  );

  const bulk_discount_amount = useMemo(
    () =>
      total_links >= BULK_DISCOUNT_THRESHOLD
        ? Math.round(link_building_subtotal * BULK_DISCOUNT_RATE * 100) / 100
        : 0,
    [total_links, link_building_subtotal]
  );

  const subtotal_after_bulk = Math.max(0, subtotal - bulk_discount_amount);

  const total_discount = applied_coupons.reduce(
    (sum, c) => sum + c.discount_amount,
    0
  );

  const total = Math.max(0, subtotal_after_bulk - total_discount);

  const item_count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        applied_coupons,
        coupon_input_code,
        order_title,
        order_notes,
        is_cart_ready,
        setItemQuantity,
        updateLinkBuildingKeywords,
        updateNewContentIntakeData,
        getIntakeDataForTier,
        clearCart,
        setAppliedCoupons,
        setCouponInputCode,
        setOrderTitle,
        setOrderNotes,
        getQuantitiesForProductType,
        getKeywordDataForTier,
        subtotal,
        link_building_subtotal,
        total_links,
        bulk_discount_amount,
        subtotal_after_bulk,
        total_discount,
        total,
        item_count,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
