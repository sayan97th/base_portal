"use client";
import React from "react";
import Link from "next/link";
import ProgressBar from "./ProgressBar";
import type { LinkBuildingOrderSummary } from "@/types/client/link-building";
import { getMonthlyBreakdown } from "@/services/client/dashboard.service";

interface Props {
  orders: LinkBuildingOrderSummary[];
  is_loading: boolean;
}

function RowSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-12 items-center gap-2">
      <div className="col-span-4 h-4 rounded bg-gray-100 dark:bg-gray-800" />
      <div className="col-span-2 h-4 rounded bg-gray-100 dark:bg-gray-800" />
      <div className="col-span-2 h-4 rounded bg-gray-100 dark:bg-gray-800" />
      <div className="col-span-4 h-4 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

export default function OrderHistory({ orders, is_loading }: Props) {
  const monthly_data = getMonthlyBreakdown(orders, 3);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Order History
        </h3>
        <Link
          href="/orders"
          className="text-sm font-medium text-coral-500 hover:text-coral-600"
        >
          View All
        </Link>
      </div>

      {/* Column Headers */}
      <div className="mb-3 grid grid-cols-12 gap-2 text-xs font-medium uppercase text-gray-400">
        <div className="col-span-4">Monthly View</div>
        <div className="col-span-2 text-center">Orders</div>
        <div className="col-span-2 text-center">Spend</div>
        <div className="col-span-4 text-center">Completion</div>
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {is_loading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : (
          monthly_data.map((row) => (
            <div
              key={row.month_key}
              className="grid grid-cols-12 items-center gap-2"
            >
              {/* Month label + status indicator */}
              <div className="col-span-4 flex items-center gap-2">
                {row.is_complete && (
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
                {!row.is_complete && !row.has_no_orders && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-coral-400">
                    <span className="h-2 w-2 rounded-full bg-coral-400" />
                  </span>
                )}
                {row.has_no_orders && <span className="h-5 w-5" />}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {row.month}
                </span>
              </div>

              {/* Order count */}
              <div className="col-span-2 text-center text-sm text-gray-600 dark:text-gray-400">
                {row.order_count > 0
                  ? `${row.order_count} Order${row.order_count !== 1 ? "s" : ""}`
                  : "—"}
              </div>

              {/* Spend */}
              <div className="col-span-2 text-center text-sm text-gray-600 dark:text-gray-400">
                {row.total_spend > 0
                  ? `$${row.total_spend.toLocaleString()}`
                  : "—"}
              </div>

              {/* Completion or Start Order CTA */}
              <div className="col-span-4 flex items-center gap-2">
                {row.has_no_orders ? (
                  <Link
                    href="/link-building"
                    className="w-full rounded-lg bg-coral-500 px-4 py-2 text-center text-xs font-semibold uppercase text-white hover:bg-coral-600"
                  >
                    Start Order
                  </Link>
                ) : (
                  <>
                    <ProgressBar
                      value={row.completion_rate}
                      color={
                        row.is_complete ? "bg-success-500" : "bg-coral-500"
                      }
                    />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {row.completion_rate}%
                    </span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
