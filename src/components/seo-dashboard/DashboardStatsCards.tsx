"use client";
import React from "react";
import type { LinkBuildingOrderSummary } from "@/types/client/link-building";
import { computeStats } from "@/services/client/dashboard.service";

interface Props {
  orders: LinkBuildingOrderSummary[];
  is_loading: boolean;
}

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-3 h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" />
      <div className="h-8 w-16 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

const stat_icons = {
  orders: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M3 5h14M3 10h14M3 15h7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  spend: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6v8M7.5 8.5C7.5 7.4 8.6 7 10 7s2.5.6 2.5 1.5c0 1-1 1.4-2.5 1.5-1.5.1-2.5.7-2.5 1.5C7.5 12.5 8.6 13 10 13s2.5-.5 2.5-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  active: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6v4l3 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  completed: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 10l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default function DashboardStatsCards({ orders, is_loading }: Props) {
  if (is_loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    );
  }

  const stats = computeStats(orders);

  const cards = [
    {
      key: "orders",
      label: "Total Orders",
      value: stats.total_orders.toLocaleString(),
      icon: stat_icons.orders,
      icon_bg: "bg-blue-light-100 dark:bg-blue-light-500/20",
      icon_color: "text-blue-light-500",
      trend: null,
    },
    {
      key: "spend",
      label: "Total Spend",
      value: `$${stats.total_spend.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      icon: stat_icons.spend,
      icon_bg: "bg-success-100 dark:bg-success-500/20",
      icon_color: "text-success-500",
      trend: null,
    },
    {
      key: "active",
      label: "Active Orders",
      value: stats.active_orders.toLocaleString(),
      icon: stat_icons.active,
      icon_bg: "bg-warning-100 dark:bg-warning-500/20",
      icon_color: "text-warning-500",
      trend:
        stats.active_orders > 0
          ? { label: "In progress", color: "text-warning-500" }
          : null,
    },
    {
      key: "completed",
      label: "Completed",
      value: stats.completed_orders.toLocaleString(),
      icon: stat_icons.completed,
      icon_bg: "bg-coral-50 dark:bg-coral-500/10",
      icon_color: "text-coral-500",
      trend:
        stats.total_orders > 0
          ? {
              label: `${Math.round(
                (stats.completed_orders / stats.total_orders) * 100
              )}% completion rate`,
              color: "text-success-500",
            }
          : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">
                {card.value}
              </p>
              {card.trend && (
                <p className={`mt-1 text-xs font-medium ${card.trend.color}`}>
                  {card.trend.label}
                </p>
              )}
            </div>
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.icon_bg} ${card.icon_color}`}
            >
              {card.icon}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
