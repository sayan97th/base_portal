"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useNotifications } from "@/context/NotificationsContext";
import { unifiedCartService } from "@/services/client/unified-cart.service";
import { saveCheckoutSession } from "@/lib/checkout-session";
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

/**
 * Extracts a readable message from an API error response.
 * When Laravel returns a 422 with an `errors` map, we surface each field
 * error on its own line instead of the generic truncated message.
 */
function extractApiErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") {
    return "Something went wrong. Please try again.";
  }

  const error = err as Record<string, unknown>;

  if ("errors" in error && error.errors && typeof error.errors === "object") {
    const errors = error.errors as Record<string, string[]>;
    const messages = Object.values(errors).flat();
    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Something went wrong. Please try again.";
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

        // Only include coupon_ids when coupons are actually applied.
        // Laravel's `required` rule rejects empty arrays, so omitting the
        // field entirely when there are no coupons avoids a validation error.
        const coupon_ids =
          applied_coupons.length > 0
            ? applied_coupons.map((c) => c.coupon_id)
            : undefined;

        const result = await unifiedCartService.checkout({
          payment_method_id: payment_intent_id,
          total_amount: total,
          coupon_ids,
          billing,
          order_title: order_title || null,
          order_notes: order_notes || null,
          link_building_items:
            lb_items.length > 0
              ? lb_items.map((item) => {
                  const keyword_rows = item.keyword_data ?? [];
                  // The API requires at least one placement per item.
                  // When the user hasn't entered keywords yet (e.g. checked
                  // out from another product page), we send a single null-value
                  // placeholder so the order is created and keywords can be
                  // provided via the intake form.
                  const placements =
                    keyword_rows.length > 0
                      ? keyword_rows.map((row, idx) => ({
                          row_index: idx,
                          keyword: row.keyword || null,
                          landing_page: row.landing_page || null,
                          exact_match: row.exact_match,
                        }))
                      : [
                          {
                            row_index: 0,
                            keyword: null,
                            landing_page: null,
                            exact_match: false,
                          },
                        ];

                  return {
                    dr_tier_id: item.tier_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    placements,
                  };
                })
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

        const session_id = crypto.randomUUID();
        saveCheckoutSession({
          session_id,
          created_at: new Date().toISOString(),
          order_title: order_title || null,
          total_amount: total,
          orders: result.orders.map((o) => ({
            order_id: o.order_id,
            product_type: o.product_type,
            total_amount: o.total_amount,
          })),
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
            link: `/orders/session/${session_id}`,
          });
        }

        clearCart();

        router.push(`/orders/session/${session_id}`);
      } catch (err: unknown) {
        setSubmitError(extractApiErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [items, applied_coupons, total, order_title, order_notes, clearCart, addNotification, router]
  );

  return { is_submitting, submit_error, setSubmitError, handleComplete };
}
