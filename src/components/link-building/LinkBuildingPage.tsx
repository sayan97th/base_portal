"use client";

import React, { useState, useMemo } from "react";
import LinkBuildingHeader from "./LinkBuildingHeader";
import EmailField from "@/components/shared/EmailField";
import LinkBuildingOrderTitle from "./LinkBuildingOrderTitle";
import DrTierGrid from "./DrTierGrid";
import OrderSummary, { SummaryItem } from "@/components/shared/OrderSummary";
import CheckoutStep, {
  BillingAddress,
  PaymentInfo,
} from "@/components/shared/CheckoutStep";
import { dr_tiers } from "./drTierData";

type Step = "selection" | "checkout";

const LinkBuildingPage: React.FC = () => {
  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [selected_quantities, setSelectedQuantities] = useState<
    Record<string, number>
  >({});
  const [order_title, setOrderTitle] = useState("");
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

  // Placeholder email — replace with actual user data when auth is integrated
  const user_email = "user@example.com";

  const selected_items: SummaryItem[] = useMemo(() => {
    return dr_tiers
      .filter((tier) => (selected_quantities[tier.id] || 0) > 0)
      .map((tier) => ({
        id: tier.id,
        label: tier.dr_label,
        quantity: selected_quantities[tier.id],
        unit_price: tier.price_per_link,
      }));
  }, [selected_quantities]);

  const total = useMemo(() => {
    const total_links = Object.values(selected_quantities).reduce(
      (sum, qty) => sum + qty,
      0
    );
    const is_bulk_discount = total_links >= 10;
    const discount_multiplier = is_bulk_discount ? 0.9 : 1;

    return dr_tiers.reduce((sum, tier) => {
      const qty = selected_quantities[tier.id] || 0;
      return sum + qty * tier.price_per_link * discount_multiplier;
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

  const handleBillingChange = (
    field: keyof BillingAddress,
    value: string
  ) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (
    field: keyof PaymentInfo,
    value: string
  ) => {
    setPaymentInfo((prev) => ({ ...prev, [field]: value }));
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

  const handleComplete = () => {
    // TODO: Submit order to API
    console.log("Order completed:", {
      selected_quantities,
      order_title,
      billing_address,
      payment_info,
      total,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {current_step === "selection" && (
            <>
              <LinkBuildingHeader />
              <EmailField email={user_email} />
              <LinkBuildingOrderTitle
                value={order_title}
                onChange={setOrderTitle}
              />
              <DrTierGrid
                selected_quantities={selected_quantities}
                onQuantityChange={handleQuantityChange}
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

export default LinkBuildingPage;
