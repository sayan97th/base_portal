"use client";

import React, { useState, useEffect, useCallback } from "react";
import { dashboardService } from "@/services/client/dashboard.service";
import type { LinkBuildingOrderSummary } from "@/types/client/link-building";
import type { DashboardTableRow } from "@/services/client/dashboard.service";
import { useDebounce } from "@/hooks/useDebounce";
import ClientProfile from "./ClientProfile";
import OrderHistory from "./OrderHistory";
import NewsCard from "./NewsCard";
import ResourcesCard from "./ResourcesCard";
import OrderStatusTable from "./OrderStatusTable";
import DashboardStatsCards from "./DashboardStatsCards";
import SmeContentWidget from "./SmeContentWidget";

const TABLE_PER_PAGE = 10;

export default function DashboardPage() {
  // ── Summary data (stats + order history cards) ─────────────────────────────
  const [orders, setOrders] = useState<LinkBuildingOrderSummary[]>([]);
  const [is_loading_summary, setIsLoadingSummary] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Table data (server-side paginated placements) ──────────────────────────
  const [table_rows, setTableRows] = useState<DashboardTableRow[]>([]);
  const [is_loading_table, setIsLoadingTable] = useState(true);
  const [table_search, setTableSearch] = useState("");
  const [table_page, setTablePage] = useState(1);
  const [table_last_page, setTableLastPage] = useState(1);
  const [table_total, setTableTotal] = useState(0);

  // Debounce search — avoids hitting the API on every keystroke
  const debounced_search = useDebounce(table_search, 400);

  // ── Load summary orders (used by stats + order history) ────────────────────
  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const data = await dashboardService.fetchOrders();
      setOrders(data);
    } catch {
      setError("Unable to load order data. Please refresh the page.");
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // ── Load paginated table rows ───────────────────────────────────────────────
  const loadTableData = useCallback(async () => {
    setIsLoadingTable(true);
    try {
      const result = await dashboardService.fetchPaginatedTableRows({
        page: table_page,
        per_page: TABLE_PER_PAGE,
        search: debounced_search || undefined,
      });
      setTableRows(result.data);
      setTableLastPage(result.last_page);
      setTableTotal(result.total);
    } catch {
      // Table shows empty state gracefully
      setTableRows([]);
    } finally {
      setIsLoadingTable(false);
    }
  }, [table_page, debounced_search]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRetry = () => {
    setError(null);
    loadSummary();
    loadTableData();
  };

  /** Search change: update the input and immediately reset to page 1. */
  const handleSearchChange = (value: string) => {
    setTableSearch(value);
    setTablePage(1);
  };

  return (
    <div className="space-y-6">
      {/* Client Profile Header */}
      <ClientProfile />

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0"
          >
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 5v3.5M8 10.5v.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {error}
          <button
            onClick={handleRetry}
            className="ml-auto font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <DashboardStatsCards orders={orders} is_loading={is_loading_summary} />

      {/* Mid Row: Order History + News + Resources */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-5">
          <OrderHistory orders={orders} is_loading={is_loading_summary} />
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

      {/* Full-Width Order Status Table (server-side paginated) */}
      <OrderStatusTable
        rows={table_rows}
        is_loading={is_loading_table}
        current_page={table_page}
        last_page={table_last_page}
        total={table_total}
        per_page={TABLE_PER_PAGE}
        search_term={table_search}
        onSearchChange={handleSearchChange}
        onPageChange={setTablePage}
      />
    </div>
  );
}
