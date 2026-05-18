import React from "react";
import type { ContentBriefTier } from "@/types/client/content-briefs";
import QuantityStepper from "@/components/shared/QuantityStepper";

interface BriefCardProps {
  tier: ContentBriefTier;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const BriefCard: React.FC<BriefCardProps> = ({
  tier,
  quantity,
  onQuantityChange,
}) => {
  const is_selected = quantity > 0;

  const handleToggle = () => {
    if (is_selected) {
      onQuantityChange(0);
    } else {
      onQuantityChange(1);
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={`relative cursor-pointer rounded-2xl border bg-white p-5 transition-all dark:bg-white/[0.03] ${
        is_selected
          ? "border-coral-500 ring-2 ring-coral-500/20 dark:border-coral-500"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
      }`}
    >
      {/* Checkmark */}
      {is_selected && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-coral-500 text-white">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Title */}
      <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
        {tier.label}
      </h3>

      {/* Turnaround Time */}
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Turnaround Time: {tier.turnaround_days} Business Days
      </p>

      {/* Quantity stepper */}
      {is_selected && (
        <div className="mb-3">
          <QuantityStepper
            quantity={quantity}
            onQuantityChange={onQuantityChange}
          />
        </div>
      )}

      {/* Price */}
      <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
        ${Number(tier.price).toFixed(2)}
      </p>
    </div>
  );
};

export default BriefCard;
