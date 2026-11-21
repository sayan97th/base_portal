"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CouponUsageProductType, CouponUsageResponse } from "@/types/admin/coupons";
import { getAdminCouponUsage } from "@/services/admin/coupons.service";
import { downloadCsv } from "@/lib/exportCsv";
import CouponUsageBoard from "./CouponUsageBoard";
import styles from "./CouponUsageBoard.module.scss";
import {
  GROUP_BY_OPTIONS,
  PRODUCT_COLORS,
  SORT_OPTIONS,
  formatMoney,
  formatShortDate,
  getCouponStateBadge,
  getStatusMeta,
  groupUsages,
  matchesSearch,
  sortUsages,
  type CouponUsageGroupBy,
  type CouponUsageSort,
} from "./coupon-usage";

interface CouponUsageContentProps {
  coupon_id: string;
}

const GROUP_BY_STORAGE_KEY = "admin_coupon_usage_group_by";

function readStoredGroupBy(): CouponUsageGroupBy {
  if (typeof window === "undefined") return "product";
  try {
    const stored_value = window.localStorage.getItem(GROUP_BY_STORAGE_KEY);
    if (GROUP_BY_OPTIONS.some((option) => option.value === stored_value)) {
      return stored_value as CouponUsageGroupBy;
    }
  } catch {
    // Storage can be unavailable (private mode), fall back to the default.
  }
  return "product";
}

function formatCouponDiscount(response: CouponUsageResponse["coupon"]): string {
  if (response.discount_type === "gift_card_reward") return `${response.discount_value}% back as a gift card`;
  if (response.discount_type === "percentage") return `${response.discount_value}% off`;
  return `${formatMoney(response.discount_value)} off`;
}

