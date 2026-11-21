"use client";

import React, { useCallback, useEffect, useState } from "react";
import styles from "./GiftCardReward.module.scss";
import GiftCardRewardForm from "./GiftCardRewardForm";
import { CheckIcon, GiftIcon, MailIcon, SpinnerIcon } from "./GiftCardIcons";
import { Modal } from "@/components/ui/modal";
import { giftCardRewardsService } from "@/services/client/gift-card-rewards.service";
import {
  formatRewardPercentage,
  isValidGiftCardEmail,
  type GiftCardReward,
  type GiftCardRewardDetails,
} from "@/types/client/gift-card-rewards";

interface GiftCardRewardPanelProps {
  /** Look the reward up by checkout session (receipt page)... */
  session_id?: string;
  /** ...or by a single order (order details page). */
  order_id?: string;
  /** Opens the form automatically once per browser session (receipt page right after checkout). */
  auto_open?: boolean;
}

interface ApiError {
  message?: string;
  errors?: Record<string, string[]>;
  status_code?: number;
}

const AUTO_OPEN_STORAGE_PREFIX = "gift_card_reward_prompted_";

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Fallback when only the end moment is known: the last valid day is the UTC day of the moment just before it. */
function lastDayFromEndMoment(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(new Date(iso).getTime() - 1000).toISOString().slice(0, 10);
}

