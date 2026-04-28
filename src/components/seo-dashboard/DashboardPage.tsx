"use client";

import React, { useState, useEffect, useCallback } from "react";
import { dashboardService } from "@/services/client/dashboard.service";
import type { LinkBuildingOrderSummary } from "@/types/client/link-building";
import type { DashboardTableRow } from "@/services/client/dashboard.service";
import { useDebounce } from "@/hooks/useDebounce";
import { useCart } from "@/context/CartContext";
import ClientProfile from "./ClientProfile";
import OrderHistory from "./OrderHistory";
import NewsCard from "./NewsCard";
import ResourcesCard from "./ResourcesCard";
import OrderStatusTable from "./OrderStatusTable";
import DashboardStatsCards from "./DashboardStatsCards";
import SmeContentWidget from "./SmeContentWidget";
import DashboardProducts from "./DashboardProducts";

type DashboardTab = "overview" | "products";

const TABLE_PER_PAGE = 10;

export default function DashboardPage() {
  const [active_tab, setActiveTab] = useState<DashboardTab>("overview");
  const { item_count } = useCart();

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

      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              active_tab === "overview"
                ? "border-coral-500 text-coral-600 dark:text-coral-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
              />
            </svg>
            Overview
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              active_tab === "products"
                ? "border-coral-500 text-coral-600 dark:text-coral-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
              />
            </svg>
            Products
            {item_count > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">
                {item_count}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* ── Products tab ─────────────────────────────────────────────────────── */}
      {active_tab === "products" && <DashboardProducts />}

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {active_tab === "overview" && (
        <>

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
        </>
      )}
    </div>
  );
}
