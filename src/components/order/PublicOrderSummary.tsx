"use client";

import React, { useMemo } from "react";
import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/types/client/unified-cart";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ItemGroup({ item }: { item: CartItem }) {
  const item_total = item.unit_price * item.quantity;
  const keyword_rows = item.product_type === "link_building" ? item.keyword_data ?? [] : [];

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-white">{item.tier_name}</span>
        <span className="text-sm font-semibold text-white/90">${formatCurrency(item_total)}</span>
      </div>

      {keyword_rows.length > 0 ? (
        <ol className="space-y-1.5">
          {keyword_rows.map((row, index) => (
            <li key={index} className="flex gap-2 text-xs text-white/75">
              <span className="mt-0.5 shrink-0 font-semibold text-white/60">{index + 1}</span>
              <span className="min-w-0">
                <span className="block truncate">KW: {row.keyword || "Not yet provided"}</span>
                <span className="block truncate">Landing page: {row.landing_page || "Not yet provided"}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-white/75">
          {item.quantity} {item.quantity === 1 ? "item" : "items"}
        </p>
      )}
    </div>
  );
}

interface PublicOrderSummaryProps {
  className?: string;
}

const PublicOrderSummary: React.FC<PublicOrderSummaryProps> = ({ className = "" }) => {
  const { items, total } = useCart();

  const has_items = items.length > 0;

  const sorted_items = useMemo(
    () => [...items].sort((a, b) => a.tier_name.localeCompare(b.tier_name)),
    [items]
  );

  return (
    <div
      className={`flex shrink-0 flex-col bg-gradient-to-br from-cyan-400 via-teal-500 to-teal-700 p-7 text-white sm:p-9 ${className}`}
    >
      <div>
        <h2 className="text-lg font-bold text-white">Order Summary</h2>

        {has_items ? (
          <div className="mt-6 space-y-5">
            {sorted_items.map((item) => (
              <ItemGroup key={item.cart_item_id} item={item} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-white/75">Your order is empty.</p>
        )}

        <div className="mt-6 border-t border-white/20 pt-5">
          <p className="text-xs text-white/70">Total</p>
          <p className="text-2xl font-bold text-white">${formatCurrency(total)}</p>
        </div>
      </div>
    </div>
  );
};

export default PublicOrderSummary;
