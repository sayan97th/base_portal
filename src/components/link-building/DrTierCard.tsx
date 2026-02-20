import React from "react";
import { DrTier, shared_features } from "./drTierData";

interface DrTierCardProps {
  tier: DrTier;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const DrTierCard: React.FC<DrTierCardProps> = ({
  tier,
  quantity,
  onQuantityChange,
}) => {
  const is_selected = quantity > 0;

  const handleSelect = () => {
    if (is_selected) {
      onQuantityChange(0);
    } else {
      onQuantityChange(1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(quantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    } else {
      onQuantityChange(0);
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={`relative cursor-pointer rounded-2xl border bg-white p-5 transition-all dark:bg-white/[0.03] ${
        is_selected
          ? "border-coral-500 ring-2 ring-coral-500/20 dark:border-coral-500"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {tier.dr_label}
        </h3>
        {tier.is_most_popular && (
          <span className="rounded-full bg-coral-500 px-2.5 py-0.5 text-xs font-medium text-white">
            Most Popular
          </span>
        )}
      </div>

      {/* Features */}
      <ul className="mb-4 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-gray-400">•</span>
          Monthly Organic Traffic: {tier.traffic_range}
        </li>
        {shared_features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-0.5 text-gray-400">•</span>
            {feature === "Original Content"
              ? feature
              : feature}
            {feature === "Original Content" && (
              <></>
            )}
          </li>
        ))}
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-gray-400">•</span>
          Content Word Count: {tier.word_count.toLocaleString()}
        </li>
      </ul>

      {/* Price */}
      <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
        ${tier.price_per_link.toFixed(2)}
      </p>

      {/* Quantity Stepper */}
      {is_selected && (
        <div
          className="mt-4 flex items-center justify-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDecrement}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-medium text-gray-800 dark:text-white/90">
            {quantity}
          </span>
          <button
            onClick={handleIncrement}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
};

export default DrTierCard;
