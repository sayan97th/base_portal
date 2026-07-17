"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import LinkBuildingHeader from "./LinkBuildingHeader";
import DrTierGrid from "./DrTierGrid";
import ContentRefreshUpsell from "./ContentRefreshUpsell";
import UnifiedIntakeStep, {
  type UnifiedIntakeStepHandle,
} from "@/components/shared/UnifiedIntakeStep";
import UnifiedCartSummary from "@/components/shared/UnifiedCartSummary";
import OrderReviewStep from "@/components/shared/OrderReviewStep";
import CheckoutStep, {
  BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import { dr_tiers as fallback_dr_tiers } from "./drTierData";
import { linkBuildingService } from "@/services/client/link-building.service";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { useCart } from "@/context/CartContext";
import { useUnifiedCheckout } from "@/hooks/useUnifiedCheckout";
import { getStripe } from "@/lib/stripe";
import type { DrTier } from "@/types/client/link-building";

type Step = "selection" | "intake" | "review" | "checkout";

const LinkBuildingPage: React.FC = () => {
  const [dr_tiers, setDrTiers] = useState<DrTier[]>(fallback_dr_tiers);
  const [dr_tiers_loading, setDrTiersLoading] = useState(true);
  const [dr_tiers_error, setDrTiersError] = useState<string | null>(null);

  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [billing_address, setBillingAddress] = useState<BillingAddress>({
    address: "",
    city: "",
    country: "United States",
    state: "Alabama",
    postal_code: "",
    company: "",
  });

  const {
    items,
    getQuantitiesForProductType,
    setItemQuantity,
    item_count,
    subtotal,
    total,
  } = useCart();

  const { saved_billing_address, has_saved_address } = useBillingAddress();
  const { is_submitting, submit_error, handleComplete: executeCheckout, handlePayLater } =
    useUnifiedCheckout();

  const checkout_ref = useRef<CheckoutStepHandle>(null);
  const intake_step_ref = useRef<UnifiedIntakeStepHandle>(null);
  const [checkout_is_processing, setCheckoutIsProcessing] = useState(false);
  const [stripe_payment_error, setStripePaymentError] = useState<string | null>(null);
  const [credits_to_apply, setCreditsToApply] = useState(0);
  const [is_applying_credits, setIsApplyingCredits] = useState(false);

  const handleCreditsChange = useCallback((is_applying: boolean, credits: number) => {
    setIsApplyingCredits(is_applying);
    setCreditsToApply(credits);
  }, []);

  const loadDrTiers = useCallback(async () => {
    setDrTiersLoading(true);
    setDrTiersError(null);
    try {
      const tiers = await linkBuildingService.fetchDrTiers();
      setDrTiers(tiers.filter((t) => t.is_active));
    } catch {
      setDrTiersError("Failed to load DR tiers. Showing default catalog.");
    } finally {
      setDrTiersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrTiers();
  }, [loadDrTiers]);

  const selected_quantities = getQuantitiesForProductType("link_building");

  const has_intake_items = useMemo(
    () =>
      items.some(
        (i) =>
          i.product_type === "link_building" ||
          i.product_type === "new_content" ||
          i.product_type === "content_optimization" ||
          i.product_type === "content_brief"
      ),
    [items]
  );

  const selected_items = useMemo(
    () =>
      dr_tiers
        .filter((tier) => (selected_quantities[tier.id] ?? 0) > 0)
        .map((tier) => ({
          id: tier.id,
          label: tier.label,
          quantity: selected_quantities[tier.id],
          unit_price: tier.price_per_link,
        })),
    [selected_quantities, dr_tiers]
  );

  const handleQuantityChange = (tier_id: string, quantity: number) => {
    const tier = dr_tiers.find((t) => t.id === tier_id);
    if (!tier) return;
    setItemQuantity(
      "link_building",
      tier_id,
      tier.label,
      tier.price_per_link,
      quantity
    );
  };

  const handleBillingChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const applyBillingIfEmpty = () => {
    if (has_saved_address && saved_billing_address) {
      const is_billing_empty =
        !billing_address.address &&
        !billing_address.city &&
        !billing_address.postal_code;
      if (is_billing_empty) setBillingAddress(saved_billing_address);
    }
  };

  const handleContinue = () => {
    if (item_count === 0) return;
    if (has_intake_items) {
      setCurrentStep("intake");
    } else {
      applyBillingIfEmpty();
      setCurrentStep("checkout");
    }
    scrollToTop();
  };

  const handleProceedToReview = useCallback(() => {
    setCurrentStep("review");
    scrollToTop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProceedFromReview = useCallback(() => {
    applyBillingIfEmpty();
    setCurrentStep("checkout");
    scrollToTop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [has_saved_address, saved_billing_address, billing_address]);

  const handleApplySavedAddress = useCallback(() => {
    if (saved_billing_address) {
      setBillingAddress(saved_billing_address);
    }
  }, [saved_billing_address]);

  const handlePrevious = () => {
    if (current_step === "checkout") {
      setCurrentStep("review");
    } else if (current_step === "review") {
      setCurrentStep("intake");
    } else {
      setCurrentStep("selection");
    }
    scrollToTop();
  };

  const handleComplete = useCallback(
    async (payment_intent_id: string, is_using_saved_method: boolean, credits_amount?: number) => {
      await executeCheckout(
        payment_intent_id,
        is_using_saved_method,
        billing_address,
        credits_amount
      );
    },
    [executeCheckout, billing_address]
  );

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

        {/* Selection step */}
        {current_step === "selection" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <LinkBuildingHeader />
              {dr_tiers_error && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {dr_tiers_error}
                </p>
              )}
              {dr_tiers_loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                    />
                  ))}
                </div>
              ) : (
                <DrTierGrid
                  dr_tiers={dr_tiers}
                  selected_quantities={selected_quantities}
                  onQuantityChange={handleQuantityChange}
                />
              )}
              {selected_items.length > 0 && <ContentRefreshUpsell />}
            </div>

            <div className="col-span-12 lg:col-span-4">
              <UnifiedCartSummary
                action_label={
                  has_intake_items ? "Continue to Intake Form" : "Continue to Checkout"
                }
                onAction={handleContinue}
                is_action_disabled={item_count === 0}
              />
            </div>
          </div>
        )}

        {/* Intake form step */}
        {current_step === "intake" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <UnifiedIntakeStep
                ref={intake_step_ref}
                onBack={() => { setCurrentStep("selection"); scrollToTop(); }}
                onNext={handleProceedToReview}
                onSkip={handleProceedToReview}
                back_label="Back to Selection"
              />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <UnifiedCartSummary
                action_label="Review Order"
                onAction={() => intake_step_ref.current?.triggerNext()}
                is_action_disabled={!has_intake_items}
              />
            </div>
          </div>
        )}

        {/* Order review step */}
        {current_step === "review" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <OrderReviewStep
                onBack={() => { setCurrentStep("intake"); scrollToTop(); }}
                onNext={handleProceedFromReview}
                back_label="Back to Intake Form"
              />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <UnifiedCartSummary
                action_label="Proceed to Checkout"
                onAction={handleProceedFromReview}
                is_quantity_locked
                on_back={() => { setCurrentStep("intake"); scrollToTop(); }}
                back_label="Back to Intake Form"
              />
            </div>
          </div>
        )}

        {/* Checkout step */}
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
                  onPayLater={handlePayLater}
                  is_loading={is_submitting}
                  error_message={submit_error}
                  total_amount={is_applying_credits ? subtotal : total}
                  saved_billing_address={saved_billing_address}
                  onApplySavedAddress={handleApplySavedAddress}
                  back_label={
                    has_intake_items ? "Back to Order Review" : "Back to Selection"
                  }
                  onProcessingChange={setCheckoutIsProcessing}
                  onCreditsChange={handleCreditsChange}
                  onStripeError={setStripePaymentError}
                />
              </div>

              <div className="col-span-12 lg:col-span-4">
                <UnifiedCartSummary
                  show_coupon_field
                  checkout_action={{
                    total,
                    is_processing: checkout_is_processing || is_submitting,
                    onSubmit: () => checkout_ref.current?.triggerSubmit(),
                  }}
                  is_applying_credits={is_applying_credits}
                  credits_to_apply={credits_to_apply}
                  is_quantity_locked
                  on_back={handlePrevious}
                  back_label={has_intake_items ? "Back to Order Review" : "Back to Selection"}
                  payment_error={stripe_payment_error ?? submit_error}
                />
              </div>
            </div>
          </Elements>
        )}
      </div>
    </div>
  );
};

export default LinkBuildingPage;
