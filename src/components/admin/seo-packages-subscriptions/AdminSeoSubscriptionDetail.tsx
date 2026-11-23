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
import { AutoRenewSwitch, PaymentCardPicker, ReminderControl } from "./SubscriptionBillingControls";
import { CancelSubscriptionModal, ChargeNowModal } from "./SubscriptionModals";
import {
  CHARGE_STATUS_CONFIG,
  clientName,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  initials,
  ordinal,
  todayIsoDate,
} from "./subscription-format";
import styles from "./SeoSubscriptionBilling.module.scss";

interface Props {
  subscription_id: number;
  /** Set by the create and edit pages after a redirect. */
  notice?: string;
}

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  activated: { tone: "success", text: "Subscription activated. The billing schedule is shown below." },
  activated_charged: { tone: "success", text: "Subscription activated and the first payment was collected." },
  activated_charge_failed: {
    tone: "error",
    text: "Subscription activated, but the first charge failed. See the payment history below for the reason.",
  },
  updated: { tone: "success", text: "Subscription updated. Changes apply from the next payment." },
};

const TRIGGER_LABELS: Record<AdminSeoSubscriptionCharge["trigger"], string> = {
  automatic: "Auto renewal",
  manual: "Charged by admin",
  external: "Paid by client",
};

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ChargeTimeline({ charges }: { charges: AdminSeoSubscriptionCharge[] }) {
  if (charges.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{charge.period_label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(charge.period_start)} to {formatDate(charge.period_end)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 tabular-nums dark:text-white">{formatMoney(charge.amount)}</p>
                  <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{TRIGGER_LABELS[charge.trigger]}{charge.charged_by ? ` (${charge.charged_by.name})` : ""}</span>
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

  const [show_charge, setShowCharge] = useState(false);
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

  if (is_loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-56 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100 lg:col-span-2 dark:bg-gray-800" />
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

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
  const name = clientName(subscription);
  const charges = subscription.charges ?? [];
  const failed_charge = charges.find((c) => c.status === "failed");
  const card = subscription.payment_profile;
  const hero_class = !is_active ? styles.isInactive : is_past_due ? styles.isPastDue : "";

  return (
    <div className="space-y-6">
      {/* Breadcrumb and actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/seo-packages-subscriptions/${subscription.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit subscription
            </Link>
            <button
              onClick={() => setShowCancel(true)}
              className="rounded-xl border border-error-200 bg-white px-4 py-2 text-sm font-medium text-error-600 transition-colors hover:bg-error-50 dark:border-error-500/30 dark:bg-gray-800 dark:text-error-400"
            >
              Cancel subscription
            </button>
            <button
              onClick={() => setShowCharge(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              {is_past_due ? "Retry payment now" : "Charge now"}
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.tone === "success"
              ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400"
              : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Hero */}
      <section className={`${styles.hero} ${hero_class}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-base font-bold backdrop-blur">
              {initials(name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{name}</p>
              <p className="truncate text-sm opacity-80">
                {subscription.user.email}
                {subscription.user.company ? ` · ${subscription.user.company}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={styles.heroPill}>
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {is_past_due ? "Past due" : subscription.status}
            </span>
            {is_active && (
              <span className={styles.heroPill}>{subscription.auto_renew ? "Auto renew on" : "Manual billing"}</span>
            )}
            {subscription.pricing_type === "custom" && <span className={styles.heroPill}>Custom price</span>}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium opacity-85">{subscription.plan_name}</p>
          <p className={`${styles.heroAmount} mt-1`}>
            {formatMoneyCompact(subscription.monthly_price)}
            <span>/ month</span>
          </p>
          {subscription.pricing_type === "custom" && subscription.package && (
            <p className="mt-1.5 text-xs opacity-75">
              Listed {subscription.package.name} price: {formatMoneyCompact(subscription.package.price_per_month)}/mo
            </p>
          )}
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <p>{is_active ? "Next charge" : "Ended"}</p>
            <p>
              {is_active
                ? formatDate(subscription.next_billing_date, { month: "long", day: "numeric", year: "numeric" })
                : formatDate(subscription.cancelled_at ?? subscription.ends_at)}
            </p>
          </div>
          <div className={styles.heroStat}>
            <p>Total collected</p>
            <p>{formatMoney(summary.total_collected)}</p>
          </div>
          <div className={styles.heroStat}>
            <p>Payments</p>
            <p>
              {summary.successful_count} paid
              {summary.failed_count > 0 ? ` · ${summary.failed_count} failed` : ""}
            </p>
          </div>
        </div>
      </section>

      {/* Past due alert */}
      {is_past_due && failed_charge && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning-200 bg-warning-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-warning-500/20 dark:bg-warning-500/10">
          <div className="text-sm text-warning-800 dark:text-warning-300">
            <p className="font-semibold">The {failed_charge.period_label} payment failed.</p>
            <p className="mt-0.5">
              {failed_charge.failure_message}{" "}
              {failed_charge.next_retry_at
                ? `It will be retried automatically on ${formatDate(failed_charge.next_retry_at, { month: "long", day: "numeric" })}.`
                : "Automatic retries have stopped."}{" "}
              The client was emailed a link to pay the invoice.
            </p>
          </div>
          {failed_charge.invoice && (
            <Link
              href={`/admin/invoices/${failed_charge.invoice.id}`}
              className="shrink-0 rounded-xl border border-warning-300 bg-white px-3.5 py-2 text-sm font-medium text-warning-800 hover:bg-warning-100 dark:border-warning-500/30 dark:bg-transparent dark:text-warning-300"
            >
              View invoice #{failed_charge.invoice.invoice_number}
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment history */}
        <div className="lg:col-span-2">
          <Panel
            title="Payment history"
            action={<span className="text-xs text-gray-400">{charges.length} billing period{charges.length === 1 ? "" : "s"}</span>}
          >
            <ChargeTimeline charges={charges} />
          </Panel>
        </div>

        {/* Billing settings */}
        <div className="space-y-6">
          <Panel title="Billing settings">
            <div className="space-y-5">
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Card used for renewals</p>
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
                {!card && cards.length > 0 && (
                  <p className="mt-1.5 text-xs text-gray-400">Using the client&apos;s default card.</p>
                )}
              </div>

              <div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">Next charge</label>
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
                    {next_date_draft && next_date_draft !== subscription.next_billing_date && (
                      <button
                        onClick={() =>
                          saveSettings("next_billing_date", { next_billing_date: next_date_draft }, "Billing date updated.")
                        }
                        disabled={saving_field === "next_billing_date"}
                        className="rounded-xl bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                      >
                        Save
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <ReminderControl
                value={subscription.reminder_days_before || null}
                is_auto_renew={subscription.auto_renew}
                disabled={!is_active || saving_field === "reminder_days_before"}
                onChange={(days) =>
                  saveSettings(
                    "reminder_days_before",
                    { reminder_days_before: days },
                    days ? `Renewal reminder set to ${days} day${days === 1 ? "" : "s"} before.` : "Renewal reminder email turned off."
                  )
                }
              />
            </div>
          </Panel>

          {is_active && summary.upcoming.length > 0 && (
            <Panel title="Upcoming charges">
              <ul className={styles.upcoming}>
                {summary.upcoming.map((item, index) => (
                  <li key={item.date} className={styles.upcomingItem}>
                    <span className={styles.calendarTile}>
                      <span>{formatDate(item.date, { month: "short" })}</span>
                      <span>{formatDate(item.date, { day: "numeric" })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900 dark:text-white">{item.period_label}</span>
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

          <Panel title="Details">
            <dl className="space-y-3 text-sm">
              {[
                ["Started", formatDate(subscription.starts_at)],
                ["Ends", subscription.ends_at ? formatDate(subscription.ends_at) : "Ongoing"],
                ["Invoice line", `Month - ${subscription.invoice_item_label}`],
                ["Activated", formatDate(subscription.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="text-right font-medium text-gray-900 dark:text-white">{value}</dd>
                </div>
              ))}
              {subscription.notes && (
                <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {subscription.notes}
                </div>
              )}
            </dl>
          </Panel>
        </div>
      </div>

      {show_charge && (
        <ChargeNowModal
          subscription={subscription}
          cards={cards}
          onClose={() => setShowCharge(false)}
          onFailed={() => loadDetail()}
          onCharged={(detail) => {
            applyDetail(detail);
            setShowCharge(false);
            setToast({ tone: "success", text: detail.message ?? "Payment collected." });
          }}
        />
      )}
      {show_cancel && (
        <CancelSubscriptionModal
          subscription={subscription}
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
