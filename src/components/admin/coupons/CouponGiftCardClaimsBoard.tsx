"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./GiftCardClaimsBoard.module.scss";
import {
  listAdminGiftCardClaims,
  updateAdminGiftCardClaimFulfillment,
} from "@/services/admin/gift-card-claims.service";
import type { AdminGiftCardClaim, GiftCardClaimStatus } from "@/types/admin/coupons";

interface CouponGiftCardClaimsBoardProps {
  /** Requests for one promo coupon (coupon edit page)... */
  coupon_id?: string;
  /** ...or for one order / checkout session (admin order pages). */
  order_id?: string;
  session_id?: string;
  /** Compact card for order pages: no tabs, hides itself when empty. */
  compact?: boolean;
}

type FilterKey = "all" | GiftCardClaimStatus;

const STATUS_CONFIG: Record<GiftCardClaimStatus, { label: string; cell: string; edge: string; dot: string }> = {
  pending_details: { label: "Waiting for client", cell: styles.statusWaiting, edge: styles.edgeWaiting, dot: styles.dotWaiting },
  submitted: { label: "Ready to send", cell: styles.statusReady, edge: styles.edgeReady, dot: styles.dotReady },
  fulfilled: { label: "Sent", cell: styles.statusSent, edge: styles.edgeSent, dot: styles.dotSent },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Ready to send" },
  { key: "pending_details", label: "Waiting for client" },
  { key: "fulfilled", label: "Sent" },
];

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function orderHref(claim: AdminGiftCardClaim): string {
  return claim.order_ids.length > 1
    ? `/admin/orders/session/${claim.session_id}`
    : `/admin/orders/${claim.order_ids[0]}`;
}

function CopyIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Promo gift card requests (money back coupons such as HAPPYHOLIDAYS).
 * Admins see what each client chose and mark the gift card as sent.
 */
