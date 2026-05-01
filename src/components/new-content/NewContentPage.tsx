"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import NewContentHeader from "./NewContentHeader";
import ArticleGrid from "./NewContentGrid";
import IntakeFormStep, { type IntakeFormTierData } from "./IntakeFormStep";
import KeywordEntryStep, {
  type KeywordData,
  type KeywordRow,
} from "@/components/link-building/KeywordEntryStep";
import type { OrderSummaryItem } from "@/components/link-building/LinkBuildingOrderSummary";
import UnifiedCartSummary from "@/components/shared/UnifiedCartSummary";
import CheckoutStep, {
  BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import { new_content_tiers as fallback_new_content_tiers } from "./newContentData";
import { newContentService } from "@/services/client/new-content.service";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { useCart } from "@/context/CartContext";
import { useUnifiedCheckout } from "@/hooks/useUnifiedCheckout";
import { getStripe } from "@/lib/stripe";
import type { NewContentTier } from "@/types/client/new-content";
import type { CartIntakeRow } from "@/types/client/unified-cart";

type Step = "selection" | "intake" | "keywords" | "checkout";

const empty_keyword_row = (): KeywordRow => ({
  keyword: "",
  landing_page: "",
  exact_match: false,
});

const NewContentPage: React.FC = () => {
  const [new_content_tiers, setNewContentTiers] = useState<NewContentTier[]>([
    ...fallback_new_content_tiers,
  ]);
  const [new_content_tiers_loading, setNewContentTiersLoading] = useState(true);
  const [new_content_tiers_error, setNewContentTiersError] = useState<
    string | null
  >(null);

  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [intake_step_error, setIntakeStepError] = useState<string | null>(null);
  const [keyword_step_error, setKeywordStepError] = useState<string | null>(null);
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
    updateNewContentIntakeData,
    getIntakeDataForTier,
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

  const loadNewContentTiers = useCallback(async () => {
    setNewContentTiersLoading(true);
    setNewContentTiersError(null);
    try {
      const tiers = await newContentService.fetchNewContentTiers();
      setNewContentTiers(tiers.filter((t) => t.is_active));
    } catch {
      setNewContentTiersError(
        "Failed to load article tiers. Showing default catalog."
      );
    } finally {
      setNewContentTiersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNewContentTiers();
  }, [loadNewContentTiers]);

  const selected_quantities = getQuantitiesForProductType("new_content");

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

  const has_lb_items = lb_selected_items.length > 0;

  const nc_selected_items = useMemo(
    () => items.filter((item) => item.product_type === "new_content"),
    [items]
  );

  const computed_intake_data = useMemo<IntakeFormTierData[]>(() => {
    return nc_selected_items.map((item) => {
      const stored = getIntakeDataForTier(item.tier_id);
      const empty_row = (): CartIntakeRow => ({
        keyword_phrase: "",
        type_of_content: "",
        notes: "",
      });
      let rows: CartIntakeRow[];
      if (stored.length >= item.quantity) {
        rows = stored;
      } else {
        rows = [
          ...stored,
          ...Array.from({ length: item.quantity - stored.length }, empty_row),
        ];
      }
      return {
        tier_id: item.tier_id,
        tier_name: item.tier_name,
        quantity: item.quantity,
        rows,
      };
    });
  }, [nc_selected_items, getIntakeDataForTier]);

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

  const checkKeywordsComplete = useCallback((): boolean => {
    for (const rows of Object.values(computed_keyword_rows)) {
      for (const row of rows) {
        if (!row.keyword.trim() || !row.landing_page.trim()) return false;
      }
    }
    return true;
  }, [computed_keyword_rows]);

  const handleIntakeRowChange = useCallback(
    (tier_id: string, rows: CartIntakeRow[]) => {
      if (intake_step_error) setIntakeStepError(null);
      updateNewContentIntakeData(tier_id, rows);
    },
    [intake_step_error, updateNewContentIntakeData]
  );

  const handleProceedFromIntake = useCallback(() => {
    const has_empty = computed_intake_data.some((tier) =>
      tier.rows.some((row) => !row.keyword_phrase.trim())
    );
    if (has_empty) {
      setIntakeStepError(
        "Please fill in the keyword phrase for every row before continuing."
      );
      scrollToTop();
      return;
    }
    setIntakeStepError(null);
    if (has_lb_items) {
      setCurrentStep("keywords");
    } else {
      applyBillingIfEmpty();
      setCurrentStep("checkout");
    }
    scrollToTop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed_intake_data, has_lb_items, has_saved_address, saved_billing_address, billing_address]);

  const handleQuantityChange = (tier_id: string, quantity: number) => {
    const tier = new_content_tiers.find((t) => t.id === tier_id);
    if (!tier) return;
    setItemQuantity("new_content", tier_id, tier.label, tier.price, quantity);
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

  const handleNext = () => {
    if (item_count === 0) return;
    if (nc_selected_items.length > 0) {
      setCurrentStep("intake");
    } else if (has_lb_items) {
      setCurrentStep("keywords");
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
    applyBillingIfEmpty();
    setCurrentStep("checkout");
    scrollToTop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkKeywordsComplete, has_saved_address, saved_billing_address, billing_address]);

  const handlePrevious = () => {
    if (current_step === "checkout" && has_lb_items) {
      setCurrentStep("keywords");
    } else if (current_step === "checkout" && nc_selected_items.length > 0) {
      setCurrentStep("intake");
    } else if (current_step === "keywords") {
      setCurrentStep(nc_selected_items.length > 0 ? "intake" : "selection");
    } else {
      setCurrentStep("selection");
    }
    scrollToTop();
  };

  const handleApplySavedAddress = useCallback(() => {
    if (saved_billing_address) {
      setBillingAddress(saved_billing_address);
    }
  }, [saved_billing_address]);

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

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        {/* My Orders shortcut */}
        <div className="mb-6 flex items-center justify-end">
          <Link
            href="/new-content/orders"
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
            </div>

            <div className="col-span-12 lg:col-span-4">
              <UnifiedCartSummary
                action_label={
                  nc_selected_items.length > 0
                    ? "Continue to Intake Form"
                    : has_lb_items
                    ? "Continue to Keywords"
                    : "Continue to Checkout"
                }
                onAction={handleNext}
                is_action_disabled={item_count === 0}
              />
            </div>
          </div>
        )}

        {/* Intake form step */}
        {current_step === "intake" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <IntakeFormStep
                tier_data={computed_intake_data}
                onRowsChange={handleIntakeRowChange}
                error={intake_step_error}
                onBack={() => { setCurrentStep("selection"); scrollToTop(); }}
                onNext={handleProceedFromIntake}
              />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <UnifiedCartSummary
                action_label={
                  has_lb_items ? "Continue to Keywords" : "Continue to Checkout"
                }
                onAction={handleProceedFromIntake}
                is_action_disabled={nc_selected_items.length === 0}
              />
            </div>
          </div>
        )}

        {/* Keywords step */}
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
                action_label="Continue to Checkout"
                onAction={handleProceedFromKeywords}
                is_action_disabled={lb_selected_items.length === 0}
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
                  back_label={
                    has_lb_items
                      ? "Back to Keywords"
                      : nc_selected_items.length > 0
                      ? "Back to Intake Form"
                      : "Back to Selection"
                  }
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
    </div>
  );
};

export default NewContentPage;
