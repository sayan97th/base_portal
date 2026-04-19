import React from "react";
import type { PremiumMentionsPlan } from "@/types/client/premium-mentions";
import PremiumMentionsPlanCard from "./PremiumMentionsPlanCard";

interface PremiumMentionsPlanGridProps {
  plans: PremiumMentionsPlan[];
  selected_plan_id: string | null;
  onSelect: (plan_id: string) => void;
}

const PremiumMentionsPlanGrid: React.FC<PremiumMentionsPlanGridProps> = ({
  plans,
  selected_plan_id,
  onSelect,
}) => {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-medium text-gray-800 dark:text-white/90">
          Choose your plan
        </h2>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          select one
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PremiumMentionsPlanCard
            key={plan.id}
            plan={plan}
            is_selected={selected_plan_id === plan.id}
            onSelect={() => onSelect(plan.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default PremiumMentionsPlanGrid;
