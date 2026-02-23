import React from "react";
import { sme_authored_tiers } from "./smeAuthoredData";
import SmeAuthoredCard from "./SmeAuthoredCard";

interface SmeAuthoredGridProps {
  selected_quantities: Record<string, number>;
  onQuantityChange: (tier_id: string, quantity: number) => void;
}

const SmeAuthoredGrid: React.FC<SmeAuthoredGridProps> = ({
  selected_quantities,
  onQuantityChange,
}) => {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-medium text-gray-800 dark:text-white/90">
          Select services
        </h2>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          multiple
        </span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          optional
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sme_authored_tiers.map((tier) => (
          <SmeAuthoredCard
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

export default SmeAuthoredGrid;
