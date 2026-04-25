"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import DrTierCard from "@/components/link-building/DrTierCard";
import KeywordEntryStep, {
  type KeywordData,
  type KeywordRow,
} from "@/components/link-building/KeywordEntryStep";
import type { OrderSummaryItem } from "@/components/link-building/LinkBuildingOrderSummary";
import CheckoutStep, {
  type BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import UnifiedCartSummary from "@/components/shared/UnifiedCartSummary";
import { linkBuildingService } from "@/services/client/link-building.service";
import { newContentService } from "@/services/client/new-content.service";
import { contentOptimizationService } from "@/services/client/content-optimization.service";
import { contentBriefsService } from "@/services/client/content-briefs.service";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { useCart } from "@/context/CartContext";
import { useUnifiedCheckout } from "@/hooks/useUnifiedCheckout";
import { getStripe } from "@/lib/stripe";
import type { DrTier } from "@/types/client/link-building";
import type { NewContentTier } from "@/types/client/new-content";
import type { ContentOptimizationTier } from "@/types/client/content-optimization";
import type { ContentBriefTier } from "@/types/client/content-briefs";

type StoreStep = "products" | "keywords" | "checkout";
type ProductTab =
  | "link_building"
  | "new_content"
  | "content_optimization"
  | "content_brief";

const stripe_promise = getStripe();

const empty_keyword_row = (): KeywordRow => ({
  keyword: "",
  landing_page: "",
  exact_match: false,
});

// ─── Generic product card for NC / CO / CB ────────────────────────────────────

interface GenericTierCardProps {
  id: string;
  label: string;
  price: number;
  meta_lines: string[];
  is_most_popular?: boolean;
  quantity: number;
  max_quantity?: number | null;
  onQuantityChange: (quantity: number) => void;
}

function GenericTierCard({
  label,
  price,
  meta_lines,
  is_most_popular,
  quantity,
  max_quantity,
  onQuantityChange,
}: GenericTierCardProps) {
  const is_selected = quantity > 0;

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (max_quantity == null || quantity < max_quantity) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(Math.max(0, quantity - 1));
  };

  return (
    <div
      onClick={() => !is_selected && onQuantityChange(1)}
      className={`group relative cursor-pointer rounded-2xl border bg-white p-5 transition-all duration-200 dark:bg-white/3 ${
        is_selected
          ? "border-coral-500 ring-2 ring-coral-500/20 dark:border-coral-500"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
      }`}
    >
      {is_most_popular && (
        <div className="absolute -top-2.5 left-4">
          <span className="rounded-full bg-coral-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuantityChange(is_selected ? 0 : 1);
        }}
        aria-label={is_selected ? "Deselect" : "Select"}
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
          is_selected
            ? "scale-100 bg-coral-500 text-white opacity-100 hover:bg-coral-600"
            : "scale-75 bg-gray-100 text-gray-300 opacity-0 group-hover:scale-100 group-hover:opacity-50 hover:opacity-100! dark:bg-gray-700 dark:text-gray-500"
        }`}
      >
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
      </button>

      <div className="mb-4 pr-8">
        <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
          {label}
        </h3>
        {meta_lines.map((line, i) => (
          <p
            key={i}
            className={`text-sm ${i === 0 ? "font-medium text-gray-700 dark:text-gray-200" : "text-xs text-gray-400 dark:text-gray-500"}`}
          >
            {line}
          </p>
        ))}
      </div>

      <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-white/80">
          ${price.toLocaleString()}
          <span className="text-xs font-normal text-gray-400">/unit</span>
        </p>

        {!is_selected ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuantityChange(1);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-coral-500 text-coral-500 transition-colors hover:bg-coral-500 hover:text-white"
            aria-label={`Add ${label}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 1V11M1 6H11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleDecrement}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-coral-400 hover:text-coral-500 dark:border-gray-600 dark:text-gray-400"
              aria-label="Decrease quantity"
            >
              <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
                <path
                  d="M1 1H9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span className="min-w-[18px] text-center text-sm font-semibold text-gray-800 dark:text-white/90">
              {quantity}
            </span>
            <button
              onClick={handleIncrement}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-coral-500 text-white transition-colors hover:bg-coral-600"
              aria-label="Increase quantity"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 1V11M1 6H11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TierGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
        />
      ))}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

