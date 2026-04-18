import React from "react";
import type { PremiumMentionsPlan } from "@/types/client/premium-mentions";

interface PremiumMentionsPlanCardProps {
  plan: PremiumMentionsPlan;
  is_selected: boolean;
  onSelect: () => void;
}

const placement_rows = [
  { key: "exclusive_placements" as const, label: "Exclusive" },
  { key: "core_placements" as const, label: "Core" },
  { key: "support_placements" as const, label: "Support" },
];

const PremiumMentionsPlanCard: React.FC<PremiumMentionsPlanCardProps> = ({
  plan,
  is_selected,
  onSelect,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-2xl border bg-white p-5 transition-all duration-200 dark:bg-white/3 ${
        is_selected
          ? "border-coral-500 ring-2 ring-coral-500/20 dark:border-coral-500"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
      }`}
    >
      {/* Most popular badge */}
      {plan.is_most_popular && (
        <div className="absolute -top-2.5 left-4">
          <span className="rounded-full bg-coral-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      {/* Selected radio indicator */}
      <div
        className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          is_selected
            ? "border-coral-500 bg-coral-500"
            : "border-gray-300 bg-white group-hover:border-gray-400 dark:border-gray-600 dark:bg-transparent"
        }`}
      >
        {is_selected && (
          <div className="h-2 w-2 rounded-full bg-white" />
        )}
      </div>

      {/* Plan name + price */}
      <div className="mb-4 pr-8">
        <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
          {plan.name}
        </h3>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-800 dark:text-white/90">
            ${plan.price_per_month.toLocaleString("en-US")}
          </span>
          <span className="text-xs font-normal text-gray-400">/month</span>
        </div>
      </div>

      <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />

      {/* Total placements */}
      <div className="my-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Total Placements
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            is_selected
              ? "bg-coral-50 text-coral-600 dark:bg-coral-500/10 dark:text-coral-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {plan.total_placements}
        </span>
      </div>

      {/* Placement breakdown */}
      <div className="mb-4 space-y-1.5">
        {placement_rows.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {label}
            </span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {plan[key]}
            </span>
          </div>
        ))}
      </div>

      <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />

      {/* Best for */}
      <div className="mt-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {plan.best_for}
        </p>
        <p className="mt-1 text-xs font-semibold italic text-gray-700 dark:text-gray-300">
          &ldquo;{plan.tagline}&rdquo;
        </p>
      </div>
    </div>
  );
};

export default PremiumMentionsPlanCard;
