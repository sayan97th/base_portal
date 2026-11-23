"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  adminSeoSubscriptionService,
  extractApiError,
} from "@/services/admin/seo-packages-subscription.service";
import type {
  AdminClientPaymentProfile,
  AdminSeoSubscription,
  AdminSeoSubscriptionCharge,
  AdminSeoSubscriptionDetail,
  AdminSeoSubscriptionSummary,
  UpdateSeoSubscriptionPayload,
} from "@/services/admin/seo-packages-subscription.service";
import DateField from "@/components/form/date-field/DateField";
import { AutoRenewSwitch, PaymentCardPicker, ReminderControl, pluralDays } from "./SubscriptionBillingControls";
import { CancelSubscriptionModal } from "./SubscriptionModals";
import SubscriptionPaymentHealthCard from "./SubscriptionPaymentHealthCard";
import { HEALTH_STATE_LABELS, needsAttention } from "./payment-health";
import {
  CHARGE_STATUS_CONFIG,
  billingCycleProgress,
  cardBrandLabel,
  clientName,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  initials,
  ordinal,
  todayIsoDate,
} from "./subscription-format";
import styles from "./SeoSubscriptionBilling.module.scss";
import detail_styles from "./SubscriptionDetail.module.scss";

interface Props {
  subscription_id: number;
  /** Set by the create and edit pages after a redirect. */
  notice?: string;
}

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  activated: { tone: "success", text: "Subscription activated. The billing schedule is shown below." },
  activated_charged: { tone: "success", text: "Subscription activated and the first payment was collected." },
  activated_paid_outside: {
    tone: "success",
    text: "Subscription activated. The first month was recorded as paid, so the client will not be charged for it.",
  },
  activated_charge_failed: {
    tone: "error",
    text: "Subscription activated, but the first charge failed. See the payment history below for the reason.",
  },
  updated: { tone: "success", text: "Subscription updated. Changes apply from the next payment." },
  charged: { tone: "success", text: "Payment collected. The invoice was created and marked as paid." },
};

const TRIGGER_LABELS: Record<AdminSeoSubscriptionCharge["trigger"], string> = {
  automatic: "Auto renewal",
  manual: "Charged by admin",
  external: "Paid by client",
};

// Heroicons outline paths used by the panel headers.
const ICON_PATHS = {
  settings:
    "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75",
  card: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  history: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  calendar:
    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  details:
    "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
} as const;

