"use client";

import React, { useState } from "react";
import { useCart } from "@/context/CartContext";
import { validateCoupon } from "@/services/client/coupons.service";
import type { CartProductType } from "@/types/client/unified-cart";

const MINIMUM_CART_FOR_COUPON = 500;
const BULK_DISCOUNT_THRESHOLD = 10;

const PRODUCT_TYPE_LABELS: Record<CartProductType, string> = {
  link_building: "Link Building",
  content_optimization: "Content Optimization",
  new_content: "New Content",
  content_brief: "Content Briefs",
};

const PRODUCT_TYPE_ORDER: CartProductType[] = [
  "link_building",
  "content_optimization",
  "new_content",
  "content_brief",
];

export interface CheckoutAction {
  total: number;
  is_processing: boolean;
  onSubmit: () => void;
}

interface UnifiedCartSummaryProps {
  action_label?: string;
  onAction?: () => void;
  is_action_disabled?: boolean;
  show_coupon_field?: boolean;
  checkout_action?: CheckoutAction;
}

const UnifiedCartSummary: React.FC<UnifiedCartSummaryProps> = ({
  action_label = "Continue",
  onAction,
  is_action_disabled = false,
  show_coupon_field = false,
  checkout_action,
}) => {
  const {
    items,
    applied_coupons,
    coupon_input_code,
    subtotal,
    total_links,
    bulk_discount_amount,
    subtotal_after_bulk,
    total_discount,
    total,
    setItemQuantity,
    setAppliedCoupons,
    setCouponInputCode,
  } = useCart();

  const [coupon_error, setCouponError] = useState<string | null>(null);
  const [coupon_is_applying, setCouponIsApplying] = useState(false);

  const has_any_discount = bulk_discount_amount > 0 || total_discount > 0;
  const raw_subtotal = subtotal;

  const links_to_discount =
    total_links < BULK_DISCOUNT_THRESHOLD
      ? BULK_DISCOUNT_THRESHOLD - total_links
      : 0;
  const lb_items = items.filter((i) => i.product_type === "link_building");
  const show_bulk_teaser =
    links_to_discount > 0 && lb_items.length > 0 && items.length > 0;
  const show_bulk_applied_badge =
    total_links >= BULK_DISCOUNT_THRESHOLD && bulk_discount_amount > 0;

  const cart_below_minimum =
    subtotal_after_bulk < MINIMUM_CART_FOR_COUPON &&
    coupon_input_code.trim().length > 0;

  const grouped_items = PRODUCT_TYPE_ORDER.map((product_type) => ({
    product_type,
    label: PRODUCT_TYPE_LABELS[product_type],
    items: items.filter((i) => i.product_type === product_type),
  })).filter((group) => group.items.length > 0);

  const handleQuantityChange = (
    product_type: CartProductType,
    tier_id: string,
    tier_name: string,
    unit_price: number,
    new_quantity: number
  ) => {
    setItemQuantity(product_type, tier_id, tier_name, unit_price, new_quantity);
  };

  const handleCouponCodeChange = (code: string) => {
    setCouponInputCode(code);
    setCouponError(null);
  };

  const handleApplyCoupon = async () => {
    const trimmed_code = coupon_input_code.trim();
    if (!trimmed_code) return;

    const already_applied = applied_coupons.some(
      (c) => c.code.toUpperCase() === trimmed_code.toUpperCase()
    );
    if (already_applied) {
      setCouponError("This promo code has already been applied.");
      return;
    }

    if (subtotal_after_bulk < MINIMUM_CART_FOR_COUPON) {
      setCouponError(
        `A minimum cart total of $${MINIMUM_CART_FOR_COUPON.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )} is required to apply a promo code.`
      );
      return;
    }

    setCouponIsApplying(true);
    setCouponError(null);

    try {
      const applied_discount = applied_coupons.reduce(
        (sum, c) => sum + c.discount_amount,
        0
      );

      const lb_tier_ids = lb_items.map((i) => i.tier_id);
      const lb_tier_amounts: Record<string, number> = {};
      lb_items.forEach((i) => {
        lb_tier_amounts[i.tier_id] =
          Math.round(i.unit_price * i.quantity * 100) / 100;
      });

      const response = await validateCoupon({
        code: trimmed_code,
        order_amount: Math.max(0, subtotal_after_bulk - applied_discount),
        ...(lb_tier_ids.length > 0 && {
          dr_tier_ids: lb_tier_ids,
          dr_tier_amounts: lb_tier_amounts,
        }),
      });

      if (response.valid) {
        setCouponInputCode("");
        setCouponError(null);
        setAppliedCoupons((prev) => [
          ...prev,
          {
            coupon_id: response.coupon_id,
            code: response.code,
            coupon_name: response.name,
            discount_amount: response.discount_amount,
            discount_type: response.discount_type,
            discount_value: response.discount_value,
          },
        ]);
      } else {
        setCouponError(response.message || "Invalid promo code.");
      }
    } catch {
      setCouponError("Could not validate promo code. Please try again.");
    } finally {
      setCouponIsApplying(false);
    }
  };

  const handleRemoveCoupon = (code: string) => {
    setAppliedCoupons((prev) => prev.filter((c) => c.code !== code));
    setCouponError(null);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3 lg:sticky lg:top-24">
      <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">
        Order Summary
      </h2>

      {/* Bulk discount progress teaser */}
      {show_bulk_teaser && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5 dark:border-violet-500/20 dark:bg-violet-500/10">
          <svg
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
            />
          </svg>
          <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
            Add{" "}
            <span className="font-bold">
              {links_to_discount} more link
              {links_to_discount !== 1 ? "s" : ""}
            </span>{" "}
            to unlock <span className="font-bold">10% off</span> your link
            building services.
          </p>
        </div>
      )}

      {/* Bulk discount applied badge */}
      {show_bulk_applied_badge && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5 dark:border-violet-500/20 dark:bg-violet-500/10">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
            <svg
              className="h-3 w-3 text-violet-600 dark:text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
            10% bulk discount applied — {total_links}+ links ordered!
          </p>
        </div>
      )}

      {/* Items grouped by product type */}
      {grouped_items.length > 0 ? (
        <div className="mb-6 space-y-5">
          {grouped_items.map((group) => (
            <div key={group.product_type}>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.cart_item_id}>
                    <p className="mb-1.5 text-sm font-semibold text-gray-800 dark:text-white/90">
                      {item.tier_name}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              item.product_type,
                              item.tier_id,
                              item.tier_name,
                              item.unit_price,
                              item.quantity - 1
                            )
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-coral-400 hover:text-coral-500 dark:border-gray-600 dark:text-gray-400"
                          aria-label={`Decrease ${item.tier_name}`}
                        >
                          <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
                            <path
                              d="M1 1H7"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        <span className="min-w-[20px] text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              item.product_type,
                              item.tier_id,
                              item.tier_name,
                              item.unit_price,
                              item.quantity + 1
                            )
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-coral-400 hover:text-coral-500 dark:border-gray-600 dark:text-gray-400"
                          aria-label={`Increase ${item.tier_name}`}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                          >
                            <path
                              d="M5 1V9M1 5H9"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-white/80">
                        $
                        {(item.unit_price * item.quantity).toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">
          No items selected yet.
        </p>
      )}

      {/* Multi-coupon section */}
      {show_coupon_field && (
        <div className="mb-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/20">
              <svg
                className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 14.25l6-6m4.5-3.493V21.75l-4.125-1.5-4.125 1.5-4.125-1.5-4.125 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"
                />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Promo Codes
            </span>
            {applied_coupons.length > 0 && (
              <span className="ml-auto inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                {applied_coupons.length} active
              </span>
            )}
          </div>

          {cart_below_minimum && (
            <div className="mb-3 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
              <svg
                className="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
              <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                A minimum cart total of $
                {MINIMUM_CART_FOR_COUPON.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                is required to use promo codes.
              </p>
            </div>
          )}

          {applied_coupons.length > 0 && (
            <div className="mb-3 space-y-2">
              {applied_coupons.map((applied) => (
                <div
                  key={applied.code}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-linear-to-r from-emerald-50 via-teal-50/60 to-transparent px-3 py-2.5 dark:border-emerald-500/25 dark:from-emerald-500/10 dark:via-teal-500/5 dark:to-transparent"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                    <svg
                      className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold leading-tight text-emerald-800 dark:text-emerald-300">
                      {applied.coupon_name}
                    </p>
                    <p className="font-mono text-[10px] tracking-wider text-emerald-600/70 dark:text-emerald-500/60">
                      {applied.code}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      &minus;$
                      {applied.discount_amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <button
                      onClick={() => handleRemoveCoupon(applied.code)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-emerald-500/50 transition-colors hover:bg-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300"
                      aria-label={`Remove coupon ${applied.code}`}
                    >
                      <svg
                        className="h-2.5 w-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={coupon_input_code}
              onChange={(e) =>
                handleCouponCodeChange(e.target.value.toUpperCase())
              }
              placeholder="PROMO CODE"
              className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-mono uppercase tracking-widest bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-colors ${
                coupon_error
                  ? "border-red-300 dark:border-red-500/60 focus:ring-red-400/40"
                  : "border-gray-200 dark:border-gray-700/80 focus:ring-brand-500/40 focus:border-brand-400 dark:focus:border-brand-500"
              }`}
              onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
            />
            <button
              onClick={handleApplyCoupon}
              disabled={!coupon_input_code.trim() || coupon_is_applying}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {coupon_is_applying ? (
                <svg
                  className="h-3.5 w-3.5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <>
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  Add
                </>
              )}
            </button>
          </div>

          {coupon_error && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-500/10">
              <svg
                className="mt-0.5 h-3 w-3 shrink-0 text-red-500 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
                {coupon_error}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Subtotal / Discounts / Total */}
      <div className="mb-5 border-t border-gray-100 pt-4 dark:border-gray-800 space-y-2">
        {has_any_discount && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Subtotal
              </p>
              <p className="text-sm font-medium text-gray-700 dark:text-white/70">
                $
                {raw_subtotal.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {bulk_discount_amount > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  Bulk Discount (10% off links)
                </p>
                <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                  &minus;$
                  {bulk_discount_amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}

            {applied_coupons.length > 1
              ? applied_coupons.map((applied) => (
                  <div
                    key={applied.code}
                    className="flex items-center justify-between"
                  >
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-[60%]">
                      {applied.coupon_name}
                    </p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      &minus;$
                      {applied.discount_amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                ))
              : total_discount > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Coupon Discount
                    </p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      &minus;$
                      {total_discount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}

            {applied_coupons.length > 1 && (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 dark:bg-emerald-500/10">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Total Savings
                </p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  &minus;$
                  {total_discount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Total
          </p>
          <p className="text-xl font-bold text-gray-800 dark:text-white/90">
            $
            {total.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Action button */}
      {checkout_action ? (
        <div className="space-y-3">
          <button
            onClick={checkout_action.onSubmit}
            disabled={checkout_action.is_processing}
            className="group relative w-full overflow-hidden rounded-xl bg-coral-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-coral-500/20 transition-all hover:bg-coral-600 hover:shadow-coral-500/30 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none dark:disabled:bg-gray-700"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 60%)",
              }}
            />
            {checkout_action.is_processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Processing payment&hellip;
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
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
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                  />
                </svg>
                Complete Purchase
              </span>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            Secured &amp; encrypted by Stripe
          </div>
        </div>
      ) : (
        <button
          onClick={onAction}
          disabled={is_action_disabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
        >
          {action_label}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8H13M9 4L13 8L9 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default UnifiedCartSummary;
