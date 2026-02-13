"use client";
import React from "react";
import ProgressBar from "./ProgressBar";

interface OrderMonth {
  month: string;
  orderQuantity: string;
  spend: string;
  completion: number;
  isComplete: boolean;
  isPending: boolean;
}

const orderData: OrderMonth[] = [
  {
    month: "March 2026",
    orderQuantity: "—",
    spend: "—",
    completion: 0,
    isComplete: false,
    isPending: true,
  },
  {
    month: "February 2026",
    orderQuantity: "50 Links",
    spend: "$20,000",
    completion: 60,
    isComplete: false,
    isPending: false,
  },
  {
    month: "January 2026",
    orderQuantity: "50 Links",
    spend: "$20,000",
    completion: 100,
    isComplete: true,
    isPending: false,
  },
];

export default function OrderHistory() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Order History
        </h3>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="10" cy="16" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Column Headers */}
      <div className="mb-3 grid grid-cols-12 gap-2 text-xs font-medium uppercase text-gray-400">
        <div className="col-span-4">Monthly View</div>
        <div className="col-span-2 text-center">Order Quantity</div>
        <div className="col-span-2 text-center">Spend</div>
        <div className="col-span-4 text-center">Completion</div>
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {orderData.map((row) => (
          <div
            key={row.month}
            className="grid grid-cols-12 items-center gap-2"
          >
            <div className="col-span-4 flex items-center gap-2">
              {row.isComplete && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-500 text-white">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6L5 8.5L9.5 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
              {!row.isComplete && !row.isPending && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-coral-400">
                  <span className="h-2 w-2 rounded-full bg-coral-400" />
                </span>
              )}
              {row.isPending && (
                <span className="h-5 w-5" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {row.month}
              </span>
            </div>
            <div className="col-span-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {row.orderQuantity}
            </div>
            <div className="col-span-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {row.spend}
            </div>
            <div className="col-span-4 flex items-center gap-2">
              {row.isPending ? (
                <button className="w-full rounded-lg bg-coral-500 px-4 py-2 text-xs font-semibold uppercase text-white hover:bg-coral-600">
                  Start Order
                </button>
              ) : (
                <>
                  <ProgressBar
                    value={row.completion}
                    color={
                      row.isComplete ? "bg-success-500" : "bg-coral-500"
                    }
                  />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {row.completion}%
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
