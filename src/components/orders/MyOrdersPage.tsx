"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge/Badge";
import { linkBuildingService } from "@/services/client/link-building.service";
import { newContentService } from "@/services/client/new-content.service";
import { contentOptimizationService } from "@/services/client/content-optimization.service";
import { contentBriefsService } from "@/services/client/content-briefs.service";
import { findSessionByOrderId } from "@/lib/checkout-session";
import { useDebounce } from "@/hooks/useDebounce";
import type { CartProductType } from "@/types/client/unified-cart";

// ─── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus = "pending" | "processing" | "completed" | "cancelled";
type FilterTab = "all" | CartProductType;

interface UnifiedOrder {
  id: string;
  product_type: CartProductType;
  label: string;
  total_amount: number;
  status: string;
  created_at: string;
  items_count: number;
  updates_count?: number;
  last_update_at?: string | null;
}

interface OrderGroup {
  group_id: string;
  session_id: string | null;
  session_title: string | null;
  created_at: string;
  total_amount: number;
  orders: UnifiedOrder[];
  is_session: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const filter_tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "link_building", label: "Link Building" },
  { key: "new_content", label: "New Content" },
  { key: "content_optimization", label: "Content Optimization" },
  { key: "content_brief", label: "Content Briefs" },
];

const PRODUCT_TYPE_CONFIG: Record<
  CartProductType,
  { label: string; color: string; bg: string; border: string }
> = {
  link_building: {
    label: "Link Building",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-500/20",
    border: "border-violet-200 dark:border-violet-500/30",
  },
  new_content: {
    label: "New Content",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-100 dark:bg-blue-500/20",
    border: "border-blue-200 dark:border-blue-500/30",
  },
  content_optimization: {
    label: "Content Optimization",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-100 dark:bg-emerald-500/20",
    border: "border-emerald-200 dark:border-emerald-500/30",
  },
  content_brief: {
    label: "Content Briefs",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-500/20",
    border: "border-amber-200 dark:border-amber-500/30",
  },
};

const PER_PAGE = 10;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function buildPageButtons(current: number, last: number): (number | "...")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(last - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < last - 2) pages.push("...");
  pages.push(last);
  return pages;
}

function getStatusConfig(status: string): {
  color: "warning" | "info" | "success" | "error";
  label: string;
  dot: string;
} {
  switch (status as OrderStatus) {
    case "pending":
      return { color: "warning", label: "Pending", dot: "bg-warning-500" };
    case "processing":
      return { color: "info", label: "Processing", dot: "bg-blue-light-500" };
    case "completed":
      return { color: "success", label: "Completed", dot: "bg-success-500" };
    case "cancelled":
      return { color: "error", label: "Cancelled", dot: "bg-error-500" };
    default:
      return { color: "info", label: status, dot: "bg-gray-400" };
  }
}

function getGroupOverallStatus(orders: UnifiedOrder[]): string {
  const priority: OrderStatus[] = ["processing", "pending", "cancelled", "completed"];
  for (const s of priority) {
    if (orders.some((o) => o.status === s)) return s;
  }
  return orders[0]?.status ?? "pending";
}

function getDetailLink(order: UnifiedOrder): string {
  const session = findSessionByOrderId(order.id);
  if (session) return `/orders/session/${session.session_id}`;
  switch (order.product_type) {
    case "link_building":
      return `/link-building/orders/${order.id}`;
    default:
      return `/orders/${order.id}?type=${order.product_type}`;
  }
}

function getTrackingLink(order: UnifiedOrder): string | null {
  return order.product_type === "link_building"
    ? `/link-building/orders/${order.id}/tracking`
    : null;
}

function getReportLink(order: UnifiedOrder): string | null {
  return order.product_type === "link_building"
    ? `/link-building/orders/${order.id}/report`
    : null;
}

