import React from "react";
import { SmeServiceTier } from "./smeCollaborationData";

interface SmeServiceCardProps {
  tier: SmeServiceTier;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const quantity_options = Array.from({ length: 10 }, (_, i) => i + 1);

const SmeServiceCard: React.FC<SmeServiceCardProps> = ({
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

  const handleQuantitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    onQuantityChange(Number(e.target.value));
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
      <h3 className="mb-3 pr-8 text-base font-semibold text-gray-800 dark:text-white/90">
        {tier.label}
      </h3>

      {/* Description */}
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {tier.description}
      </p>

      {/* Quantity Dropdown */}
      {is_selected && (
        <div className="mb-3" onClick={(e) => e.stopPropagation()}>
          <select
            value={quantity}
            onChange={handleQuantitySelect}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            {quantity_options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Price */}
      <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
        ${tier.price.toFixed(2)}
      </p>
    </div>
  );
};

export default SmeServiceCard;
