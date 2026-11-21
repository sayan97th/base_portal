"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./GiftCardClaimsBoard.module.scss";
import {
  listAdminGiftCardClaims,
  updateAdminGiftCardClaimFulfillment,
} from "@/services/admin/gift-card-claims.service";
import type { AdminGiftCardClaim, GiftCardClaimStatus } from "@/types/admin/coupons";

interface CouponGiftCardClaimsBoardProps {
  /** Requests of one order or one checkout session (admin order pages). */
  order_id?: string;
  session_id?: string;
}

const STATUS_CONFIG: Record<GiftCardClaimStatus, { label: string; cell: string }> = {
  pending_details: { label: "Waiting for client", cell: styles.statusWaiting },
  submitted: { label: "Ready to send", cell: styles.statusReady },
  fulfilled: { label: "Sent", cell: styles.statusSent },
};

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
 * Promo gift card card shown on admin order pages when the order used a
 * money back coupon (such as HAPPYHOLIDAYS). Hides itself otherwise.
 * The full list of a coupon lives in /admin/coupons/{id}/gift-cards.
 */
export default function CouponGiftCardClaimsBoard({ order_id, session_id }: CouponGiftCardClaimsBoardProps) {
  const [claims, setClaims] = useState<AdminGiftCardClaim[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating_id, setUpdatingId] = useState<string | null>(null);
  const [copied_id, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let is_cancelled = false;

    listAdminGiftCardClaims({ order_id, session_id })
      .then((data) => {
        if (!is_cancelled) setClaims(data);
      })
      .catch(() => {
        // The card is optional on the order page, a failed load just hides it.
      })
      .finally(() => {
        if (!is_cancelled) setIsLoading(false);
      });

    return () => {
      is_cancelled = true;
    };
  }, [order_id, session_id]);

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

  if (is_loading || claims.length === 0) return null;

  const coupon_id = claims[0].coupon_id;

  return (
    <div className={styles.board}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>🎁 Promo gift card</p>
          <p className={styles.subtitle}>This order used the {claims[0].coupon_code} money back promo code.</p>
        </div>
        {coupon_id && (
          <Link href={`/admin/coupons/${coupon_id}/gift-cards`} className={styles.viewAllLink}>
            View all requests
          </Link>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {claims.map((claim) => {
        const config = STATUS_CONFIG[claim.status];
        const is_waiting = claim.status === "pending_details";
        return (
          <div key={claim.id} className={styles.compactItem}>
            <div className={styles.compactGrow}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={styles.amount}>{formatMoney(claim.reward_amount)}</span>
                {claim.gift_card_brand ? (
                  <span className={`${styles.brandPill} ${styles[`brand_${claim.gift_card_brand}`] ?? ""}`}>
                    {claim.gift_card_brand_label ?? claim.gift_card_brand}
                  </span>
                ) : (
                  <span className={styles.brandPill}>Not chosen</span>
                )}
              </div>
              <p className={styles.clientMeta}>
                {claim.reward_percentage}% of {formatMoney(claim.order_total)}
              </p>
              <div className="mt-1">
                {claim.recipient_email ? (
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
                )}
              </div>
            </div>
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
          </div>
        );
      })}
    </div>
  );
}
