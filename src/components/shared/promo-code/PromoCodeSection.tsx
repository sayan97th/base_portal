"use client";

import React, { useId, useState } from "react";
import styles from "./PromoCodeSection.module.scss";
import { useCart } from "@/context/CartContext";
import { validateCoupon } from "@/services/client/coupons.service";
import { GiftIcon } from "@/components/gift-card-rewards/GiftCardIcons";
import { formatRewardPercentage, isGiftCardRewardCoupon } from "@/types/client/gift-card-rewards";
import type { CartAppliedCoupon } from "@/types/client/unified-cart";
import { MAX_PROMO_CODES_PER_ORDER, PROMO_COMBINATION_ERROR_MESSAGE } from "@/lib/promo-codes";

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function TicketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AppliedPromoTicket({
  coupon,
  onRemove,
}: {
  coupon: CartAppliedCoupon;
  onRemove: (code: string) => void;
}) {
  const is_reward = isGiftCardRewardCoupon(coupon);

  return (
    <div className={`${styles.ticket} ${is_reward ? styles.ticketReward : ""}`}>
      <div className={styles.ticketStub}>
        {is_reward ? <GiftIcon className={styles.ticketStubIcon} /> : <CheckIcon className={styles.ticketStubIcon} />}
      </div>
      <div className={styles.ticketBody}>
        <p className={styles.ticketCode}>{coupon.code}</p>
        <p className={styles.ticketName}>{coupon.coupon_name}</p>
      </div>
      <div className={styles.ticketValue}>
        {is_reward ? (
          <span className={styles.rewardTag}>{formatRewardPercentage(coupon.discount_value)} back</span>
        ) : (
          <span className={styles.savings}>&minus;{formatMoney(coupon.discount_amount)}</span>
        )}
        <button
          type="button"
          onClick={() => onRemove(coupon.code)}
          className={styles.removeButton}
          aria-label={`Remove coupon ${coupon.code}`}
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

/**
 * Promo code entry for the order summary. Follows the common checkout
 * pattern: one field with an inline Apply button, a ticket style chip once a
 * code is applied, and inline errors. Money back codes (HAPPYHOLIDAYS) get a
 * festive ticket, and the gift card form is rendered by the parent.
 */
export default function PromoCodeSection() {
  const {
    items,
    subtotal,
    bulk_discount_amount,
    applied_coupons,
    coupon_input_code,
    setAppliedCoupons,
    setCouponInputCode,
    setCouponAdjustmentNotice,
  } = useCart();

  const input_id = useId();
  const error_id = useId();
  const [coupon_error, setCouponError] = useState<string | null>(null);
  const [coupon_is_applying, setCouponIsApplying] = useState(false);
  // Bumped on every failed attempt so the shake animation replays.
  const [error_attempt, setErrorAttempt] = useState(0);

  const has_applied_coupon = applied_coupons.length > 0;
  const has_reached_promo_limit = applied_coupons.length >= MAX_PROMO_CODES_PER_ORDER;

  const showError = (message: string) => {
    setCouponError(message);
    setErrorAttempt((n) => n + 1);
  };

  const handleCouponCodeChange = (code: string) => {
    setCouponInputCode(code);
    setCouponError(null);
  };

  const handleApplyCoupon = async () => {
    const trimmed_code = coupon_input_code.trim();
    if (!trimmed_code || coupon_is_applying) return;

    // Only one promo code is allowed per order, promo codes never stack
    if (has_reached_promo_limit) {
      showError(PROMO_COMBINATION_ERROR_MESSAGE);
      return;
    }

    setCouponIsApplying(true);
    setCouponError(null);

    try {
      const lb_items = items.filter((i) => i.product_type === "link_building");
      const lb_tier_ids = lb_items.map((i) => i.tier_id);
      const lb_tier_amounts: Record<string, number> = {};
      lb_items.forEach((i) => {
        lb_tier_amounts[i.tier_id] = Math.round(i.unit_price * i.quantity * 100) / 100;
      });

      const cart_product_types = [...new Set(items.map((i) => i.product_type))];
      const product_type_amounts: Record<string, number> = {};
      items.forEach((i) => {
        const item_total = Math.round(i.unit_price * i.quantity * 100) / 100;
        product_type_amounts[i.product_type] = (product_type_amounts[i.product_type] ?? 0) + item_total;
      });

      // Validate against full subtotal, if the coupon wins the bulk discount won't apply
      const response = await validateCoupon({
        code: trimmed_code,
        order_amount: subtotal,
        cart_product_types,
        product_type_amounts,
        ...(lb_tier_ids.length > 0 && {
          dr_tier_ids: lb_tier_ids,
          dr_tier_amounts: lb_tier_amounts,
        }),
      });

      if (!response.valid) {
        showError(response.message || "Invalid promo code.");
        return;
      }

      setCouponInputCode("");
      setCouponError(null);
      setCouponAdjustmentNotice(null);

      // A regular coupon overrides the bulk discount, so tell the user when it
      // saves less. Money back promo codes keep the bulk discount, no notice.
      if (!response.is_gift_card_reward && bulk_discount_amount > 0 && response.discount_amount < bulk_discount_amount) {
        setCouponAdjustmentNotice(
          `Promo code "${response.code}" applied. It replaces the bulk discount (${formatMoney(
            bulk_discount_amount
          )}) with this promo (${formatMoney(response.discount_amount)}).`
        );
      }

      setAppliedCoupons([
        {
          coupon_id: response.coupon_id,
          code: response.code,
          coupon_name: response.name,
          discount_amount: response.discount_amount,
          discount_type: response.discount_type,
          discount_value: response.discount_value,
          applies_to: response.applies_to,
          product_types: response.product_types ?? [],
          minimum_purchase_amount: response.minimum_purchase_amount,
          dr_tier_id: response.dr_tier_id,
          is_gift_card_reward: response.is_gift_card_reward === true,
        },
      ]);
    } catch {
      showError("Could not validate promo code. Please try again.");
    } finally {
      setCouponIsApplying(false);
    }
  };

  const handleRemoveCoupon = (code: string) => {
    setAppliedCoupons((prev) => prev.filter((c) => c.code !== code));
    setCouponError(null);
    setCouponAdjustmentNotice(null);
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <TicketIcon />
        </span>
        <label htmlFor={has_applied_coupon ? undefined : input_id} className={styles.headerTitle}>
          Promo code
        </label>
        {has_applied_coupon && <span className={styles.appliedPill}>Applied</span>}
      </div>

      {has_applied_coupon && (
        <div className={styles.ticketList}>
          {applied_coupons.map((applied) => (
            <AppliedPromoTicket key={applied.code} coupon={applied} onRemove={handleRemoveCoupon} />
          ))}
          <p className={styles.hint}>{PROMO_COMBINATION_ERROR_MESSAGE} Remove it to use a different code.</p>
        </div>
      )}

      {!has_applied_coupon && (
        <>
          <div
            className={`${styles.field} ${coupon_error ? styles.fieldError : ""} ${
              coupon_error ? (error_attempt % 2 === 0 ? styles.shakeEven : styles.shakeOdd) : ""
            }`}
          >
            <TicketIcon className={styles.fieldIcon} />
            <input
              id={input_id}
              type="text"
              value={coupon_input_code}
              onChange={(e) => handleCouponCodeChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyCoupon();
                }
              }}
              placeholder="PROMO CODE"
              autoComplete="off"
              spellCheck={false}
              className={styles.input}
              aria-invalid={!!coupon_error}
              aria-describedby={coupon_error ? error_id : undefined}
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={!coupon_input_code.trim() || coupon_is_applying}
              className={styles.applyButton}
            >
              {coupon_is_applying ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  <span className={styles.srOnly}>Applying</span>
                </>
              ) : (
                "Apply"
              )}
            </button>
          </div>

          {coupon_error ? (
            <p id={error_id} role="alert" className={styles.errorText}>
              {coupon_error}
            </p>
          ) : (
            <p className={styles.hint}>One promo code per order.</p>
          )}
        </>
      )}
    </div>
  );
}
