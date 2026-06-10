"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Elements } from "@stripe/react-stripe-js";
import ContentBriefsHeader from "./ContentBriefsHeader";
import BriefGrid from "./BriefGrid";
import UnifiedIntakeStep, {
  type UnifiedIntakeStepHandle,
} from "@/components/shared/UnifiedIntakeStep";
import UnifiedCartSummary from "@/components/shared/UnifiedCartSummary";
import OrderReviewStep from "@/components/shared/OrderReviewStep";
import CheckoutStep, {
  type BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import type { ContentBriefTier } from "@/types/client/content-briefs";
import { contentBriefsService } from "@/services/client/content-briefs.service";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { useCart } from "@/context/CartContext";
import { useUnifiedCheckout } from "@/hooks/useUnifiedCheckout";
import { getStripe } from "@/lib/stripe";

type Step = "selection" | "intake" | "review" | "checkout";

const ContentBriefsPage: React.FC = () => {
  const [tiers, setTiers] = useState<ContentBriefTier[]>([]);
  const [tiers_loading, setTiersLoading] = useState(true);
  const [tiers_error, setTiersError] = useState<string | null>(null);

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

  useEffect(() => {
    contentBriefsService
      .fetchTiers()
      .then((data) => {
        setTiers(data.filter((t) => t.is_active && !t.is_hidden));
      })
      .catch(() => {
        setTiersError("Failed to load available tiers. Please refresh the page.");
      })
      .finally(() => {
        setTiersLoading(false);
      });
  }, []);

  const selected_quantities = getQuantitiesForProductType("content_brief");

  const has_intake_items = useMemo(
    () =>
      items.some(
        (i) =>
          i.product_type === "content_brief" ||
          i.product_type === "content_optimization" ||
          i.product_type === "new_content" ||
          i.product_type === "link_building"
      ),
    [items]
  );

  const handleQuantityChange = (tier_id: string, quantity: number) => {
    const tier = tiers.find((t) => t.id === tier_id);
    if (!tier) return;
    setItemQuantity("content_brief", tier_id, tier.label, tier.price, quantity);
  };

  const handleBillingChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplySavedAddress = useCallback(() => {
    if (saved_billing_address) {
      setBillingAddress(saved_billing_address);
    }
  }, [saved_billing_address]);

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

  const handleNext = () => {
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
    async (payment_intent_id: string, is_using_saved_method: boolean) => {
      await executeCheckout(
        payment_intent_id,
        is_using_saved_method,
        billing_address
      );
    },
    [executeCheckout, billing_address]
  );

  const back_label_for_checkout = has_intake_items ? "Back to Order Review" : "Back to Selection";

  if (tiers_error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <p className="text-sm text-red-500">{tiers_error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Selection step */}
      {current_step === "selection" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 lg:col-span-8">
            <ContentBriefsHeader />
            <BriefGrid
              tiers={tiers}
              selected_quantities={selected_quantities}
              onQuantityChange={handleQuantityChange}
              is_loading={tiers_loading}
            />
          </div>

          <div className="col-span-12 lg:col-span-4">
            <UnifiedCartSummary
              action_label={
                has_intake_items ? "Continue to Intake Form" : "Continue to Checkout"
              }
              onAction={handleNext}
              is_action_disabled={item_count === 0}
            />
          </div>
        </div>
      )}

      {/* Intake step */}
      {current_step === "intake" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <UnifiedIntakeStep
              ref={intake_step_ref}
              onBack={() => { setCurrentStep("selection"); scrollToTop(); }}
              onNext={handleProceedToReview}
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
                back_label={back_label_for_checkout}
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
                back_label={back_label_for_checkout}
                payment_error={stripe_payment_error ?? submit_error}
              />
            </div>
          </div>
        </Elements>
      )}
    </div>
  );
};

export default ContentBriefsPage;
