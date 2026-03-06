"use client";

import React, { useState, useMemo } from "react";
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
import { dr_tiers } from "./drTierData";

type Step = "selection" | "keywords" | "checkout";

const empty_keyword_row = (): KeywordRow => ({
  keyword: "",
  landing_page: "",
  exact_match: false,
});

const LinkBuildingPage: React.FC = () => {
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
  }, [selected_quantities, keyword_data]);

  const selected_items: OrderSummaryItem[] = useMemo(() => {
    return dr_tiers
      .filter((tier) => (selected_quantities[tier.id] ?? 0) > 0)
      .map((tier) => ({
        id: tier.id,
        label: tier.dr_label,
        quantity: selected_quantities[tier.id],
        unit_price: tier.price_per_link,
      }));
  }, [selected_quantities]);

  const total = useMemo(() => {
    return dr_tiers.reduce((sum, tier) => {
      const qty = selected_quantities[tier.id] ?? 0;
      return sum + qty * tier.price_per_link;
    }, 0);
  }, [selected_quantities]);

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

  const handleComplete = () => {
    // TODO: submit order to API
    console.log("Order submitted:", {
      selected_quantities,
      keyword_data,
      order_title,
      order_notes,
      billing_address,
      payment_info,
      total,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Main content */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {current_step === "selection" && (
            <>
              <LinkBuildingHeader />
              <DrTierGrid
                selected_quantities={selected_quantities}
                onQuantityChange={handleQuantityChange}
              />
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