function groupOrdersBySession(orders: UnifiedOrder[]): OrderGroup[] {
  const session_map = new Map<string, OrderGroup>();
  const ungrouped: OrderGroup[] = [];

  for (const order of orders) {
    const session = findSessionByOrderId(order.id);
    if (session) {
      if (session_map.has(session.session_id)) {
        const group = session_map.get(session.session_id)!;
        if (!group.orders.find((o) => o.id === order.id)) {
          group.orders.push(order);
          group.total_amount += order.total_amount;
        }
      } else {
        session_map.set(session.session_id, {
          group_id: session.session_id,
          session_id: session.session_id,
          session_title: session.order_title,
          created_at: session.created_at,
          total_amount: order.total_amount,
          orders: [order],
          is_session: false,
        });
      }
    } else {
      ungrouped.push({
        group_id: order.id,
        session_id: null,
        session_title: null,
        created_at: order.created_at,
        total_amount: order.total_amount,
        orders: [order],
        is_session: false,
      });
    }
  }

  const session_groups = [...session_map.values()].map((g) => ({
    ...g,
    is_session: g.orders.length > 1,
  }));

  const all_groups = [...session_groups, ...ungrouped];
  all_groups.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return all_groups;
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

const CartIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const BoltIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const ReportIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ChevronDownIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const UpdateIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function GroupSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-3.5 dark:bg-gray-800/50">
            <div className="h-8 w-8 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-56 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-3.5 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: i === 0 ? 3 : 1 }).map((__, j) => (
              <div key={j} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-5 w-24 rounded-md bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-48 rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-14 rounded-lg bg-gray-100 dark:bg-gray-800" />
                  <div className="h-6 w-12 rounded-lg bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Order item row ─────────────────────────────────────────────────────────────

interface OrderItemRowProps {
  order: UnifiedOrder;
  is_last: boolean;
  compact?: boolean;
}

function OrderItemRow({ order, is_last, compact = false }: OrderItemRowProps) {
  const status_config = getStatusConfig(order.status);
  const is_active = order.status === "pending" || order.status === "processing";
  const has_updates = (order.updates_count ?? 0) > 0;
  const type_config = PRODUCT_TYPE_CONFIG[order.product_type];
  const tracking_link = getTrackingLink(order);
  const report_link = getReportLink(order);
  const detail_link = getDetailLink(order);

  return (
    <div
      className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
        !is_last ? "border-b border-gray-100 dark:border-gray-700/60" : ""
      } ${compact ? "bg-gray-50/50 dark:bg-white/1" : ""}`}
    >
      {/* Left: product type + label + meta */}
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        {/* Active pulse dot */}
        {is_active && (
          <div className="relative mt-1.5 flex h-2 w-2 shrink-0 sm:mt-0">
            {order.status === "processing" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                order.status === "processing" ? "bg-blue-500" : "bg-warning-500"
              }`}
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${type_config.bg} ${type_config.color} ${type_config.border}`}
            >
              {type_config.label}
            </span>
            <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
              {order.label}
            </p>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {order.items_count} {order.items_count === 1 ? "item" : "items"}
            </span>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {formatCurrency(order.total_amount)}
            </span>
            {has_updates && order.last_update_at && (
              <>
                <span className="text-gray-200 dark:text-gray-700">·</span>
                <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 dark:text-gray-500">
                  <UpdateIcon />
                  {order.updates_count} update{order.updates_count !== 1 ? "s" : ""}
                  <span className="ml-0.5 text-gray-300 dark:text-gray-600">
                    {formatRelativeTime(order.last_update_at)}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: status badge + actions */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge
          variant="light"
          size="sm"
          color={status_config.color}
          startIcon={
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${status_config.dot}`} />
          }
        >
          {status_config.label}
        </Badge>

        <div className="flex items-center gap-1.5">
          {tracking_link && order.status !== "cancelled" && (
            <Link
              href={tracking_link}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                is_active
                  ? "bg-brand-500 text-white hover:bg-brand-600"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <BoltIcon />
              Track
            </Link>
          )}
          {report_link && (
            <Link
              href={report_link}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ReportIcon />
              Report
            </Link>
          )}
          <Link
            href={detail_link}
            className="inline-flex items-center gap-1 rounded-lg border border-coral-200 bg-coral-50 px-2.5 py-1 text-xs font-medium text-coral-600 transition-colors hover:bg-coral-500 hover:text-white dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-400 dark:hover:bg-coral-500 dark:hover:text-white"
          >
            <EyeIcon />
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Order group card ───────────────────────────────────────────────────────────