/** Last day the promo works, for example "December 18, 2026". The whole day is included. */
function formatDeadline(reward: Pick<GiftCardReward, "promotion_last_day" | "promotion_ends_at">): string | null {
  const last_day = reward.promotion_last_day ?? lastDayFromEndMoment(reward.promotion_ends_at);
  if (!last_day) return null;
  // Read as a calendar date in UTC so the browser timezone never shifts the day.
  return new Date(`${last_day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function brandLabel(reward: GiftCardReward): string {
  return reward.brands.find((b) => b.value === reward.gift_card_brand)?.label ?? reward.gift_card_brand ?? "";
}

function wasPrompted(claim_id: string): boolean {
  try {
    return sessionStorage.getItem(AUTO_OPEN_STORAGE_PREFIX + claim_id) === "1";
  } catch {
    return true;
  }
}

function markPrompted(claim_id: string): void {
  try {
    sessionStorage.setItem(AUTO_OPEN_STORAGE_PREFIX + claim_id, "1");
  } catch {
    // Private mode or blocked storage, the prompt simply shows again.
  }
}

/**
 * Post purchase "rescue" view for money back promo codes (HAPPYHOLIDAYS).
 * Renders nothing unless the order used the promo. While the promo is still
 * running and details are missing, it invites the client to pick a gift card;
 * once submitted it shows a short confirmation instead.
 */
export default function GiftCardRewardPanel({ session_id, order_id, auto_open = false }: GiftCardRewardPanelProps) {
  const [reward, setReward] = useState<GiftCardReward | null>(null);
  const [is_modal_open, setIsModalOpen] = useState(false);
  const [details, setDetails] = useState<GiftCardRewardDetails>({ recipient_email: "", gift_card_brand: "" });
  const [field_errors, setFieldErrors] = useState<{ email?: string; brand?: string }>({});
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [just_submitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    if (!session_id && !order_id) return;
    let is_cancelled = false;

    giftCardRewardsService
      .lookup({ session_id, order_id })
      .then((data) => {
        if (is_cancelled) return;
        setReward(data);

        if (auto_open && data?.is_claimable && !wasPrompted(data.id)) {
          markPrompted(data.id);
          setIsModalOpen(true);
        }
      })
      .catch(() => {
        // The reward is a bonus, a lookup failure must never break the order page.
        if (!is_cancelled) setReward(null);
      });

    return () => {
      is_cancelled = true;
    };
  }, [session_id, order_id, auto_open]);

  const closeModal = useCallback(() => {
    if (is_submitting) return;
    setIsModalOpen(false);
    setSubmitError(null);
    setJustSubmitted(false);
  }, [is_submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reward) return;

    const errors: { email?: string; brand?: string } = {};
    if (!details.gift_card_brand) errors.brand = "Please choose a gift card.";
    if (!isValidGiftCardEmail(details.recipient_email)) errors.email = "Please enter a valid email address.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !details.gift_card_brand) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const updated = await giftCardRewardsService.submit(reward.id, {
        recipient_email: details.recipient_email.trim(),
        gift_card_brand: details.gift_card_brand,
      });
      setReward(updated);
      setJustSubmitted(true);
    } catch (err: unknown) {
      const api_error = (err ?? {}) as ApiError;
      setFieldErrors({
        email: api_error.errors?.recipient_email?.[0],
        brand: api_error.errors?.gift_card_brand?.[0],
      });
      setSubmitError(api_error.message ?? "We could not save your gift card details. Please try again.");

      // The promo ended or the details were already sent from another tab.
      if (api_error.status_code === 409 || api_error.status_code === 422) {
        giftCardRewardsService.lookup({ session_id, order_id }).then(setReward).catch(() => {});
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!reward) return null;

  const percentage = formatRewardPercentage(reward.reward_percentage);
  const deadline = formatDeadline(reward);
  const is_pending = reward.status === "pending_details" && reward.is_claimable;
  const is_fulfilled = reward.status === "fulfilled";

  return (
    <>
      <section className={styles.panel} aria-label="Promo gift card">
        <div className={styles.panelAccent} />
        <div className={styles.panelBody}>
          <div className={`${styles.panelIcon} ${is_pending ? "" : styles.panelIconDone}`}>
            {is_pending ? <GiftIcon /> : <CheckIcon />}
          </div>

          <div className={styles.panelText}>
            {is_pending ? (
              <>
                <p className={styles.panelTitle}>
                  You earned a {formatMoney(reward.reward_amount)} gift card
                </p>
                <p className={styles.panelDescription}>
                  Thanks for ordering with {reward.coupon_code}. Choose Amazon, Visa or Target and tell us where to
                  send your {percentage} back.
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className={styles.panelTitle}>
                    {is_fulfilled ? "Your gift card has been sent" : "Gift card request received"}
                  </p>
                  <span className={`${styles.chip} ${is_fulfilled ? styles.chipFulfilled : styles.chipSubmitted}`}>
                    {is_fulfilled ? "Sent" : "In progress"}
                  </span>
                </div>
                <p className={styles.panelDescription}>
                  {is_fulfilled
                    ? "Check your inbox for your gift card. Happy holidays!"
                    : "Our team will email your gift card shortly."}
                </p>
                <div className={styles.summaryList}>
                  <span className={styles.summaryItem}>
                    <GiftIcon className={styles.giftIcon} />
                    <span>
                      {formatMoney(reward.reward_amount)} {brandLabel(reward)}
                    </span>
                  </span>
                  {reward.recipient_email && (
                    <span className={styles.summaryItem}>
                      <MailIcon className={styles.giftIcon} />
                      <span>{reward.recipient_email}</span>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {is_pending && (
            <div className={styles.panelAction}>
              <button type="button" className={styles.primaryButton} onClick={() => setIsModalOpen(true)}>
                <GiftIcon />
                Choose my gift card
              </button>
              {deadline && <span className={styles.deadline}>Available until {deadline}</span>}
            </div>
          )}
        </div>
      </section>

      <Modal isOpen={is_modal_open} onClose={closeModal} className="max-w-[520px] m-4">
        <div className={styles.modalBody}>
          {just_submitted ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <CheckIcon />
              </div>
              <p className={styles.modalTitle}>You are all set!</p>
              <p className={styles.muted}>
                We will send your {formatMoney(reward.reward_amount)} {brandLabel(reward)} gift card to{" "}
                <strong>{reward.recipient_email}</strong>.
              </p>
              <div className={styles.modalActions} style={{ justifyContent: "center" }}>
                <button type="button" className={styles.primaryButton} onClick={closeModal}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.modalHero}>
                <div>
                  <span className={styles.ribbon} style={{ background: "rgba(255,255,255,0.2)" }}>
                    <GiftIcon className={styles.giftIcon} />
                    {reward.coupon_code}
                  </span>
                  <p className={styles.modalHeroText} style={{ marginTop: 8 }}>
                    {percentage} back on your {formatMoney(reward.order_total)} order
                  </p>
                </div>
                <span className={styles.amount}>{formatMoney(reward.reward_amount)}</span>
              </div>

              <p className={styles.modalTitle}>Claim your gift card</p>
              <p className={styles.muted} style={{ marginBottom: 18 }}>
                Pick your favorite and we will email it to you.
              </p>

              <GiftCardRewardForm
                value={details}
                onChange={(next) => {
                  setDetails(next);
                  setFieldErrors({});
                }}
                brands={reward.brands}
                email_error={field_errors.email}
                brand_error={field_errors.brand}
                disabled={is_submitting}
              />

              {submit_error && <p className={styles.submitError}>{submit_error}</p>}

              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={closeModal} disabled={is_submitting}>
                  Maybe later
                </button>
                <button type="submit" className={styles.primaryButton} disabled={is_submitting}>
                  {is_submitting ? <SpinnerIcon className={styles.spinner} /> : <CheckIcon />}
                  {is_submitting ? "Sending..." : "Send my gift card details"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
