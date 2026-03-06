"use client";

import React from "react";

export interface OrderSummaryItem {
  id: string;
  label: string;
  quantity: number;
  unit_price: number;
}

interface LinkBuildingOrderSummaryProps {
  selected_items: OrderSummaryItem[];
  total: number;
  action_label: string;
  onAction: () => void;
  is_action_disabled?: boolean;
  onQuantityChange?: (item_id: string, quantity: number) => void;
}

const LinkBuildingOrderSummary: React.FC<LinkBuildingOrderSummaryProps> = ({
  selected_items,
  total,
  action_label,
  onAction,
  is_action_disabled = false,
  onQuantityChange,
}) => {
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

      {/* Total */}
      <div className="mb-5 border-t border-gray-100 pt-4 dark:border-gray-800">
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

      {/* Action Button */}
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
    </div>
  );
};

export default LinkBuildingOrderSummary;
