"use client";

import React from "react";
import Badge from "../ui/badge/Badge";
import type { PaymentMethod } from "./BillingPage";

interface PaymentMethodCardProps {
  payment_method: PaymentMethod;
  onRemove: () => void;
  onSetDefault: () => void;
}

const brand_gradients: Record<string, string> = {
  visa: "linear-gradient(135deg, #1a237e 0%, #0288d1 100%)",
  mastercard: "linear-gradient(135deg, #b71c1c 0%, #ff8f00 100%)",
  amex: "linear-gradient(135deg, #004d40 0%, #0097a7 100%)",
  discover: "linear-gradient(135deg, #e65100 0%, #ffb300 100%)",
};

const brand_labels: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
};

function MiniCard({ brand, last_four }: { brand: string; last_four: string }) {
  const gradient = brand_gradients[brand] ?? "linear-gradient(135deg, #4527a0 0%, #6a1b9a 100%)";

  return (
    <div
      className="relative flex h-13 w-20 shrink-0 flex-col justify-between overflow-hidden rounded-xl p-2 shadow-md"
      style={{ backgroundImage: gradient }}
    >
      {/* Sheen */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)",
        }}
      />
      {/* Decorative circle */}
      <div
        className="pointer-events-none absolute -bottom-4 -right-4 h-14 w-14 rounded-full opacity-20"
        style={{ background: "rgba(255,255,255,0.6)" }}
      />

      {/* Chip */}
      <div
        className="relative h-2.5 w-4 rounded-sm"
        style={{
          background: "linear-gradient(135deg, #d4a846 0%, #f5d278 50%, #c9952a 100%)",
        }}
      />

      {/* Last 4 */}
      <p className="relative font-mono text-[9px] font-semibold tracking-wider text-white/90">
        •••• {last_four}
      </p>
    </div>
  );
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  payment_method,
  onRemove,
  onSetDefault,
}) => {
  const brand_label =
    brand_labels[payment_method.card_brand] || payment_method.card_brand;

  return (
    <div className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:px-8">
      {/* Left: mini card + info */}
      <div className="flex items-center gap-4">
        <MiniCard brand={payment_method.card_brand} last_four={payment_method.last_four} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {brand_label}{" "}
              <span className="font-normal text-gray-500 dark:text-gray-400">
                ending in {payment_method.last_four}
              </span>
            </p>
            {payment_method.is_default && (
              <Badge variant="light" size="sm" color="success">
                Default
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Expires {payment_method.expiry_month} / {payment_method.expiry_year}
          </p>
          {payment_method.billing_address && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {[
                payment_method.billing_address.address_line1,
                payment_method.billing_address.city,
                payment_method.billing_address.state,
                payment_method.billing_address.postal_code,
                payment_method.billing_address.country,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 pl-24 sm:pl-0">
        {!payment_method.is_default && (
          <button
            onClick={onSetDefault}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
          >
            Set as default
          </button>
        )}
        <button
          onClick={onRemove}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default PaymentMethodCard;
