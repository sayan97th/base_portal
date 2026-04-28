import React from "react";
import type { DrTier } from "@/types/client/link-building";

interface DrTierCardProps {
  tier: DrTier;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DrTierCard: React.FC<DrTierCardProps> = ({
  tier,
  quantity,
  onQuantityChange,
}) => {
  const is_selected = quantity > 0;
  const is_single_value = tier.max_quantity === 1;

  const handleCardClick = () => {
    if (is_single_value) {
      onQuantityChange(is_selected ? 0 : 1);
    } else if (!is_selected) {
      onQuantityChange(1);
    }
  };

  const handleCheckToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(is_selected ? 0 : 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tier.max_quantity == null || quantity < tier.max_quantity) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(Math.max(0, quantity - 1));
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative cursor-pointer rounded-2xl border bg-white p-5 transition-all duration-200 dark:bg-white/3 ${
        is_selected
          ? "border-coral-500 ring-2 ring-coral-500/20 dark:border-coral-500"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
      }`}
    >
      {/* Selected checkmark badge — clickable to toggle for all tiers */}
      <button
        onClick={handleCheckToggle}
        aria-label={is_selected ? "Deselect" : "Select"}
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
          is_selected
            ? "scale-100 bg-coral-500 text-white opacity-100 hover:bg-coral-600"
            : "scale-75 bg-gray-100 text-gray-300 opacity-0 group-hover:scale-100 group-hover:opacity-50 hover:opacity-100! dark:bg-gray-700 dark:text-gray-500"
        }`}
      >
        <CheckIcon />
      </button>

      {/* Most popular badge */}
      {tier.is_most_popular && (
        <div className="absolute -top-2.5 left-4">
          <span className="rounded-full bg-coral-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 pr-8">
        <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
          {tier.label}
        </h3>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {tier.traffic_range}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          monthly organic traffic minimum
        </p>
      </div>

      <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />

      {/* Footer: price + controls */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-white/80">
          ${tier.price_per_link.toLocaleString()}
          <span className="text-xs font-normal text-gray-400">/placement</span>
        </p>

        {is_single_value ? (
          /* Single-value tier: show a pill indicating 1 placement when selected */
          <div
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
              is_selected
                ? "bg-coral-50 text-coral-600 dark:bg-coral-500/10 dark:text-coral-400"
                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
            }`}
          >
            {is_selected ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
                1 placement
              </>
            ) : (
              "1 placement"
            )}
          </div>
        ) : (
          /* Multi-value tier: +/- quantity controls */
          !is_selected ? (
            <button
              onClick={(e) => { e.stopPropagation(); onQuantityChange(1); }}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-coral-500 text-coral-500 transition-colors hover:bg-coral-500 hover:text-white"
              aria-label={`Add ${tier.label}`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 1V11M1 6H11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleDecrement}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-coral-400 hover:text-coral-500 dark:border-gray-600 dark:text-gray-400"
                aria-label="Decrease quantity"
              >
                <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
                  <path
                    d="M1 1H9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <span className="min-w-[18px] text-center text-sm font-semibold text-gray-800 dark:text-white/90">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-coral-500 text-white transition-colors hover:bg-coral-600"
                aria-label="Increase quantity"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 1V11M1 6H11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default DrTierCard;
