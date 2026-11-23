"use client";

import React, { useEffect, useState } from "react";
import {
  adminSeoSubscriptionService,
  extractApiError,
} from "@/services/admin/seo-packages-subscription.service";
import type {
  AdminClientPaymentProfile,
  AdminSeoSubscription,
  AdminSeoSubscriptionDetail,
  SeoSubscriptionPricingType,
} from "@/services/admin/seo-packages-subscription.service";
import { listAdminSeoPackages } from "@/services/admin/seo-packages.service";
import type { AdminSeoPackage } from "@/types/admin/seo-packages";
import { cardBrandLabel, clientName, formatDate, formatMoney, formatMoneyCompact, todayIsoDate } from "./subscription-format";
import styles from "./SeoSubscriptionBilling.module.scss";

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function ModalShell({
  children,
  onClose,
  max_width = "max-w-md",
}: {
  children: React.ReactNode;
  onClose: () => void;
  max_width?: string;
}) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-99999 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[94vh] w-full ${max_width} overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-gray-900`}>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mt-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
      {message}
    </div>
  );
}

// ── Charge now ─────────────────────────────────────────────────────────────────

export function ChargeNowModal({
  subscription,
  cards,
  onClose,
  onCharged,
  onFailed,
}: {
  subscription: AdminSeoSubscription;
  cards: AdminClientPaymentProfile[];
  onClose: () => void;
  onCharged: (detail: AdminSeoSubscriptionDetail) => void;
  onFailed?: () => void;
}) {
  const usable_cards = cards.filter((c) => !c.is_expired);
  const preferred =
    usable_cards.find((c) => c.id === subscription.payment_profile_id) ??
    usable_cards.find((c) => c.is_default) ??
    usable_cards[0];
  const [card_id, setCardId] = useState<string>(preferred?.id ?? "");
  const [is_charging, setIsCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const period_date = subscription.next_billing_date;
  const period_label = formatDate(period_date, { month: "long", year: "numeric" });
  const is_early = !!period_date && period_date > todayIsoDate();

  async function handleConfirm() {
    setIsCharging(true);
    setError(null);
    try {
      const detail = await adminSeoSubscriptionService.chargeNow(subscription.id, card_id || null);
      onCharged(detail);
    } catch (err) {
      setError(extractApiError(err, "The card could not be charged. Please try again."));
      onFailed?.();
    } finally {
      setIsCharging(false);
    }
  }

  return (
    <ModalShell onClose={() => !is_charging && onClose()}>
      <div className="p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 text-white shadow-sm">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Charge {formatMoneyCompact(subscription.monthly_price)} now?
        </h3>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          This bills the <strong className="text-gray-700 dark:text-gray-200">{period_label}</strong> period of{" "}
          {clientName(subscription)}&apos;s {subscription.plan_name} subscription. An invoice is created and marked as paid,
          and the client gets a payment confirmation email.
        </p>

        {is_early && (
          <div className="mt-4 rounded-xl border border-blue-light-200 bg-blue-light-50 px-3.5 py-2.5 text-xs leading-relaxed text-blue-light-800 dark:border-blue-light-500/20 dark:bg-blue-light-500/10 dark:text-blue-light-300">
            This period is not due until {formatDate(period_date, { month: "long", day: "numeric" })}. Charging now
            moves the next charge one month forward, so the client is never billed twice for {period_label}.
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Charge to</p>
          {usable_cards.length === 0 ? (
            <p className="rounded-xl bg-warning-50 px-3.5 py-2.5 text-sm text-warning-800 dark:bg-warning-500/10 dark:text-warning-300">
              No valid card on file. The client can pay the invoice from their portal instead.
            </p>
          ) : (
            <div className="space-y-2">
              {usable_cards.map((card) => (
                <label
                  key={card.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 text-sm transition-colors ${
                    card_id === card.id
                      ? "border-brand-400 bg-brand-50/60 dark:border-brand-500/50 dark:bg-brand-500/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="charge_card"
                      checked={card_id === card.id}
                      onChange={() => setCardId(card.id)}
                      className="h-4 w-4 border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {cardBrandLabel(card.card_brand)} •••• {card.last_four}
                    </span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {card.expiry_month}/{String(card.expiry_year).slice(-2)}
                    {card.is_default ? " · Default" : ""}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <ErrorBox message={error} />
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3 dark:border-gray-800">
        <button
          onClick={onClose}
          disabled={is_charging}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          Not now
        </button>
        <button
          onClick={handleConfirm}
          disabled={is_charging || usable_cards.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {is_charging ? (
            <>
              <Spinner /> Charging…
            </>
          ) : (
            `Charge ${formatMoney(subscription.monthly_price)}`
          )}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Cancel subscription ────────────────────────────────────────────────────────

export function CancelSubscriptionModal({
  subscription,
  onClose,
  onCancelled,
}: {
  subscription: AdminSeoSubscription;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [is_cancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsCancelling(true);
    setError(null);
    try {
      await adminSeoSubscriptionService.cancelSubscription(subscription.id, { notes: notes.trim() || undefined });
      onCancelled();
    } catch (err) {
      setError(extractApiError(err, "Failed to cancel the subscription. Please try again."));
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <ModalShell onClose={() => !is_cancelling && onClose()} max_width="max-w-sm">
      <div className="p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
          <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">Cancel subscription?</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {clientName(subscription)} will not be charged again for {subscription.plan_name}, and any pending payment retries
          stop. Past invoices and the payment history are kept. This cannot be undone.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Reason (optional, internal)"
          className="mt-4 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <ErrorBox message={error} />
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3 dark:border-gray-800">
        <button onClick={onClose} disabled={is_cancelling} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Keep active
        </button>
        <button onClick={handleConfirm} disabled={is_cancelling} className="inline-flex items-center justify-center gap-2 rounded-xl bg-error-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-error-600 disabled:opacity-60">
          {is_cancelling ? (<><Spinner /> Cancelling…</>) : "Yes, cancel"}
        </button>
      </div>
    </ModalShell>
  );
}
