"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import UnifiedIntakeStep from "@/components/shared/UnifiedIntakeStep";
import OrderReviewStep from "@/components/shared/OrderReviewStep";
import CheckoutStep, {
  BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import PublicAccountStep from "./PublicAccountStep";
import PublicOrderSummary from "./PublicOrderSummary";
import { useCart } from "@/context/CartContext";
import { useUnifiedCheckout } from "@/hooks/useUnifiedCheckout";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { getStripe } from "@/lib/stripe";
import { decodePublicOrderCart } from "@/lib/public-order-link";

type Step = "intake" | "review" | "account" | "checkout";

const MARKETING_SITE_URL = "https://basesearchmarketing.com";

const PublicOrderPage: React.FC = () => {
  const search_params = useSearchParams();
  const has_hydrated_cart = useRef(false);
  const has_set_initial_step = useRef(false);

  const {
    items,
    item_count,
    subtotal,
    total,
    setItemQuantity,
    clearCart,
    is_cart_ready,
  } = useCart();
  const { saved_billing_address } = useBillingAddress();

  const [current_step, setCurrentStep] = useState<Step>("intake");
  const [billing_address, setBillingAddress] = useState<BillingAddress>({
    address: "",
    city: "",
    country: "United States",
    state: "Alabama",
    postal_code: "",
    company: "",
  });

  // No custom redirect is passed here, so once the payment workflow completes
  // useUnifiedCheckout falls back to its default target, `/orders/session/{id}`,
  // the same order receipt view every other checkout flow in the app lands on.
  const {
    is_submitting,
    submit_error,
    handleComplete: executeCheckout,
    handlePayLater,
  } = useUnifiedCheckout();

  const checkout_ref = useRef<CheckoutStepHandle>(null);
  const [checkout_is_processing, setCheckoutIsProcessing] = useState(false);
  const [stripe_payment_error, setStripePaymentError] = useState<string | null>(null);
  const [is_applying_credits, setIsApplyingCredits] = useState(false);
  const [details_deferred, setDetailsDeferred] = useState(false);

  const handleCreditsChange = useCallback((is_applying: boolean) => {
    setIsApplyingCredits(is_applying);
  }, []);

  const has_intake_items = useMemo(
    () =>
      items.some(
        (i) =>
          i.product_type === "new_content" ||
          i.product_type === "content_optimization" ||
          i.product_type === "content_brief" ||
          i.product_type === "link_building"
      ),
    [items]
  );

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Hydrate the cart from the link's `cart` query param once, on first load.
  // The link is the single source of truth for this order, so any cart the
  // shared CartContext already holds (a leftover localStorage snapshot from a
  // prior visit, or another order saved server-side against this browser's
  // logged-in account) is cleared first rather than merged with the decoded
  // items — merging was letting stale items ride along into checkout.
  useEffect(() => {
    if (!is_cart_ready || has_hydrated_cart.current) return;
    has_hydrated_cart.current = true;

    const decoded_items = decodePublicOrderCart(search_params.get("cart"));

    clearCart();
    for (const decoded_item of decoded_items) {
      setItemQuantity(
        decoded_item.product_type,
        decoded_item.tier_id,
        decoded_item.tier_name,
        decoded_item.unit_price,
        decoded_item.quantity
      );
    }
  }, [is_cart_ready, search_params, setItemQuantity, clearCart]);

  // Once the cart has settled, land on "intake" if any item needs intake
  // details, otherwise skip straight to "review".
  useEffect(() => {
    if (!is_cart_ready || has_set_initial_step.current || item_count === 0) return;
    has_set_initial_step.current = true;
    setCurrentStep(has_intake_items ? "intake" : "review");
  }, [is_cart_ready, item_count, has_intake_items]);

  const applyBillingIfEmpty = () => {
    if (saved_billing_address) {
      const is_billing_empty =
        !billing_address.address && !billing_address.city && !billing_address.postal_code;
      if (is_billing_empty) setBillingAddress(saved_billing_address);
    }
  };

  const handleBillingChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleProceedToReview = useCallback(() => {
    setDetailsDeferred(false);
    setCurrentStep("review");
    scrollToTop();
  }, []);

  const handleProceedToAccount = useCallback(() => {
    setCurrentStep("account");
    scrollToTop();
  }, []);

  const handleSkipIntake = useCallback(() => {
    setDetailsDeferred(true);
    setCurrentStep("account");
    scrollToTop();
  }, []);

  const handleProceedToCheckout = useCallback(() => {
    applyBillingIfEmpty();
    setCurrentStep("checkout");
    scrollToTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved_billing_address, billing_address]);

  const handlePrevious = () => {
    if (current_step === "checkout") {
      setCurrentStep("account");
    } else if (current_step === "account") {
      setCurrentStep(has_intake_items ? "review" : "intake");
    } else if (current_step === "review") {
      setCurrentStep("intake");
    }
    scrollToTop();
  };

  const handleApplySavedAddress = useCallback(() => {
    if (saved_billing_address) setBillingAddress(saved_billing_address);
  }, [saved_billing_address]);

  const handleComplete = useCallback(
    async (payment_intent_id: string, is_using_saved_method: boolean, credits_amount?: number) => {
      await executeCheckout(
        payment_intent_id,
        is_using_saved_method,
        billing_address,
        credits_amount,
        details_deferred
      );
    },
    [executeCheckout, billing_address, details_deferred]
  );

  if (is_cart_ready && item_count === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Your order link is invalid or has expired
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Please return to basesearchmarketing.com and start your order again.
        </p>
        <a
          href={MARKETING_SITE_URL}
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Back to basesearchmarketing.com
        </a>
      </div>
    );
  }

  const display_total = is_applying_credits ? subtotal : total;
  const payment_error = stripe_payment_error ?? submit_error;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-gray-900 md:flex">
        <PublicOrderSummary className="md:w-[320px]" />

        <div className="min-w-0 flex-1 p-6 sm:p-8 lg:p-10">
          {/* Intake form step */}
          {current_step === "intake" && (
            <UnifiedIntakeStep
              onBack={() => { window.location.href = MARKETING_SITE_URL; }}
              onNext={handleProceedToReview}
              onSkip={handleSkipIntake}
              back_label="Back to basesearchmarketing.com"
            />
          )}

          {/* Order review step */}
          {current_step === "review" && (
            <OrderReviewStep
              onBack={() => { setCurrentStep("intake"); scrollToTop(); }}
              onNext={handleProceedToAccount}
              back_label="Back to Intake Form"
            />
          )}

          {/* Order summary + create account step */}
          {current_step === "account" && (
            <PublicAccountStep
              onNext={handleProceedToCheckout}
              onBack={() => setCurrentStep(has_intake_items ? "review" : "intake")}
              back_label={has_intake_items ? "Back to Order Review" : "Back to Order Details"}
            />
          )}

          {/* Checkout step */}
          {current_step === "checkout" && (
            <Elements stripe={getStripe()}>
              <div className="space-y-6">
                <CheckoutStep
                  ref={checkout_ref}
                  billing_address={billing_address}
                  onBillingChange={handleBillingChange}
                  onPrevious={handlePrevious}
                  onComplete={handleComplete}
                  onPayLater={() => handlePayLater(details_deferred)}
                  is_loading={is_submitting}
                  error_message={submit_error}
                  total_amount={display_total}
                  saved_billing_address={saved_billing_address}
                  onApplySavedAddress={handleApplySavedAddress}
                  back_label="Back to Create Account"
                  onProcessingChange={setCheckoutIsProcessing}
                  onCreditsChange={handleCreditsChange}
                  onStripeError={setStripePaymentError}
                />

                {payment_error && (
                  <div className="rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                    {payment_error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => checkout_ref.current?.triggerSubmit()}
                  disabled={checkout_is_processing || is_submitting}
                  className="w-full rounded-full bg-coral-500 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
                >
                  {checkout_is_processing || is_submitting
                    ? "Processing…"
                    : `Pay $${display_total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </button>
              </div>
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicOrderPage;
