import React from "react";
import { optimization_tiers } from "./contentOptimizationData";
import ContentOptimizationCard from "./ContentOptimizationCard";

interface ContentOptimizationGridProps {
  selected_quantities: Record<string, number>;
  onQuantityChange: (tier_id: string, quantity: number) => void;
}

const ContentOptimizationGrid: React.FC<ContentOptimizationGridProps> = ({
  selected_quantities,
  onQuantityChange,
}) => {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-medium text-gray-800 dark:text-white/90">
          Choose how many articles you would like optimized and their current
          word count:
        </h2>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          multiple
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {optimization_tiers.map((tier) => (
          <ContentOptimizationCard
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

export default ContentOptimizationGrid;
