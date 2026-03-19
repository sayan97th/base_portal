"use client";

import React from "react";

export interface OrderSummaryItem {
  id: string;
  label: string;
  quantity: number;
  unit_price: number;
}

export interface CouponState {
  code: string;
  discount_amount: number | null;
  coupon_name: string | null;
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
  coupon?: CouponState;
  onCouponCodeChange?: (code: string) => void;
  onApplyCoupon?: () => void;
  onRemoveCoupon?: () => void;
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
  coupon,
  onCouponCodeChange,
  onApplyCoupon,
  onRemoveCoupon,
  show_coupon_field = false,
  checkout_action,
}) => {
  const discount = coupon?.discount_amount ?? 0;
  const final_total = Math.max(0, total - discount);

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

      {/* Coupon Field */}
      {show_coupon_field && coupon && (
        <div className="mb-5">
          {coupon.discount_amount !== null ? (
            /* Applied coupon display */
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {coupon.coupon_name ?? coupon.code}
                  </p>
                  <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-500">
                    {coupon.code}
                  </p>
                </div>
              </div>
              <button
                onClick={onRemoveCoupon}
                className="ml-2 flex h-5 w-5 items-center justify-center rounded-full text-emerald-500 transition-colors hover:bg-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-500/20"
                aria-label="Remove coupon"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            /* Coupon input */
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Discount Coupon
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coupon.code}
                  onChange={(e) => onCouponCodeChange?.(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-mono uppercase tracking-widest bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
                    coupon.error
                      ? "border-red-300 dark:border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                  onKeyDown={(e) => e.key === "Enter" && onApplyCoupon?.()}
                />
                <button
                  onClick={onApplyCoupon}
                  disabled={!coupon.code.trim() || coupon.is_applying}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                >
                  {coupon.is_applying ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>
              {coupon.error && (
                <p className="mt-1 text-[11px] text-red-500">{coupon.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subtotal + Discount + Total */}
      <div className="mb-5 border-t border-gray-100 pt-4 dark:border-gray-800 space-y-2">
        {discount > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">Subtotal</p>
              <p className="text-sm font-medium text-gray-700 dark:text-white/70">
                ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Coupon Discount
              </p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                −${discount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white/90">
            ${final_total.toLocaleString("en-US", {
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
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing payment…
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1">
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                  Complete Purchase
                </span>
                <span className="font-mono text-xs font-bold opacity-75">
                  $
                  {checkout_action.total.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </span>
            )}
          </button>

          {/* Security note under the button */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Secured & encrypted by Stripe
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
