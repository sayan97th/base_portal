"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import NewContentHeader from "./NewContentHeader";
import ArticleGrid from "./NewContentGrid";
import OrderSummary, {
  SummaryItem,
} from "@/components/shared/OrderSummary";
import CheckoutStep, {
  BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import { new_content_tiers as fallback_new_content_tiers } from "./newContentData";
import { newContentService } from "@/services/client/new-content.service";
import { useNotifications } from "@/context/NotificationsContext";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { useCartPersistence } from "@/hooks/useCartPersistence";
import { getStripe } from "@/lib/stripe";
import type { NewContentTier } from "@/types/client/new-content";

type Step = "selection" | "checkout";

const NewContentPage: React.FC = () => {
  const router = useRouter();
  const { addNotification } = useNotifications();

  // Article tiers state
  const [new_content_tiers, setNewContentTiers] = useState<NewContentTier[]>([
    ...fallback_new_content_tiers,
  ]);
  const [new_content_tiers_loading, setNewContentTiersLoading] = useState(true);
  const [new_content_tiers_error, setNewContentTiersError] = useState<string | null>(
    null
  );

  // Order submission state
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [billing_address, setBillingAddress] = useState<BillingAddress>({
    address: "",
    city: "",
    country: "United States",
    state: "Alabama",
    postal_code: "",
    company: "",
  });

  // Persisted cart state
  const {
    selected_quantities,
    setSelectedQuantities,
    clearCart,
  } = useCartPersistence();

  const { saved_billing_address, has_saved_address } = useBillingAddress();

  // Ref to imperatively trigger submit from the order summary button
  const checkout_ref = useRef<CheckoutStepHandle>(null);
  // Tracks CheckoutStep's internal processing state so the summary button stays in sync
  const [checkout_is_processing, setCheckoutIsProcessing] = useState(false);

  const loadNewContentTiers = useCallback(async () => {
    setNewContentTiersLoading(true);
    setNewContentTiersError(null);
    try {
      const tiers = await newContentService.fetchNewContentTiers();
      setNewContentTiers(tiers.filter((t) => t.is_active));
    } catch {
      setNewContentTiersError("Failed to load article tiers. Showing default catalog.");
    } finally {
      setNewContentTiersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNewContentTiers();
  }, [loadNewContentTiers]);

  const selected_items: SummaryItem[] = useMemo(() => {
    return new_content_tiers
      .filter((tier) => (selected_quantities[tier.id] ?? 0) > 0)
      .map((tier) => ({
        id: tier.id,
        label: tier.label,
        quantity: selected_quantities[tier.id],
        unit_price: tier.price,
      }));
  }, [selected_quantities, new_content_tiers]);

  const total = useMemo(() => {
    return new_content_tiers.reduce((sum, tier) => {
      const qty = selected_quantities[tier.id] ?? 0;
      return sum + qty * tier.price;
    }, 0);
  }, [selected_quantities, new_content_tiers]);

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

  const handleNext = () => {
    if (selected_items.length === 0) return;
    setCurrentStep("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    setCurrentStep("selection");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleComplete = useCallback(
    async (payment_intent_id: string, is_using_saved_method: boolean) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const items = new_content_tiers
          .filter((tier) => (selected_quantities[tier.id] ?? 0) > 0)
          .map((tier) => ({
            tier_id: tier.id,
            quantity: selected_quantities[tier.id],
            unit_price: tier.price,
          }));

        const result = await newContentService.createOrder({
          total_amount: total,
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

        const total_articles = items.reduce((sum, item) => sum + item.quantity, 0);
        const formatted_amount = total.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        await addNotification({
          type: "order",
          message: "Your new content order has been placed successfully.",
          preview_text: `Order #${result.order_id} · ${total_articles} article${total_articles !== 1 ? "s" : ""} · $${formatted_amount}`,
        });

        clearCart();
        router.push("/new-content/orders");
      } catch {
        setSubmitError("Failed to submit order. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [new_content_tiers, selected_quantities, total, billing_address, clearCart, addNotification, router]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {current_step === "selection" && (
            <>
              <NewContentHeader />
              {new_content_tiers_error && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                  {new_content_tiers_error}
                </div>
              )}
              <ArticleGrid
                new_content_tiers={new_content_tiers}
                selected_quantities={selected_quantities}
                onQuantityChange={handleQuantityChange}
                is_loading={new_content_tiers_loading}
              />

              {/* Next Button */}
              <button
                onClick={handleNext}
                disabled={selected_items.length === 0}
                className="w-full rounded-lg bg-coral-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
              >
                Next
              </button>
            </>
          )}

          {current_step === "checkout" && (
            <Elements stripe={getStripe()}>
              <CheckoutStep
                billing_address={billing_address}
                onBillingChange={handleBillingChange}
                onPrevious={handlePrevious}
                onComplete={handleComplete}
                total_amount={total}
                ref={checkout_ref}
              />
            </Elements>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <OrderSummary
            selected_items={selected_items}
            total={total}
          />
        </div>
      </div>
    </div>
  );
};

export default NewContentPage;
