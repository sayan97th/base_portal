"use client";

import React, { useId } from "react";
import { formatDate, formatMoneyCompact } from "./subscription-format";
import styles from "./FirstPaymentPlanner.module.scss";

/**
 * How the first month of a new subscription is handled:
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
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
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

// ── Helpers ──────────────────────────────────────────────────────────────────

type LedgerTone = "paid" | "now" | "due" | "upcoming";

interface LedgerEntry {
  date: string;
  tone: LedgerTone;
  status: string;
}

function buildLedger(
  schedule: string[],
  choice: FirstPaymentChoice,
  today: string,
  is_auto_renew: boolean
): LedgerEntry[] {
  return schedule.map((date, index) => {
    if (index === 0) {
      if (choice === "paid_outside") return { date, tone: "paid", status: "Paid, not charged" };
      if (choice === "charge_now") return { date, tone: "now", status: "Charged now" };
      if (date === today) return { date, tone: "due", status: is_auto_renew ? "Billing run today" : "Due today" };
      return { date, tone: "due", status: is_auto_renew ? "Auto charge" : "Charge by hand" };
    }
    return { date, tone: "upcoming", status: is_auto_renew ? "Auto charge" : "Charge by hand" };
  });
}

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
  const reference_id = useId();
  const first_date = schedule[0] ?? today;
  const is_first_today = first_date === today;
  const first_month = formatDate(first_date, { month: "long" });
  const second_date = schedule[1] ?? null;

  const charge_now_blocker = !is_first_today
    ? "Only when the first payment is today"
    : has_usable_card === false
      ? "No valid card on file"
      : has_usable_card === null
        ? "Select a client first"
        : null;

  const options: {
    value: FirstPaymentChoice;
    title: string;
    text: string;
    disabled_reason: string | null;
  }[] = [
    {
      value: "schedule",
      title: is_first_today ? "Bill on schedule" : `Bill on ${formatDate(first_date, { month: "short", day: "numeric" })}`,
      text: is_auto_renew
        ? is_first_today
          ? "The billing run charges the card on file later today."
          : "The card on file is charged automatically on that day."
        : "You charge it from the subscription page when ready.",
      disabled_reason: null,
    },
    {
      value: "charge_now",
      title: "Charge now",
      text: `Collect ${formatMoneyCompact(monthly_price)} right away when you activate.`,
      disabled_reason: charge_now_blocker,
    },
    {
      value: "paid_outside",
      title: `${first_month} already paid`,
      text: "Paid another way. Recorded as paid and never charged.",
      disabled_reason: null,
    },
  ];

  const ledger = buildLedger(schedule.slice(0, 4), choice, today, is_auto_renew);

  return (
    <div className={styles.planner}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>First month</p>
          <p className={styles.title}>How is {first_month} handled?</p>
        </div>
        <span className={styles.amountPill}>{formatMoneyCompact(monthly_price)} / month</span>
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
          <label htmlFor={reference_id} className={styles.paidLabel}>
            Payment reference <small>(optional)</small>
          </label>
          <input
            id={reference_id}
            type="text"
            value={outside_reference}
            onChange={(e) => onOutsideReferenceChange(e.target.value)}
            maxLength={120}
            placeholder="e.g. Bank transfer on Nov 20, check #1042"
            className={styles.paidInput}
          />
          <p className={styles.paidHint}>
            A paid invoice is added to the client&apos;s portal and the payment is listed in Transactions.
            {second_date && (
              <>
                {" "}
                The first charge will be on <strong>{formatDate(second_date, { month: "short", day: "numeric", year: "numeric" })}</strong>.
              </>
            )}
          </p>
        </div>
      )}

      {ledger.length > 0 && (
        <ol className={styles.ledger} aria-label="Upcoming months">
          {ledger.map((entry) => (
            <li key={entry.date} className={styles.ledgerItem} data-tone={entry.tone}>
              <span className={styles.ledgerMonth}>{formatDate(entry.date, { month: "short" })}</span>
              <span className={styles.ledgerDay}>{formatDate(entry.date, { day: "numeric" })}</span>
              <span className={styles.ledgerStatus}>
                {entry.tone === "paid" && <span className={styles.ledgerCheck}>{ICONS.check}</span>}
                {entry.status}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className={styles.guard}>
        <span className={styles.guardIcon}>{ICONS.shield}</span>
        <span>
          <strong>Billed once per month.</strong> If a month is already paid, by card, from the client portal or
          recorded here, renewals skip it automatically.
        </span>
      </p>
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
