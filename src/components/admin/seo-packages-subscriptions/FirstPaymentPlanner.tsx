"use client";

import React, { useId } from "react";
import { formatDate, formatMoneyCompact } from "./subscription-format";
import styles from "./FirstPaymentPlanner.module.scss";

/**
 * How the first payment of a new subscription is handled:
 *   schedule      charged on the first billing date (by the billing run, or by hand)
 *   charge_now    charged right away when the subscription is activated
 *   paid_outside  already paid another way, recorded as paid and never charged
 */
export type FirstPaymentChoice = "schedule" | "charge_now" | "paid_outside";

interface FirstPaymentPlannerProps {
  choice: FirstPaymentChoice;
  onChoiceChange: (choice: FirstPaymentChoice) => void;
  /** Upcoming billing dates, first one first (YYYY-MM-DD). */
  schedule: string[];
  today: string;
  monthly_price: number;
  is_auto_renew: boolean;
  /** Charging now needs a valid card; null while a client is not selected yet. */
  has_usable_card: boolean | null;
  /** Optional note saved with a payment made outside the portal. */
  outside_reference: string;
  onOutsideReferenceChange: (value: string) => void;
}

// ── Icons ────────────────────────────────────────────────────────────────────

const ICONS = {
  schedule: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  charge_now: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  paid_outside: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
};

// ── Component ────────────────────────────────────────────────────────────────

export default function FirstPaymentPlanner({
  choice,
  onChoiceChange,
  schedule,
  today,
  monthly_price,
  is_auto_renew,
  has_usable_card,
  outside_reference,
  onOutsideReferenceChange,
}: FirstPaymentPlannerProps) {
  const note_id = useId();
  const first_date = schedule[0] ?? today;
  const is_first_today = first_date === today;
  const first_month = formatDate(first_date, { month: "long" });
  const first_day = formatDate(first_date, { month: "short", day: "numeric" });
  const second_date = schedule[1] ?? null;
  const amount = formatMoneyCompact(monthly_price);

  const charge_now_blocker = !is_first_today
    ? "Only available when the first payment is today."
    : has_usable_card === false
      ? "No valid card on file."
      : has_usable_card === null
        ? "Select a client first."
        : null;

  const schedule_text = !is_auto_renew
    ? "Nothing is charged automatically. You charge it from the subscription page."
    : is_first_today
      ? "Charged to the card on file later today, by the automatic billing run."
      : `Charged to the card on file automatically on ${first_day}.`;

  const options: {
    value: FirstPaymentChoice;
    title: string;
    text: string;
    disabled_reason: string | null;
  }[] = [
    {
      value: "schedule",
      title: is_first_today ? "Charge on schedule" : `Charge on ${first_day}`,
      text: schedule_text,
      disabled_reason: null,
    },
    {
      value: "charge_now",
      title: "Charge now",
      text: `Charge ${amount} to the card on file as soon as you activate, so you know right away if it went through.`,
      disabled_reason: charge_now_blocker,
    },
    {
      value: "paid_outside",
      title: `${first_month} already paid`,
      text: second_date
        ? `The client paid another way. Nothing is charged until ${formatDate(second_date, { month: "short", day: "numeric" })}.`
        : "The client paid another way. Nothing is charged.",
      disabled_reason: null,
    },
  ];

  return (
    <div className={styles.planner}>
      <div className={styles.header}>
        <p className={styles.title}>First payment ({first_month})</p>
        <span className={styles.amountPill}>{amount}</span>
      </div>

      <div className={styles.options} role="radiogroup" aria-label="First payment">
        {options.map((option) => {
          const is_selected = choice === option.value;
          const is_disabled = !!option.disabled_reason;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={is_selected}
              aria-disabled={is_disabled}
              disabled={is_disabled}
              onClick={() => onChoiceChange(option.value)}
              className={styles.option}
              data-choice={option.value}
              data-selected={is_selected || undefined}
            >
              <span className={styles.optionIcon}>{ICONS[option.value]}</span>
              <span className={styles.optionBody}>
                <span className={styles.optionTitle}>{option.title}</span>
                <span className={styles.optionText}>{option.disabled_reason ?? option.text}</span>
              </span>
              <span className={styles.optionRadio} aria-hidden>
                {is_selected && ICONS.check}
              </span>
            </button>
          );
        })}
      </div>

      {choice === "paid_outside" && (
        <div className={styles.paidPanel}>
          <label htmlFor={note_id} className={styles.paidLabel}>
            Note <small>(optional)</small>
          </label>
          <input
            id={note_id}
            type="text"
            value={outside_reference}
            onChange={(e) => onOutsideReferenceChange(e.target.value)}
            maxLength={120}
            placeholder="e.g. Paid by bank transfer"
            className={styles.paidInput}
          />
          <p className={styles.paidHint}>
            {first_month} is marked as paid on the client&apos;s invoice and in Transactions.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Edit mode notice ─────────────────────────────────────────────────────────

/**
 * Shown when the next billing date is moved into a month that is already
 * paid. The API refuses the change too, this explains why before saving.
 */
export function PaidMonthNotice({ period_label }: { period_label: string }) {
  return (
    <div className={styles.paidNotice} role="status">
      <span className={styles.paidNoticeIcon}>{ICONS.warning}</span>
      <span>
        <strong>{period_label} is already paid.</strong> Pick a date in a later month so the client is not charged twice
        for the same month.
      </span>
    </div>
  );
}
