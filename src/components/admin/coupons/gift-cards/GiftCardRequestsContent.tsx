"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AdminGiftCardClaim, Coupon, GiftCardClaimStatus } from "@/types/admin/coupons";
import {
  getAdminCouponGiftCardClaims,
  updateAdminGiftCardClaimFulfillment,
} from "@/services/admin/gift-card-claims.service";
import { formatMoney, formatShortDate, getCouponStateBadge } from "../usage/coupon-usage";
import GiftCardRequestsBoard from "./GiftCardRequestsBoard";
import GiftCardExportMenu, { type GiftCardExportScope } from "./GiftCardExportMenu";
import styles from "./GiftCardRequests.module.scss";
import {
  GIFT_CARD_SORT_OPTIONS,
  GIFT_CARD_STATUS_META,
  GIFT_CARD_STATUS_ORDER,
  groupGiftCardClaimsByStatus,
  matchesGiftCardSearch,
  sortGiftCardClaims,
  sumGiftCardClaims,
  type GiftCardSort,
  type GiftCardStatusFilter,
} from "./gift-card-claims";

interface GiftCardRequestsContentProps {
  coupon_id: string;
  initial_status?: GiftCardStatusFilter;
}

// ── Icons ────────────────────────────────────────────────────────────────────

function GiftIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function PaperPlaneIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ── States ───────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className={`${styles.skeleton} mb-4 h-4 w-48`} />
      <div className={`${styles.skeleton} h-40 w-full`} style={{ borderRadius: 20 }} />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`${styles.skeleton} h-20`} style={{ borderRadius: 16 }} />
        ))}
      </div>
      <div className={`${styles.skeleton} mt-6 h-80 w-full`} style={{ borderRadius: 16 }} />
    </div>
  );
}

