"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
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
} from "@/services/admin/seo-packages-subscription.service";
import {
  cardBrandLabel,
  clientName,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  initials,
  todayIsoDate,
} from "./subscription-format";
import { resolvePaymentError, type ResolvedPaymentError } from "./payment-errors";
import styles from "./SubscriptionCheckout.module.scss";

// ── Types ────────────────────────────────────────────────────────────────────

type CheckoutStep = "method" | "review" | "result";

type PaymentOutcome =
  | { status: "succeeded"; detail: AdminSeoSubscriptionDetail; card: AdminClientPaymentProfile | null }
  | {
      status: "failed";
      error: ResolvedPaymentError;
      charge: AdminSeoSubscriptionCharge | null;
      card: AdminClientPaymentProfile | null;
    };

const STEPS: Array<{ key: CheckoutStep; label: string; hint: string }> = [
  { key: "method", label: "Payment method", hint: "Choose the client's card" },
  { key: "review", label: "Review", hint: "Check and confirm" },
  { key: "result", label: "Confirmation", hint: "Payment result" },
];

// ── Icons ────────────────────────────────────────────────────────────────────

const ICON_PATHS = {
  back: "M15.75 19.5L8.25 12l7.5-7.5",
  forward: "M8.25 4.5l7.5 7.5-7.5 7.5",
  check: "M4.5 12.75l6 6 9-13.5",
  close: "M6 18L18 6M6 6l12 12",
  lock: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  shield:
    "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  info: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
  alert: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
  card: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  invoice:
    "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  mail: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  calendar:
    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  refresh:
    "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99",
  bolt: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
} as const;

