"use client";

import React, { useState } from "react";
import styles from "./GiftCardReward.module.scss";
import GiftCardRewardForm from "./GiftCardRewardForm";
import { GiftIcon } from "./GiftCardIcons";
import { useCart } from "@/context/CartContext";
import { useOptionalAuth } from "@/context/auth-context-store";
import {
  GIFT_CARD_BRAND_OPTIONS,
  describeOrderGiftCardCoverage,
  formatRewardPercentage,
  isGiftCardRewardDetailsComplete,
  isValidGiftCardEmail,
} from "@/types/client/gift-card-rewards";

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type ClaimStatus = "not_started" | "in_progress" | "ready";

const STATUS_LABELS: Record<ClaimStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  ready: "Ready",
};

/**
 * Shown in the order summary right after a money back promo code
 * (HAPPYHOLIDAYS) is applied. The client picks a gift card and the email
 * where it should be sent, and those details travel with the checkout so the
 * BASE team is notified right away. Filling it in is optional: anyone who
 * skips it can finish it later from the order page.
 *
 * The gift card is earned per order, never per product: a cart with several
 * items or products still earns one single gift card for the whole order.
 */
export default function GiftCardRewardCheckoutCard() {
  const {
    items,
    gift_card_reward_coupon,
    gift_card_reward_amount,
    gift_card_reward_details,
    setGiftCardRewardDetails,
  } = useCart();
  const auth = useOptionalAuth();
  const [is_collapsed, setIsCollapsed] = useState(false);

  if (!gift_card_reward_coupon) return null;

  const suggested_email = auth?.user?.business_email || auth?.user?.email || null;
  const email = gift_card_reward_details.recipient_email.trim();
  const email_error = email && !isValidGiftCardEmail(email) ? "Please enter a valid email address." : null;
  const is_complete = isGiftCardRewardDetailsComplete(gift_card_reward_details);

  const completed_steps =
    (gift_card_reward_details.gift_card_brand ? 1 : 0) + (isValidGiftCardEmail(email) ? 1 : 0);
  const status: ClaimStatus = is_complete ? "ready" : completed_steps > 0 || email ? "in_progress" : "not_started";

  const selected_brand = GIFT_CARD_BRAND_OPTIONS.find(
    (option) => option.value === gift_card_reward_details.gift_card_brand
  );
  const reward_percentage = formatRewardPercentage(gift_card_reward_coupon.discount_value);
  const show_summary = is_complete && is_collapsed;

  // Items the gift card is calculated on. They all share one gift card.
  const restricted_types = gift_card_reward_coupon.product_types ?? [];
  const covered_item_count = items
    .filter((item) => restricted_types.length === 0 || restricted_types.includes(item.product_type))
    .reduce((sum, item) => sum + item.quantity, 0);
  const coverage_text = describeOrderGiftCardCoverage(covered_item_count);

  return (
    <section className={styles.checkoutCard} aria-label="Holiday gift card reward">
      <div className={styles.checkoutHeader}>
        <div className={styles.checkoutHeaderText}>
          <div className={styles.checkoutMeta}>
            <span className={styles.ribbon}>
              <GiftIcon className={styles.giftIcon} />
              Holiday reward
            </span>
            <span className={`${styles.statusPill} ${styles[`statusPill_${status}`]}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>
          <p className={styles.checkoutTitle}>Claim your holiday gift card</p>
          <p className={styles.muted}>
            Thanks for using {gift_card_reward_coupon.code}. We will send you one gift card worth{" "}
            {reward_percentage} of this order total.
          </p>
          <p className={styles.coverageNote}>{coverage_text}</p>
        </div>
        <div className={styles.rewardBadge}>
          <span className={styles.amount}>{formatMoney(gift_card_reward_amount)}</span>
          <span className={styles.rewardBadgeLabel}>Order gift card</span>
        </div>
      </div>

      {!show_summary && (
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Gift card details progress"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={completed_steps}
        >
          <span className={styles.progressFill} style={{ width: `${(completed_steps / 2) * 100}%` }} />
        </div>
      )}

      {show_summary && selected_brand ? (
        <div className={styles.claimSummary}>
          <span className={`${styles.miniCard} ${styles.claimSummaryCard} ${styles[`miniCard_${selected_brand.value}`] ?? ""}`}>
            <span className={styles.miniCardBrand}>{selected_brand.label}</span>
            <span className={styles.miniCardChip} />
          </span>
          <div className={styles.claimSummaryText}>
            <p className={styles.claimSummaryTitle}>
              One {selected_brand.label} gift card for this order, {formatMoney(gift_card_reward_amount)}
            </p>
            <p className={styles.claimSummaryEmail} title={email}>
              Sent to {email}
            </p>
          </div>
          <button type="button" className={styles.linkButton} onClick={() => setIsCollapsed(false)}>
            Edit
          </button>
        </div>
      ) : (
        <>
          <GiftCardRewardForm
            value={gift_card_reward_details}
            onChange={setGiftCardRewardDetails}
            email_error={email_error}
            show_steps
            suggested_email={suggested_email}
          />

          <div className={styles.statusRow}>
            <span className={`${styles.statusDot} ${is_complete ? styles.statusDotReady : ""}`} />
            <p className={`${styles.muted} ${styles.statusRowText}`}>
              {is_complete
                ? "All set. We will send these details with your order."
                : "Optional. You can also finish this later from your order page."}
            </p>
            {is_complete && (
              <button type="button" className={styles.confirmButton} onClick={() => setIsCollapsed(true)}>
                Done
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