function EmptyState({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className={styles.emptyCard}>
      <span className={styles.emptyIcon}>
        <GiftIcon />
      </span>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyText}>{text}</p>
      {children}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

/**
 * Dedicated view of one money back coupon gift card requests: who earned a
 * gift card, what they picked, what still has to be sent, and an export.
 */
export default function GiftCardRequestsContent({ coupon_id, initial_status = "all" }: GiftCardRequestsContentProps) {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [claims, setClaims] = useState<AdminGiftCardClaim[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [action_error, setActionError] = useState<string | null>(null);
  const [reload_key, setReloadKey] = useState(0);

  const [search_term, setSearchTerm] = useState("");
  const [status_filter, setStatusFilter] = useState<GiftCardStatusFilter>(initial_status);
  const [sort, setSort] = useState<GiftCardSort>("newest");

  const [selected_ids, setSelectedIds] = useState<Set<string>>(new Set());
  const [updating_ids, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let is_cancelled = false;

    getAdminCouponGiftCardClaims(coupon_id)
      .then((response) => {
        if (is_cancelled) return;
        setCoupon(response.coupon);
        setClaims(response.data);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (is_cancelled) return;
        setLoadError(error instanceof Error ? error.message : "We could not load the gift card requests.");
      })
      .finally(() => {
        if (!is_cancelled) setIsLoading(false);
      });

    return () => {
      is_cancelled = true;
    };
  }, [coupon_id, reload_key]);

  const reload = useCallback(() => {
    setIsLoading(true);
    setReloadKey((value) => value + 1);
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  const status_stats = useMemo(() => {
    const stats = {} as Record<GiftCardClaimStatus, { count: number; reward: number }>;
    GIFT_CARD_STATUS_ORDER.forEach((status) => {
      const status_claims = claims.filter((claim) => claim.status === status);
      stats[status] = { count: status_claims.length, reward: sumGiftCardClaims(status_claims).reward };
    });
    return stats;
  }, [claims]);

  const totals = useMemo(() => sumGiftCardClaims(claims), [claims]);

  const visible_claims = useMemo(() => {
    const matching = claims.filter(
      (claim) =>
        (status_filter === "all" || claim.status === status_filter) && matchesGiftCardSearch(claim, search_term)
    );
    return sortGiftCardClaims(matching, sort);
  }, [claims, status_filter, search_term, sort]);

  const groups = useMemo(() => groupGiftCardClaimsByStatus(visible_claims), [visible_claims]);

  const selected_claims = useMemo(() => claims.filter((claim) => selected_ids.has(claim.id)), [claims, selected_ids]);
  const selected_ready = selected_claims.filter((claim) => claim.status === "submitted");
  const selected_sent = selected_claims.filter((claim) => claim.status === "fulfilled");
  const has_active_filters = status_filter !== "all" || search_term.trim() !== "";

  // ── Actions ────────────────────────────────────────────────────────────────

  const updateFulfillment = useCallback(async (targets: AdminGiftCardClaim[], is_fulfilled: boolean) => {
    if (targets.length === 0) return;
    const target_ids = targets.map((claim) => claim.id);
    setActionError(null);
    setUpdatingIds((previous) => new Set([...previous, ...target_ids]));

    const results = await Promise.allSettled(
      targets.map((claim) => updateAdminGiftCardClaimFulfillment(claim.id, is_fulfilled))
    );

    const updated_by_id = new Map<string, AdminGiftCardClaim>();
    let failed_count = 0;
    results.forEach((result) => {
      if (result.status === "fulfilled") updated_by_id.set(result.value.id, result.value);
      else failed_count += 1;
    });

    setClaims((previous) => previous.map((claim) => updated_by_id.get(claim.id) ?? claim));
    setUpdatingIds((previous) => {
      const next = new Set(previous);
      target_ids.forEach((id) => next.delete(id));
      return next;
    });

    if (failed_count > 0) {
      setActionError(
        failed_count === targets.length
          ? "We could not update the gift card status. Please try again."
          : `${failed_count} of ${targets.length} requests could not be updated. Please try again.`
      );
    }
  }, []);

  const handleChangeStatus = useCallback(
    (claim: AdminGiftCardClaim, is_fulfilled: boolean) => updateFulfillment([claim], is_fulfilled),
    [updateFulfillment]
  );

  const handleBulkUpdate = async (is_fulfilled: boolean) => {
    await updateFulfillment(is_fulfilled ? selected_ready : selected_sent, is_fulfilled);
    setSelectedIds(new Set());
  };

  const toggleSelect = useCallback((claim_id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(claim_id)) next.delete(claim_id);
      else next.add(claim_id);
      return next;
    });
  }, []);

  const toggleSelectMany = useCallback((claim_ids: string[], is_selected: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      claim_ids.forEach((id) => (is_selected ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (is_loading && !coupon) return <LoadingState />;

  if (load_error || !coupon) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <EmptyState
          title="Gift card requests unavailable"
          text={load_error ?? "We could not find this coupon. It may have been removed."}
        >
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/admin/coupons" className={styles.button}>
              Back to Coupons
            </Link>
            <button type="button" onClick={reload} className={`${styles.button} ${styles.buttonPrimary}`}>
              Try again
            </button>
          </div>
        </EmptyState>
      </div>
    );
  }

  const coupon_state = getCouponStateBadge(coupon);

  const export_scopes: GiftCardExportScope[] = [
    {
      key: "all",
      label: "All requests",
      description: "Every request of this coupon",
      count: claims.length,
      getClaims: () => sortGiftCardClaims(claims, "newest"),
    },
    ...(has_active_filters
      ? [
          {
            key: "filtered",
            label: "Current view",
            description: "Only rows matching your filters",
            count: visible_claims.length,
            file_suffix: "filtered",
            getClaims: () => visible_claims,
          },
        ]
      : []),
    {
      key: "selected",
      label: "Selected rows",
      description: "Rows checked on the board",
      count: selected_claims.length,
      file_suffix: "selected",
      getClaims: () => sortGiftCardClaims(selected_claims, sort),
    },
  ];

  const kpi_cards = [
    {
      key: "submitted",
      label: "Ready to send",
      value: status_stats.submitted.count,
      sub: formatMoney(status_stats.submitted.reward),
      color: GIFT_CARD_STATUS_META.submitted.color,
      icon: <PaperPlaneIcon />,
    },
    {
      key: "pending_details",
      label: "Waiting for client",
      value: status_stats.pending_details.count,
      sub: formatMoney(status_stats.pending_details.reward),
      color: "#a0a4b8",
      icon: <HourglassIcon />,
    },
    {
      key: "fulfilled",
      label: "Sent",
      value: status_stats.fulfilled.count,
      sub: formatMoney(status_stats.fulfilled.reward),
      color: GIFT_CARD_STATUS_META.fulfilled.color,
      icon: <CheckCircleIcon />,
    },
    {
      key: "all",
      label: "Total value",
      value: formatMoney(totals.reward),
      sub: `${claims.length} ${claims.length === 1 ? "request" : "requests"}`,
      color: "#579bfc",
      icon: <GiftIcon />,
    },
  ] as const;

  return (
    <div className={`mx-auto max-w-[1400px] px-4 py-6 sm:px-6 ${selected_claims.length > 0 ? "pb-40 sm:pb-28" : ""}`}>
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500" aria-label="Breadcrumb">
        <Link href="/admin/coupons" className="transition-colors hover:text-brand-500">
          Coupons
        </Link>
        <span>/</span>
        <Link href={`/admin/coupons/${coupon.id}/edit`} className="transition-colors hover:text-brand-500">
          {coupon.code}
        </Link>
        <span>/</span>
        <span className="text-gray-600 dark:text-gray-300">Gift card requests</span>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroMain}>
            <div className={styles.heroTitleLine}>
              <span className={styles.couponCode}>{coupon.code}</span>
              <h1 className={styles.heroTitle}>{coupon.name}</h1>
            </div>
            <div className={styles.heroMeta}>
              <span className={styles.metaChip}>
                <span className={styles.metaDot} style={{ backgroundColor: coupon_state.color }} />
                {coupon_state.label}
              </span>
              <span className={styles.metaChip}>{coupon.discount_value}% back</span>
              {coupon.expires_at && <span className={styles.metaChip}>Ends {formatShortDate(coupon.expires_at)}</span>}
            </div>
          </div>

          <div className={styles.heroActions}>
            <GiftCardExportMenu coupon_code={coupon.code} scopes={export_scopes} />
            <Link href={`/admin/coupons/${coupon.id}/edit`} className={`${styles.button} ${styles.buttonPrimary}`}>
              Edit coupon
            </Link>
          </div>
        </div>
      </section>

      {/* KPI cards, the three status cards also work as filters */}
      <section className={styles.kpis}>
        {kpi_cards.map((card) => {
          const is_filter = card.key !== "all";
          const is_active = is_filter && status_filter === card.key;
          const content = (
            <>
              <span className={styles.kpiIcon}>{card.icon}</span>
              <span className={styles.kpiBody}>
                <span className={styles.kpiValue}>{card.value}</span>
                <span className={styles.kpiLabel}>{card.label}</span>
                <span className={styles.kpiSub}>{card.sub}</span>
              </span>
            </>
          );
          const kpi_style = { "--kpi-color": card.color } as React.CSSProperties;

          return is_filter ? (
            <button
              key={card.key}
              type="button"
              className={`${styles.kpi} ${styles.kpiButton} ${is_active ? styles.kpiActive : ""}`}
              style={kpi_style}
              onClick={() => setStatusFilter(is_active ? "all" : (card.key as GiftCardClaimStatus))}
              aria-pressed={is_active}
              title={is_active ? "Show every status" : `Show only ${card.label.toLowerCase()}`}
            >
              {content}
            </button>
          ) : (
            <div key={card.key} className={styles.kpi} style={kpi_style}>
              {content}
            </div>
          );
        })}
      </section>

      {action_error && (
        <div className={styles.alert} role="alert">
          <span>{action_error}</span>
          <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss">
            <CloseIcon />
          </button>
        </div>
      )}

      {claims.length === 0 ? (
        <EmptyState
          title="No gift card requests yet"
          text={`Nobody has checked out with ${coupon.code} so far. Requests show up here as soon as a client uses it.`}
        />
      ) : (
        <>
          {/* Toolbar: search and sort only, status filtering lives in the cards above */}
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <SearchIcon />
              <input
                type="search"
                value={search_term}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search client, email or order"
                aria-label="Search gift card requests"
              />
            </label>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as GiftCardSort)}
              className={styles.select}
              aria-label="Sort requests"
            >
              {GIFT_CARD_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <span className={styles.resultCount}>
              {status_filter !== "all" && (
                <button
                  type="button"
                  className={styles.activeFilter}
                  style={{ "--chip-color": GIFT_CARD_STATUS_META[status_filter].color } as React.CSSProperties}
                  onClick={() => setStatusFilter("all")}
                  aria-label={`Remove the ${GIFT_CARD_STATUS_META[status_filter].label} filter`}
                >
                  {GIFT_CARD_STATUS_META[status_filter].label}
                  <CloseIcon />
                </button>
              )}
              Showing {visible_claims.length} of {claims.length}
            </span>
          </div>

          {visible_claims.length === 0 ? (
            <EmptyState title="No matching requests" text="Try a different search or clear the filters.">
              <button type="button" onClick={clearFilters} className={`${styles.button} mx-auto mt-4`}>
                Clear filters
              </button>
            </EmptyState>
          ) : (
            <GiftCardRequestsBoard
              groups={groups}
              selected_ids={selected_ids}
              updating_ids={updating_ids}
              onToggleSelect={toggleSelect}
              onToggleSelectMany={toggleSelectMany}
              onChangeStatus={handleChangeStatus}
            />
          )}
        </>
      )}

      {/* Bulk actions, shown while rows are selected */}
      {selected_claims.length > 0 && (
        <div className={styles.bulkBar} role="region" aria-label="Bulk actions">
          <span className={styles.bulkCount}>{selected_claims.length}</span>
          <span className={styles.bulkLabel}>
            {selected_claims.length === 1 ? "request selected" : "requests selected"}
            <span className={styles.bulkSub}>{formatMoney(sumGiftCardClaims(selected_claims).reward)} in gift cards</span>
          </span>
          <button
            type="button"
            className={styles.bulkClose}
            onClick={() => setSelectedIds(new Set())}
            aria-label="Clear selection"
          >
            <CloseIcon />
          </button>
          <div className={styles.bulkActions}>
            <button
              type="button"
              className={`${styles.bulkButton} ${styles.bulkButtonSuccess}`}
              onClick={() => handleBulkUpdate(true)}
              disabled={selected_ready.length === 0 || updating_ids.size > 0}
              title={selected_ready.length === 0 ? "None of the selected requests is ready to send" : undefined}
            >
              <CheckCircleIcon />
              Mark as sent{selected_ready.length > 0 ? ` (${selected_ready.length})` : ""}
            </button>
            <button
              type="button"
              className={styles.bulkButton}
              onClick={() => handleBulkUpdate(false)}
              disabled={selected_sent.length === 0 || updating_ids.size > 0}
              title={selected_sent.length === 0 ? "None of the selected requests is marked as sent" : undefined}
            >
              Mark as not sent{selected_sent.length > 0 ? ` (${selected_sent.length})` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
