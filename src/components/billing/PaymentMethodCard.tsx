"use client";

import React from "react";
import Badge from "../ui/badge/Badge";
import type { PaymentMethod } from "./BillingPage";

interface PaymentMethodCardProps {
  payment_method: PaymentMethod;
  onRemove: () => void;
  onSetDefault: () => void;
}

const card_brand_colors: Record<string, string> = {
  visa: "bg-blue-600",
  mastercard: "bg-orange-500",
  amex: "bg-indigo-600",
  discover: "bg-amber-500",
};

const card_brand_labels: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
};

function getCardIcon(brand: string) {
  const color = card_brand_colors[brand] || "bg-gray-500";
  return (
    <div
      className={`flex h-10 w-14 items-center justify-center rounded-md ${color} text-xs font-bold text-white`}
    >
      {(card_brand_labels[brand] || brand).substring(0, 4).toUpperCase()}
    </div>
  );
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  payment_method,
  onRemove,
  onSetDefault,
}) => {
  const brand_label =
    card_brand_labels[payment_method.card_brand] || payment_method.card_brand;

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-8">
      <div className="flex items-center gap-4">
        {getCardIcon(payment_method.card_brand)}
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {brand_label} ending in {payment_method.last_four}
            </p>
            {payment_method.is_default && (
              <Badge variant="light" size="sm" color="success">
                Default
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Expires {payment_method.expiry_month}/{payment_method.expiry_year}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!payment_method.is_default && (
          <button
            onClick={onSetDefault}
            className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Set as default
          </button>
        )}
        <button
          onClick={onRemove}
          className="text-sm font-medium text-error-500 hover:text-error-600 dark:text-error-400 dark:hover:text-error-300"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default PaymentMethodCard;
