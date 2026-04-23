"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import ContentOptimizationHeader from "./ContentOptimizationHeader";
import ContentOptimizationGrid from "./ContentOptimizationGrid";
import LinkBuildingOrderSummary, {
  type OrderSummaryItem,
  type AppliedCouponItem,
  type MultiCouponState,
} from "@/components/link-building/LinkBuildingOrderSummary";
import CheckoutStep, {
  BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import { getStripe } from "@/lib/stripe";
import type { ContentOptimizationTier } from "@/types/client/content-optimization";
import { contentOptimizationService } from "@/services/client/content-optimization.service";
import { validateCoupon } from "@/services/client/coupons.service";
import { useNotifications } from "@/context/NotificationsContext";
import { useBillingAddress } from "@/hooks/useBillingAddress";

type Step = "selection" | "checkout";

const MINIMUM_CART_FOR_COUPON = 500;

const ContentOptimizationsPage: React.FC = () => {
  const router = useRouter();
  const { addNotification } = useNotifications();

  const [tiers, setTiers] = useState<ContentOptimizationTier[]>([]);
  const [is_loading_tiers, setIsLoadingTiers] = useState(true);
  const [tiers_error, setTiersError] = useState<string | null>(null);

  const fetchTiers = useCallback(async () => {
    setIsLoadingTiers(true);
    setTiersError(null);
    try {
      const data = await contentOptimizationService.fetchTiers();
      setTiers(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch {
      setTiersError("Failed to load optimization tiers. Please refresh the page.");
    } finally {
      setIsLoadingTiers(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [selected_quantities, setSelectedQuantities] = useState<
    Record<string, number>
  >({});
  const [billing_address, setBillingAddress] = useState<BillingAddress>({
    address: "",
    city: "",
    country: "United States",
    state: "Alabama",
    postal_code: "",
    company: "",
  });

  // Order submission state
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  // Coupon transient state (not persisted — reset on every session)
  const [coupon_error, setCouponError] = useState<string | null>(null);
  const [coupon_is_applying, setCouponIsApplying] = useState(false);
  const [applied_coupons, setAppliedCoupons] = useState<AppliedCouponItem[]>([]);
  const [coupon_input_code, setCouponInputCode] = useState("");

  const coupons_state: MultiCouponState = {
    input_code: coupon_input_code,
    applied_coupons,
    error: coupon_error,
    is_applying: coupon_is_applying,
  };

  const { saved_billing_address, has_saved_address } = useBillingAddress();

  // Ref to imperatively trigger submit from the order summary button
  const checkout_ref = useRef<CheckoutStepHandle>(null);
  // Tracks CheckoutStep's internal processing state so the summary button stays in sync
  const [checkout_is_processing, setCheckoutIsProcessing] = useState(false);

  const selected_items: OrderSummaryItem[] = useMemo(() => {
    return tiers
      .filter((tier) => (selected_quantities[tier.id] || 0) > 0)
      .map((tier) => ({
        id: tier.id,
        label: tier.label,
        quantity: selected_quantities[tier.id],
        unit_price: tier.price,
      }));
  }, [tiers, selected_quantities]);

  const subtotal = useMemo(() => {
    return tiers.reduce((sum: number, tier: ContentOptimizationTier) => {
      const qty = selected_quantities[tier.id] || 0;
      return sum + qty * tier.price;
    }, 0);
  }, [tiers, selected_quantities]);

  const total_discount = coupons_state.applied_coupons.reduce(
    (sum, c) => sum + c.discount_amount,
    0
  );
  const total = Math.max(0, subtotal - total_discount);

  const handleQuantityChange = (tier_id: string, quantity: number) => {
    setSelectedQuantities((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[tier_id];
      } else {
        next[tier_id] = quantity;
      }
      return next;
    });
  };

  const handleBillingChange = (
    field: keyof BillingAddress,
    value: string
  ) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleCouponCodeChange = (code: string) => {
    setCouponInputCode(code);
    setCouponError(null);
  };

  const handleApplyCoupon = async () => {
    const trimmed_code = coupon_input_code.trim();
    if (!trimmed_code) return;

    const already_applied = applied_coupons.some(
      (c) => c.code.toUpperCase() === trimmed_code.toUpperCase()
    );
    if (already_applied) {
      setCouponError("This promo code has already been applied.");
      return;
    }

    if (subtotal < MINIMUM_CART_FOR_COUPON) {
      setCouponError(
        `A minimum cart total of $${MINIMUM_CART_FOR_COUPON.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} is required to apply a promo code.`
      );
      return;
    }

    setCouponIsApplying(true);
    setCouponError(null);
    try {
      const applied_discount = applied_coupons.reduce(
        (sum, c) => sum + c.discount_amount,
        0
      );
      const response = await validateCoupon({
        code: trimmed_code,
        order_amount: Math.max(0, subtotal - applied_discount),
      });
      if (response.valid) {
        setCouponInputCode("");
        setCouponError(null);
        setCouponIsApplying(false);
        setAppliedCoupons((prev) => [
          ...prev,
          {
            coupon_id: response.coupon_id,
            code: response.code,
            coupon_name: response.name,
            discount_amount: response.discount_amount,
            discount_type: response.discount_type,
            discount_value: response.discount_value,
          },
        ]);
      } else {
        setCouponError(response.message || "Invalid promo code.");
        setCouponIsApplying(false);
      }
    } catch {
      setCouponError("Could not validate promo code. Please try again.");
      setCouponIsApplying(false);
    }
  };

  const handleRemoveCoupon = (code: string) => {
    setAppliedCoupons((prev) => prev.filter((c) => c.code !== code));
    setCouponError(null);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleNext = () => {
    if (selected_items.length === 0) return;
    // Auto-populate billing address from profile when no data entered yet
    if (has_saved_address && saved_billing_address) {
      const is_billing_empty =
        !billing_address.address &&
        !billing_address.city &&
        !billing_address.postal_code;
      if (is_billing_empty) {
        setBillingAddress(saved_billing_address);
      }
    }
    setCurrentStep("checkout");
    scrollToTop();
  };

  const handlePrevious = () => {
    setCurrentStep("selection");
    scrollToTop();
  };

  const handleApplySavedAddress = useCallback(() => {
    if (saved_billing_address) {
      setBillingAddress(saved_billing_address);
    }
  }, [saved_billing_address]);

  const handleComplete = async (
    payment_intent_id: string,
    is_using_saved_method: boolean
  ) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const items = tiers
        .filter((tier) => (selected_quantities[tier.id] || 0) > 0)
        .map((tier) => ({
          tier_id: tier.id,
          quantity: selected_quantities[tier.id],
          unit_price: tier.price,
        }));

      const result = await contentOptimizationService.createOrder({
        total_amount: total,
        coupon_ids: applied_coupons.map((c) => c.coupon_id),
        items,
        billing: is_using_saved_method
          ? { company: null, address: "", city: "", state: "", country: "", postal_code: "" }
          : {
              company: billing_address.company || null,
              address: billing_address.address,
              city: billing_address.city,
              state: billing_address.state,
              country: billing_address.country,
              postal_code: billing_address.postal_code,
            },
        payment: { payment_method_id: payment_intent_id },
      });

      const total_items = items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
      const formatted_amount = total.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      await addNotification({
        type: "order",
        message: "Your content optimization order has been placed successfully.",
        preview_text: `Order #${result.order_id} · ${total_items} optimization${total_items !== 1 ? "s" : ""} · $${formatted_amount}`,
        link: `/content-optimizations/orders/${result.order_id}`,
      });

      router.push(`/content-optimizations/orders/${result.order_id}`);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        {/* My Orders shortcut */}
        <div className="mb-6 flex items-center justify-end">
          <Link
            href="/content-optimizations/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
              />
            </svg>
            My Orders
          </Link>
        </div>

        {/* Tiers loading / error states */}
        {is_loading_tiers && (
          <div className="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
            Loading optimization tiers...
          </div>
        )}
        {!is_loading_tiers && tiers_error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {tiers_error}
          </div>
        )}

        {/* Selection step */}
        {!is_loading_tiers && !tiers_error && current_step === "selection" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <ContentOptimizationHeader />
              <ContentOptimizationGrid
                tiers={tiers}
                selected_quantities={selected_quantities}
                onQuantityChange={handleQuantityChange}
              />
            </div>

            <div className="col-span-12 lg:col-span-4">
              <LinkBuildingOrderSummary
                selected_items={selected_items}
                total={subtotal}
                action_label="Continue"
                onAction={handleNext}
                is_action_disabled={selected_items.length === 0}
                onQuantityChange={handleQuantityChange}
              />
            </div>
          </div>
        )}

        {/* Checkout step — Elements wraps both columns so the summary button
            can trigger CheckoutStep's Stripe hooks via the imperative ref */}
        {!is_loading_tiers && !tiers_error && current_step === "checkout" && (
          <Elements stripe={getStripe()}>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8">
                <CheckoutStep
                  ref={checkout_ref}
                  billing_address={billing_address}
                  onBillingChange={handleBillingChange}
                  onPrevious={handlePrevious}
                  onComplete={handleComplete}
                  is_loading={is_submitting}
                  error_message={submit_error}
                  total_amount={total}
                  saved_billing_address={saved_billing_address}
                  onApplySavedAddress={handleApplySavedAddress}
                  back_label="Back to Selection"
                  onProcessingChange={setCheckoutIsProcessing}
                />
              </div>

              <div className="col-span-12 lg:col-span-4">
                <LinkBuildingOrderSummary
                  selected_items={selected_items}
                  total={subtotal}
                  min_cart_for_coupon={MINIMUM_CART_FOR_COUPON}
                  action_label="Continue"
                  onAction={() => {}}
                  is_action_disabled
                  show_coupon_field
                  coupon_state={coupons_state}
                  onCouponCodeChange={handleCouponCodeChange}
                  onApplyCoupon={handleApplyCoupon}
                  onRemoveCoupon={handleRemoveCoupon}
                  checkout_action={{
                    total,
                    is_processing: checkout_is_processing || is_submitting,
                    onSubmit: () => checkout_ref.current?.triggerSubmit(),
                  }}
                />
              </div>
            </div>
          </Elements>
        )}
      </div>
    </div>
  );
};

export default ContentOptimizationsPage;
