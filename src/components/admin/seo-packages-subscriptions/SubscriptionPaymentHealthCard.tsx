"use client";

import { useId } from "react";
import Link from "next/link";
import type {
  AdminSeoSubscription,
  AdminSeoSubscriptionFailure,
  AdminSeoSubscriptionPaymentHealth,
} from "@/services/admin/seo-packages-subscription.service";
import { cardBrandLabel, formatDate, formatMoney } from "./subscription-format";
import {
  HEALTH_STATE_LABELS,
  cardIssueLabel,
  describeHealth,
  needsAttention,
  pluralDaysShort,
  pluralPeriods,
} from "./payment-health";
import styles from "./SubscriptionPaymentHealth.module.scss";

interface Props {
  subscription: AdminSeoSubscription;
  health: AdminSeoSubscriptionPaymentHealth;
  onCancel: () => void;
}

// Heroicons outline paths.
const ICONS = {
  alert:
    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  card: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  refresh:
    "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99",
  bolt: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  invoice:
    "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  ban: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  mail: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  check: "M4.5 12.75l6 6 9-13.5",
  close: "M6 18L18 6M6 6l12 12",
} as const;

function Icon({ d, className, stroke_width = 1.9 }: { d: string; className?: string; stroke_width?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke_width} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

/** Human label for a processor decline code: "insufficient_funds" to "Insufficient funds". */
function declineCodeLabel(code: string | null): string {
  if (!code) return "Declined";
  const text = code.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type StepStatus = "failed" | "scheduled" | "upcoming" | "skipped";

/**
 * One step per allowed attempt: the declines that happened, the retry that
 * is scheduled, and the attempts left (or skipped once retries stopped).
 */
function RetryTrack({ failure }: { failure: AdminSeoSubscriptionFailure }) {
  const total = Math.max(failure.max_attempts, failure.attempt_count);
  const has_retry = Boolean(failure.next_retry_at);

  const steps = Array.from({ length: total }, (_, index): { status: StepStatus; label: string; hint: string } => {
    const number = index + 1;

    if (number <= failure.attempt_count) {
      const is_last = number === failure.attempt_count;
      return {
        status: "failed",
        label: number === 1 ? "First charge" : `Retry ${number - 1}`,
        hint: is_last && failure.last_attempt_at ? formatDate(failure.last_attempt_at, { month: "short", day: "numeric" }) : "Declined",
      };
    }

    if (number === failure.attempt_count + 1 && has_retry) {
      return {
        status: "scheduled",
        label: `Retry ${number - 1}`,
        hint: formatDate(failure.next_retry_at, { month: "short", day: "numeric" }),
      };
    }

    return {
      status: has_retry ? "upcoming" : "skipped",
      label: `Retry ${number - 1}`,
      hint: has_retry ? "If needed" : "Stopped",
    };
  });

  return (
    <ol className={styles.track} aria-label="Automatic payment attempts">
      {steps.map((step, index) => (
        <li key={index} className={styles.trackStep} data-status={step.status}>
          <span className={styles.trackDot} aria-hidden="true">
            {step.status === "failed" && <Icon d={ICONS.close} stroke_width={3} />}
            {step.status === "scheduled" && <Icon d={ICONS.refresh} stroke_width={2.4} />}
          </span>
          <span className={styles.trackLabel}>{step.label}</span>
          <span className={styles.trackHint}>
            {step.status === "failed" ? `Declined${step.hint !== "Declined" ? `, ${step.hint}` : ""}` : step.hint}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Payment health of a subscription for admins: what went wrong, how far
 * behind the client is, what the system already did, and the actions that
 * are left (charge, open invoice, cancel). Renders nothing when payments
 * are up to date.
 */
export default function SubscriptionPaymentHealthCard({ subscription, health, onCancel }: Props) {
  const title_id = useId();

  if (!needsAttention(health)) return null;

  const { title, lead } = describeHealth(subscription, health);
  const failure = health.failure;
  const card = subscription.payment_profile;
  const card_issue = cardIssueLabel(health);
  const is_owed = health.overdue_periods > 0;
  const charge_label = health.state === "no_payment_method" ? "Charge now" : "Retry payment now";

  const client_note =
    health.state === "retrying" || health.state === "payment_failed"
      ? "The client was emailed about this payment with a link to fix it."
      : health.state === "no_payment_method"
        ? "The client is asked to add a card when they remove their last one."
        : subscription.auto_renew
          ? "No automatic charge is pending for these periods."
          : "Manual billing: the client is only charged when an admin uses Charge now.";

  return (
    <section
      className={styles.root}
      data-severity={health.severity}
      data-state={health.state}
      aria-labelledby={title_id}
      role={health.severity === "critical" ? "alert" : "status"}
    >
      <span className={styles.glow} aria-hidden="true" />

      <header className={styles.head}>
        <span className={styles.beacon} aria-hidden="true">
          <span className={styles.beaconRing} />
          <span className={styles.beaconRing} />
          <span className={styles.beaconCore}>
            <Icon d={health.state === "no_payment_method" ? ICONS.card : ICONS.alert} />
          </span>
        </span>

        <div className={styles.headText}>
          <p className={styles.eyebrow}>
            <span className={styles.stateChip}>{HEALTH_STATE_LABELS[health.state]}</span>
            {health.severity === "critical" && <span className={styles.eyebrowNote}>Needs attention</span>}
          </p>
          <h2 id={title_id} className={styles.title}>
            {title}
          </h2>
          {lead && <p className={styles.lead}>{lead}</p>}
        </div>
      </header>

      {(is_owed || failure) && (
        <dl className={styles.metrics}>
          <div className={styles.metric} data-emphasis="true">
            <dt>Outstanding</dt>
            <dd>{formatMoney(health.overdue_amount || failure?.amount || 0)}</dd>
            <span>{is_owed ? `${pluralPeriods(health.overdue_periods, "period")} unpaid` : "Current period"}</span>
          </div>
          <div className={styles.metric}>
            <dt>Behind</dt>
            <dd>{is_owed ? pluralPeriods(health.overdue_periods) : "Due now"}</dd>
            <span>
              {health.oldest_due_date
                ? `Since ${formatDate(health.oldest_due_date, { month: "short", day: "numeric", year: "numeric" })}`
                : "Not yet overdue"}
            </span>
          </div>
          <div className={styles.metric}>
            <dt>Overdue</dt>
            <dd>{health.days_overdue > 0 ? pluralDaysShort(health.days_overdue) : "Today"}</dd>
            <span>Oldest unpaid date</span>
          </div>
          <div className={styles.metric}>
            <dt>Next retry</dt>
            <dd>
              {failure?.next_retry_at
                ? formatDate(failure.next_retry_at, { month: "short", day: "numeric" })
                : subscription.auto_renew
                  ? "Stopped"
                  : "Manual"}
            </dd>
            <span>
              {failure
                ? `Attempt ${failure.attempt_count} of ${Math.max(failure.max_attempts, failure.attempt_count)}`
                : "No attempt yet"}
            </span>
          </div>
        </dl>
      )}

      {failure && (
        <div className={styles.reason}>
          <div className={styles.reasonHead}>
            <span className={styles.reasonLabel}>Why it failed</span>
            <code className={styles.reasonCode}>{declineCodeLabel(failure.code)}</code>
            {!failure.is_retryable && <span className={styles.reasonTag}>Retry will not fix it</span>}
          </div>
          <p className={styles.reasonMessage}>{failure.message || failure.client_reason}</p>
          <p className={styles.reasonClient}>
            <Icon d={ICONS.mail} />
            <span>
              The client was told: <em>{failure.client_reason}</em>
            </span>
          </p>
          <RetryTrack failure={failure} />
        </div>
      )}

      <div className={styles.cardLine} data-issue={card_issue ? "true" : undefined}>
        <span className={styles.cardIcon} aria-hidden="true">
          <Icon d={ICONS.card} />
        </span>
        <span className={styles.cardText}>
          <strong>
            {card_issue ??
              (card ? `${cardBrandLabel(card.card_brand)} ending in ${card.last_four}` : "Client's default card")}
          </strong>
          <span>
            {card_issue
              ? "Renewals cannot be charged until the client adds a valid card."
              : "Used for the next automatic or manual charge."}
          </span>
        </span>
      </div>

      {health.suggest_cancellation && (
        <div className={styles.suggestion}>
          <Icon d={ICONS.clock} />
          <p>
            <strong>{pluralPeriods(health.overdue_periods)} behind.</strong> You can keep trying to collect, or
            cancel the subscription now. Cancelling stops every future charge and lets you decide what happens to
            the open invoices.
          </p>
        </div>
      )}

      <footer className={styles.footer}>
        <p className={styles.footerNote}>
          <Icon d={ICONS.mail} />
          {client_note}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            className={`${styles.button} ${health.suggest_cancellation ? styles.buttonDanger : styles.buttonGhost}`}
          >
            <Icon d={ICONS.ban} />
            Cancel subscription
          </button>
          {health.open_invoice && (
            <Link href={`/admin/invoices/${health.open_invoice.id}`} className={`${styles.button} ${styles.buttonSecondary}`}>
              <Icon d={ICONS.invoice} />
              Invoice #{health.open_invoice.invoice_number}
            </Link>
          )}
          <Link
            href={`/admin/seo-packages-subscriptions/${subscription.id}/charge`}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            <Icon d={ICONS.bolt} />
            {charge_label}
          </Link>
        </div>
      </footer>
    </section>
  );
}
