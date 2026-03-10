"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LinkBuildingHeader from "./LinkBuildingHeader";
import DrTierGrid from "./DrTierGrid";
import LinkBuildingOrderSummary, {
  OrderSummaryItem,
} from "./LinkBuildingOrderSummary";
import KeywordEntryStep, {
  KeywordData,
  KeywordRow,
} from "./KeywordEntryStep";
import CheckoutStep, {
  BillingAddress,
  PaymentInfo,
} from "@/components/shared/CheckoutStep";
import { dr_tiers as fallback_dr_tiers } from "./drTierData";
import { linkBuildingService } from "@/services/link-building.service";
import type { DrTier } from "@/types/link-building";

type Step = "selection" | "keywords" | "checkout";

const empty_keyword_row = (): KeywordRow => ({
  keyword: "",
  landing_page: "",
  exact_match: false,
});

const LinkBuildingPage: React.FC = () => {
  const router = useRouter();

  // DR Tiers state
  const [dr_tiers, setDrTiers] = useState<DrTier[]>(fallback_dr_tiers);
  const [dr_tiers_loading, setDrTiersLoading] = useState(true);
  const [dr_tiers_error, setDrTiersError] = useState<string | null>(null);

  // Order submission state
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [selected_quantities, setSelectedQuantities] = useState<
    Record<string, number>
  >({});
  const [keyword_data, setKeywordData] = useState<KeywordData>({});
  const [order_title, setOrderTitle] = useState("");
  const [order_notes, setOrderNotes] = useState("");
  const [billing_address, setBillingAddress] = useState<BillingAddress>({
    address: "",
    city: "",
    country: "United States",
    state: "Alabama",
    postal_code: "",
    company: "",
  });
  const [payment_info, setPaymentInfo] = useState<PaymentInfo>({
    card_number: "",
    expiry_month: "",
    expiry_year: "",
    cvc: "",
    name_on_card: "",
  });

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

  // Derive keyword rows from selected_quantities, filling gaps with empty rows
  // while preserving any data already entered by the user.
  const computed_keyword_rows = useMemo<KeywordData>(() => {
    const result: KeywordData = {};

    dr_tiers.forEach((tier) => {
      const qty = selected_quantities[tier.id] ?? 0;
      if (qty === 0) return;

      const stored = keyword_data[tier.id] ?? [];
      if (stored.length === qty) {
        result[tier.id] = stored;
      } else if (stored.length < qty) {
        result[tier.id] = [
          ...stored,
          ...Array.from({ length: qty - stored.length }, empty_keyword_row),
        ];
      } else {
        result[tier.id] = stored.slice(0, qty);
      }
    });

    return result;
  }, [selected_quantities, keyword_data, dr_tiers]);

  const selected_items: OrderSummaryItem[] = useMemo(() => {
    return dr_tiers
      .filter((tier) => (selected_quantities[tier.id] ?? 0) > 0)
      .map((tier) => ({
        id: tier.id,
        label: tier.dr_label,
        quantity: selected_quantities[tier.id],
        unit_price: tier.price_per_link,
      }));
  }, [selected_quantities, dr_tiers]);

  const total = useMemo(() => {
    return dr_tiers.reduce((sum, tier) => {
      const qty = selected_quantities[tier.id] ?? 0;
      return sum + qty * tier.price_per_link;
    }, 0);
  }, [selected_quantities, dr_tiers]);

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

  const handleKeywordChange = (
    tier_id: string,
    row_index: number,
    field: keyof KeywordRow,
    value: string | boolean
  ) => {
    // Use computed_keyword_rows as the base so every row always has all fields
    // defined (avoids controlled→uncontrolled input warnings).
    const base_rows = (computed_keyword_rows[tier_id] ?? []).map((r) => ({
      ...r,
    }));
    if (base_rows[row_index]) {
      base_rows[row_index] = { ...base_rows[row_index], [field]: value };
    }
    setKeywordData((prev) => ({ ...prev, [tier_id]: base_rows }));
  };

  const handleBillingChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (field: keyof PaymentInfo, value: string) => {
    setPaymentInfo((prev) => ({ ...prev, [field]: value }));
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleContinue = () => {
    if (selected_items.length === 0) return;
    setCurrentStep("keywords");
    scrollToTop();
  };

  const handleReview = () => {
    setCurrentStep("checkout");
    scrollToTop();
  };

  const handlePrevious = () => {
    setCurrentStep(current_step === "checkout" ? "keywords" : "selection");
    scrollToTop();
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // TODO: Replace with actual Stripe.js tokenization before production.
      // payment_method_id should be obtained via stripe.createPaymentMethod()
      // using the card element — never send raw card data to your backend.
      const payment_method_id = "pm_placeholder";

      const items = dr_tiers
        .filter((tier) => (selected_quantities[tier.id] ?? 0) > 0)
        .map((tier) => {
          const qty = selected_quantities[tier.id];
          const rows = computed_keyword_rows[tier.id] ?? [];
          return {
            dr_tier_id: tier.id,
            quantity: qty,
            unit_price: tier.price_per_link,
            placements: Array.from({ length: qty }, (_, row_index) => ({
              row_index,
              keyword: rows[row_index]?.keyword || null,
              landing_page: rows[row_index]?.landing_page || null,
              exact_match: rows[row_index]?.exact_match ?? false,
            })),
          };
        });

      const result = await linkBuildingService.createLinkBuildingOrder({
        order_title: order_title || null,
        order_notes: order_notes || null,
        total_amount: total,
        items,
        billing: {
          company: billing_address.company || null,
          address: billing_address.address,
          city: billing_address.city,
          state: billing_address.state,
          country: billing_address.country,
          postal_code: billing_address.postal_code,
        },
        payment: { payment_method_id },
      });

      router.push(`/link-building/orders/${result.order_id}`);
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
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Link Building
        </h1>
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
      <div className="grid grid-cols-12 gap-6">
        {/* Main content */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {current_step === "selection" && (
            <>
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
            </>
          )}

          {current_step === "keywords" && (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevious}
                  className="text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  &laquo; Back
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter your target keywords and landing pages for each
                  placement.
                </p>
              </div>
              <KeywordEntryStep
                selected_items={selected_items}
                keyword_data={computed_keyword_rows}
                order_title={order_title}
                order_notes={order_notes}
                onKeywordChange={handleKeywordChange}
                onOrderTitleChange={setOrderTitle}
                onOrderNotesChange={setOrderNotes}
              />
            </>
          )}

          {current_step === "checkout" && (
            <CheckoutStep
              billing_address={billing_address}
              payment_info={payment_info}
              onBillingChange={handleBillingChange}
              onPaymentChange={handlePaymentChange}
              onPrevious={handlePrevious}
              onComplete={handleComplete}
              is_loading={is_submitting}
              error_message={submit_error}
            />
          )}
        </div>

        {/* Sidebar */}
        {current_step !== "checkout" && (
          <div className="col-span-12 lg:col-span-4">
            <LinkBuildingOrderSummary
              selected_items={selected_items}
              total={total}
              action_label={
                current_step === "selection" ? "Continue" : "Review"
              }
              onAction={
                current_step === "selection" ? handleContinue : handleReview
              }
              is_action_disabled={selected_items.length === 0}
              onQuantityChange={handleQuantityChange}
            />
          </div>
        )}

        {current_step === "checkout" && (
          <div className="col-span-12 lg:col-span-4">
            <LinkBuildingOrderSummary
              selected_items={selected_items}
              total={total}
              action_label="Review"
              onAction={() => {}}
              is_action_disabled
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkBuildingPage;
