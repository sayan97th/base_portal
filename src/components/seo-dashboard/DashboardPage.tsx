"use client";

import React, { useState, useEffect, useCallback } from "react";
import { dashboardService } from "@/services/client/dashboard.service";
import type { LinkBuildingOrderSummary } from "@/types/client/link-building";
import ClientProfile from "./ClientProfile";
import OrderHistory from "./OrderHistory";
import NewsCard from "./NewsCard";
import ResourcesCard from "./ResourcesCard";
import OrderStatusTable from "./OrderStatusTable";
import DashboardStatsCards from "./DashboardStatsCards";
import SmeContentWidget from "./SmeContentWidget";

export default function DashboardPage() {
  const [orders, setOrders] = useState<LinkBuildingOrderSummary[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dashboardService.fetchOrders();
      setOrders(data);
    } catch {
      setError("Unable to load order data. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-6">
      {/* Client Profile Header */}
      <ClientProfile />

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
          <button
            onClick={fetchOrders}
            className="ml-auto font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <DashboardStatsCards orders={orders} is_loading={is_loading} />

      {/* Mid Row: Order History + News + Resources */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-5">
          <OrderHistory orders={orders} is_loading={is_loading} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <NewsCard />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <ResourcesCard />
        </div>
      </div>

      {/* SME Content Services Widget */}
      <SmeContentWidget />

      {/* Full-Width Order Status Table */}
      <OrderStatusTable orders={orders} is_loading={is_loading} />
    </div>
  );
}