function OrderGroupCard({ group }: { group: OrderGroup }) {
  const [is_expanded, setIsExpanded] = useState(true);

  if (!group.is_session) {
    const order = group.orders[0];
    const type_config = PRODUCT_TYPE_CONFIG[order.product_type];
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div
          className={`flex items-center gap-2 border-b px-4 py-2 ${type_config.border} ${type_config.bg}`}
        >
          <span className={`text-[10px] font-semibold ${type_config.color}`}>
            {type_config.label}
          </span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(order.created_at)}
          </span>
        </div>
        <OrderItemRow order={order} is_last={true} compact={false} />
      </div>
    );
  }

  // Multi-product session group
  const overall_status = getGroupOverallStatus(group.orders);
  const status_config = getStatusConfig(overall_status);
  const total_items = group.orders.reduce((sum, o) => sum + o.items_count, 0);
  const unique_types = [...new Set(group.orders.map((o) => o.product_type))];

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm dark:border-brand-500/25 dark:bg-white/3">
      {/* Session header — clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full bg-linear-to-r from-brand-50 via-brand-50/60 to-transparent px-4 py-3.5 text-left transition-colors hover:from-brand-100 dark:from-brand-500/10 dark:via-brand-500/5 dark:to-transparent dark:hover:from-brand-500/15"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: icon + meta */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
              <CartIcon />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                  {group.session_title ?? "Multi-Product Purchase"}
                </span>
                <Badge
                  variant="light"
                  size="sm"
                  color={status_config.color}
                  startIcon={
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${status_config.dot}`}
                    />
                  }
                >
                  {status_config.label}
                </Badge>
              </div>

              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(group.created_at)}
                </span>
                <span className="text-gray-200 dark:text-gray-700">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {group.orders.length} services
                </span>
                <span className="text-gray-200 dark:text-gray-700">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {total_items} {total_items === 1 ? "item" : "items"}
                </span>
                <span className="text-gray-200 dark:text-gray-700">·</span>
                <div className="flex flex-wrap items-center gap-1">
                  {unique_types.map((pt) => {
                    const cfg = PRODUCT_TYPE_CONFIG[pt];
                    return (
                      <span
                        key={pt}
                        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
                      >
                        {cfg.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right: total + chevron */}
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-bold text-gray-800 dark:text-white/90">
              {formatCurrency(group.total_amount)}
            </span>
            <ChevronDownIcon expanded={is_expanded} />
          </div>
        </div>
      </button>

      {/* Order items — collapsible */}
      {is_expanded && (
        <div className="border-t border-brand-100 dark:border-brand-500/15">
          {group.orders.map((order, idx) => (
            <OrderItemRow
              key={`${order.product_type}-${order.id}`}
              order={order}
              is_last={idx === group.orders.length - 1}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

const MyOrdersPage: React.FC = () => {
  const [all_orders, setAllOrders] = useState<UnifiedOrder[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active_filter, setActiveFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const debounced_search = useDebounce(search, 400);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (filter: FilterTab) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const merged: UnifiedOrder[] = [];
    const failed_services: string[] = [];

    try {
      const [lb_result, nc_result, co_result, cb_result] = await Promise.allSettled([
        linkBuildingService.fetchMyOrders({ per_page: 200 }),
        newContentService.fetchMyOrders(),
        contentOptimizationService.fetchMyOrders(),
        contentBriefsService.fetchMyOrders(),
      ]);

      if (lb_result.status === "fulfilled") {
        const lb_data = lb_result.value?.data;
        if (Array.isArray(lb_data)) {
          lb_data.forEach((o) =>
            merged.push({
              id: o.id,
              product_type: "link_building",
              label: o.order_title ?? "Link Building Order",
              total_amount: o.total_amount,
              status: o.status,
              created_at: o.created_at,
              items_count: o.items_count,
              updates_count: o.updates_count,
              last_update_at: o.last_update_at,
            })
          );
        }
      } else {
        failed_services.push("Link Building");
        console.error("[MyOrders] Link Building orders failed:", lb_result.reason);
      }

      if (nc_result.status === "fulfilled") {
        const nc_data = Array.isArray(nc_result.value) ? nc_result.value : [];
        nc_data.forEach((o) =>
          merged.push({
            id: o.id,
            product_type: "new_content",
            label: o.order_notes ?? "New Content Order",
            total_amount: o.total_amount,
            status: o.status,
            created_at: o.created_at,
            items_count: o.items_count,
          })
        );
      } else {
        failed_services.push("New Content");
        console.error("[MyOrders] New Content orders failed:", nc_result.reason);
      }

      if (co_result.status === "fulfilled") {
        const co_data = Array.isArray(co_result.value) ? co_result.value : [];
        co_data.forEach((o) =>
          merged.push({
            id: o.id,
            product_type: "content_optimization",
            label: o.order_notes ?? "Content Optimization Order",
            total_amount: o.total_amount,
            status: o.status,
            created_at: o.created_at,
            items_count: o.items_count,
          })
        );
      } else {
        failed_services.push("Content Optimization");
        console.error("[MyOrders] Content Optimization orders failed:", co_result.reason);
      }

      if (cb_result.status === "fulfilled") {
        const cb_data = Array.isArray(cb_result.value) ? cb_result.value : [];
        cb_data.forEach((o) =>
          merged.push({
            id: o.id,
            product_type: "content_brief",
            label: o.order_notes ?? "Content Briefs Order",
            total_amount: o.total_amount,
            status: o.status,
            created_at: o.created_at,
            items_count: o.items_count,
          })
        );
      } else {
        failed_services.push("Content Briefs");
        console.error("[MyOrders] Content Briefs orders failed:", cb_result.reason);
      }
    } catch {
      setError("We couldn't load your orders. Please try again.");
    } finally {
      merged.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAllOrders(merged);

      if (failed_services.length === 4) {
        setError("We couldn't load your orders. Please try again.");
      } else if (failed_services.length > 0) {
        setError(
          `Could not load orders for: ${failed_services.join(", ")}. Other order types are shown below.`
        );
      }

      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered_orders = React.useMemo(() => {
    let result = all_orders;

    if (active_filter !== "all") {
      result = result.filter((o) => o.product_type === active_filter);
    }

    if (debounced_search.trim()) {
      const query = debounced_search.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.label.toLowerCase().includes(query) ||
          o.status.toLowerCase().includes(query) ||
          o.id.toLowerCase().includes(query) ||
          PRODUCT_TYPE_CONFIG[o.product_type].label.toLowerCase().includes(query)
      );
    }

    return result;
  }, [all_orders, active_filter, debounced_search]);

  const order_groups = React.useMemo(
    () => groupOrdersBySession(filtered_orders),
    [filtered_orders]
  );

  const total_orders = filtered_orders.length;
  const total_groups = order_groups.length;
  const last_page = Math.max(1, Math.ceil(total_groups / PER_PAGE));
  const safe_page = Math.min(page, last_page);
  const paginated_groups = order_groups.slice(
    (safe_page - 1) * PER_PAGE,
    safe_page * PER_PAGE
  );
  const range_start = total_groups === 0 ? 0 : (safe_page - 1) * PER_PAGE + 1;
  const range_end = Math.min(safe_page * PER_PAGE, total_groups);
  const page_buttons = buildPageButtons(safe_page, last_page);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">My Orders</h1>
          {!is_loading && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {total_orders}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M7.25 1.5C4.075 1.5 1.5 4.075 1.5 7.25C1.5 10.425 4.075 13 7.25 13C10.425 13 13 10.425 13 7.25C13 4.075 10.425 1.5 7.25 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M11.5 11.5L14.5 14.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search orders…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500"
            />
          </div>

          {/* New Order */}
          <Link
            href="/store"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Order
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {filter_tabs.map((tab) => {
          const is_active = active_filter === tab.key;
          const count =
            tab.key === "all"
              ? all_orders.length
              : all_orders.filter((o) => o.product_type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                is_active
                  ? "bg-gray-800 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  is_active
                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-gray-900"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
          <button
            onClick={loadOrders}
            className="mt-1 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Content */}
      {is_loading ? (
        <GroupSkeleton />
      ) : paginated_groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-800">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {total_orders === 0 && !search && active_filter === "all"
              ? "No orders yet"
              : "No orders match your search"}
          </p>
          {total_orders === 0 && !search && active_filter === "all" && (
            <Link
              href="/store"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              Place your first order
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginated_groups.map((group) => (
            <OrderGroupCard key={group.group_id} group={group} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!is_loading && !error && total_groups > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 px-1 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {range_start}–{range_end}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{total_groups}</span>{" "}
            {total_groups === 1 ? "purchase" : "purchases"} &nbsp;·&nbsp; Page{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{safe_page}</span> of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{last_page}</span>
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={safe_page === 1}
              className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M7.5 2.5L4.5 6L7.5 9.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Prev
            </button>

            {page_buttons.map((btn, i) =>
              btn === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="flex h-8 w-8 items-center justify-center text-xs text-gray-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={btn}
                  onClick={() => setPage(btn as number)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                    btn === safe_page
                      ? "border-coral-500 bg-coral-500 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {btn}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={safe_page === last_page}
              className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Next
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4.5 2.5L7.5 6L4.5 9.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
