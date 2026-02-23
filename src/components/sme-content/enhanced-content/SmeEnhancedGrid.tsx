import React from "react";
import { sme_enhanced_tiers } from "./smeEnhancedData";
import SmeEnhancedCard from "./SmeEnhancedCard";

interface SmeEnhancedGridProps {
  selected_quantities: Record<string, number>;
  onQuantityChange: (tier_id: string, quantity: number) => void;
}

const SmeEnhancedGrid: React.FC<SmeEnhancedGridProps> = ({
  selected_quantities,
  onQuantityChange,
}) => {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Select services
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          multiple
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          optional
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sme_enhanced_tiers.map((tier) => (
          <SmeEnhancedCard
            key={tier.id}
            tier={tier}
            quantity={selected_quantities[tier.id] || 0}
            onQuantityChange={(qty) => onQuantityChange(tier.id, qty)}
          />
        ))}
      </div>
    </div>
  );
};

export default SmeEnhancedGrid;
