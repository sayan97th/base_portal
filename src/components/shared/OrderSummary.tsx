"use client";

import React, { useState, useMemo, useCallback } from "react";

export interface SummaryItem {
  id: string;
  label: string;
  quantity: number;
  unit_price: number;
}

interface CouponData {
  code: string;
  discount_percent: number;
  label: string;
}

interface OrderSummaryProps {
  selected_items: SummaryItem[];
  total: number;
  on_coupon_applied?: (
    coupon_code: string | null,
    discount_amount: number
  ) => void;
}

// Coupon registry — easy to extend or swap for an API call later
const VALID_COUPONS: CouponData[] = [
  { code: "10TEST", discount_percent: 10, label: "10% Off (Test)" },
];

const MAX_COUPON_LENGTH = 20;
const ALPHANUMERIC_REGEX = /^[A-Z0-9]+$/;

const formatPrice = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

const OrderSummary: React.FC<OrderSummaryProps> = ({
  selected_items,
  total,
  on_coupon_applied,
}) => {
  const [is_coupon_open, setIsCouponOpen] = useState(false);
  const [coupon_input, setCouponInput] = useState("");
  const [applied_coupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [coupon_error, setCouponError] = useState("");
  const [is_validating, setIsValidating] = useState(false);
  const [shake_error, setShakeError] = useState(false);

  const discount_amount = useMemo(() => {
    if (!applied_coupon) return 0;
    return total * (applied_coupon.discount_percent / 100);
  }, [applied_coupon, total]);

  const final_total = useMemo(() => {
    return total - discount_amount;
  }, [total, discount_amount]);

  const triggerShake = useCallback(() => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
  }, []);

  const validateCouponInput = useCallback((value: string): string | null => {
    if (!value.trim()) {
      return "Please enter a coupon code.";
    }

    if (value.length > MAX_COUPON_LENGTH) {
      return `Coupon code must be ${MAX_COUPON_LENGTH} characters or less.`;
    }

    if (!ALPHANUMERIC_REGEX.test(value)) {
      return "Coupon code can only contain letters and numbers.";
    }

    return null;
  }, []);

  const applyCoupon = useCallback(() => {
    const normalized_code = coupon_input.trim().toUpperCase();
    const validation_error = validateCouponInput(normalized_code);

    if (validation_error) {
      setCouponError(validation_error);
      triggerShake();
      return;
    }

    // Simulate brief validation delay for UX
    setIsValidating(true);
    setCouponError("");

    setTimeout(() => {
      const found_coupon = VALID_COUPONS.find(
        (c) => c.code === normalized_code
      );

      if (!found_coupon) {
        setCouponError("Invalid coupon code. Please try again.");
        setIsValidating(false);
        triggerShake();
        return;
      }

      setAppliedCoupon(found_coupon);
      setCouponInput("");
      setCouponError("");
      setIsValidating(false);

      if (on_coupon_applied) {
        const new_discount = total * (found_coupon.discount_percent / 100);
        on_coupon_applied(found_coupon.code, new_discount);
      }
    }, 600);
  }, [coupon_input, validateCouponInput, triggerShake, on_coupon_applied, total]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");

    if (on_coupon_applied) {
      on_coupon_applied(null, 0);
    }
  }, [on_coupon_applied]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw_value = e.target.value.toUpperCase();
      if (raw_value.length <= MAX_COUPON_LENGTH) {
        setCouponInput(raw_value);
        if (coupon_error) setCouponError("");
      }
    },
    [coupon_error]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyCoupon();
      }
    },
    [applyCoupon]
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:sticky lg:top-24">
      <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Summary
      </h2>

      {/* Selected Items Breakdown */}
      {selected_items.length > 0 && (
        <div className="mb-5 space-y-4">
          {selected_items.map((item) => (
            <div key={item.id} className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Qty {item.quantity}
                </p>
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {formatPrice(item.unit_price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Coupon Section */}
      <div className="mb-5">
        {!applied_coupon ? (
          <>
            {/* Toggle Link */}
            <button
              type="button"
              onClick={() => setIsCouponOpen((prev) => !prev)}
              className="mb-3 flex items-center gap-1.5 text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`transition-transform duration-200 ${is_coupon_open ? "rotate-90" : ""}`}
              >
                <path
                  d="M6 4L10 8L6 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Have a coupon?
            </button>

            {/* Collapsible Input */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                is_coupon_open
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div
                  className={`flex gap-2 ${shake_error ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={coupon_input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter code"
                      maxLength={MAX_COUPON_LENGTH}
                      disabled={is_validating}
                      className={`h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm uppercase tracking-wider text-gray-800 shadow-theme-xs placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:outline-hidden focus:ring-3 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
                        coupon_error
                          ? "border-red-400 focus:border-red-400 focus:ring-red-500/10 dark:border-red-500"
                          : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800"
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={is_validating || !coupon_input.trim()}
                    className="h-11 shrink-0 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white shadow-theme-xs transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {is_validating ? (
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="opacity-25"
                        />
                        <path
                          d="M4 12a8 8 0 018-8"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          className="opacity-75"
                        />
                      </svg>
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>

                {/* Error Message */}
                {coupon_error && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M7 4.5V7.5M7 9.5H7.005M13 7C13 10.3137 10.3137 13 7 13C3.68629 13 1 10.3137 1 7C1 3.68629 3.68629 1 7 1C10.3137 1 13 3.68629 13 7Z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {coupon_error}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Applied Coupon Badge */
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800/50 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                className="text-green-500"
              >
                <path
                  d="M6 9L8 11L12 7M17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  {applied_coupon.code}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {applied_coupon.label}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeCoupon}
              className="flex h-6 w-6 items-center justify-center rounded-full text-green-400 transition-colors hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-800/50 dark:hover:text-green-300"
              aria-label="Remove coupon"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Discount Line */}
      {applied_coupon && discount_amount > 0 && (
        <div className="mb-4 flex items-center justify-between border-t border-dashed border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            Discount ({applied_coupon.discount_percent}%)
          </p>
          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
            -{formatPrice(discount_amount)}
          </p>
        </div>
      )}

      {/* Total */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Total
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">USD</p>
        </div>
        <div className="text-right">
          {applied_coupon && (
            <p className="text-sm text-gray-400 line-through dark:text-gray-500">
              {formatPrice(total)}
            </p>
          )}
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {formatPrice(final_total)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