// ── Small presentational pieces ──────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className={`${styles.skeleton} mb-4 h-4 w-40`} />
      <div className={`${styles.skeleton} h-56 w-full`} style={{ borderRadius: 20 }} />
      <div className={`${styles.skeleton} mt-6 h-10 w-full max-w-xl`} />
      <div className={`${styles.skeleton} mt-4 h-80 w-full`} style={{ borderRadius: 16 }} />
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.board}>
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
          </svg>
        </div>
        <p className={styles.emptyTitle}>{title}</p>
        <p className={styles.emptyText}>{text}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CouponUsageContent({ coupon_id }: CouponUsageContentProps) {
  const [usage_response, setUsageResponse] = useState<CouponUsageResponse | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  const [search_term, setSearchTerm] = useState("");
  // The board only renders after the data loads, so reading storage here
  // never changes the server rendered markup.
  const [group_by, setGroupBy] = useState<CouponUsageGroupBy>(readStoredGroupBy);
  const [sort, setSort] = useState<CouponUsageSort>("newest");
  const [product_filter, setProductFilter] = useState<CouponUsageProductType | "all">("all");
  const [reload_key, setReloadKey] = useState(0);

  useEffect(() => {
    let is_cancelled = false;

    getAdminCouponUsage(coupon_id)
      .then((response) => {
        if (is_cancelled) return;
        setUsageResponse(response);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (is_cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "We could not load this coupon usage.");
      })
      .finally(() => {
        if (!is_cancelled) setIsLoading(false);
      });

    return () => {
      is_cancelled = true;
    };
  }, [coupon_id, reload_key]);

  const loadUsage = useCallback(() => {
    setIsLoading(true);
    setReloadKey((value) => value + 1);
  }, []);

  const handleGroupByChange = (value: CouponUsageGroupBy) => {
    setGroupBy(value);
    try {
      window.localStorage.setItem(GROUP_BY_STORAGE_KEY, value);
    } catch {
      // Remembering the grouping is a convenience only.
    }
  };

  const usages = useMemo(() => usage_response?.data ?? [], [usage_response]);

  const filtered_usages = useMemo(() => {
    const matching = usages.filter(
      (usage) =>
        (product_filter === "all" || usage.product_type === product_filter) && matchesSearch(usage, search_term)
    );
    return sortUsages(matching, sort);
  }, [usages, product_filter, search_term, sort]);

  const groups = useMemo(() => groupUsages(filtered_usages, group_by), [filtered_usages, group_by]);

  const handleExport = () => {
    if (!usage_response) return;
    const headers = [
      "Order",
      "Order ID",
      "Product",
      "Status",
      "Client",
      "Client Email",
      "Company",
      "Items",
      "Subtotal",
      usage_response.coupon.is_gift_card_reward ? "Gift Card Earned" : "Discount",
      "Total",
      "Invoice",
      "Used On",
    ];
    const rows = filtered_usages.map((usage) => [
      usage.order_reference,
      usage.order_id,
      usage.product_label,
      getStatusMeta(usage.status).label,
      usage.client?.name ?? "",
      usage.client?.email ?? "",
      usage.client?.company ?? usage.client?.organization ?? "",
      usage.items.map((item) => `${item.quantity} x ${item.label}`).join("; "),
      usage.subtotal_before_discount.toFixed(2),
      (usage_response.coupon.is_gift_card_reward ? usage.reward_amount : usage.discount_amount).toFixed(2),
      usage.total_amount.toFixed(2),
      usage.invoice?.invoice_number ?? "",
      usage.used_at ? new Date(usage.used_at).toISOString() : "",
    ]);
    downloadCsv(`coupon-${usage_response.coupon.code.toLowerCase()}-usage.csv`, headers, rows);
  };

  if (is_loading && !usage_response) return <LoadingState />;

  if (error_message || !usage_response) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <EmptyState
          title="Coupon usage unavailable"
          text={error_message ?? "We could not find this coupon. It may have been removed."}
        />
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/admin/coupons" className={styles.button}>
            Back to Coupons
          </Link>
          <button type="button" onClick={loadUsage} className={`${styles.button} ${styles.buttonPrimary}`}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { coupon, summary } = usage_response;
  const is_gift_card_reward = coupon.discount_type === "gift_card_reward";
  const coupon_state = getCouponStateBadge(coupon);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <Link href="/admin/coupons" className="transition-colors hover:text-brand-500">
          Coupons
        </Link>
        <span>/</span>
        <Link href={`/admin/coupons/${coupon.id}/edit`} className="transition-colors hover:text-brand-500">
          {coupon.code}
        </Link>
        <span>/</span>
        <span className="text-gray-600 dark:text-gray-300">Usage</span>
      </div>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <span className={styles.couponCode}>{coupon.code}</span>
            <h1 className={styles.heroTitle}>{coupon.name}</h1>
            <div className={styles.heroMeta}>
              <span className={styles.metaChip}>
                <span className={styles.metaDot} style={{ backgroundColor: coupon_state.color }} />
                {coupon_state.label}
              </span>
              <span className={styles.metaChip}>{formatCouponDiscount(coupon)}</span>
              <span className={styles.metaChip}>
                {coupon.times_used}
                {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""} {coupon.times_used === 1 ? "use" : "uses"}
              </span>
              {summary.first_used_at && (
                <span>
                  First used {formatShortDate(summary.first_used_at)}, last used {formatShortDate(summary.last_used_at)}
                </span>
              )}
            </div>
          </div>

          <div className={styles.heroActions}>
            <button type="button" onClick={loadUsage} className={styles.button} disabled={is_loading}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {is_loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className={styles.button}
              disabled={filtered_usages.length === 0}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>
            <Link href={`/admin/coupons/${coupon.id}/edit`} className={`${styles.button} ${styles.buttonPrimary}`}>
              Edit coupon
            </Link>
          </div>
        </div>
      </section>

      {usages.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No orders yet"
            text={`Nobody has checked out with ${coupon.code} so far. Orders will show up here as soon as a client uses it.`}
          />
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="search"
                value={search_term}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search client, email, order or invoice"
                aria-label="Search orders"
              />
            </label>

            <div className={styles.segmented} role="group" aria-label="Group by">
              <span className={styles.segmentedLabel}>Group by</span>
              {GROUP_BY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleGroupByChange(option.value)}
                  className={`${styles.segment} ${group_by === option.value ? styles.segmentActive : ""}`}
                  aria-pressed={group_by === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as CouponUsageSort)}
              className={styles.select}
              aria-label="Sort orders"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <span className={styles.resultCount}>
              Showing {filtered_usages.length} of {usages.length} {usages.length === 1 ? "order" : "orders"}
            </span>
          </div>

          {summary.by_product_type.length > 1 && (
            <div className={styles.filterChips}>
              <button
                type="button"
                onClick={() => setProductFilter("all")}
                className={`${styles.filterChip} ${product_filter === "all" ? styles.filterChipActive : ""}`}
              >
                All products
              </button>
              {summary.by_product_type.map((entry) => (
                <button
                  key={entry.product_type}
                  type="button"
                  onClick={() => setProductFilter(entry.product_type)}
                  className={`${styles.filterChip} ${product_filter === entry.product_type ? styles.filterChipActive : ""}`}
                  style={{ "--chip-color": PRODUCT_COLORS[entry.product_type] } as React.CSSProperties}
                >
                  {entry.product_label} ({entry.order_count})
                </button>
              ))}
            </div>
          )}

          {filtered_usages.length === 0 ? (
            <EmptyState title="No matching orders" text="Try a different search or clear the product filter." />
          ) : (
            <CouponUsageBoard groups={groups} is_gift_card_reward={is_gift_card_reward} />
          )}
        </>
      )}
    </div>
  );
}
