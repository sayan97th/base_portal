"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Elements } from "@stripe/react-stripe-js";
import ContentBriefsHeader from "./ContentBriefsHeader";
import BriefGrid from "./BriefGrid";
import ContentBriefIntakeFormStep from "./ContentBriefIntakeFormStep";
import type { ContentBriefIntakeTierData } from "./ContentBriefIntakeFormStep";
import KeywordEntryStep, {
  type KeywordData,
  type KeywordRow,
} from "@/components/link-building/KeywordEntryStep";
import type { OrderSummaryItem } from "@/components/link-building/LinkBuildingOrderSummary";
import UnifiedCartSummary from "@/components/shared/UnifiedCartSummary";
import CheckoutStep, {
  type BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import type { ContentBriefTier } from "@/types/client/content-briefs";
import type { ContentOptimizationIntakeRow } from "@/types/client/unified-cart";
import { contentBriefsService } from "@/services/client/content-briefs.service";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { useCart } from "@/context/CartContext";
import { useUnifiedCheckout } from "@/hooks/useUnifiedCheckout";
import { getStripe } from "@/lib/stripe";

type Step = "selection" | "keywords" | "intake" | "checkout";

const empty_keyword_row = (): KeywordRow => ({
  keyword: "",
  landing_page: "",
  exact_match: false,
});

const empty_cb_intake_row = (): ContentOptimizationIntakeRow => ({
  primary_keyword: "",
  secondary_keywords: "",
  content_page_url: "",
});

const ContentBriefsPage: React.FC = () => {
  const [tiers, setTiers] = useState<ContentBriefTier[]>([]);
  const [tiers_loading, setTiersLoading] = useState(true);
  const [tiers_error, setTiersError] = useState<string | null>(null);

  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [keyword_step_error, setKeywordStepError] = useState<string | null>(null);
  const [intake_step_error, setIntakeStepError] = useState<string | null>(null);
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
    updateLinkBuildingKeywords,
    getKeywordDataForTier,
    updateContentBriefIntakeData,
    getContentBriefIntakeDataForTier,
    item_count,
    total,
    order_title,
    order_notes,
    setOrderTitle,
    setOrderNotes,
  } = useCart();
  const { saved_billing_address, has_saved_address } = useBillingAddress();
  const { is_submitting, submit_error, handleComplete: executeCheckout } =
    useUnifiedCheckout();

  const checkout_ref = useRef<CheckoutStepHandle>(null);
  const [checkout_is_processing, setCheckoutIsProcessing] = useState(false);

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

  // Link-building items from unified cart (may coexist)
  const lb_selected_items = useMemo<OrderSummaryItem[]>(
    () =>
      items
        .filter((item) => item.product_type === "link_building")
        .map((item) => ({
          id: item.tier_id,
          label: item.tier_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
    [items]
  );

  // Content-brief items
  const cb_selected_items = useMemo<OrderSummaryItem[]>(
    () =>
      items
        .filter((item) => item.product_type === "content_brief")
        .map((item) => ({
          id: item.tier_id,
          label: item.tier_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
    [items]
  );

  const has_lb_items = lb_selected_items.length > 0;
  const has_cb_items = cb_selected_items.length > 0;

  // --- Link-building keyword rows ---
  const computed_keyword_rows = useMemo<KeywordData>(() => {
    const result: KeywordData = {};
    lb_selected_items.forEach(({ id, quantity }) => {
      const stored = getKeywordDataForTier(id) as KeywordRow[];
      if (stored.length === quantity) {
        result[id] = stored;
      } else if (stored.length < quantity) {
        result[id] = [
          ...stored,
          ...Array.from({ length: quantity - stored.length }, empty_keyword_row),
        ];
      } else {
        result[id] = stored.slice(0, quantity);
      }
    });
    return result;
  }, [lb_selected_items, getKeywordDataForTier]);

  // --- Content-brief intake rows ---
  const computed_cb_intake_rows = useMemo<Record<string, ContentOptimizationIntakeRow[]>>(() => {
    const result: Record<string, ContentOptimizationIntakeRow[]> = {};
    cb_selected_items.forEach(({ id, quantity }) => {
      const stored = getContentBriefIntakeDataForTier(id);
      if (stored.length >= quantity) {
        result[id] = stored;
      } else {
        result[id] = [
          ...stored,
          ...Array.from({ length: quantity - stored.length }, empty_cb_intake_row),
        ];
      }
    });
    return result;
  }, [cb_selected_items, getContentBriefIntakeDataForTier]);

  const cb_intake_tier_data = useMemo<ContentBriefIntakeTierData[]>(
    () =>
      cb_selected_items.map(({ id, label }) => ({
        tier_id: id,
        tier_name: label,
        rows: computed_cb_intake_rows[id] ?? [empty_cb_intake_row()],
      })),
    [cb_selected_items, computed_cb_intake_rows]
  );

  // --- Validation ---
  const checkKeywordsComplete = useCallback((): boolean => {
    for (const rows of Object.values(computed_keyword_rows)) {
      for (const row of rows) {
        if (!row.keyword.trim() || !row.landing_page.trim()) return false;
      }
    }
    return true;
  }, [computed_keyword_rows]);

  const checkCbIntakeComplete = useCallback((): boolean => {
    for (const rows of Object.values(computed_cb_intake_rows)) {
      for (const row of rows) {
        if (!row.primary_keyword.trim() || !row.content_page_url.trim()) return false;
      }
    }
    return true;
  }, [computed_cb_intake_rows]);

  // --- Handlers ---
  const handleQuantityChange = (tier_id: string, quantity: number) => {
    const tier = tiers.find((t) => t.id === tier_id);
    if (!tier) return;
    setItemQuantity("content_brief", tier_id, tier.label, tier.price, quantity);
  };

  const handleKeywordChange = (
    tier_id: string,
    row_index: number,
    field: keyof KeywordRow,
    value: string | boolean
  ) => {
    if (keyword_step_error) setKeywordStepError(null);
    const base_rows = (computed_keyword_rows[tier_id] ?? []).map((r) => ({ ...r }));
    if (base_rows[row_index]) {
      base_rows[row_index] = { ...base_rows[row_index], [field]: value };
    }
    updateLinkBuildingKeywords(tier_id, base_rows);
  };

  const handleCbIntakeRowsChange = useCallback(
    (tier_id: string, rows: ContentOptimizationIntakeRow[]) => {
      if (intake_step_error) setIntakeStepError(null);
      updateContentBriefIntakeData(tier_id, rows);
    },
    [intake_step_error, updateContentBriefIntakeData]
  );

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
    if (has_lb_items) {
      setCurrentStep("keywords");
    } else if (has_cb_items) {
      setCurrentStep("intake");
    } else {
      applyBillingIfEmpty();
      setCurrentStep("checkout");
    }
    scrollToTop();
  };

  const handleProceedFromKeywords = useCallback(() => {
    if (!checkKeywordsComplete()) {
      setKeywordStepError(
        "Please fill in the keyword and landing page for every row before continuing."
      );
      scrollToTop();
      return;
    }
    setKeywordStepError(null);
    if (has_cb_items) {
      setCurrentStep("intake");
    } else {
      applyBillingIfEmpty();
      setCurrentStep("checkout");
    }
    scrollToTop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkKeywordsComplete, has_cb_items, has_saved_address, saved_billing_address, billing_address]);

  const handleProceedFromIntake = useCallback(() => {
    if (!checkCbIntakeComplete()) {
      setIntakeStepError(
        "Please fill in the primary keyword and current live URL for every row before continuing."
      );
      scrollToTop();
      return;
    }
    setIntakeStepError(null);
    applyBillingIfEmpty();
    setCurrentStep("checkout");
    scrollToTop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkCbIntakeComplete, has_saved_address, saved_billing_address, billing_address]);

  const handlePrevious = () => {
    if (current_step === "checkout") {
      if (has_cb_items) {
        setCurrentStep("intake");
      } else if (has_lb_items) {
        setCurrentStep("keywords");
      } else {
        setCurrentStep("selection");
      }
    } else if (current_step === "intake") {
      if (has_lb_items) {
        setCurrentStep("keywords");
      } else {
        setCurrentStep("selection");
      }
    } else if (current_step === "keywords") {
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

  const back_label_for_checkout = has_cb_items
    ? "Back to Intake Form"
    : has_lb_items
    ? "Back to Keywords"
    : "Back to Selection";

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
                has_lb_items
                  ? "Continue to Keywords"
                  : has_cb_items
                  ? "Continue to Intake Form"
                  : "Continue"
              }
              onAction={handleNext}
              is_action_disabled={item_count === 0}
            />
          </div>
        </div>
      )}

      {/* Keywords step (link-building items) */}
      {current_step === "keywords" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 lg:col-span-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setCurrentStep("selection"); scrollToTop(); }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
                Back to Selection
              </button>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter target keywords and landing pages for each placement.
              </p>
            </div>

            {keyword_step_error && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Incomplete keyword data
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                    {keyword_step_error}
                  </p>
                </div>
              </div>
            )}

            <KeywordEntryStep
              selected_items={lb_selected_items}
              keyword_data={computed_keyword_rows}
              order_title={order_title}
              order_notes={order_notes}
              onKeywordChange={handleKeywordChange}
              onOrderTitleChange={setOrderTitle}
              onOrderNotesChange={setOrderNotes}
            />
          </div>

          <div className="col-span-12 lg:col-span-4">
            <UnifiedCartSummary
              action_label={has_cb_items ? "Continue to Intake Form" : "Continue to Checkout"}
              onAction={handleProceedFromKeywords}
              is_action_disabled={lb_selected_items.length === 0}
              show_coupon_field
            />
          </div>
        </div>
      )}

      {/* Intake step (content-brief items) */}
      {current_step === "intake" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <ContentBriefIntakeFormStep
              tier_data={cb_intake_tier_data}
              onRowsChange={handleCbIntakeRowsChange}
              error={intake_step_error}
              onBack={() => {
                if (has_lb_items) {
                  setCurrentStep("keywords");
                } else {
                  setCurrentStep("selection");
                }
                scrollToTop();
              }}
              onNext={handleProceedFromIntake}
            />
          </div>

          <div className="col-span-12 lg:col-span-4">
            <UnifiedCartSummary
              action_label="Continue to Checkout"
              onAction={handleProceedFromIntake}
              is_action_disabled={cb_selected_items.length === 0}
              show_coupon_field
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
                is_loading={is_submitting}
                error_message={submit_error}
                total_amount={total}
                saved_billing_address={saved_billing_address}
                onApplySavedAddress={handleApplySavedAddress}
                back_label={back_label_for_checkout}
                onProcessingChange={setCheckoutIsProcessing}
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
              />
            </div>
          </div>
        </Elements>
      )}
    </div>
  );
};

export default ContentBriefsPage;
