"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import PremiumMentionsHeader from "./PremiumMentionsHeader";
import PremiumMentionsPlanGrid from "./PremiumMentionsPlanGrid";
import LinkBuildingOrderSummary, {
  type OrderSummaryItem,
  type MultiCouponState,
} from "@/components/link-building/LinkBuildingOrderSummary";
import CheckoutStep, {
  type BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import { premium_mentions_plans as fallback_plans } from "./premiumMentionsData";
import { premiumMentionsService } from "@/services/client/premium-mentions.service";
import { validateCoupon } from "@/services/client/coupons.service";
import { useNotifications } from "@/context/NotificationsContext";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { getStripe } from "@/lib/stripe";
import type { PremiumMentionsPlan } from "@/types/client/premium-mentions";
import type { AppliedCouponItem } from "@/components/link-building/LinkBuildingOrderSummary";

type Step = "selection" | "checkout";

const MINIMUM_CART_FOR_COUPON = 1000;

const PremiumMentionsPage: React.FC = () => {
  const router = useRouter();
  const { addNotification } = useNotifications();

  // Plans state
  const [plans, setPlans] = useState<PremiumMentionsPlan[]>(fallback_plans);
  const [plans_loading, setPlansLoading] = useState(true);
  const [plans_error, setPlansError] = useState<string | null>(null);

  // Selection state
  const [selected_plan_id, setSelectedPlanId] = useState<string | null>(null);

  // Order submission state
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  // Step state
  const [current_step, setCurrentStep] = useState<Step>("selection");

  // Billing address state
  const [billing_address, setBillingAddress] = useState<BillingAddress>({
    address: "",
    city: "",
    country: "United States",
    state: "Alabama",
    postal_code: "",
    company: "",
  });

  // Coupon state
  const [coupon_input_code, setCouponInputCode] = useState("");
  const [applied_coupons, setAppliedCoupons] = useState<AppliedCouponItem[]>([]);
  const [coupon_error, setCouponError] = useState<string | null>(null);
  const [coupon_is_applying, setCouponIsApplying] = useState(false);

  const { saved_billing_address, has_saved_address } = useBillingAddress();

  const checkout_ref = useRef<CheckoutStepHandle>(null);
  const [checkout_is_processing, setCheckoutIsProcessing] = useState(false);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const data = await premiumMentionsService.fetchPlans();
      setPlans(data.filter((p) => p.is_active));
    } catch {
      setPlansError("Failed to load plans. Showing default catalog.");
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const selected_plan = useMemo(
    () => plans.find((p) => p.id === selected_plan_id) ?? null,
    [plans, selected_plan_id]
  );

  const selected_items: OrderSummaryItem[] = useMemo(() => {
    if (!selected_plan) return [];
    return [
      {
        id: selected_plan.id,
        label: selected_plan.name,
        quantity: 1,
        unit_price: selected_plan.price_per_month,
      },
    ];
  }, [selected_plan]);

  const subtotal = selected_plan?.price_per_month ?? 0;

  const total_discount = applied_coupons.reduce(
    (sum, c) => sum + c.discount_amount,
    0
  );
  const total = Math.max(0, subtotal - total_discount);

  const coupons_state: MultiCouponState = {
    input_code: coupon_input_code,
    applied_coupons,
    error: coupon_error,
    is_applying: coupon_is_applying,
  };

  const handlePlanSelect = (plan_id: string) => {
    setSelectedPlanId(plan_id);
  };

  const handleBillingChange = (field: keyof BillingAddress, value: string) => {
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

  const handleContinue = () => {
    if (!selected_plan) return;

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

  const handleApplySavedAddress = useCallback(() => {
    if (saved_billing_address) {
      setBillingAddress(saved_billing_address);
    }
  }, [saved_billing_address]);

  const handlePrevious = () => {
    setCurrentStep("selection");
    scrollToTop();
  };

  const handleComplete = async (
    payment_intent_id: string,
    is_using_saved_method: boolean
  ) => {
    if (!selected_plan) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await premiumMentionsService.createOrder({
        plan_id: selected_plan.id,
        total_amount: total,
        coupon_ids: applied_coupons.map((c) => c.coupon_id),
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

      const formatted_amount = total.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      await addNotification({
        type: "order",
        message: "Your Premium Mentions order has been placed successfully.",
        preview_text: `Order #${result.order_id} · ${selected_plan.name} · $${formatted_amount}`,
        link: `/premium-mentions/orders/${result.order_id}`,
      });

      router.push(`/premium-mentions/orders/${result.order_id}`);
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
            href="/orders"
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

        {/* ── Selection step ── */}
        {current_step === "selection" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <PremiumMentionsHeader />

              {plans_error && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {plans_error}
                </p>
              )}

              {plans_loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                    />
                  ))}
                </div>
              ) : (
                <PremiumMentionsPlanGrid
                  plans={plans}
                  selected_plan_id={selected_plan_id}
                  onSelect={handlePlanSelect}
                />
              )}
            </div>

            <div className="col-span-12 lg:col-span-4">
              <LinkBuildingOrderSummary
                selected_items={selected_items}
                total={subtotal}
                action_label="Continue to Checkout"
                onAction={handleContinue}
                is_action_disabled={!selected_plan}
              />
            </div>
          </div>
        )}

        {/* ── Checkout step ── */}
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
                  onProcessingChange={setCheckoutIsProcessing}
                />
              </div>

              <div className="col-span-12 lg:col-span-4">
                <LinkBuildingOrderSummary
                  selected_items={selected_items}
                  total={subtotal}
                  min_cart_for_coupon={MINIMUM_CART_FOR_COUPON}
                  action_label="Continue to Checkout"
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

export default PremiumMentionsPage;
