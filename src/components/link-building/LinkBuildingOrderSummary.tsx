"use client";

import React from "react";

export interface OrderSummaryItem {
  id: string;
  label: string;
  quantity: number;
  unit_price: number;
}

export interface AppliedCouponItem {
  coupon_id: string;
  code: string;
  coupon_name: string;
  discount_amount: number;
  discount_type: string;
  discount_value: number;
}

export interface MultiCouponState {
  input_code: string;
  applied_coupons: AppliedCouponItem[];
  error: string | null;
  is_applying: boolean;
}

/** When provided, replaces the regular action button with a styled
 *  "Complete Purchase" CTA that lives inside the order summary. */
export interface CheckoutAction {
  total: number;
  is_processing: boolean;
  onSubmit: () => void;
}

interface LinkBuildingOrderSummaryProps {
  selected_items: OrderSummaryItem[];
  total: number;
  action_label: string;
  onAction: () => void;
  is_action_disabled?: boolean;
  onQuantityChange?: (item_id: string, quantity: number) => void;
  coupon_state?: MultiCouponState;
  onCouponCodeChange?: (code: string) => void;
  onApplyCoupon?: () => void;
  onRemoveCoupon?: (code: string) => void;
  show_coupon_field?: boolean;
  checkout_action?: CheckoutAction;
}

const LinkBuildingOrderSummary: React.FC<LinkBuildingOrderSummaryProps> = ({
  selected_items,
  total,
  action_label,
  onAction,
  is_action_disabled = false,
  onQuantityChange,
  coupon_state,
  onCouponCodeChange,
  onApplyCoupon,
  onRemoveCoupon,
  show_coupon_field = false,
  checkout_action,
}) => {
  const total_discount =
    coupon_state?.applied_coupons.reduce((sum, c) => sum + c.discount_amount, 0) ?? 0;
  const final_total = Math.max(0, total - total_discount);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3 lg:sticky lg:top-24">
      <h2 className="mb-5 text-base font-semibold text-gray-800 dark:text-white/90">
        Order Summary
      </h2>

      {selected_items.length > 0 ? (
        <div className="mb-6 space-y-4">
          {selected_items.map((item) => (
            <div key={item.id}>
              <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
                {item.label}
              </p>
              <div className="flex items-center justify-between">
                {onQuantityChange ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onQuantityChange(item.id, item.quantity - 1)
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-coral-400 hover:text-coral-500 dark:border-gray-600 dark:text-gray-400"
                      aria-label={`Decrease ${item.label}`}
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
                        onQuantityChange(item.id, item.quantity + 1)
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-coral-400 hover:text-coral-500 dark:border-gray-600 dark:text-gray-400"
                      aria-label={`Increase ${item.label}`}
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
                ) : (
                  <span className="text-sm text-gray-500">
                    ×{item.quantity}
                  </span>
                )}
                <p className="text-sm font-medium text-gray-700 dark:text-white/80">
                  ${(item.unit_price * item.quantity).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">
          No items selected yet.
        </p>
      )}

      {/* ── Multi-Coupon Section ── */}
      {show_coupon_field && coupon_state && (
        <div className="mb-5">
          {/* Section header */}
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
            {coupon_state.applied_coupons.length > 0 && (
              <span className="ml-auto inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                {coupon_state.applied_coupons.length}{" "}
                {coupon_state.applied_coupons.length === 1 ? "active" : "active"}
              </span>
            )}
          </div>

          {/* Applied coupons list */}
          {coupon_state.applied_coupons.length > 0 && (
            <div className="mb-3 space-y-2">
              {coupon_state.applied_coupons.map((applied) => (
                <div
                  key={applied.code}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-linear-to-r from-emerald-50 via-teal-50/60 to-transparent px-3 py-2.5 dark:border-emerald-500/25 dark:from-emerald-500/10 dark:via-teal-500/5 dark:to-transparent"
                >
                  {/* Check badge */}
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

                  {/* Coupon info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold leading-tight text-emerald-800 dark:text-emerald-300">
                      {applied.coupon_name}
                    </p>
                    <p className="font-mono text-[10px] tracking-wider text-emerald-600/70 dark:text-emerald-500/60">
                      {applied.code}
                    </p>
                  </div>

                  {/* Discount + Remove */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      &minus;$
                      {applied.discount_amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <button
                      onClick={() => onRemoveCoupon?.(applied.code)}
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

          {/* Input row */}
          <div className="flex gap-2">
            <input
              type="text"
              value={coupon_state.input_code}
              onChange={(e) =>
                onCouponCodeChange?.(e.target.value.toUpperCase())
              }
              placeholder="PROMO CODE"
              className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-mono uppercase tracking-widest bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-colors ${
                coupon_state.error
                  ? "border-red-300 dark:border-red-500/60 focus:ring-red-400/40"
                  : "border-gray-200 dark:border-gray-700/80 focus:ring-brand-500/40 focus:border-brand-400 dark:focus:border-brand-500"
              }`}
              onKeyDown={(e) => e.key === "Enter" && onApplyCoupon?.()}
            />
            <button
              onClick={onApplyCoupon}
              disabled={
                !coupon_state.input_code.trim() || coupon_state.is_applying
              }
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {coupon_state.is_applying ? (
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

          {/* Error message */}
          {coupon_state.error && (
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
                {coupon_state.error}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Subtotal / Discounts / Total ── */}
      <div className="mb-5 border-t border-gray-100 pt-4 dark:border-gray-800 space-y-2">
        {total_discount > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Subtotal
              </p>
              <p className="text-sm font-medium text-gray-700 dark:text-white/70">
                $
                {total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {/* Per-coupon breakdown */}
            {coupon_state && coupon_state.applied_coupons.length > 1
              ? coupon_state.applied_coupons.map((applied) => (
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
              : (
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

            {/* Total savings pill when multiple coupons */}
            {coupon_state && coupon_state.applied_coupons.length > 1 && (
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
            {final_total.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* ── Checkout action: Complete Purchase ── */}
      {checkout_action ? (
        <div className="space-y-3">
          <button
            onClick={checkout_action.onSubmit}
            disabled={checkout_action.is_processing}
            className="group relative w-full overflow-hidden rounded-xl bg-coral-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-coral-500/20 transition-all hover:bg-coral-600 hover:shadow-coral-500/30 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none dark:disabled:bg-gray-700"
          >
            {/* Sheen on hover */}
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
              <span className="flex flex-col items-center gap-1">
                <span className="flex items-center gap-2">
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
              </span>
            )}
          </button>

          {/* Security note */}
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
        /* Regular step action button */
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

export default LinkBuildingOrderSummary;