function Panel({
  title,
  subtitle,
  icon,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof ICON_PATHS;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${detail_styles.panel} ${className}`}>
      <header className={detail_styles.panelHeader}>
        <div className={detail_styles.panelHeading}>
          <span className={detail_styles.panelIcon} aria-hidden>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[icon]} />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className={detail_styles.panelTitle}>{title}</h2>
            {subtitle && <p className={detail_styles.panelSubtitle}>{subtitle}</p>}
          </div>
        </div>
        {action && <div className={detail_styles.panelAction}>{action}</div>}
      </header>
      {children}
    </section>
  );
}

function ChargeTimeline({ charges }: { charges: AdminSeoSubscriptionCharge[] }) {
  if (charges.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS.history} />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No payments yet</p>
        <p className="max-w-xs text-xs text-gray-400">
          Every monthly charge appears here with its invoice, card, and result, including failed attempts.
        </p>
      </div>
    );
  }

  return (
    <ol className={styles.timeline}>
      {charges.map((charge) => {
        const cfg = CHARGE_STATUS_CONFIG[charge.status];
        return (
          <li key={charge.id} className={styles.timelineItem}>
            <span className={styles.timelineRail} aria-hidden />
            <span className={styles.timelineDot} data-status={charge.status} aria-hidden>
              {charge.status === "succeeded" ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : charge.status === "failed" ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </span>
            <div className={styles.timelineCard}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{charge.period_label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(charge.period_start)} to {formatDate(charge.period_end)}
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end sm:justify-start sm:gap-0.5">
                  <p className="text-sm font-bold text-gray-900 tabular-nums dark:text-white">{formatMoney(charge.amount)}</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span>{charge.trigger === "external" && charge.charged_by ? "Paid outside the portal" : TRIGGER_LABELS[charge.trigger]}{charge.charged_by ? ` (${charge.charged_by.name})` : ""}</span>
                {charge.card_label && <span>{charge.card_label}</span>}
                {charge.paid_at && <span>Paid {formatDate(charge.paid_at)}</span>}
                {charge.attempt_count > 1 && <span>{charge.attempt_count} attempts</span>}
                {charge.invoice && (
                  <Link href={`/admin/invoices/${charge.invoice.id}`} className="font-semibold text-brand-500 hover:underline">
                    Invoice #{charge.invoice.invoice_number}
                  </Link>
                )}
              </div>

              {charge.status === "failed" && charge.failure_message && (
                <div className={styles.failureBox}>
                  <strong>Declined:</strong> {charge.failure_message}
                  <br />
                  {charge.next_retry_at
                    ? `Automatic retry on ${formatDate(charge.next_retry_at, { month: "long", day: "numeric" })}.`
                    : "No more automatic retries. Charge manually or ask the client to pay the invoice."}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function daysLeftLabel(days_left: number): string {
  if (days_left < 0) return `Overdue by ${Math.abs(days_left)} day${days_left === -1 ? "" : "s"}`;
  if (days_left === 0) return "Due today";
  if (days_left === 1) return "Tomorrow";
  return `In ${days_left} days`;
}

/** Compact header: plan and price on the left, client and key figures on the right. */
function SubscriptionSummary({
  subscription,
  summary,
  is_active,
  is_past_due,
}: {
  subscription: AdminSeoSubscription;
  summary: AdminSeoSubscriptionSummary;
  is_active: boolean;
  is_past_due: boolean;
}) {
  const name = clientName(subscription);
  const card = subscription.payment_profile;
  const cycle = is_active ? billingCycleProgress(subscription.next_billing_date, subscription.billing_anchor_day) : null;
  const plan_class = !is_active
    ? detail_styles.isInactive
    : is_past_due || subscription.payment_health?.severity === "critical"
      ? detail_styles.isPastDue
      : "";
  const health = subscription.payment_health;
  const has_payment_issue = is_active && needsAttention(health);
  const status_tone = !is_active
    ? "neutral"
    : has_payment_issue
      ? health?.severity === "critical" ? "error" : "warning"
      : "success";
  const status_label = has_payment_issue && health ? HEALTH_STATE_LABELS[health.state] : is_past_due ? "Past due" : subscription.status;

  return (
    <section className={detail_styles.summary} aria-label="Subscription summary">
      <div className={`${detail_styles.summaryPlan} ${plan_class}`}>
        <p className={detail_styles.summaryPlanName} title={subscription.plan_name}>
          {subscription.plan_name}
        </p>
        <p className={detail_styles.summaryPrice}>
          {formatMoneyCompact(subscription.monthly_price)}
          <span>/ month</span>
        </p>
        {subscription.pricing_type === "custom" && subscription.package && (
          <p className={detail_styles.summaryCompare}>
            Listed {subscription.package.name} price: {formatMoneyCompact(subscription.package.price_per_month)}/mo
          </p>
        )}
      </div>

      <div className={detail_styles.summaryBody}>
        <div className={detail_styles.summaryClient}>
          <div className={detail_styles.summaryIdentity}>
            <span className={detail_styles.avatar} aria-hidden>
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className={detail_styles.identityName}>{name}</p>
              <p className={detail_styles.identityMeta}>
                {subscription.user.email}
                {subscription.user.company ? `, ${subscription.user.company}` : ""}
              </p>
            </div>
          </div>
          <div className={detail_styles.badges}>
            <span className={detail_styles.badge} data-tone={status_tone}>
              <span className={detail_styles.badgeDot} />
              {status_label}
            </span>
            {is_active && (
              <span className={detail_styles.badge}>{subscription.auto_renew ? "Auto renew on" : "Manual billing"}</span>
            )}
            {subscription.pricing_type === "custom" && (
              <span className={detail_styles.badge} data-tone="brand">
                Custom price
              </span>
            )}
          </div>
        </div>

        <dl className={detail_styles.stats}>
          <div className={detail_styles.stat}>
            <dt>{is_active ? "Next charge" : "Ended"}</dt>
            <dd>
              {is_active
                ? formatDate(subscription.next_billing_date)
                : formatDate(subscription.cancelled_at ?? subscription.ends_at)}
            </dd>
            {cycle && (
              <>
                <span className={detail_styles.statHint} data-tone={cycle.days_left < 0 ? "error" : undefined}>
                  {daysLeftLabel(cycle.days_left)}
                </span>
                <div
                  className={detail_styles.cycle}
                  role="progressbar"
                  aria-label="Current billing period"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(cycle.percent)}
                >
                  <span style={{ width: `${cycle.percent}%` }} />
                </div>
              </>
            )}
          </div>
          <div className={detail_styles.stat}>
            <dt>Total collected</dt>
            <dd>{formatMoney(summary.total_collected)}</dd>
            <span className={detail_styles.statHint}>Since {formatDate(subscription.starts_at)}</span>
          </div>
          <div className={detail_styles.stat}>
            <dt>Payments</dt>
            <dd>{summary.successful_count} paid</dd>
            <span className={detail_styles.statHint} data-tone={summary.failed_count > 0 ? "error" : undefined}>
              {summary.failed_count > 0 ? `${summary.failed_count} failed` : "No failed payments"}
            </span>
          </div>
          <div className={detail_styles.stat}>
            <dt>Renewal card</dt>
            <dd>{card ? `${cardBrandLabel(card.card_brand)} •••• ${card.last_four}` : "Default card"}</dd>
            <span className={detail_styles.statHint} data-tone={summary.card_on_file ? undefined : "error"}>
              {summary.card_on_file
                ? "Card on file"
                : subscription.payment_health?.card_issue === "expired"
                  ? "Saved cards expired"
                  : "No card on file"}
            </span>
          </div>
        </dl>
      </div>
    </section>
  );
}

function DetailSkeleton() {
  const block = "animate-pulse bg-gray-100 dark:bg-gray-800";
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className={`h-5 w-48 rounded ${block}`} />
      <div className={`h-36 rounded-2xl ${block}`} />
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-12">
        <div className={`h-72 rounded-2xl lg:col-span-7 ${block}`} />
        <div className={`h-72 rounded-2xl lg:col-span-5 ${block}`} />
      </div>
    </div>
  );
}

export default function AdminSeoSubscriptionDetail({ subscription_id, notice }: Props) {
  const [subscription, setSubscription] = useState<AdminSeoSubscription | null>(null);
  const [summary, setSummary] = useState<AdminSeoSubscriptionSummary | null>(null);
  const [cards, setCards] = useState<AdminClientPaymentProfile[]>([]);
  const [cards_loading, setCardsLoading] = useState(true);
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(
    () => (notice ? NOTICES[notice] ?? null : null)
  );
  const [saving_field, setSavingField] = useState<string | null>(null);
  const [next_date_draft, setNextDateDraft] = useState("");

  const [show_cancel, setShowCancel] = useState(false);

  const applyDetail = useCallback((detail: AdminSeoSubscriptionDetail) => {
    setSubscription(detail.data);
    setSummary(detail.summary);
    setNextDateDraft(detail.data.next_billing_date ?? "");
  }, []);

  // Refresh after an action (charge failed, cancelled).
  const loadDetail = useCallback(async () => {
    try {
      applyDetail(await adminSeoSubscriptionService.fetchSubscriptionDetail(subscription_id));
    } catch (err) {
      setToast({ tone: "error", text: extractApiError(err, "Failed to refresh this subscription.") });
    }
  }, [subscription_id, applyDetail]);

  useEffect(() => {
    let is_current = true;
    adminSeoSubscriptionService
      .fetchSubscriptionDetail(subscription_id)
      .then((detail) => {
        if (!is_current) return;
        applyDetail(detail);
        return adminSeoSubscriptionService
          .listClientPaymentProfiles(detail.data.user.id)
          .then((data) => is_current && setCards(data))
          .catch(() => is_current && setCards([]))
          .finally(() => is_current && setCardsLoading(false));
      })
      .catch((err) => is_current && setLoadError(extractApiError(err, "Failed to load this subscription.")))
      .finally(() => is_current && setIsLoading(false));
    return () => {
      is_current = false;
    };
  }, [subscription_id, applyDetail]);

  // Drop ?notice= from the URL so a refresh does not repeat the message.
  useEffect(() => {
    if (notice) window.history.replaceState(null, "", window.location.pathname);
  }, [notice]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function saveSettings(field: string, payload: UpdateSeoSubscriptionPayload, success_text: string) {
    if (!subscription) return;
    setSavingField(field);
    try {
      applyDetail(await adminSeoSubscriptionService.updateSubscription(subscription.id, payload));
      setToast({ tone: "success", text: success_text });
    } catch (err) {
      setToast({ tone: "error", text: extractApiError(err, "Could not save the change.") });
    } finally {
      setSavingField(null);
    }
  }

  if (is_loading) return <DetailSkeleton />;

  if (!subscription || !summary) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-300">{load_error ?? "Subscription not found."}</p>
        <Link href="/admin/seo-packages-subscriptions" className="mt-3 inline-block text-sm font-medium text-brand-500 hover:underline">
          Back to subscriptions
        </Link>
      </div>
    );
  }

  const is_active = subscription.status === "active";
  const is_past_due = is_active && subscription.payment_status === "past_due";
  const charges = subscription.charges ?? [];
  const card = subscription.payment_profile;
  const has_date_change = Boolean(next_date_draft) && next_date_draft !== subscription.next_billing_date;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Back link and actions */}
      <div className={detail_styles.toolbar}>
        <Link
          href="/admin/seo-packages-subscriptions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          All subscriptions
        </Link>
        {is_active && (
          <div className={detail_styles.toolbarActions}>
            <Link
              href={`/admin/seo-packages-subscriptions/${subscription.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit
              <span className="hidden sm:inline">subscription</span>
            </Link>
            <button
              onClick={() => setShowCancel(true)}
              className="inline-flex items-center rounded-xl border border-error-200 bg-white px-4 py-2 text-sm font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-500/30 dark:bg-gray-800 dark:text-error-400"
            >
              Cancel
              <span className="ml-1 hidden sm:inline">subscription</span>
            </button>
            <Link
              href={`/admin/seo-packages-subscriptions/${subscription.id}/charge`}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 sm:py-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              {is_past_due ? "Retry payment now" : "Charge now"}
            </Link>
          </div>
        )}
      </div>

      {/* Toast: pinned above the bottom edge on phones so it is visible after closing a modal */}
      {toast && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 rounded-xl border px-4 py-3 text-sm shadow-lg sm:static sm:inset-auto sm:z-auto sm:shadow-none ${
            toast.tone === "success"
              ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400"
              : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400"
          }`}
        >
          {toast.text}
        </div>
      )}

      <SubscriptionSummary
        subscription={subscription}
        summary={summary}
        is_active={is_active}
        is_past_due={is_past_due}
      />

      {/* Payment health: declined renewals, pending payments, missing card */}
      {is_active && subscription.payment_health && (
        <SubscriptionPaymentHealthCard
          subscription={subscription}
          health={subscription.payment_health}
          onCancel={() => setShowCancel(true)}
        />
      )}

      {/* Row 1: how billing works (left) and which card pays (right) */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-12">
        <Panel
          title="Billing settings"
          subtitle="Renewal, next charge date and client reminders."
          icon="settings"
          className="lg:col-span-7"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <AutoRenewSwitch
              is_on={subscription.auto_renew}
              disabled={!is_active || saving_field === "auto_renew"}
              onToggle={() =>
                saveSettings(
                  "auto_renew",
                  { auto_renew: !subscription.auto_renew },
                  subscription.auto_renew
                    ? "Auto renew turned off. The client will not be charged automatically."
                    : "Auto renew turned on. The card on file will be charged every month."
                )
              }
              description={
                subscription.auto_renew
                  ? `Charges ${formatMoneyCompact(subscription.monthly_price)} on the ${ordinal(subscription.billing_anchor_day ?? 1)} of every month.`
                  : subscription.auto_renew_disabled_at
                    ? `Turned off on ${formatDate(subscription.auto_renew_disabled_at)}. Charge manually with Charge now.`
                    : "Off. Charge each month manually with Charge now."
              }
            />

            <div>
              <label className={detail_styles.fieldLabel}>Next charge</label>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <DateField
                    value={next_date_draft}
                    min={todayIsoDate()}
                    disabled={!is_active}
                    aria_label="Next charge date"
                    onChange={(value) => setNextDateDraft(value || subscription.next_billing_date || "")}
                    marked_dates={summary.upcoming.map((item) => item.date)}
                    footer_hint="Later charges follow on the same day"
                  />
                </div>
                {has_date_change && (
                  <button
                    onClick={() =>
                      saveSettings("next_billing_date", { next_billing_date: next_date_draft }, "Billing date updated.")
                    }
                    disabled={saving_field === "next_billing_date"}
                    className="min-h-11 shrink-0 rounded-xl bg-brand-500 px-4 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    Save
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                Moving this date shifts every later charge to the same day of the month.
              </p>
            </div>

            <div className="md:col-span-2">
              <ReminderControl
                value={subscription.reminder_days_before || null}
                is_auto_renew={subscription.auto_renew}
                disabled={!is_active || saving_field === "reminder_days_before"}
                next_charge_date={subscription.next_billing_date}
                last_reminder_sent_for={subscription.last_reminder_sent_for}
                onChange={(days) =>
                  saveSettings(
                    "reminder_days_before",
                    { reminder_days_before: days },
                    days ? `Renewal reminder set to ${pluralDays(days)} before.` : "Renewal reminder email turned off."
                  )
                }
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Card used for renewals"
          subtitle={card ? "Charged on every renewal and on Charge now." : "Using the client's default card."}
          icon="card"
          action={!cards_loading && cards.length > 0 ? `${cards.length} saved` : undefined}
          className="lg:col-span-5"
        >
          <PaymentCardPicker
            cards={cards}
            is_loading={cards_loading}
            selected_id={subscription.payment_profile_id}
            onSelect={(card_id) =>
              is_active &&
              card_id !== subscription.payment_profile_id &&
              saveSettings("payment_profile_id", { payment_profile_id: card_id }, "Renewal card updated.")
            }
          />
        </Panel>
      </div>

      {/* Row 2: what happened (left) and what comes next (right) */}
      <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-12">
        <Panel
          title="Payment history"
          subtitle="Every billing period with its invoice and result."
          icon="history"
          action={`${charges.length} period${charges.length === 1 ? "" : "s"}`}
          className="lg:col-span-7"
        >
          <ChargeTimeline charges={charges} />
        </Panel>

        <div className="space-y-5 sm:space-y-6 lg:col-span-5">
          {is_active && summary.upcoming.length > 0 && (
            <Panel title="Upcoming charges" subtitle="The next scheduled payments." icon="calendar">
              <ul className={detail_styles.upcoming}>
                {summary.upcoming.map((item, index) => (
                  <li key={item.date} className={detail_styles.upcomingItem}>
                    <span className={detail_styles.calendarTile} aria-hidden>
                      <span>{formatDate(item.date, { month: "short" })}</span>
                      <span>{formatDate(item.date, { day: "numeric" })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{item.period_label}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {index === 0
                          ? subscription.auto_renew ? "Charged automatically" : "Waiting for a manual charge"
                          : subscription.auto_renew ? "Auto renewal" : "Manual"}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-gray-900 tabular-nums dark:text-white">
                      {formatMoneyCompact(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Details" icon="details">
            <dl className={detail_styles.details}>
              <div className={detail_styles.detailItem}>
                <dt>Started</dt>
                <dd>{formatDate(subscription.starts_at)}</dd>
              </div>
              <div className={detail_styles.detailItem}>
                <dt>Ends</dt>
                <dd>{subscription.ends_at ? formatDate(subscription.ends_at) : "Ongoing"}</dd>
              </div>
              <div className={detail_styles.detailItem}>
                <dt>Activated</dt>
                <dd>{formatDate(subscription.created_at)}</dd>
              </div>
              <div className={detail_styles.detailItem}>
                <dt>Billing day</dt>
                <dd>{subscription.billing_anchor_day ? `${ordinal(subscription.billing_anchor_day)} of the month` : "Not set"}</dd>
              </div>
              <div className={`${detail_styles.detailItem} ${detail_styles.isWide}`}>
                <dt>Invoice line</dt>
                <dd>Month - {subscription.invoice_item_label}</dd>
              </div>
            </dl>
            {subscription.notes && <p className={detail_styles.notes}>{subscription.notes}</p>}
          </Panel>
        </div>
      </div>

      {show_cancel && (
        <CancelSubscriptionModal
          subscription={subscription}
          open_invoices={summary.open_invoices ?? []}
          onClose={() => setShowCancel(false)}
          onCancelled={() => {
            setShowCancel(false);
            setToast({ tone: "success", text: "Subscription cancelled. No further charges will be made." });
            loadDetail();
          }}
        />
      )}
    </div>
  );
}
