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
  ContentOptimizationIntakeRow,
} from "@/types/client/unified-cart";
import { unifiedCartService } from "@/services/client/unified-cart.service";
import { getActiveDiscounts } from "@/services/client/discounts.service";
import type { Discount, BulkDiscountDetail } from "@/types/admin/discounts";

const CART_STORAGE_KEY = "unified_cart_v1";
const CART_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const SERVER_SYNC_DEBOUNCE_MS = 1500;
const MINIMUM_CART_FOR_COUPON = 500;

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
  updateContentOptimizationIntakeData: (
    tier_id: string,
    rows: ContentOptimizationIntakeRow[]
  ) => void;
  getContentOptimizationIntakeDataForTier: (tier_id: string) => ContentOptimizationIntakeRow[];
  updateContentBriefIntakeData: (
    tier_id: string,
    rows: ContentOptimizationIntakeRow[]
  ) => void;
  getContentBriefIntakeDataForTier: (tier_id: string) => ContentOptimizationIntakeRow[];
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
  bulk_discount_details: BulkDiscountDetail[];
  subtotal_after_bulk: number;
  total_discount: number;
  effective_discount_amount: number;
  active_discount_type: "bulk" | "coupon" | "none";
  total: number;
  item_count: number;

  bulk_discount_configs: Discount[];

  coupon_adjustment_notice: string | null;
  setCouponAdjustmentNotice: Dispatch<SetStateAction<string | null>>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [applied_coupons, setAppliedCoupons] = useState<CartAppliedCoupon[]>([]);
  const [coupon_input_code, setCouponInputCode] = useState("");
  const [order_title, setOrderTitle] = useState("");
  const [order_notes, setOrderNotes] = useState("");
  const [is_cart_ready, setIsCartReady] = useState(false);
  const [bulk_discount_configs, setBulkDiscountConfigs] = useState<Discount[]>([]);
  const [coupon_adjustment_notice, setCouponAdjustmentNotice] = useState<string | null>(null);

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
    getActiveDiscounts()
      .then((discounts) => {
        setBulkDiscountConfigs(discounts.filter((d) => d.discount_type === "bulk"));
      })
      .catch(() => {});
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

  const updateContentOptimizationIntakeData = useCallback(
    (tier_id: string, rows: ContentOptimizationIntakeRow[]) => {
      setItems((prev) =>
        prev.map((item) =>
          item.product_type === "content_optimization" && item.tier_id === tier_id
            ? { ...item, co_intake_data: rows }
            : item
        )
      );
    },
    []
  );

  const getContentOptimizationIntakeDataForTier = useCallback(
    (tier_id: string): ContentOptimizationIntakeRow[] => {
      const item = items.find(
        (i) => i.product_type === "content_optimization" && i.tier_id === tier_id
      );
      return item?.co_intake_data ?? [];
    },
    [items]
  );

  const updateContentBriefIntakeData = useCallback(
    (tier_id: string, rows: ContentOptimizationIntakeRow[]) => {
      setItems((prev) =>
        prev.map((item) =>
          item.product_type === "content_brief" && item.tier_id === tier_id
            ? { ...item, co_intake_data: rows }
            : item
        )
      );
    },
    []
  );

  const getContentBriefIntakeDataForTier = useCallback(
    (tier_id: string): ContentOptimizationIntakeRow[] => {
      const item = items.find(
        (i) => i.product_type === "content_brief" && i.tier_id === tier_id
      );
      return item?.co_intake_data ?? [];
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

  const bulk_discount_details = useMemo<BulkDiscountDetail[]>(() => {
    return bulk_discount_configs.map((config) => {
      let current_quantity = 0;
      let product_subtotal = 0;

      if (config.applies_to === "all") {
        current_quantity = items.reduce((sum, item) => sum + item.quantity, 0);
        product_subtotal = subtotal;
      } else {
        const product_items = items.filter((i) => i.product_type === config.applies_to);
        current_quantity = product_items.reduce((sum, item) => sum + item.quantity, 0);
        product_subtotal = product_items.reduce(
          (sum, item) => sum + item.quantity * item.unit_price,
          0
        );
      }

      const is_applied = current_quantity >= config.min_quantity;
      const rate = config.discount_rate / 100;
      const discount_amount = is_applied
        ? Math.round(product_subtotal * rate * 100) / 100
        : 0;

      return {
        config,
        is_applied,
        discount_amount,
        current_quantity,
        quantity_needed: Math.max(0, config.min_quantity - current_quantity),
        product_subtotal,
      };
    });
  }, [bulk_discount_configs, items, subtotal]);

  const bulk_discount_amount = useMemo(
    () => bulk_discount_details.reduce((sum, d) => sum + d.discount_amount, 0),
    [bulk_discount_details]
  );

  const subtotal_after_bulk = Math.max(0, subtotal - bulk_discount_amount);

  const total_discount = applied_coupons.reduce(
    (sum, c) => sum + c.discount_amount,
    0
  );

  // Only one discount type applies — whichever gives the bigger savings.
  const effective_discount_amount = Math.max(bulk_discount_amount, total_discount);

  const active_discount_type: "bulk" | "coupon" | "none" =
    total_discount > 0 && total_discount >= bulk_discount_amount
      ? "coupon"
      : bulk_discount_amount > 0
      ? "bulk"
      : "none";

  const total = Math.max(0, subtotal - effective_discount_amount);

  const item_count = items.reduce((sum, item) => sum + item.quantity, 0);

  // Recalculate and validate applied coupons whenever items or bulk discount change.
  // Keeps discount amounts in sync with the current cart, removes coupons that no
  // longer qualify, and defers to bulk discount when it gives more savings.
  // Anti-gaming: prevents clients from locking in a discount then adjusting quantities
  // to extract more value than the coupon was intended to provide.
  useEffect(() => {
    if (!is_cart_ready || applied_coupons.length === 0) return;

    const new_subtotal = items.reduce(
      (sum, i) => sum + i.quantity * i.unit_price,
      0
    );

    // Cart dropped below the global minimum — remove all coupons
    if (new_subtotal < MINIMUM_CART_FOR_COUPON) {
      setAppliedCoupons([]);
      setCouponAdjustmentNotice(
        `Your promo code was removed because your cart dropped below the $${MINIMUM_CART_FOR_COUPON.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )} minimum required for promo codes.`
      );
      return;
    }

    let changed = false;
    const updated: CartAppliedCoupon[] = [];

    for (const coupon of applied_coupons) {
      let applicable_subtotal = new_subtotal;

      // Determine the subtotal this coupon can act on
      if (coupon.product_types && coupon.product_types.length > 0) {
        applicable_subtotal = items
          .filter((i) => (coupon.product_types as string[]).includes(i.product_type))
          .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

        if (applicable_subtotal === 0) {
          changed = true;
          setCouponAdjustmentNotice(
            `Promo code "${coupon.code}" was removed — none of the qualifying products remain in your cart.`
          );
          continue;
        }
      } else if (coupon.applies_to === "specific_product" && coupon.dr_tier_id) {
        applicable_subtotal = items
          .filter(
            (i) =>
              i.product_type === "link_building" &&
              i.tier_id === coupon.dr_tier_id
          )
          .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

        if (applicable_subtotal === 0) {
          changed = true;
          setCouponAdjustmentNotice(
            `Promo code "${coupon.code}" was removed — the qualifying product is no longer in your cart.`
          );
          continue;
        }
      }

      // Check minimum purchase requirement
      if (
        coupon.applies_to === "minimum_purchase" &&
        coupon.minimum_purchase_amount != null &&
        new_subtotal < coupon.minimum_purchase_amount
      ) {
        changed = true;
        setCouponAdjustmentNotice(
          `Promo code "${coupon.code}" was removed — your cart no longer meets the $${coupon.minimum_purchase_amount.toLocaleString(
            "en-US",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )} minimum purchase requirement.`
        );
        continue;
      }

      // Recalculate discount based on current applicable subtotal
      const new_discount =
        coupon.discount_type === "percentage"
          ? Math.round(applicable_subtotal * (coupon.discount_value / 100) * 100) / 100
          : Math.min(coupon.discount_value, applicable_subtotal);

      if (new_discount !== coupon.discount_amount) changed = true;

      updated.push({ ...coupon, discount_amount: new_discount });
    }

    if (updated.length === 0) {
      if (changed) setAppliedCoupons([]);
      return;
    }

    // Defer to bulk discount when it now gives more savings than the recalculated coupon
    const recalculated_coupon_total = updated.reduce(
      (sum, c) => sum + c.discount_amount,
      0
    );
    if (bulk_discount_amount > 0 && bulk_discount_amount > recalculated_coupon_total) {
      setAppliedCoupons([]);
      return;
    }

    if (changed) setAppliedCoupons(updated);
  }, [is_cart_ready, items, applied_coupons, bulk_discount_amount]); // eslint-disable-line react-hooks/exhaustive-deps

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
        updateContentOptimizationIntakeData,
        getContentOptimizationIntakeDataForTier,
        updateContentBriefIntakeData,
        getContentBriefIntakeDataForTier,
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
        bulk_discount_details,
        subtotal_after_bulk,
        total_discount,
        effective_discount_amount,
        active_discount_type,
        total,
        item_count,
        bulk_discount_configs,
        coupon_adjustment_notice,
        setCouponAdjustmentNotice,
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