export default function CouponGiftCardClaimsBoard({
  coupon_id,
  order_id,
  session_id,
  compact = false,
}: CouponGiftCardClaimsBoardProps) {
  const [claims, setClaims] = useState<AdminGiftCardClaim[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [updating_id, setUpdatingId] = useState<string | null>(null);
  const [copied_id, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let is_cancelled = false;

    listAdminGiftCardClaims({ coupon_id, order_id, session_id })
      .then((data) => {
        if (!is_cancelled) setClaims(data);
      })
      .catch(() => {
        if (!is_cancelled) setError("Could not load gift card requests.");
      })
      .finally(() => {
        if (!is_cancelled) setIsLoading(false);
      });

    return () => {
      is_cancelled = true;
    };
  }, [coupon_id, order_id, session_id]);

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = { all: claims.length, pending_details: 0, submitted: 0, fulfilled: 0 };
    claims.forEach((claim) => {
      result[claim.status] += 1;
    });
    return result;
  }, [claims]);

  const visible_claims = filter === "all" ? claims : claims.filter((claim) => claim.status === filter);

  const toggleFulfillment = async (claim: AdminGiftCardClaim) => {
    if (claim.status === "pending_details") return;
    setUpdatingId(claim.id);
    setError(null);
    try {
      const updated = await updateAdminGiftCardClaimFulfillment(claim.id, claim.status !== "fulfilled");
      setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      setError("Could not update the gift card request. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const copyEmail = (claim: AdminGiftCardClaim) => {
    if (!claim.recipient_email) return;
    navigator.clipboard.writeText(claim.recipient_email).then(() => {
      setCopiedId(claim.id);
      setTimeout(() => setCopiedId(null), 1800);
    }).catch(() => {});
  };

  const renderStatusCell = (claim: AdminGiftCardClaim) => {
    const config = STATUS_CONFIG[claim.status];
    const is_waiting = claim.status === "pending_details";
    return (
      <div>
        <button
          type="button"
          className={`${styles.statusCell} ${config.cell}`}
          onClick={() => toggleFulfillment(claim)}
          disabled={is_waiting || updating_id === claim.id}
          title={is_waiting ? "The client has not chosen a gift card yet" : claim.status === "fulfilled" ? "Click to mark as not sent" : "Click to mark as sent"}
        >
          {updating_id === claim.id ? "Saving..." : config.label}
        </button>
        {claim.status === "fulfilled" && claim.fulfilled_at && (
          <p className={styles.statusHint}>
            {formatDate(claim.fulfilled_at)}
            {claim.fulfilled_by ? ` by ${claim.fulfilled_by.name}` : ""}
          </p>
        )}
      </div>
    );
  };

  const renderBrand = (claim: AdminGiftCardClaim) =>
    claim.gift_card_brand ? (
      <span className={`${styles.brandPill} ${styles[`brand_${claim.gift_card_brand}`] ?? ""}`}>
        {claim.gift_card_brand_label ?? claim.gift_card_brand}
      </span>
    ) : (
      <span className={styles.brandPill}>Not chosen</span>
    );

  const renderEmail = (claim: AdminGiftCardClaim) =>
    claim.recipient_email ? (
      <span className={styles.emailCell}>
        <span title={claim.recipient_email}>{claim.recipient_email}</span>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => copyEmail(claim)}
          aria-label={`Copy ${claim.recipient_email}`}
        >
          {copied_id === claim.id ? <CheckIcon /> : <CopyIcon />}
        </button>
      </span>
    ) : (
      <span className={styles.clientMeta}>Not provided yet</span>
    );

  // ── Compact card (admin order pages) ──────────────────────────────────────
  if (compact) {
    if (is_loading || claims.length === 0) return null;

    return (
      <div className={styles.board}>
        <div className={styles.header}>
          <div>
            <p className={styles.title}>🎁 Promo gift card</p>
            <p className={styles.subtitle}>This order used the {claims[0].coupon_code} money back promo code.</p>
          </div>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {claims.map((claim) => (
          <div key={claim.id} className={styles.compactItem}>
            <div className={styles.compactGrow}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={styles.amount}>{formatMoney(claim.reward_amount)}</span>
                {renderBrand(claim)}
              </div>
              <p className={styles.clientMeta}>
                {claim.reward_percentage}% of {formatMoney(claim.order_total)}
              </p>
              <div className="mt-1">{renderEmail(claim)}</div>
            </div>
            {renderStatusCell(claim)}
          </div>
        ))}
      </div>
    );
  }

  // ── Full board (coupon edit page) ─────────────────────────────────────────
  return (
    <div className={styles.board}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>Gift Card Requests</p>
          <p className={styles.subtitle}>
            Click a status to mark a gift card as sent. Admins are emailed each time a client submits details.
          </p>
        </div>
        <div className={styles.tabs} role="tablist">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={filter === option.key}
              onClick={() => setFilter(option.key)}
              className={`${styles.tab} ${filter === option.key ? styles.tabActive : ""}`}
            >
              {option.key !== "all" && <span className={`${styles.tabDot} ${STATUS_CONFIG[option.key].dot}`} />}
              {option.label}
              <span className={styles.tabCount}>{counts[option.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rowEdge} aria-hidden="true" />
              <th>Client</th>
              <th>Gift card</th>
              <th>Value</th>
              <th>Send to</th>
              <th>Status</th>
              <th>Order</th>
            </tr>
          </thead>
          <tbody>
            {is_loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td className={styles.rowEdge} />
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j}>
                      <div className={styles.skeleton} />
                    </td>
                  ))}
                </tr>
              ))}

            {!is_loading &&
              visible_claims.map((claim) => (
                <tr key={claim.id}>
                  <td className={`${styles.rowEdge} ${STATUS_CONFIG[claim.status].edge}`} />
                  <td>
                    <p className={styles.clientName}>{claim.client?.name ?? "Unknown client"}</p>
                    <p className={styles.clientMeta}>
                      {[claim.client?.company, claim.client?.email].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                  <td>{renderBrand(claim)}</td>
                  <td>
                    <p className={styles.amount}>{formatMoney(claim.reward_amount)}</p>
                    <p className={styles.clientMeta}>
                      {claim.reward_percentage}% of {formatMoney(claim.order_total)}
                    </p>
                  </td>
                  <td>{renderEmail(claim)}</td>
                  <td>{renderStatusCell(claim)}</td>
                  <td>
                    <Link href={orderHref(claim)} className="font-medium text-brand-500 hover:text-brand-600">
                      #{claim.session_id.slice(0, 8).toUpperCase()}
                    </Link>
                    <p className={styles.clientMeta}>{formatDate(claim.created_at)}</p>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!is_loading && visible_claims.length === 0 && (
        <p className={styles.empty}>
          {claims.length === 0
            ? "No client has used this promo code yet."
            : "No gift card requests in this status."}
        </p>
      )}
    </div>
  );
}
