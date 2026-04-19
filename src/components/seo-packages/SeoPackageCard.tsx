import React from "react";
import type { SeoPackage } from "@/types/client/seo-packages";

interface SeoPackageCardProps {
  package: SeoPackage;
  is_selected: boolean;
  onSelect: (package_id: string) => void;
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

const category_styles: Record<string, { badge: string; dot: string }> = {
  Strategy: {
    badge: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
    dot: "bg-brand-500",
  },
  "On-Page": {
    badge: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  "Off-Page": {
    badge: "bg-coral-50 text-coral-600 dark:bg-coral-500/15 dark:text-coral-400",
    dot: "bg-coral-500",
  },
  Technical: {
    badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

const SeoPackageCard: React.FC<SeoPackageCardProps> = ({
  package: pkg,
  is_selected,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(pkg.id)}
      className={`group relative cursor-pointer rounded-2xl border bg-white p-5 transition-all duration-200 dark:bg-white/3 ${
        is_selected
          ? "border-coral-500 ring-2 ring-coral-500/20 dark:border-coral-500"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
      }`}
    >
      {/* Selected checkmark badge */}
      <div
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
          is_selected
            ? "scale-100 bg-coral-500 text-white opacity-100"
            : "scale-75 bg-gray-100 text-gray-300 opacity-0 group-hover:scale-100 group-hover:opacity-50 dark:bg-gray-700 dark:text-gray-500"
        }`}
      >
        <CheckIcon />
      </div>

      {/* Most popular badge */}
      {pkg.is_most_popular && (
        <div className="absolute -top-2.5 left-4">
          <span className="rounded-full bg-coral-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      {/* Plan name */}
      <div className="mb-3 pr-8">
        <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
          {pkg.name}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {pkg.best_for}
        </p>
      </div>

      <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />

      {/* Price */}
      <div className="my-4">
        <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
          ${pkg.price_per_month.toLocaleString()}
          <span className="text-sm font-normal text-gray-400"> / month</span>
        </p>
      </div>

      {/* Feature list */}
      <ul className="space-y-2.5">
        {pkg.features.map((feature) => {
          const styles = category_styles[feature.category] ?? {
            badge: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
            dot: "bg-gray-400",
          };
          return (
            <li key={feature.category} className="flex items-start gap-2">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}
              >
                {feature.category}
              </span>
              <span className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                {feature.description}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SeoPackageCard;
