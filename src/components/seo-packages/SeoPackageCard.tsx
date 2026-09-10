import React from "react";
import type { SeoPackage } from "@/types/client/seo-packages";

interface SeoPackageCardProps {
  package: SeoPackage;
  is_selected: boolean;
  onSelect: (package_id: string) => void;
  features_label: string;
  tier_index: number;
}

const CheckIcon = ({ className }: { className: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
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
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8H13M9 4L13 8L9 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IDEAL_FOR_ICONS = [
  // Sprout / foundation
  <svg key="sprout" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8m0 0c0-3.314-2.686-6-6-6H4a8 8 0 008 8zm0 0c0-4.418 3.582-8 8-8h2a8 8 0 01-8 8z" />
  </svg>,
  // Trending up / growth
  <svg key="trending" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8m0 0h-5m5 0v5" />
  </svg>,
  // Crown / full-scale
  <svg key="crown" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.25 18.75a.75.75 0 00.75.75h18a.75.75 0 00.75-.75v-1.5a.75.75 0 00-.75-.75H3a.75.75 0 00-.75.75v1.5zM3.75 15h16.5l-1.4-9.1a.5.5 0 00-.86-.27l-3.14 3.42-2.85-5.7a.5.5 0 00-.9 0l-2.85 5.7-3.14-3.42a.5.5 0 00-.86.27L3.75 15z" />
  </svg>,
];

const DEFAULT_IDEAL_FOR_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface TierAccentStyle {
  badge: string;
  check: string;
  callout_bg: string;
  callout_text: string;
}

function getTierAccentStyle(tier_index: number, is_highlighted: boolean): TierAccentStyle {
  if (is_highlighted) {
    return {
      badge: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
      check: "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400",
      callout_bg: "bg-brand-50 dark:bg-brand-500/10",
      callout_text: "text-brand-600 dark:text-brand-400",
    };
  }
  if (tier_index === 0) {
    return {
      badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      check: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
      callout_bg: "bg-gray-50 dark:bg-white/5",
      callout_text: "text-gray-500 dark:text-gray-400",
    };
  }
  return {
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
    check: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
    callout_bg: "bg-violet-50 dark:bg-violet-500/10",
    callout_text: "text-violet-700 dark:text-violet-400",
  };
}

const SeoPackageCard: React.FC<SeoPackageCardProps> = ({
  package: pkg,
  is_selected,
  onSelect,
  features_label,
  tier_index,
}) => {
  const is_highlighted = pkg.is_most_popular;
  const ideal_for_icon = IDEAL_FOR_ICONS[tier_index] ?? DEFAULT_IDEAL_FOR_ICON;
  const tier_accent = getTierAccentStyle(tier_index, is_highlighted);

  const border_classes = is_selected
    ? "border-2 border-brand-400 shadow-md shadow-brand-500/10 dark:border-brand-500"
    : is_highlighted
      ? "border-2 border-coral-400 shadow-md shadow-coral-500/10 dark:border-coral-500"
      : "border-gray-200 dark:border-gray-800";

  const background_classes = is_selected
    ? "bg-brand-50/60 dark:bg-brand-500/10"
    : "bg-white dark:bg-white/3";

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-4 transition-all duration-200 sm:p-5 ${border_classes} ${background_classes}`}
    >
      {is_highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-coral-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          Most Popular
        </span>
      )}

      {/* Eyebrow tier label */}
      <span
        className={`inline-block w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tier_accent.badge}`}
      >
        {pkg.name}
      </span>

      {/* Headline */}
      <h3 className="mt-1.5 text-lg font-bold leading-snug text-gray-900 dark:text-white/90">
        {pkg.headline || pkg.name}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {pkg.best_for}
      </p>

      {/* Price */}
      <p className="mt-1.5 text-3xl font-bold text-gray-900 dark:text-white/90">
        ${pkg.price_per_month.toLocaleString()}
        <span className="text-sm font-normal text-gray-400"> /month</span>
      </p>

      {/* CTA */}
      <button
        type="button"
        onClick={() => onSelect(pkg.id)}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${is_selected
          ? "bg-brand-500 text-white hover:bg-brand-600"
          : is_highlighted
            ? "bg-coral-500 text-white hover:bg-coral-600"
            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
          }`}
      >
        {is_selected ? (
          <>
            Selected
            <CheckIcon className="h-3.5 w-3.5" />
          </>
        ) : (
          <>
            Choose {pkg.name}
            <ArrowIcon />
          </>
        )}
      </button>

      {/* Feature list */}
      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {features_label}
      </p>
      <ul className="space-y-2">
        {pkg.features.map((feature, feature_index) => (
          <li key={`${feature.title}-${feature_index}`} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tier_accent.check}`}
            >
              <CheckIcon className="h-3 w-3" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-gray-800 dark:text-white/90">
                {feature.title}
              </p>
              {feature.description && (
                <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Ideal for callout */}
      {pkg.ideal_for && (
        <div className={`mt-4 flex items-start gap-2 rounded-xl p-2.5 ${tier_accent.callout_bg}`}>
          <span className={`mt-0.5 shrink-0 ${tier_accent.callout_text}`}>{ideal_for_icon}</span>
          <p className={`text-[11px] leading-snug ${tier_accent.callout_text}`}>
            <span className="font-semibold">Ideal for:</span> {pkg.ideal_for}
          </p>
        </div>
      )}
    </div>
  );
};

export default SeoPackageCard;
