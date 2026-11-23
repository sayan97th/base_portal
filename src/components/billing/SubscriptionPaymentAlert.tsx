"use client";

import { useId } from "react";
import Link from "next/link";
import type { ActiveSeoSubscription, SeoSubscriptionPaymentHealth } from "@/types/client/seo-packages";
import styles from "./SubscriptionPaymentAlert.module.scss";

interface Props {
  subscription: ActiveSeoSubscription;
  /** On the billing page the card form opens in place instead of navigating. */
  onAddCard?: () => void;
}

const ALERT_STATES: SeoSubscriptionPaymentHealth["state"][] = [
  "no_payment_method",
  "retrying",
  "payment_pending",
  "payment_failed",
];

const ICONS = {
  alert:
    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  card: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  invoice:
    "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  support:
    "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
} as const;

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function formatLongDate(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function describe(subscription: ActiveSeoSubscription, health: SeoSubscriptionPaymentHealth) {
  const plan = subscription.plan_name || subscription.package?.name || "SEO subscription";
  const reason = health.failure?.reason ?? "";
  const renews_on = formatLongDate(subscription.next_billing_date);

  switch (health.state) {
    case "retrying":
      return {
        eyebrow: "Payment issue",
        title: "Your SEO subscription payment did not go through",
        text: `${reason} We will try again automatically on ${formatLongDate(
          health.failure?.next_retry_at
        )}, or right away as soon as you add a new card. You can also pay the invoice now.`,
      };
    case "payment_failed":
      return {
        eyebrow: "Action needed",
        title: "Your SEO subscription payment failed",
        text: `${reason} Add a valid card or pay the open invoice to keep your ${plan} subscription in good standing.`,
      };
    case "payment_pending":
      return {
        eyebrow: "Payment pending",
        title: `You have a pending payment for your ${plan} subscription`,
        text: health.open_invoice
          ? "Pay the open invoice from your portal, it only takes a minute."
          : "Our team will send you the invoice. Contact us if you have any questions about your plan.",
      };
    case "no_payment_method":
      return {
        eyebrow: "Card needed",
        title: "Add a card to keep your SEO subscription running",
        text:
          health.card_issue === "expired"
            ? `The card on your account has expired. Your subscription renews automatically on ${renews_on}.`
            : `There is no card on your account. Your subscription renews automatically on ${renews_on}, and nothing can be charged without one.`,
      };
    default:
      return null;
  }
}

/**
 * Client facing notice for an SEO subscription payment problem: a declined
 * renewal, a pending payment or a missing card. Explains what happened in
 * plain language and offers the fastest fix. Renders nothing otherwise.
 */
export default function SubscriptionPaymentAlert({ subscription, onAddCard }: Props) {
  const title_id = useId();
  const health = subscription.payment_health;

  if (!health || !ALERT_STATES.includes(health.state)) return null;

  const copy = describe(subscription, health);
  if (!copy) return null;

  const amount_due = health.overdue_amount || health.failure?.amount || 0;
  const needs_card = health.state === "no_payment_method" || !health.has_usable_card;
  const card_label = needs_card ? "Add a card" : "Update payment method";

  return (
    <section
      className={styles.root}
      data-severity={health.severity}
      aria-labelledby={title_id}
      role={health.severity === "critical" ? "alert" : "status"}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon d={health.state === "no_payment_method" ? ICONS.card : ICONS.alert} />
      </span>

      <div className={styles.body}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h2 id={title_id} className={styles.title}>
          {copy.title}
        </h2>
        <p className={styles.text}>{copy.text}</p>

        {amount_due > 0 && health.state !== "no_payment_method" && (
          <dl className={styles.facts}>
            <div>
              <dt>Amount due</dt>
              <dd>{formatAmount(amount_due)}</dd>
            </div>
            {health.overdue_periods > 0 && (
              <div>
                <dt>Pending</dt>
                <dd>
                  {health.overdue_periods} month{health.overdue_periods === 1 ? "" : "s"}
                </dd>
              </div>
            )}
            {health.failure?.period_label && (
              <div>
                <dt>Period</dt>
                <dd>{health.failure.period_label}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className={styles.actions}>
        {health.open_invoice && (
          <Link href={`/invoices/${health.open_invoice.unique_id}`} className={`${styles.button} ${styles.buttonPrimary}`}>
            <Icon d={ICONS.invoice} />
            Pay invoice #{health.open_invoice.invoice_number}
          </Link>
        )}
        {health.state !== "payment_pending" &&
          (onAddCard ? (
            <button
              type="button"
              onClick={onAddCard}
              className={`${styles.button} ${health.open_invoice ? styles.buttonSecondary : styles.buttonPrimary}`}
            >
              <Icon d={ICONS.card} />
              {card_label}
            </button>
          ) : (
            <Link
              href="/billing"
              className={`${styles.button} ${health.open_invoice ? styles.buttonSecondary : styles.buttonPrimary}`}
            >
              <Icon d={ICONS.card} />
              {card_label}
            </Link>
          ))}
        {health.state === "payment_pending" && !health.open_invoice && (
          <Link href="/support" className={`${styles.button} ${styles.buttonSecondary}`}>
            <Icon d={ICONS.support} />
            Contact support
          </Link>
        )}
      </div>
    </section>
  );
}
