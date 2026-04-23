import React from "react";
import ArticleCard from "./NewContentCard";
import type { NewContentTier } from "@/types/client/new-content";

interface ArticleGridProps {
  new_content_tiers: NewContentTier[];
  selected_quantities: Record<string, number>;
  onQuantityChange: (tier_id: string, quantity: number) => void;
  is_loading?: boolean;
}

const ArticleGrid: React.FC<ArticleGridProps> = ({
  new_content_tiers,
  selected_quantities,
  onQuantityChange,
  is_loading = false,
}) => {
  if (is_loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="mb-3 h-6 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-medium text-gray-800 dark:text-white/90">
          OptimizedPlus SEO Articles. Choose your word count and quantities:
        </h2>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          multiple
        </span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          optional
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {new_content_tiers.map((tier) => (
          <ArticleCard
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

export default ArticleGrid;