interface StepIndicatorProps {
  current_step: StoreStep;
  has_lb_items: boolean;
}

function StepIndicator({ current_step, has_lb_items }: StepIndicatorProps) {
  const steps = [
    { key: "products" as StoreStep, label: "Select Products" },
    ...(has_lb_items || current_step === "keywords"
      ? [{ key: "keywords" as StoreStep, label: "Enter Keywords" }]
      : []),
    { key: "checkout" as StoreStep, label: "Checkout" },
  ];

  const current_index = steps.findIndex((s) => s.key === current_step);

  return (
    <nav className="flex items-center gap-2">
      {steps.map((step, i) => {
        const is_active = step.key === current_step;
        const is_done = i < current_index;
        return (
          <React.Fragment key={step.key}>
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  is_active
                    ? "bg-coral-500 text-white"
                    : is_done
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                {is_done ? (
                  <svg
                    className="h-2.5 w-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-xs font-medium ${
                  is_active
                    ? "text-gray-800 dark:text-white/90"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="h-px w-6 bg-gray-200 dark:bg-gray-700" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ─── Tab navigation ───────────────────────────────────────────────────────────

interface TabConfig {
  key: ProductTab;
  label: string;
  icon: React.ReactNode;
}

const product_tabs: TabConfig[] = [
  {
    key: "link_building",
    label: "Link Building",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
        />
      </svg>
    ),
  },
  {
    key: "new_content",
    label: "New Content",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    ),
  },
  {
    key: "content_optimization",
    label: "Content Optimization",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    ),
  },
  {
    key: "content_brief",
    label: "Content Briefs",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
        />
      </svg>
    ),
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

const UnifiedStorePage: React.FC = () => {
  const [current_step, setCurrentStep] = useState<StoreStep>("products");
  const [active_tab, setActiveTab] = useState<ProductTab>("link_building");

  const [dr_tiers, setDrTiers] = useState<DrTier[]>([]);
  const [dr_tiers_loading, setDrTiersLoading] = useState(true);
  const [dr_tiers_error, setDrTiersError] = useState<string | null>(null);

  const [nc_tiers, setNcTiers] = useState<NewContentTier[]>([]);
  const [nc_tiers_loading, setNcTiersLoading] = useState(true);

  const [co_tiers, setCoTiers] = useState<ContentOptimizationTier[]>([]);
  const [co_tiers_loading, setCoTiersLoading] = useState(true);

  const [cb_tiers, setCbTiers] = useState<ContentBriefTier[]>([]);
  const [cb_tiers_loading, setCbTiersLoading] = useState(true);

  const [billing_address, setBillingAddress] = useState<BillingAddress>({
    address: "",
    city: "",
    country: "United States",
    state: "Alabama",
    postal_code: "",
    company: "",
  });

  const [checkout_is_processing, setCheckoutIsProcessing] = useState(false);

  const checkout_ref = useRef<CheckoutStepHandle>(null);

  const {
    getQuantitiesForProductType,
    setItemQuantity,
    updateLinkBuildingKeywords,
    getKeywordDataForTier,
    item_count,
    total,
    order_title,
    order_notes,
    setOrderTitle,
    setOrderNotes,
    is_cart_ready,
  } = useCart();

  const { saved_billing_address, has_saved_address } = useBillingAddress();
  const { is_submitting, submit_error, handleComplete: executeCheckout } =
    useUnifiedCheckout();

  // ── Fetch all product tiers in parallel ─────────────────────────────────────

  useEffect(() => {
    linkBuildingService
      .fetchDrTiers()
      .then((tiers) => setDrTiers(tiers.filter((t) => t.is_active)))
      .catch(() => setDrTiersError("Could not load Link Building tiers."))
      .finally(() => setDrTiersLoading(false));

    newContentService
      .fetchNewContentTiers()
      .then((tiers) => setNcTiers(tiers.filter((t) => t.is_active && !t.is_hidden)))
      .catch(() => {})
      .finally(() => setNcTiersLoading(false));

    contentOptimizationService
      .fetchTiers()
      .then((tiers) => setCoTiers(tiers.filter((t) => t.is_active && !t.is_hidden)))
      .catch(() => {})
      .finally(() => setCoTiersLoading(false));

    contentBriefsService
      .fetchTiers()
      .then((tiers) => setCbTiers(tiers.filter((t) => t.is_active && !t.is_hidden)))
      .catch(() => {})
      .finally(() => setCbTiersLoading(false));
  }, []);

  // ── Quantities per product type ──────────────────────────────────────────────

  const lb_quantities = getQuantitiesForProductType("link_building");
  const nc_quantities = getQuantitiesForProductType("new_content");
  const co_quantities = getQuantitiesForProductType("content_optimization");
  const cb_quantities = getQuantitiesForProductType("content_brief");

  // ── Link building keyword data ───────────────────────────────────────────────

  const lb_selected_items = useMemo<OrderSummaryItem[]>(
    () =>
      dr_tiers
        .filter((t) => (lb_quantities[t.id] ?? 0) > 0)
        .map((t) => ({
          id: t.id,
          label: t.label,
          quantity: lb_quantities[t.id],
          unit_price: t.price_per_link,
        })),
    [dr_tiers, lb_quantities]
  );

  const has_lb_items = lb_selected_items.length > 0;

  const computed_keyword_rows = useMemo<KeywordData>(() => {
    const result: KeywordData = {};
    lb_selected_items.forEach(({ id, quantity }) => {
      const stored = getKeywordDataForTier(id) as KeywordRow[];
      if (stored.length === quantity) {
        result[id] = stored;
      } else if (stored.length < quantity) {
        result[id] = [
          ...stored,
          ...Array.from({ length: quantity - stored.length }, empty_keyword_row),
        ];
      } else {
        result[id] = stored.slice(0, quantity);
      }
    });
    return result;
  }, [lb_selected_items, getKeywordDataForTier]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleLbQuantityChange = (tier_id: string, quantity: number) => {
    const tier = dr_tiers.find((t) => t.id === tier_id);
    if (!tier) return;
    setItemQuantity("link_building", tier_id, tier.label, tier.price_per_link, quantity);
  };

  const handleNcQuantityChange = (tier_id: string, quantity: number) => {
    const tier = nc_tiers.find((t) => t.id === tier_id);
    if (!tier) return;
    setItemQuantity("new_content", tier_id, tier.label, tier.price, quantity);
  };

  const handleCoQuantityChange = (tier_id: string, quantity: number) => {
    const tier = co_tiers.find((t) => t.id === tier_id);
    if (!tier) return;
    setItemQuantity("content_optimization", tier_id, tier.label, tier.price, quantity);
  };

  const handleCbQuantityChange = (tier_id: string, quantity: number) => {
    const tier = cb_tiers.find((t) => t.id === tier_id);
    if (!tier) return;
    setItemQuantity("content_brief", tier_id, tier.label, tier.price, quantity);
  };

  const handleKeywordChange = (
    tier_id: string,
    row_index: number,
    field: keyof KeywordRow,
    value: string | boolean
  ) => {
    const base_rows = (computed_keyword_rows[tier_id] ?? []).map((r) => ({ ...r }));
    if (base_rows[row_index]) {
      base_rows[row_index] = { ...base_rows[row_index], [field]: value };
    }
    updateLinkBuildingKeywords(tier_id, base_rows);
  };

  const handleBillingChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleProceedToCheckout = () => {
    if (item_count === 0) return;
    if (has_lb_items) {
      setCurrentStep("keywords");
    } else {
      if (has_saved_address && saved_billing_address) {
        const is_billing_empty =
          !billing_address.address && !billing_address.city && !billing_address.postal_code;
        if (is_billing_empty) setBillingAddress(saved_billing_address);
      }
      setCurrentStep("checkout");
    }
    scrollToTop();
  };

  const handleProceedFromKeywords = useCallback(() => {
    if (has_saved_address && saved_billing_address) {
      const is_billing_empty =
        !billing_address.address && !billing_address.city && !billing_address.postal_code;
      if (is_billing_empty) setBillingAddress(saved_billing_address);
    }
    setCurrentStep("checkout");
    scrollToTop();
  }, [has_saved_address, saved_billing_address, billing_address]);

  const handleBack = () => {
    if (current_step === "checkout") {
      setCurrentStep(has_lb_items ? "keywords" : "products");
    } else {
      setCurrentStep("products");
    }
    scrollToTop();
  };

  const handleApplySavedAddress = useCallback(() => {
    if (saved_billing_address) setBillingAddress(saved_billing_address);
  }, [saved_billing_address]);

  const handlePaymentComplete = useCallback(
    async (payment_intent_id: string, is_using_saved_method: boolean) => {
      await executeCheckout(payment_intent_id, is_using_saved_method, billing_address);
    },
    [executeCheckout, billing_address]
  );

  const handleTriggerCheckout = useCallback(() => {
    checkout_ref.current?.triggerSubmit();
  }, []);

  // ── Products step action label ────────────────────────────────────────────────

  const products_action_label =
    item_count === 0
      ? "Add items to continue"
      : has_lb_items
        ? "Continue to Keywords"
        : "Proceed to Checkout";

  // ── Cart tab badge counts ─────────────────────────────────────────────────────

  const tab_counts: Record<ProductTab, number> = useMemo(
    () => ({
      link_building: Object.values(lb_quantities).reduce((s, v) => s + v, 0),
      new_content: Object.values(nc_quantities).reduce((s, v) => s + v, 0),
      content_optimization: Object.values(co_quantities).reduce((s, v) => s + v, 0),
      content_brief: Object.values(cb_quantities).reduce((s, v) => s + v, 0),
    }),
    [lb_quantities, nc_quantities, co_quantities, cb_quantities]
  );

  const is_checkout_busy = checkout_is_processing || is_submitting;

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        {/* Top bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">
              Store
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Browse all services, add to cart, and checkout in one place.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <StepIndicator
              current_step={current_step}
              has_lb_items={has_lb_items}
            />
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                />
              </svg>
              My Orders
            </Link>
          </div>
        </div>

        {/* Main layout: content + sidebar */}
        <div className="grid grid-cols-12 gap-6">
          {/* ── Main content area ──────────────────────────────────────────── */}
          <div className="col-span-12 space-y-6 lg:col-span-8">

            {/* ── Step: Products ─────────────────────────────────────────── */}
            {current_step === "products" && (
              <>
                {/* Tab navigation */}
                <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-white/3">
                  {product_tabs.map((tab) => {
                    const is_active = active_tab === tab.key;
                    const count = tab_counts[tab.key];
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                          is_active
                            ? "bg-coral-500 text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        }`}
                      >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                        {count > 0 && (
                          <span
                            className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                              is_active
                                ? "bg-white/30 text-white"
                                : "bg-coral-100 text-coral-600 dark:bg-coral-500/20 dark:text-coral-400"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div>
                  {/* Link Building */}
                  {active_tab === "link_building" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          Link Building
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          High-authority backlinks from real, vetted websites. Select
                          the DR tiers and quantities you need.
                        </p>
                      </div>
                      {dr_tiers_error && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          {dr_tiers_error}
                        </p>
                      )}
                      {dr_tiers_loading ? (
                        <TierGridSkeleton count={5} />
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {dr_tiers.map((tier) => (
                            <DrTierCard
                              key={tier.id}
                              tier={tier}
                              quantity={lb_quantities[tier.id] ?? 0}
                              onQuantityChange={(qty) =>
                                handleLbQuantityChange(tier.id, qty)
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* New Content */}
                  {active_tab === "new_content" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          New Content
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          Professionally written content tailored to your audience and
                          SEO goals.
                        </p>
                      </div>
                      {nc_tiers_loading ? (
                        <TierGridSkeleton count={3} />
                      ) : nc_tiers.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                          No tiers available at the moment.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {nc_tiers.map((tier) => (
                            <GenericTierCard
                              key={tier.id}
                              id={tier.id}
                              label={tier.label}
                              price={tier.price}
                              meta_lines={[tier.turnaround_time]}
                              is_most_popular={tier.is_most_popular}
                              quantity={nc_quantities[tier.id] ?? 0}
                              max_quantity={tier.max_quantity}
                              onQuantityChange={(qty) =>
                                handleNcQuantityChange(tier.id, qty)
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Optimization */}
                  {active_tab === "content_optimization" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          Content Optimization
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          Improve your existing content&apos;s rankings with targeted
                          on-page optimizations.
                        </p>
                      </div>
                      {co_tiers_loading ? (
                        <TierGridSkeleton count={3} />
                      ) : co_tiers.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                          No tiers available at the moment.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {co_tiers.map((tier) => (
                            <GenericTierCard
                              key={tier.id}
                              id={tier.id}
                              label={tier.label}
                              price={tier.price}
                              meta_lines={[
                                tier.word_count_range,
                                `${tier.turnaround_days}-day turnaround`,
                              ]}
                              is_most_popular={tier.is_most_popular}
                              quantity={co_quantities[tier.id] ?? 0}
                              max_quantity={tier.max_quantity}
                              onQuantityChange={(qty) =>
                                handleCoQuantityChange(tier.id, qty)
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Briefs */}
                  {active_tab === "content_brief" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          Content Briefs
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          Detailed content briefs to guide your writers and boost
                          content quality.
                        </p>
                      </div>
                      {cb_tiers_loading ? (
                        <TierGridSkeleton count={3} />
                      ) : cb_tiers.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                          No tiers available at the moment.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {cb_tiers.map((tier) => (
                            <GenericTierCard
                              key={tier.id}
                              id={tier.id}
                              label={tier.label}
                              price={tier.price}
                              meta_lines={[
                                `${tier.turnaround_days}-day turnaround`,
                              ]}
                              is_most_popular={tier.is_most_popular}
                              quantity={cb_quantities[tier.id] ?? 0}
                              max_quantity={tier.max_quantity}
                              onQuantityChange={(qty) =>
                                handleCbQuantityChange(tier.id, qty)
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Step: Keywords ─────────────────────────────────────────── */}
            {current_step === "keywords" && (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBack}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                      />
                    </svg>
                    Back to Products
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enter target keywords and landing pages for each placement.
                  </p>
                </div>
                <KeywordEntryStep
                  selected_items={lb_selected_items}
                  keyword_data={computed_keyword_rows}
                  order_title={order_title}
                  order_notes={order_notes}
                  onKeywordChange={handleKeywordChange}
                  onOrderTitleChange={setOrderTitle}
                  onOrderNotesChange={setOrderNotes}
                />
              </>
            )}

            {/* ── Step: Checkout ─────────────────────────────────────────── */}
            {current_step === "checkout" && (
              <Elements stripe={stripe_promise}>
                <CheckoutStep
                  ref={checkout_ref}
                  billing_address={billing_address}
                  onBillingChange={handleBillingChange}
                  onPrevious={handleBack}
                  onComplete={handlePaymentComplete}
                  is_loading={is_submitting}
                  error_message={submit_error}
                  total_amount={total}
                  saved_billing_address={saved_billing_address}
                  onApplySavedAddress={handleApplySavedAddress}
                  back_label={has_lb_items ? "Back to Keywords" : "Back to Products"}
                  onProcessingChange={setCheckoutIsProcessing}
                />
              </Elements>
            )}
          </div>

          {/* ── Sidebar: Cart Summary ──────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-4">
            {current_step === "products" && (
              <UnifiedCartSummary
                action_label={products_action_label}
                onAction={handleProceedToCheckout}
                is_action_disabled={item_count === 0 || !is_cart_ready}
                show_coupon_field={false}
              />
            )}

            {current_step === "keywords" && (
              <UnifiedCartSummary
                action_label="Continue to Checkout"
                onAction={handleProceedFromKeywords}
                is_action_disabled={lb_selected_items.length === 0}
                show_coupon_field={true}
              />
            )}

            {current_step === "checkout" && (
              <UnifiedCartSummary
                show_coupon_field={true}
                checkout_action={{
                  total,
                  is_processing: is_checkout_busy,
                  onSubmit: handleTriggerCheckout,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedStorePage;
