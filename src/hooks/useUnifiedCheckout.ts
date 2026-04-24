"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useNotifications } from "@/context/NotificationsContext";
import { unifiedCartService } from "@/services/client/unified-cart.service";
import type { BillingAddress } from "@/components/shared/CheckoutStep";
import type {
  CartProductType,
  UnifiedCheckoutBilling,
} from "@/types/client/unified-cart";

const PRODUCT_TYPE_LABELS: Record<CartProductType, string> = {
  link_building: "Link Building",
  content_optimization: "Content Optimization",
  new_content: "New Content",
  content_brief: "Content Briefs",
};

function getOrderDetailLink(
  product_type: CartProductType,
  order_id: string
): string {
  switch (product_type) {
    case "link_building":
      return `/link-building/orders/${order_id}`;
    case "content_optimization":
      return `/content-optimizations/orders/${order_id}`;
    case "new_content":
      return `/new-content/orders`;
    case "content_brief":
      return `/content-briefs/orders/${order_id}`;
  }
}

export interface UseUnifiedCheckoutReturn {
  is_submitting: boolean;
  submit_error: string | null;
  setSubmitError: (error: string | null) => void;
  handleComplete: (
    payment_intent_id: string,
    is_using_saved_method: boolean,
    billing_address: BillingAddress
  ) => Promise<void>;
}

/**
 * Handles the unified checkout flow shared across all 4 product pages.
 * After Stripe confirms the payment, it submits all cart items to
 * POST /api/cart/checkout, which creates one order per product type
 * atomically. On success it clears the cart and redirects.
 */
export function useUnifiedCheckout(): UseUnifiedCheckoutReturn {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const {
    items,
    applied_coupons,
    total,
    order_title,
    order_notes,
    clearCart,
  } = useCart();

  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const handleComplete = useCallback(
    async (
      payment_intent_id: string,
      is_using_saved_method: boolean,
      billing_address: BillingAddress
    ) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const billing: UnifiedCheckoutBilling = is_using_saved_method
          ? {
              company: null,
              address: "",
              city: "",
              state: "",
              country: "",
              postal_code: "",
            }
          : {
              company: billing_address.company || null,
              address: billing_address.address,
              city: billing_address.city,
              state: billing_address.state,
              country: billing_address.country,
              postal_code: billing_address.postal_code,
            };

        const lb_items = items.filter(
          (i) => i.product_type === "link_building"
        );
        const co_items = items.filter(
          (i) => i.product_type === "content_optimization"
        );
        const nc_items = items.filter(
          (i) => i.product_type === "new_content"
        );
        const cb_items = items.filter(
          (i) => i.product_type === "content_brief"
        );

        const result = await unifiedCartService.checkout({
          payment_method_id: payment_intent_id,
          total_amount: total,
          coupon_ids: applied_coupons.map((c) => c.coupon_id),
          billing,
          order_title: order_title || null,
          order_notes: order_notes || null,
          link_building_items:
            lb_items.length > 0
              ? lb_items.map((item) => ({
                  dr_tier_id: item.tier_id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  placements: (item.keyword_data ?? []).map((row, idx) => ({
                    row_index: idx,
                    keyword: row.keyword || null,
                    landing_page: row.landing_page || null,
                    exact_match: row.exact_match,
                  })),
                }))
              : undefined,
          content_optimization_items:
            co_items.length > 0
              ? co_items.map((item) => ({
                  tier_id: item.tier_id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                }))
              : undefined,
          new_content_items:
            nc_items.length > 0
              ? nc_items.map((item) => ({
                  tier_id: item.tier_id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                }))
              : undefined,
          content_brief_items:
            cb_items.length > 0
              ? cb_items.map((item) => ({
                  tier_id: item.tier_id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                }))
              : undefined,
        });

        for (const order of result.orders) {
          const label = PRODUCT_TYPE_LABELS[order.product_type];
          const formatted_amount = order.total_amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          await addNotification({
            type: "order",
            message: `Your ${label} order has been placed successfully.`,
            preview_text: `Order #${order.order_id} · $${formatted_amount}`,
            link: getOrderDetailLink(order.product_type, order.order_id),
          });
        }

        clearCart();

        if (result.orders.length === 1) {
          const order = result.orders[0];
          router.push(getOrderDetailLink(order.product_type, order.order_id));
        } else {
          // Multiple product types — redirect to the most prominent order.
          const priority: CartProductType[] = [
            "link_building",
            "content_optimization",
            "content_brief",
            "new_content",
          ];
          const primary =
            priority
              .map((pt) => result.orders.find((o) => o.product_type === pt))
              .find(Boolean) ?? result.orders[0];
          router.push(getOrderDetailLink(primary!.product_type, primary!.order_id));
        }
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Something went wrong. Please try again.";
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [items, applied_coupons, total, order_title, order_notes, clearCart, addNotification, router]
  );

  return { is_submitting, submit_error, setSubmitError, handleComplete };
}
