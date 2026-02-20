"use client";

import React, { useState, useMemo } from "react";
import LinkBuildingHeader from "./LinkBuildingHeader";
import LinkBuildingEmailField from "./LinkBuildingEmailField";
import LinkBuildingOrderTitle from "./LinkBuildingOrderTitle";
import DrTierGrid from "./DrTierGrid";
import OrderSummary from "./OrderSummary";
import { dr_tiers } from "./drTierData";

const LinkBuildingPage: React.FC = () => {
  const [selected_quantities, setSelectedQuantities] = useState<
    Record<string, number>
  >({});
  const [order_title, setOrderTitle] = useState("");
  const [coupon_code, setCouponCode] = useState("");

  // Placeholder email — replace with actual user data when auth is integrated
  const user_email = "user@example.com";

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

  const handleNext = () => {
    // TODO: Navigate to the next step or submit the order
    console.log("Order:", {
      selected_quantities,
      order_title,
      coupon_code,
      total,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <LinkBuildingHeader />
          <LinkBuildingEmailField email={user_email} />
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
            className="w-full rounded-lg bg-coral-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-coral-600 disabled:bg-coral-300 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <OrderSummary
            total={total}
            coupon_code={coupon_code}
            onCouponChange={setCouponCode}
          />
        </div>
      </div>
    </div>
  );
};

export default LinkBuildingPage;