function Icon({ d, stroke_width = 2 }: { d: string; stroke_width?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke_width} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function joinClasses(...class_names: Array<string | false | null | undefined>): string {
  return class_names.filter(Boolean).join(" ");
}

function cardExpiryLabel(card: AdminClientPaymentProfile): string {
  return `${String(card.expiry_month).padStart(2, "0")}/${String(card.expiry_year).slice(-2)}`;
}

/** True when the card expires this month or next month. */
function isExpiringSoon(card: AdminClientPaymentProfile): boolean {
  const now = new Date();
  const months_left =
    (Number(card.expiry_year) - now.getFullYear()) * 12 + (Number(card.expiry_month) - (now.getMonth() + 1));
  return months_left >= 0 && months_left <= 1;
}

function cardShortLabel(card: AdminClientPaymentProfile | null): string {
  if (!card) return "Card on file";
  return `${cardBrandLabel(card.card_brand)} ending in ${card.last_four}`;
}

function brandKey(brand: string | null | undefined): string {
  const key = (brand ?? "").toLowerCase();
  return ["visa", "mastercard", "amex", "discover"].includes(key) ? key : "generic";
}

/** Short Stripe reference, e.g. "pi_3Q...a91F", easy to read and to copy. */
function shortReference(reference: string | null | undefined): string | null {
  if (!reference) return null;
  return reference.length > 16 ? `${reference.slice(0, 7)}...${reference.slice(-4)}` : reference;
}

// ── Small building blocks ────────────────────────────────────────────────────

function Notice({ tone, children }: { tone: "info" | "warning" | "error"; children: ReactNode }) {
  return (
    <div className={joinClasses(styles.notice, styles[`notice_${tone}`])} role={tone === "error" ? "alert" : undefined}>
      <Icon d={tone === "info" ? ICON_PATHS.info : ICON_PATHS.alert} />
      <span>{children}</span>
    </div>
  );
}

function Stepper({ current, outcome }: { current: CheckoutStep; outcome: PaymentOutcome | null }) {
  const current_index = STEPS.findIndex((step) => step.key === current);
  return (
    <ol className={styles.stepper} aria-label="Payment steps">
      {STEPS.map((step, index) => {
        const is_done = index < current_index || (step.key === "result" && outcome?.status === "succeeded");
        const is_failed = step.key === "result" && outcome?.status === "failed";
        const is_current = index === current_index;
        const state = is_failed ? "failed" : is_done ? "done" : is_current ? "current" : "upcoming";
        return (
          <li
            key={step.key}
            className={styles.step}
            data-state={state}
            aria-current={is_current ? "step" : undefined}
          >
            <span className={styles.step_marker} aria-hidden="true">
              {state === "done" ? (
                <Icon d={ICON_PATHS.check} stroke_width={3} />
              ) : state === "failed" ? (
                <Icon d={ICON_PATHS.close} stroke_width={3} />
              ) : (
                index + 1
              )}
            </span>
            <span className={styles.step_text}>
              <span className={styles.step_label}>{step.label}</span>
              <span className={styles.step_hint}>{step.hint}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Small brand thumbnail shown next to each card option. */
function CardThumb({ card }: { card: AdminClientPaymentProfile }) {
  return (
    <span className={styles.card_thumb} data-brand={brandKey(card.card_brand)} aria-hidden="true">
      <span className={styles.card_thumb_chip} />
      <span className={styles.card_thumb_brand}>{cardBrandLabel(card.card_brand)}</span>
    </span>
  );
}

function OrderSummary({
  subscription,
  period_label,
  card,
  is_paid,
}: {
  subscription: AdminSeoSubscription;
  period_label: string;
  card: AdminClientPaymentProfile | null;
  is_paid: boolean;
}) {
  const name = clientName(subscription);
  return (
    <aside className={styles.summary} aria-label="Order summary">
      <div className={styles.summary_hero}>
        <span className={styles.summary_hero_label}>{is_paid ? "Amount paid" : "Total due today"}</span>
        <span className={styles.summary_hero_amount}>{formatMoney(subscription.monthly_price)}</span>
        <span className={styles.summary_hero_caption}>USD, one billing period</span>
      </div>

      <div className={styles.summary_body}>
        <div className={styles.summary_client}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(name)}
          </span>
          <span className={styles.summary_client_text}>
            <span className={styles.summary_client_name} title={name}>
              {name}
            </span>
            <span className={styles.summary_client_meta} title={subscription.user.email}>
              {subscription.user.email}
            </span>
          </span>
        </div>

        <dl className={styles.summary_lines}>
          <div>
            <dt>Plan</dt>
            <dd title={subscription.plan_name}>{subscription.plan_name}</dd>
          </div>
          <div>
            <dt>Billing period</dt>
            <dd>{period_label}</dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{formatDate(subscription.next_billing_date)}</dd>
          </div>
          <div>
            <dt>Card</dt>
            <dd>{card ? `•••• ${card.last_four}` : "Not selected"}</dd>
          </div>
        </dl>

        <div className={styles.summary_total}>
          <span>Total</span>
          <span>{formatMoney(subscription.monthly_price)}</span>
        </div>

        <p className={styles.summary_secure}>
          <Icon d={ICON_PATHS.lock} />
          Encrypted and processed by Stripe. Full card numbers are never stored or shown.
        </p>
      </div>
    </aside>
  );
}

// ── Steps ────────────────────────────────────────────────────────────────────

function MethodStep({
  subscription,
  usable_cards,
  hidden_expired_count,
  selected_card_id,
  onSelect,
  onContinue,
}: {
  subscription: AdminSeoSubscription;
  usable_cards: AdminClientPaymentProfile[];
  hidden_expired_count: number;
  selected_card_id: string;
  onSelect: (card_id: string) => void;
  onContinue: () => void;
}) {
  const name = clientName(subscription);
  const heading_id = useId();
  const has_cards = usable_cards.length > 0;

  return (
    <section className={styles.panel} aria-labelledby={heading_id}>
      <header className={styles.panel_header}>
        <span className={styles.panel_icon} aria-hidden="true">
          <Icon d={ICON_PATHS.card} stroke_width={1.8} />
        </span>
        <div>
          <h2 id={heading_id} className={styles.panel_title}>
            Choose a payment method
          </h2>
          <p className={styles.panel_subtitle}>Active cards saved on {name}&apos;s account.</p>
        </div>
      </header>

      <p className={styles.privacy_note}>
        <Icon d={ICON_PATHS.shield} />
        <span>
          Only cards that belong to <strong>{name}</strong> are listed. Cards from other clients are never shown
          or charged.
        </span>
      </p>

      {has_cards ? (
        <fieldset className={styles.card_grid}>
          <legend className="sr-only">Card to charge</legend>
          {usable_cards.map((card) => {
            const is_selected = card.id === selected_card_id;
            return (
              <label
                key={card.id}
                className={joinClasses(styles.card_option, is_selected && styles.card_option_selected)}
              >
                <input
                  type="radio"
                  name="checkout_card"
                  value={card.id}
                  checked={is_selected}
                  onChange={() => onSelect(card.id)}
                  className={styles.visually_hidden_input}
                />
                <CardThumb card={card} />
                <span className={styles.card_option_body}>
                  <span className={styles.card_option_text}>
                    <span className={styles.card_option_title}>
                      {cardBrandLabel(card.card_brand)} <span className={styles.card_digits}>•••• {card.last_four}</span>
                    </span>
                    <span className={styles.card_option_meta}>
                      {card.cardholder_name ? `${card.cardholder_name}, ` : ""}Expires {cardExpiryLabel(card)}
                    </span>
                  </span>
                  <span className={styles.card_option_tags}>
                    {card.is_default && <span className={styles.tag}>Default</span>}
                    {card.id === subscription.payment_profile_id && (
                      <span className={joinClasses(styles.tag, styles.tag_brand)}>Renewal card</span>
                    )}
                    {isExpiringSoon(card) && (
                      <span className={joinClasses(styles.tag, styles.tag_warning)}>Expires soon</span>
                    )}
                  </span>
                  <span className={styles.radio_mark} aria-hidden="true">
                    <Icon d={ICON_PATHS.check} stroke_width={3} />
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      ) : (
        <div className={styles.empty}>
          <span className={styles.empty_icon} aria-hidden="true">
            <Icon d={ICON_PATHS.card} stroke_width={1.6} />
          </span>
          <p className={styles.empty_title}>No active card on file</p>
          <p className={styles.empty_text}>
            {name} has no valid card saved. Ask the client to add a card from their portal, or to pay the invoice
            directly.
          </p>
        </div>
      )}

      {hidden_expired_count > 0 && (
        <Notice tone="warning">
          {hidden_expired_count} expired {hidden_expired_count === 1 ? "card is" : "cards are"} hidden because{" "}
          {hidden_expired_count === 1 ? "it" : "they"} can no longer be charged.
        </Notice>
      )}

      <div className={styles.panel_actions}>
        <Link href={`/admin/seo-packages-subscriptions/${subscription.id}`} className={styles.button_ghost}>
          Cancel
        </Link>
        <button
          type="button"
          className={styles.button_primary}
          disabled={!has_cards || !selected_card_id}
          onClick={onContinue}
        >
          Continue to review
          <Icon d={ICON_PATHS.forward} />
        </button>
      </div>
    </section>
  );
}

function ReviewStep({
  subscription,
  card,
  period_label,
  is_early,
  is_processing,
  onBack,
  onConfirm,
}: {
  subscription: AdminSeoSubscription;
  card: AdminClientPaymentProfile;
  period_label: string;
  is_early: boolean;
  is_processing: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [is_authorized, setIsAuthorized] = useState(false);
  const heading_id = useId();
  const confirm_id = useId();
  const name = clientName(subscription);

  const outcomes = [
    { icon: ICON_PATHS.invoice, text: `An invoice for ${period_label} is created and marked as paid.` },
    { icon: ICON_PATHS.mail, text: `${name} receives a payment confirmation email.` },
    { icon: ICON_PATHS.calendar, text: "The next charge date moves one month forward." },
  ];

  return (
    <section className={styles.panel} aria-labelledby={heading_id} aria-busy={is_processing}>
      <header className={styles.panel_header}>
        <span className={styles.panel_icon} aria-hidden="true">
          <Icon d={ICON_PATHS.shield} stroke_width={1.8} />
        </span>
        <div>
          <h2 id={heading_id} className={styles.panel_title}>
            Review and confirm
          </h2>
          <p className={styles.panel_subtitle}>Check every detail before charging the card.</p>
        </div>
      </header>

      <div className={styles.review_card}>
        <div className={styles.review_row}>
          <span className={styles.review_label}>Charge</span>
          <span className={styles.review_value_big}>{formatMoney(subscription.monthly_price)}</span>
        </div>
        <div className={styles.review_row}>
          <span className={styles.review_label}>Client</span>
          <span className={styles.review_value}>{name}</span>
        </div>
        <div className={styles.review_row}>
          <span className={styles.review_label}>Plan</span>
          <span className={styles.review_value}>{subscription.plan_name}</span>
        </div>
        <div className={styles.review_row}>
          <span className={styles.review_label}>Period</span>
          <span className={styles.review_value}>{period_label}</span>
        </div>
        <div className={styles.review_row}>
          <span className={styles.review_label}>Card</span>
          <span className={styles.review_value}>
            <span className={styles.brand_dot} data-brand={brandKey(card.card_brand)} aria-hidden="true" />
            {cardShortLabel(card)}
            <button type="button" className={styles.link_button} onClick={onBack} disabled={is_processing}>
              Change
            </button>
          </span>
        </div>
      </div>

      {is_early && (
        <Notice tone="info">
          This period is not due until{" "}
          {formatDate(subscription.next_billing_date, { month: "long", day: "numeric" })}. Charging now moves the
          next charge one month forward, so the client is never billed twice for {period_label}.
        </Notice>
      )}

      <div>
        <p className={styles.section_label}>What happens next</p>
        <ul className={styles.outcomes}>
          {outcomes.map((outcome) => (
            <li key={outcome.text}>
              <span className={styles.outcome_icon} aria-hidden="true">
                <Icon d={outcome.icon} stroke_width={1.8} />
              </span>
              {outcome.text}
            </li>
          ))}
        </ul>
      </div>

      <label htmlFor={confirm_id} className={joinClasses(styles.consent, is_authorized && styles.consent_checked)}>
        <input
          id={confirm_id}
          type="checkbox"
          checked={is_authorized}
          disabled={is_processing}
          onChange={(event) => setIsAuthorized(event.target.checked)}
        />
        <span className={styles.consent_box} aria-hidden="true">
          <Icon d={ICON_PATHS.check} stroke_width={3} />
        </span>
        <span>
          I confirm that {name} authorized this charge of{" "}
          <strong>{formatMoney(subscription.monthly_price)}</strong> to their {cardShortLabel(card)}.
        </span>
      </label>

      <div className={styles.panel_actions}>
        <button type="button" className={styles.button_ghost} onClick={onBack} disabled={is_processing}>
          <Icon d={ICON_PATHS.back} />
          Back
        </button>
        <button
          type="button"
          className={joinClasses(styles.button_primary, styles.button_pay)}
          disabled={!is_authorized || is_processing}
          onClick={onConfirm}
        >
          {is_processing ? <SpinnerIcon /> : <Icon d={ICON_PATHS.lock} />}
          {is_processing ? "Processing payment..." : `Pay ${formatMoney(subscription.monthly_price)}`}
        </button>
      </div>

      {is_processing && (
        <div className={styles.processing} role="status" aria-live="polite">
          <span className={styles.processing_orb} aria-hidden="true">
            <span />
            <span />
            <Icon d={ICON_PATHS.card} stroke_width={1.8} />
          </span>
          <p className={styles.processing_title}>Processing payment</p>
          <p className={styles.processing_text}>Contacting the bank. Please keep this page open.</p>
        </div>
      )}
    </section>
  );
}

function SuccessResult({
  subscription_id,
  detail,
  card,
}: {
  subscription_id: number;
  detail: AdminSeoSubscriptionDetail;
  card: AdminClientPaymentProfile | null;
}) {
  const heading_ref = useRef<HTMLHeadingElement>(null);
  const charge = detail.charge ?? detail.data.charges?.find((item) => item.status === "succeeded") ?? null;
  const reference = shortReference(charge?.payment_intent_id);

  useEffect(() => {
    heading_ref.current?.focus();
  }, []);

  return (
    <section className={joinClasses(styles.panel, styles.result)} data-tone="success" aria-live="polite">
      <div className={styles.result_badge} aria-hidden="true">
        <svg viewBox="0 0 52 52">
          <circle className={styles.result_circle} cx="26" cy="26" r="24" fill="none" />
          <path className={styles.result_check} fill="none" d="M15 27l7 7 15-16" />
        </svg>
      </div>
      <p className={styles.result_eyebrow}>Payment successful</p>
      <h2 ref={heading_ref} tabIndex={-1} className={styles.result_title}>
        {formatMoney(charge?.amount ?? detail.data.monthly_price)} collected
      </h2>
      <p className={styles.result_text}>
        {detail.message ?? "The payment was approved."} A confirmation email is on its way to the client.
      </p>

      <dl className={styles.receipt}>
        <div>
          <dt>Billing period</dt>
          <dd>{charge?.period_label ?? "Current period"}</dd>
        </div>
        <div>
          <dt>Paid on</dt>
          <dd>{formatDate(charge?.paid_at ?? todayIsoDate(), { month: "long", day: "numeric", year: "numeric" })}</dd>
        </div>
        <div>
          <dt>Card</dt>
          <dd>{charge?.card_label ?? cardShortLabel(card)}</dd>
        </div>
        <div>
          <dt>Invoice</dt>
          <dd>{charge?.invoice ? `#${charge.invoice.invoice_number}` : "Created"}</dd>
        </div>
        <div>
          <dt>Next charge</dt>
          <dd>{formatDate(detail.data.next_billing_date)}</dd>
        </div>
        {reference && (
          <div>
            <dt>Reference</dt>
            <dd className={styles.mono} title={charge?.payment_intent_id ?? undefined}>
              {reference}
            </dd>
          </div>
        )}
      </dl>

      <div className={styles.result_actions}>
        {charge?.invoice && (
          <Link href={`/admin/invoices/${charge.invoice.id}`} className={styles.button_ghost}>
            <Icon d={ICON_PATHS.invoice} stroke_width={1.8} />
            View invoice
          </Link>
        )}
        <Link
          href={`/admin/seo-packages-subscriptions/${subscription_id}?notice=charged`}
          className={styles.button_primary}
        >
          Back to subscription
          <Icon d={ICON_PATHS.forward} />
        </Link>
      </div>
    </section>
  );
}

function FailedResult({
  subscription_id,
  error,
  charge,
  card,
  has_other_cards,
  onRetry,
  onChooseOtherCard,
}: {
  subscription_id: number;
  error: ResolvedPaymentError;
  charge: AdminSeoSubscriptionCharge | null;
  card: AdminClientPaymentProfile | null;
  has_other_cards: boolean;
  onRetry: () => void;
  onChooseOtherCard: () => void;
}) {
  const heading_ref = useRef<HTMLHeadingElement>(null);
  const is_conflict = error.kind === "conflict" || error.code === "network_error";
  const show_other_card = error.suggests_other_card && has_other_cards;

  useEffect(() => {
    heading_ref.current?.focus();
  }, []);

  return (
    <section
      className={joinClasses(styles.panel, styles.result)}
      data-tone={is_conflict ? "warning" : "error"}
      role="alert"
    >
      <div className={styles.result_badge} aria-hidden="true">
        <svg viewBox="0 0 52 52">
          <circle className={styles.result_circle} cx="26" cy="26" r="24" fill="none" />
          {is_conflict ? (
            <path className={styles.result_check} fill="none" d="M26 15v14M26 36v1" />
          ) : (
            <path className={styles.result_check} fill="none" d="M18 18l16 16M34 18L18 34" />
          )}
        </svg>
      </div>
      <p className={styles.result_eyebrow}>{is_conflict ? "Payment not completed" : "Payment failed"}</p>
      <h2 ref={heading_ref} tabIndex={-1} className={styles.result_title}>
        {error.title}
      </h2>
      <p className={styles.result_text}>{error.explanation}</p>

      <div className={styles.failure_box}>
        <dl className={styles.failure_meta}>
          <div>
            <dt>Card</dt>
            <dd>{charge?.card_label ?? cardShortLabel(card)}</dd>
          </div>
          <div>
            <dt>Error code</dt>
            <dd className={styles.mono}>{error.code}</dd>
          </div>
          {charge && charge.attempt_count > 0 && (
            <div>
              <dt>Attempts</dt>
              <dd>{charge.attempt_count}</dd>
            </div>
          )}
        </dl>
        {error.server_message && error.server_message !== error.explanation && (
          <p className={styles.failure_message}>
            <span>Message from the bank:</span> {error.server_message}
          </p>
        )}
      </div>

      <div className={styles.next_steps}>
        <p className={styles.section_label}>What you can do</p>
        <ol>
          {error.next_steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      {!is_conflict && (
        <p className={styles.result_footnote}>
          The client was not notified about this failed attempt. The subscription is marked as past due until a
          payment succeeds.
        </p>
      )}

      <div className={styles.result_actions}>
        <Link href={`/admin/seo-packages-subscriptions/${subscription_id}`} className={styles.button_ghost}>
          Back to subscription
        </Link>
        {show_other_card && (
          <button type="button" className={styles.button_secondary} onClick={onChooseOtherCard}>
            <Icon d={ICON_PATHS.card} stroke_width={1.8} />
            Use another card
          </button>
        )}
        {error.can_retry_same_card && (
          <button type="button" className={styles.button_primary} onClick={onRetry}>
            <Icon d={ICON_PATHS.refresh} stroke_width={1.8} />
            Try again
          </button>
        )}
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function CheckoutSkeleton() {
  const block = "animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800";
  return (
    <div className="space-y-6">
      <div className="h-5 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      <div className={`h-20 ${block}`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className={`h-[460px] ${block}`} />
        <div className={`h-[460px] ${block}`} />
      </div>
    </div>
  );
}

function CheckoutMessage({ subscription_id, text }: { subscription_id: number; text: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-600 dark:text-gray-300">{text}</p>
      <Link
        href={`/admin/seo-packages-subscriptions/${subscription_id}`}
        className="mt-3 inline-block text-sm font-medium text-brand-500 hover:underline"
      >
        Back to subscription
      </Link>
    </div>
  );
}

/**
 * Full page manual checkout for one subscription. Cards are loaded from an
 * endpoint scoped to the subscription, so only the owner's cards can appear,
 * and the server checks ownership again before charging.
 */
export default function SubscriptionCheckout({ subscription_id }: { subscription_id: number }) {
  const [subscription, setSubscription] = useState<AdminSeoSubscription | null>(null);
  const [cards, setCards] = useState<AdminClientPaymentProfile[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let is_current = true;

    Promise.all([
      adminSeoSubscriptionService.fetchSubscriptionDetail(subscription_id),
      adminSeoSubscriptionService.listSubscriptionPaymentProfiles(subscription_id),
    ])
      .then(([detail, profiles]) => {
        if (!is_current) return;
        // Defensive: never show cards unless they belong to this subscription's client.
        const is_owner_match = profiles.owner_user_id === detail.data.user.id;
        setSubscription(detail.data);
        setCards(is_owner_match ? profiles.cards : []);
        if (!is_owner_match) setLoadError("The saved cards could not be verified for this client.");
      })
      .catch((err) => is_current && setLoadError(extractApiError(err, "Failed to load this subscription.")))
      .finally(() => is_current && setIsLoading(false));

    return () => {
      is_current = false;
    };
  }, [subscription_id]);

  if (is_loading) return <CheckoutSkeleton />;

  if (!subscription) {
    return <CheckoutMessage subscription_id={subscription_id} text={load_error ?? "Subscription not found."} />;
  }

  if (subscription.status !== "active") {
    return (
      <CheckoutMessage
        subscription_id={subscription_id}
        text={`This subscription is ${subscription.status}, so it can no longer be charged.`}
      />
    );
  }

  // Keyed by subscription so no selection or result can leak between clients.
  return (
    <CheckoutFlow
      key={subscription.id}
      subscription={subscription}
      cards={cards}
      card_warning={load_error}
    />
  );
}

function CheckoutFlow({
  subscription,
  cards,
  card_warning,
}: {
  /** Snapshot taken when the page opened, so the billed period stays on screen after paying. */
  subscription: AdminSeoSubscription;
  cards: AdminClientPaymentProfile[];
  card_warning: string | null;
}) {
  const usable_cards = cards.filter((card) => !card.is_expired);
  const hidden_expired_count = cards.length - usable_cards.length;

  const preferred_card =
    usable_cards.find((card) => card.id === subscription.payment_profile_id) ??
    usable_cards.find((card) => card.is_default) ??
    usable_cards[0];

  const [step, setStep] = useState<CheckoutStep>("method");
  const [selected_card_id, setSelectedCardId] = useState(preferred_card?.id ?? "");
  const [is_processing, setIsProcessing] = useState(false);
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);
  const is_submitting_ref = useRef(false);
  const top_ref = useRef<HTMLDivElement>(null);

  // Only a card from this client's list can ever be sent to the server.
  const selected_card = usable_cards.find((card) => card.id === selected_card_id) ?? null;

  const period_date = subscription.next_billing_date;
  const period_label = formatDate(period_date, { month: "long", year: "numeric" });
  const is_early = !!period_date && period_date > todayIsoDate();
  const name = clientName(subscription);

  // Warn before leaving while the bank is processing the payment.
  useEffect(() => {
    if (!is_processing) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [is_processing]);

  const goToStep = useCallback((next_step: CheckoutStep) => {
    setStep(next_step);
    top_ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  async function handleConfirm() {
    if (!selected_card || is_submitting_ref.current) return;
    is_submitting_ref.current = true;
    setIsProcessing(true);

    try {
      const detail = await adminSeoSubscriptionService.chargeNow(subscription.id, selected_card.id);
      setOutcome({ status: "succeeded", detail, card: selected_card });
    } catch (err) {
      const error = resolvePaymentError(err);
      const charge = (err as { charge?: AdminSeoSubscriptionCharge | null } | undefined)?.charge ?? null;
      setOutcome({ status: "failed", error, charge, card: selected_card });
    } finally {
      is_submitting_ref.current = false;
      setIsProcessing(false);
      goToStep("result");
    }
  }

  function handleRetry() {
    setOutcome(null);
    goToStep("review");
  }

  function handleChooseOtherCard() {
    const other_card = usable_cards.find((card) => card.id !== selected_card_id);
    if (other_card) setSelectedCardId(other_card.id);
    setOutcome(null);
    goToStep("method");
  }

  const other_cards_count = usable_cards.filter((card) => card.id !== selected_card_id).length;

  return (
    <div ref={top_ref} className={styles.page}>
      <div className={styles.topbar}>
        <Link
          href={`/admin/seo-packages-subscriptions/${subscription.id}`}
          className={joinClasses(styles.back_link, is_processing && styles.back_link_disabled)}
          aria-disabled={is_processing}
          tabIndex={is_processing ? -1 : undefined}
          onClick={(event) => is_processing && event.preventDefault()}
        >
          <Icon d={ICON_PATHS.back} />
          Back to subscription
        </Link>
        <span className={styles.secure_badge}>
          <Icon d={ICON_PATHS.lock} />
          Secure checkout
        </span>
      </div>

      <header className={styles.heading}>
        <p className={styles.eyebrow}>
          <Icon d={ICON_PATHS.bolt} />
          Manual payment
        </p>
        <h1 className={styles.title}>
          Charge {formatMoneyCompact(subscription.monthly_price)} to {name}
        </h1>
        <p className={styles.subtitle}>
          Bill the <strong>{period_label}</strong> period of {subscription.plan_name} with a card saved on the
          client&apos;s account.
        </p>
      </header>

      <Stepper current={step} outcome={outcome} />

      {card_warning && <Notice tone="error">{card_warning}</Notice>}

      <div className={styles.layout}>
        <div className={styles.main}>
          {step === "method" && (
            <MethodStep
              subscription={subscription}
              usable_cards={usable_cards}
              hidden_expired_count={hidden_expired_count}
              selected_card_id={selected_card_id}
              onSelect={setSelectedCardId}
              onContinue={() => selected_card && goToStep("review")}
            />
          )}

          {step === "review" && selected_card && (
            <ReviewStep
              subscription={subscription}
              card={selected_card}
              period_label={period_label}
              is_early={is_early}
              is_processing={is_processing}
              onBack={() => goToStep("method")}
              onConfirm={handleConfirm}
            />
          )}

          {step === "result" && outcome?.status === "succeeded" && (
            <SuccessResult subscription_id={subscription.id} detail={outcome.detail} card={outcome.card} />
          )}

          {step === "result" && outcome?.status === "failed" && (
            <FailedResult
              subscription_id={subscription.id}
              error={outcome.error}
              charge={outcome.charge}
              card={outcome.card}
              has_other_cards={other_cards_count > 0}
              onRetry={handleRetry}
              onChooseOtherCard={handleChooseOtherCard}
            />
          )}
        </div>

        <OrderSummary
          subscription={subscription}
          period_label={period_label}
          card={selected_card}
          is_paid={outcome?.status === "succeeded"}
        />
      </div>
    </div>
  );
}
