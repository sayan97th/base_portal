import React from "react";
import { DrTier } from "./drTierData";

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

  const handleCardClick = () => {
    if (!is_selected) {
      onQuantityChange(1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(quantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(Math.max(0, quantity - 1));
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative rounded-2xl border bg-white p-5 transition-all dark:bg-white/3 ${
        is_selected
          ? "border-coral-500 ring-2 ring-coral-500/20 dark:border-coral-500"
          : "cursor-pointer border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
      }`}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
          {tier.dr_label}
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

        {!is_selected ? (
          <button
            onClick={(e) => { e.stopPropagation(); onQuantityChange(1); }}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-coral-500 text-coral-500 transition-colors hover:bg-coral-500 hover:text-white"
            aria-label={`Add ${tier.dr_label}`}
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
          <div className="flex items-center gap-2">
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
        )}
      </div>
    </div>
  );
};

export default DrTierCard;
