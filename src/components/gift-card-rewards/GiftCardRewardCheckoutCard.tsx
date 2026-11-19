"use client";

import React from "react";
import styles from "./GiftCardReward.module.scss";
import GiftCardRewardForm from "./GiftCardRewardForm";
import { GiftIcon } from "./GiftCardIcons";
import { useCart } from "@/context/CartContext";
import {
  formatRewardPercentage,
  isGiftCardRewardDetailsComplete,
  isValidGiftCardEmail,
} from "@/types/client/gift-card-rewards";

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Shown in the order summary while a money back promo code (HAPPYHOLIDAYS)
 * is applied. Filling it in is optional: if the client skips it, they can
 * complete it later from the order page.
 */
export default function GiftCardRewardCheckoutCard() {
  const {
    gift_card_reward_coupon,
    gift_card_reward_amount,
    gift_card_reward_details,
    setGiftCardRewardDetails,
  } = useCart();

  if (!gift_card_reward_coupon) return null;

  const email = gift_card_reward_details.recipient_email.trim();
  const email_error = email && !isValidGiftCardEmail(email) ? "Please enter a valid email address." : null;
  const is_complete = isGiftCardRewardDetailsComplete(gift_card_reward_details);

  return (
    <section className={styles.checkoutCard} aria-label="Holiday gift card reward">
      <div className={styles.checkoutHeader}>
        <div>
          <span className={styles.ribbon}>
            <GiftIcon className={styles.giftIcon} />
            {gift_card_reward_coupon.code}
          </span>
          <p className={styles.checkoutTitle}>
            You get {formatRewardPercentage(gift_card_reward_coupon.discount_value)} back as a gift card
          </p>
          <p className={styles.muted}>Tell us which one you want and where to send it.</p>
        </div>
        <div className={styles.rewardBadge}>
          <span className={styles.amount}>{formatMoney(gift_card_reward_amount)}</span>
          <span className={styles.rewardBadgeLabel}>Gift card</span>
        </div>
      </div>

      <GiftCardRewardForm
        value={gift_card_reward_details}
        onChange={setGiftCardRewardDetails}
        email_error={email_error}
      />

      <div className={styles.statusRow}>
        <span className={`${styles.statusDot} ${is_complete ? styles.statusDotReady : ""}`} />
        <p className={styles.muted}>
          {is_complete
            ? "All set. Your gift card details will be sent with your order."
            : "Optional. You can also complete this later from your order page."}
        </p>
      </div>
    </section>
  );
}
