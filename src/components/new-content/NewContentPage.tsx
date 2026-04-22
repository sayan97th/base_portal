"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import NewContentHeader from "./NewContentHeader";
import ArticleGrid from "./ArticleGrid";
import OrderSummary, {
  SummaryItem,
} from "@/components/shared/OrderSummary";
import CheckoutStep, {
  BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import { article_tiers as fallback_article_tiers } from "./newContentData";
import { newContentService } from "@/services/client/new-content.service";
import { useNotifications } from "@/context/NotificationsContext";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { useCartPersistence } from "@/hooks/useCartPersistence";
import { getStripe } from "@/lib/stripe";
import type { ArticleTier } from "@/types/client/new-content";

type Step = "selection" | "checkout";

const NewContentPage: React.FC = () => {
  const router = useRouter();
  const { addNotification } = useNotifications();

  // Article tiers state
  const [article_tiers, setArticleTiers] = useState<ArticleTier[]>([
    ...fallback_article_tiers,
  ]);
  const [article_tiers_loading, setArticleTiersLoading] = useState(true);
  const [article_tiers_error, setArticleTiersError] = useState<string | null>(
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

  const loadArticleTiers = useCallback(async () => {
    setArticleTiersLoading(true);
    setArticleTiersError(null);
    try {
      const tiers = await newContentService.fetchArticleTiers();
      setArticleTiers(tiers.filter((t) => t.is_active));
    } catch {
      setArticleTiersError("Failed to load article tiers. Showing default catalog.");
    } finally {
      setArticleTiersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticleTiers();
  }, [loadArticleTiers]);

  const selected_items: SummaryItem[] = useMemo(() => {
    return article_tiers
      .filter((tier) => (selected_quantities[tier.id] ?? 0) > 0)
      .map((tier) => ({
        id: tier.id,
        label: tier.label,
        quantity: selected_quantities[tier.id],
        unit_price: tier.price,
      }));
  }, [selected_quantities, article_tiers]);

  const total = useMemo(() => {
    return article_tiers.reduce((sum, tier) => {
      const qty = selected_quantities[tier.id] ?? 0;
      return sum + qty * tier.price;
    }, 0);
  }, [selected_quantities, article_tiers]);

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

  const handleComplete = (_payment_intent_id: string) => {
    // TODO: Submit order to API
    console.log("Order completed:", {
      selected_quantities,
      billing_address,
      total,
    });
    clearCart();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {current_step === "selection" && (
            <>
              <NewContentHeader />
              {article_tiers_error && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                  {article_tiers_error}
                </div>
              )}
              <ArticleGrid
                article_tiers={article_tiers}
                selected_quantities={selected_quantities}
                onQuantityChange={handleQuantityChange}
                is_loading={article_tiers_loading}
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
