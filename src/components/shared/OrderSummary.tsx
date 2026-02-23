import React from "react";

export interface SummaryItem {
  id: string;
  label: string;
  quantity: number;
  unit_price: number;
}

interface OrderSummaryProps {
  selected_items: SummaryItem[];
  total: number;
  coupon_code: string;
  onCouponChange: (code: string) => void;
}

const formatPrice = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

const OrderSummary: React.FC<OrderSummaryProps> = ({
  selected_items,
  total,
  coupon_code,
  onCouponChange,
}) => {
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

      {/* Coupon Input */}
      <div className="mb-5">
        <input
          type="text"
          value={coupon_code}
          onChange={(e) => onCouponChange(e.target.value)}
          placeholder="Have a coupon?"
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
      </div>

      {/* Total */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">USD</p>
        </div>
        <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
          {formatPrice(total)}
        </p>
      </div>
    </div>
  );
};

export default OrderSummary;
