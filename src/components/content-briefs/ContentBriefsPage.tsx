"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import ContentBriefsHeader from "./ContentBriefsHeader";
import EmailField from "@/components/shared/EmailField";
import BriefGrid from "./BriefGrid";
import LinkBuildingOrderSummary, {
  type OrderSummaryItem,
  type AppliedCouponItem,
  type MultiCouponState,
} from "@/components/link-building/LinkBuildingOrderSummary";
import CheckoutStep, {
  type BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import { brief_tiers } from "./contentBriefsData";
import { contentBriefsService } from "@/services/client/content-briefs.service";
import { validateCoupon } from "@/services/client/coupons.service";
import { useNotifications } from "@/context/NotificationsContext";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { getStripe } from "@/lib/stripe";

type Step = "selection" | "checkout";

const ContentBriefsPage: React.FC = () => {
  const router = useRouter();
  const { addNotification } = useNotifications();

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

  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const [applied_coupons, setAppliedCoupons] = useState<AppliedCouponItem[]>([]);
  const [coupon_input_code, setCouponInputCode] = useState("");
  const [coupon_error, setCouponError] = useState<string | null>(null);
  const [coupon_is_applying, setCouponIsApplying] = useState(false);

  const { saved_billing_address, has_saved_address } = useBillingAddress();

  const checkout_ref = useRef<CheckoutStepHandle>(null);
  const [checkout_is_processing, setCheckoutIsProcessing] = useState(false);

  const coupons_state: MultiCouponState = {
    input_code: coupon_input_code,
    applied_coupons,
    error: coupon_error,
    is_applying: coupon_is_applying,
  };

  // Placeholder email — replace with actual user data when auth is integrated
  const user_email = "marketing@basesearchmarketing.com";

  const selected_items: OrderSummaryItem[] = useMemo(() => {
    return brief_tiers
      .filter((tier) => (selected_quantities[tier.id] || 0) > 0)
      .map((tier) => ({
        id: tier.id,
        label: tier.label,
        quantity: selected_quantities[tier.id],
        unit_price: tier.price,
      }));
  }, [selected_quantities]);

  const subtotal = useMemo(() => {
    return brief_tiers.reduce((sum, tier) => {
      const qty = selected_quantities[tier.id] || 0;
      return sum + qty * tier.price;
    }, 0);
  }, [selected_quantities]);

  const total_discount = applied_coupons.reduce(
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

  const handleBillingChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplySavedAddress = useCallback(() => {
    if (saved_billing_address) {
      setBillingAddress(saved_billing_address);
    }
  }, [saved_billing_address]);

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

  const handleComplete = async (
    payment_intent_id: string,
    is_using_saved_method: boolean
  ) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const items = brief_tiers
        .filter((tier) => (selected_quantities[tier.id] ?? 0) > 0)
        .map((tier) => ({
          tier_id: tier.id,
          quantity: selected_quantities[tier.id],
          unit_price: tier.price,
        }));

      const result = await contentBriefsService.createOrder({
        total_amount: total,
        coupon_ids: applied_coupons.map((c) => c.coupon_id),
        items,
        billing: is_using_saved_method
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
            },
        payment: { payment_method_id: payment_intent_id },
      });

      const total_briefs = items.reduce((sum, item) => sum + item.quantity, 0);
      const formatted_amount = total.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      await addNotification({
        type: "order",
        message: "Your content brief order has been placed successfully.",
        preview_text: `Order #${result.order_id} · ${total_briefs} brief${total_briefs !== 1 ? "s" : ""} · $${formatted_amount}`,
        link: `/content-briefs/orders/${result.order_id}`,
      });

      router.push(`/content-briefs/orders/${result.order_id}`);
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* ── Selection step ── */}
      {current_step === "selection" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 lg:col-span-8">
            <ContentBriefsHeader />
            <EmailField email={user_email} />
            <BriefGrid
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

      {/* ── Checkout step — Elements wraps both columns so the summary button
           can trigger CheckoutStep's Stripe hooks via the imperative ref ── */}
      {current_step === "checkout" && (
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
  );
};

export default ContentBriefsPage;
