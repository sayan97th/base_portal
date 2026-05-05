"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import { listAdminOrders } from "@/services/admin/order.service";
import type {
  AdminOrder,
  AdminOrderGroup,
  AdminOrderProductType,
  AdminOrderFilters,
  OrderStatus,
  OrderSortField,
  SortDirection,
  OrderUser,
  OrderItem,
} from "@/types/admin";
import { useDebounce } from "@/hooks/useDebounce";
import OrderFiltersBar from "./OrderFiltersBar";

// ── Date picker input ──────────────────────────────────────────────────────────

interface DatePickerInputProps {
  value: string;
  placeholder: string;
  max_date?: string;
  min_date?: string;
  on_change: (value: string) => void;
  is_active?: boolean;
}

function DatePickerInput({
  value,
  placeholder,
  max_date,
  min_date,
  on_change,
  is_active,
}: DatePickerInputProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const fp_ref = useRef<FlatpickrInstance | null>(null);
  const on_change_ref = useRef(on_change);
  on_change_ref.current = on_change;

  useEffect(() => {
    if (!input_ref.current) return;
    fp_ref.current = flatpickr(input_ref.current, {
      dateFormat: "Y-m-d",
      appendTo: document.body,
      disableMobile: true,
      maxDate: max_date || undefined,
      minDate: min_date || undefined,
      onChange: (_, date_str) => on_change_ref.current(date_str),
    });
    return () => fp_ref.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fp_ref.current) return;
    if (value) fp_ref.current.setDate(value, false);
    else fp_ref.current.clear(false);
  }, [value]);

  useEffect(() => {
    fp_ref.current?.set("maxDate", max_date || undefined);
  }, [max_date]);

  useEffect(() => {
    fp_ref.current?.set("minDate", min_date || undefined);
  }, [min_date]);

  return (
    <div className="relative">
      <input
        ref={input_ref}
        readOnly
        placeholder={placeholder}
        className={`h-8 w-36 cursor-pointer rounded-lg border px-3 pr-8 text-xs outline-none transition placeholder:text-gray-400 ${
          is_active
            ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
            : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:border-gray-600"
        }`}
      />
      <span
        className={`pointer-events-none absolute inset-y-0 right-2 flex items-center ${
          is_active ? "text-brand-500 dark:text-brand-400" : "text-gray-400"
        }`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V9.75z" />
        </svg>
      </span>
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:    "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  processing: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  completed:  "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  cancelled:  "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
};

const STATUS_DOT: Record<OrderStatus, string> = {
  pending:    "bg-warning-500",
  processing: "bg-brand-500",
  completed:  "bg-success-500",
  cancelled:  "bg-error-500",
};

const PRODUCT_TYPE_CONFIG: Record<
  AdminOrderProductType,
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
  content_refresh: {
    label: "Content Refresh",
    color: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-100 dark:bg-teal-500/20",
    border: "border-teal-200 dark:border-teal-500/30",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getItemLabel(item: OrderItem, _product_type?: AdminOrderProductType | null): string {
  if (item.item_name) return item.item_name;
  if (item.dr_tier?.label) return item.dr_tier.label;
  return `Item #${item.id}`;
}

function getGroupOverallStatus(orders: AdminOrder[]): OrderStatus {
  const priority: OrderStatus[] = ["processing", "pending", "cancelled", "completed"];
  for (const s of priority) {
    if (orders.some((o) => o.status === s)) return s;
  }
  return orders[0]?.status ?? "pending";
}

function getOrderItemsCount(order: AdminOrder): number {
  if (order.items_count != null) return order.items_count;
  return order.items?.length ?? 0;
}

function groupAdminOrders(orders: AdminOrder[]): AdminOrderGroup[] {
  const session_map = new Map<string, AdminOrderGroup>();
  const ungrouped: AdminOrderGroup[] = [];

  for (const order of orders) {
    if (order.session_id) {
      if (session_map.has(order.session_id)) {
        const group = session_map.get(order.session_id)!;
        if (!group.orders.find((o) => o.id === order.id)) {
          group.orders.push(order);
          group.total_amount += order.total_amount;
        }
      } else {
        session_map.set(order.session_id, {
          group_id: order.session_id,
          session_id: order.session_id,
          session_title: order.session_title ?? null,
          created_at: order.created_at,
          total_amount: order.total_amount,
          orders: [order],
          is_multi_order: false,
          user: order.user,
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
        is_multi_order: false,
        user: order.user,
      });
    }
  }

  const session_groups = [...session_map.values()].map((g) => ({
    ...g,
    is_multi_order: g.orders.length > 1,
  }));

  return [...session_groups, ...ungrouped].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const CartIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const ChevronDownIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
    fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const UserAvatarIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

// ── Inline products panel (always-visible, no toggle) ─────────────────────────

interface ProductsPanelProps {
  items: OrderItem[];
  product_type?: AdminOrderProductType | null;
  compact?: boolean;
}

function ProductsPanel({ items, product_type, compact = false }: ProductsPanelProps) {
  if (!items?.length) return null;
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  return (
    <div className={`border-t border-gray-100 dark:border-gray-800 ${compact ? "px-4 py-2.5" : "px-5 py-3"}`}>
      {/* Section label */}
      <div className="mb-2 flex items-center gap-1.5">
        <svg className="h-3 w-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h12M6 10h12M6 14h8" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-600">
          Products
        </span>
      </div>

      {/* Items grid */}
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const label = getItemLabel(item, product_type);
          return (
            <div
              key={item.id}
              className="group flex items-center gap-2.5 rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-white/[0.03]"
            >
              {/* Quantity badge */}
              <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-md bg-gray-200/80 px-1.5 text-[10px] font-bold tabular-nums text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                {item.quantity}×
              </span>

              {/* Name + tier detail */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
                {item.dr_tier && (
                  <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-gray-500">
                    DR {item.dr_tier.traffic_range} &middot; {item.dr_tier.word_count.toLocaleString()} words &middot; {formatCurrency(item.dr_tier.price_per_link)}/link
                  </p>
                )}
              </div>

              {/* Unit price */}
              <span className="shrink-0 text-[11px] text-gray-400 tabular-nums dark:text-gray-500">
                {formatCurrency(item.unit_price)}
              </span>

              {/* Line subtotal */}
              <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200">
                {formatCurrency(item.subtotal)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Total row — only when multiple items */}
      {items.length > 1 && (
        <div className="mt-2 flex items-center justify-end gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
          <span className="text-[10px] font-medium uppercase tracking-widest text-gray-300 dark:text-gray-600">Total</span>
          <span className="text-xs font-bold tabular-nums text-gray-800 dark:text-white/90">
            {formatCurrency(total)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function CardsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="h-5 w-28 rounded-md bg-gray-100 dark:bg-gray-800" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-48 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-36 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-5 w-16 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-5 w-20 rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Customer pill ──────────────────────────────────────────────────────────────

function CustomerInfo({ user }: { user: OrderUser }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span className="text-gray-300 dark:text-gray-600">
        <UserAvatarIcon />
      </span>
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {user.first_name} {user.last_name}
      </span>
      <span className="text-gray-300 dark:text-gray-600">·</span>
      <span>{user.email}</span>
    </div>
  );
}

// ── Single order row (used inside session cards) ───────────────────────────────

interface OrderRowProps {
  order: AdminOrder;
  is_last: boolean;
  compact?: boolean;
}

function OrderRow({ order, is_last, compact = false }: OrderRowProps) {
  const type_config = order.product_type ? PRODUCT_TYPE_CONFIG[order.product_type] : null;
  const items_count = getOrderItemsCount(order);
  const has_items = (order.items?.length ?? 0) > 0;

  return (
    <div
      className={`${!is_last ? "border-b border-gray-100 dark:border-gray-700/60" : ""} ${compact ? "bg-gray-50/60 dark:bg-white/2" : ""}`}
    >
      <div className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          {/* Active pulse dot */}
          {(order.status === "processing" || order.status === "pending") && (
            <div className="relative mt-1.5 flex h-2 w-2 shrink-0 sm:mt-0">
              {order.status === "processing" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-50" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${STATUS_DOT[order.status]}`} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {type_config && (
                <span
                  className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${type_config.bg} ${type_config.color} ${type_config.border}`}
                >
                  {type_config.label}
                </span>
              )}
              <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                {order.order_title}
              </p>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
              {items_count > 0 && (
                <>
                  <span className="text-gray-200 dark:text-gray-700">·</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {items_count} {items_count === 1 ? "item" : "items"}
                  </span>
                </>
              )}
              <span className="text-gray-200 dark:text-gray-700">·</span>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[order.status]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[order.status]}`} />
            {order.status}
          </span>
          {order.product_type === "new_content" && (
            <Link
              href={`/admin/new-content/orders/${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Keywords
            </Link>
          )}
          {order.product_type === "content_optimization" && (
            <Link
              href={`/admin/content-optimization/orders/${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Keywords
            </Link>
          )}
          {order.product_type === "content_brief" && (
            <Link
              href={`/admin/content-refresh/orders/${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Keywords
            </Link>
          )}
          {order.product_type === "content_refresh" && (
            <Link
              href={`/admin/content-refresh/orders/${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Keywords
            </Link>
          )}
          <Link
            href={`/admin/orders/${order.id}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              type_config
                ? `${type_config.border} ${type_config.bg} ${type_config.color} hover:opacity-80`
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/6"
            }`}
          >
            View Details
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Inline products — always visible */}
      {has_items && (
        <ProductsPanel items={order.items} product_type={order.product_type} compact />
      )}
    </div>
  );
}

// ── Single-order card (no session) ─────────────────────────────────────────────

function SingleOrderCard({ group }: { group: AdminOrderGroup }) {
  const order = group.orders[0];
  const type_config = order.product_type ? PRODUCT_TYPE_CONFIG[order.product_type] : null;
  const items_count = getOrderItemsCount(order);
  const has_items = (order.items?.length ?? 0) > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-white/3">
      {/* Type header strip */}
      {type_config && (
        <div className={`flex items-center gap-2 border-b px-5 py-2 ${type_config.border} ${type_config.bg}`}>
          <span className={`text-[10px] font-semibold ${type_config.color}`}>{type_config.label}</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(order.created_at)}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: title + meta */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {(order.status === "processing" || order.status === "pending") && (
              <span className="relative flex h-2 w-2 shrink-0">
                {order.status === "processing" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-50" />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${STATUS_DOT[order.status]}`} />
              </span>
            )}
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
              {order.order_title}
            </p>
          </div>

          <CustomerInfo user={order.user} />

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            {items_count > 0 && (
              <>
                <span className="text-gray-200 dark:text-gray-700">·</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {items_count} {items_count === 1 ? "item" : "items"}
                </span>
              </>
            )}
            {!type_config && (
              <>
                <span className="text-gray-200 dark:text-gray-700">·</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(order.created_at)}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: status + total + action */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[order.status]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[order.status]}`} />
            {order.status}
          </span>
          <span className="text-sm font-bold text-gray-800 dark:text-white/90">
            {formatCurrency(order.total_amount)}
          </span>
          {order.product_type === "new_content" && (
            <Link
              href={`/admin/new-content/orders/${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Keywords
            </Link>
          )}
          {order.product_type === "content_optimization" && (
            <Link
              href={`/admin/content-optimization/orders/${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Keywords
            </Link>
          )}
          {order.product_type === "content_brief" && (
            <Link
              href={`/admin/content-refresh/orders/${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Keywords
            </Link>
          )}
          {order.product_type === "content_refresh" && (
            <Link
              href={`/admin/content-refresh/orders/${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Keywords
            </Link>
          )}
          <Link
            href={`/admin/orders/${order.id}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              type_config
                ? `${type_config.border} ${type_config.bg} ${type_config.color} hover:opacity-80`
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400 dark:hover:bg-white/6"
            }`}
          >
            View Details
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Inline products — always visible */}
      {has_items && (
        <ProductsPanel items={order.items} product_type={order.product_type} />
      )}
    </div>
  );
}

// ── Multi-order session card ───────────────────────────────────────────────────

function SessionOrderCard({ group }: { group: AdminOrderGroup }) {
  const [is_expanded, setIsExpanded] = useState(true);

  const overall_status = getGroupOverallStatus(group.orders);
  const total_items = group.orders.reduce((sum, o) => sum + getOrderItemsCount(o), 0);
  const unique_types = [
    ...new Set(
      group.orders
        .map((o) => o.product_type)
        .filter((t): t is AdminOrderProductType => t != null)
    ),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm dark:border-brand-500/25 dark:bg-white/3">
      {/* Session header — click to expand/collapse */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full bg-linear-to-r from-brand-50 via-brand-50/60 to-transparent px-5 py-4 text-left transition-colors hover:from-brand-100 dark:from-brand-500/10 dark:via-brand-500/5 dark:to-transparent dark:hover:from-brand-500/15"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: icon + meta */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
              <CartIcon />
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                  {group.session_title ?? "Multi-Product Purchase"}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[overall_status]}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[overall_status]}`} />
                  {overall_status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <CustomerInfo user={group.user} />
                <span className="text-gray-200 dark:text-gray-700">·</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(group.created_at)}
                </span>
                <span className="text-gray-200 dark:text-gray-700">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {group.orders.length} {group.orders.length === 1 ? "service" : "services"}
                </span>
                <span className="text-gray-200 dark:text-gray-700">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {total_items} {total_items === 1 ? "item" : "items"}
                </span>
                {unique_types.length > 0 && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: total + view all + chevron */}
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-bold text-gray-800 dark:text-white/90">
              {formatCurrency(group.total_amount)}
            </span>
            <Link
              href={`/admin/orders/${group.orders[0].id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:border-brand-500/30 dark:bg-white/3 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              View All Details
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <ChevronDownIcon expanded={is_expanded} />
          </div>
        </div>
      </button>

      {/* Individual orders — collapsible */}
      {is_expanded && (
        <div className="border-t border-brand-100 dark:border-brand-500/15">
          {group.orders.map((order, idx) => (
            <OrderRow
              key={order.id}
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

// ── Group card dispatcher ──────────────────────────────────────────────────────

function OrderGroupCard({ group }: { group: AdminOrderGroup }) {
  if (group.is_multi_order) return <SessionOrderCard group={group} />;
  return <SingleOrderCard group={group} />;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminOrdersContent() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [last_page, setLastPage] = useState(1);

  // Filter & sort state
  const [search_input, setSearchInput] = useState("");
  const [status_filter, setStatusFilter] = useState<OrderStatus | "">("");
  const [sort_field, setSortField] = useState<OrderSortField | undefined>("created_at");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");

  const debounced_search = useDebounce(search_input, 450);

  const fetchOrders = useCallback(async (filters: AdminOrderFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAdminOrders(filters);
      setOrders(data.data);
      setTotal(data.total);
      setLastPage(data.last_page);
    } catch {
      setError("Failed to load orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders({
      page,
      search: debounced_search,
      status: status_filter || undefined,
      sort_field,
      sort_direction,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
    });
  }, [fetchOrders, page, debounced_search, status_filter, sort_field, sort_direction, date_from, date_to]);

  function handleSearchChange(value: string) { setSearchInput(value); setPage(1); }
  function handleStatusChange(status: OrderStatus | "") { setStatusFilter(status); setPage(1); }
  function handleSortChange(field: OrderSortField, direction: SortDirection) {
    setSortField(field); setSortDirection(direction); setPage(1);
  }
  function handleDateRangeChange(from: string, to: string) {
    setDateFrom(from); setDateTo(to); setPage(1);
  }
  function handleClearAll() {
    setSearchInput(""); setStatusFilter(""); setSortField("created_at");
    setSortDirection("desc"); setDateFrom(""); setDateTo(""); setPage(1);
  }

  const has_date_range = date_from !== "" || date_to !== "";

  const order_groups = React.useMemo(() => groupAdminOrders(orders), [orders]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Orders</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage and track all platform orders
        </p>
      </div>

      {/* Filters bar */}
      <OrderFiltersBar
        search_value={search_input}
        on_search_change={handleSearchChange}
        status_filter={status_filter}
        on_status_change={handleStatusChange}
        sort_field={sort_field}
        sort_direction={sort_direction}
        on_sort_change={handleSortChange}
        total={total}
        is_loading={is_loading}
        on_clear_all={handleClearAll}
      />

      {error && (
        <div className="rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}

      {/* Date range + orders card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

        {/* Date range toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-1.5 ${has_date_range ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"}`}>
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="shrink-0 text-xs font-medium">Date range</span>
            </div>

            <div className="flex items-center gap-2">
              <DatePickerInput
                value={date_from}
                placeholder="From date"
                max_date={date_to || undefined}
                on_change={(val) => handleDateRangeChange(val, date_to)}
                is_active={date_from !== ""}
              />
              <svg className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <DatePickerInput
                value={date_to}
                placeholder="To date"
                min_date={date_from || undefined}
                on_change={(val) => handleDateRangeChange(date_from, val)}
                is_active={date_to !== ""}
              />
              {has_date_range && (
                <button
                  onClick={() => handleDateRangeChange("", "")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  title="Clear date range"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {has_date_range && (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              {date_from && date_to
                ? `${date_from} → ${date_to}`
                : date_from
                  ? `From ${date_from}`
                  : `Until ${date_to}`}
            </span>
          )}
        </div>

        {/* Orders list */}
        <div className="p-4 space-y-3">
          {is_loading ? (
            <CardsSkeleton />
          ) : order_groups.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg
                  className="h-7 w-7 text-gray-300 dark:text-gray-600"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No orders found</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : (
            order_groups.map((group) => (
              <OrderGroupCard key={group.group_id} group={group} />
            ))
          )}
        </div>

        {/* Pagination */}
        {!is_loading && last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page <span className="font-medium text-gray-700 dark:text-gray-300">{page}</span> of{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{last_page}</span>
              {" "}&nbsp;·&nbsp;{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span> total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(last_page, p + 1))}
                disabled={page === last_page}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
