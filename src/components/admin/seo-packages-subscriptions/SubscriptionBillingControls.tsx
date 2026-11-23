"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { AdminClientPaymentProfile } from "@/services/admin/seo-packages-subscription.service";
import { addCalendarDays, cardBrandLabel, daysBetween, formatDate, todayIsoDate } from "./subscription-format";
import styles from "./SeoSubscriptionBilling.module.scss";

// ── Auto renew switch ──────────────────────────────────────────────────────────

export function AutoRenewSwitch({
  is_on,
  disabled = false,
  title = "Auto renew every month",
  description,
  onToggle,
}: {
  is_on: boolean;
  disabled?: boolean;
  title?: string;
  description: React.ReactNode;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={is_on}
      disabled={disabled}
      onClick={onToggle}
      className={`${styles.switchCard} ${is_on ? styles.isOn : ""}`}
    >
      <span className={`${styles.switch} ${is_on ? styles.isOn : ""}`} aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </span>
      </span>
    </button>
  );
}

// ── Saved card picker ──────────────────────────────────────────────────────────

export function PaymentCardPicker({
  cards,
  selected_id,
  is_loading,
  allow_default_option = true,
  onSelect,
}: {
  cards: AdminClientPaymentProfile[];
  selected_id: string | null;
  is_loading: boolean;
  allow_default_option?: boolean;
  onSelect: (card_id: string | null) => void;
}) {
  if (is_loading) {
    return (
      <div className={styles.cardGrid}>
        {[0, 1].map((i) => (
          <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-warning-300 bg-warning-50 px-4 py-3 text-sm text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300">
        <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
        <span>
          This client has no card on file yet. They can add one from <strong>Billing</strong> in their portal.
          Until then, monthly invoices can be paid by the client manually.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={styles.cardGrid}>
        {cards.map((card) => {
          const is_selected = selected_id === card.id;
          return (
            <button
              key={card.id}
              type="button"
              disabled={card.is_expired}
              data-brand={card.card_brand?.toLowerCase()}
              onClick={() => onSelect(card.id)}
              className={`${styles.cardChip} ${is_selected ? styles.isSelected : ""}`}
              aria-pressed={is_selected}
            >
              <span className={styles.cardChipTop}>
                {cardBrandLabel(card.card_brand)}
                {is_selected ? (
                  <span className={styles.cardChipCheck}>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                ) : card.is_default ? (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] tracking-wider">Default</span>
                ) : null}
              </span>
              <span className={styles.cardChipNumber}>•••• {card.last_four}</span>
              <span className={styles.cardChipMeta}>
                <span className="truncate">{card.cardholder_name || "Card on file"}</span>
                <span>
                  {card.is_expired ? "Expired" : `${card.expiry_month}/${String(card.expiry_year).slice(-2)}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {allow_default_option && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`text-xs font-medium transition-colors ${
            selected_id === null
              ? "text-brand-500"
              : "text-gray-500 hover:text-brand-500 dark:text-gray-400"
          }`}
        >
          {selected_id === null ? "✓ " : ""}Always use the client&apos;s default card
        </button>
      )}
    </div>
  );
}

// ── Renewal reminder (optional) ────────────────────────────────────────────────

export const REMINDER_DAY_CHOICES = [1, 3, 5, 7] as const;
export const DEFAULT_REMINDER_DAYS = 3;
/** Mirrors SeoPackageSubscription::MIN_REMINDER_DAYS / MAX_REMINDER_DAYS in the API. */
export const MIN_REMINDER_DAYS = 1;
export const MAX_REMINDER_DAYS = 28;

const REMINDER_SLIDER_TICKS = [1, 7, 14, 21, 28] as const;

export function pluralDays(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function isPresetReminder(days: number | null): boolean {
  return days !== null && (REMINDER_DAY_CHOICES as readonly number[]).includes(days);
}

function clampReminderDays(days: number): number {
  return Math.min(MAX_REMINDER_DAYS, Math.max(MIN_REMINDER_DAYS, Math.round(days)));
}

/**
 * Plain English line about the next reminder for the given charge date,
 * mirroring how the daily billing run decides to send it. Null when there
 * is nothing useful to say (no date yet, or the charge is today).
 */
export function describeNextReminder(
  next_charge_iso: string | null | undefined,
  days: number,
  last_sent_for?: string | null
): string | null {
  if (!next_charge_iso) return null;

  const today = todayIsoDate();
  if (daysBetween(today, next_charge_iso) <= 0) return null;

  const charge_label = formatDate(next_charge_iso, { month: "short", day: "numeric" });
  if (last_sent_for === next_charge_iso) return `Already sent for the ${charge_label} charge.`;

  const reminder_iso = addCalendarDays(next_charge_iso, -days);
  if (reminder_iso <= today) return `Goes out with the next daily billing run, ahead of the ${charge_label} charge.`;

  return `Next reminder goes out on ${formatDate(reminder_iso, { weekday: "short", month: "short", day: "numeric" })}.`;
}

/**
 * On/off switch for the "your subscription renews soon" email, with the
 * number of days before the charge. `value` is the days, or null when off.
 * Admins pick a quick preset or open the custom editor for any value
 * between MIN_REMINDER_DAYS and MAX_REMINDER_DAYS.
 */
export function ReminderControl({
  value,
  is_auto_renew,
  disabled = false,
  next_charge_date,
  last_reminder_sent_for,
  onChange,
}: {
  value: number | null;
  is_auto_renew: boolean;
  disabled?: boolean;
  /** Upcoming charge date (YYYY-MM-DD), used for the "next reminder" preview. */
  next_charge_date?: string | null;
  last_reminder_sent_for?: string | null;
  onChange: (value: number | null) => void;
}) {
  const is_on = value !== null && value > 0 && is_auto_renew;
  const is_locked = disabled || !is_auto_renew;
  const is_custom_value = is_on && !isPresetReminder(value);

  const [is_custom_open, setIsCustomOpen] = useState(false);
  const [custom_draft, setCustomDraft] = useState("");
  const input_ref = useRef<HTMLInputElement>(null);
  const field_id = useId();

  // The editor hides itself when the reminder is turned off or auto renew is disabled.
  const is_editing_custom = is_custom_open && is_on;

  useEffect(() => {
    if (is_editing_custom) input_ref.current?.select();
  }, [is_editing_custom]);

  const parsed_draft = custom_draft.trim() === "" ? Number.NaN : Number(custom_draft);
  const is_draft_number = Number.isInteger(parsed_draft);
  const is_draft_valid = is_draft_number && parsed_draft >= MIN_REMINDER_DAYS && parsed_draft <= MAX_REMINDER_DAYS;
  const slider_days = is_draft_number ? clampReminderDays(parsed_draft) : value ?? DEFAULT_REMINDER_DAYS;
  const slider_fill = ((slider_days - MIN_REMINDER_DAYS) / (MAX_REMINDER_DAYS - MIN_REMINDER_DAYS)) * 100;
  const draft_error = custom_draft.trim() === "" || is_draft_valid
    ? null
    : `Enter a whole number between ${MIN_REMINDER_DAYS} and ${MAX_REMINDER_DAYS}.`;

  const preview_days = is_editing_custom && is_draft_valid ? parsed_draft : value;
  const reminder_preview = is_on && preview_days
    ? describeNextReminder(next_charge_date, preview_days, is_editing_custom ? null : last_reminder_sent_for)
    : null;

  const openCustomEditor = () => {
    setCustomDraft(String(value ?? DEFAULT_REMINDER_DAYS));
    setIsCustomOpen(true);
  };

  const closeCustomEditor = () => setIsCustomOpen(false);

  const applyCustomDays = () => {
    if (!is_draft_valid) return;
    if (parsed_draft !== value) onChange(parsed_draft);
    setIsCustomOpen(false);
  };

  const stepDraft = (delta: number) => setCustomDraft(String(clampReminderDays(slider_days + delta)));

  const handleDraftKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyCustomDays();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeCustomEditor();
    }
  };

  return (
    <div className={`${styles.reminderCard} ${is_on ? styles.isOn : ""} ${is_locked ? styles.isLocked : ""}`}>
      <div className={styles.reminderHead}>
        <span className={styles.reminderIcon} aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900 dark:text-white">Renewal reminder email</span>
          <span className="block text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {!is_auto_renew
              ? "Only sent for subscriptions that renew automatically."
              : is_on
                ? `The client is emailed ${pluralDays(value ?? 0)} before each charge.`
                : "Off. The client only gets the receipt after each payment."}
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={is_on}
          aria-label="Send renewal reminder email"
          disabled={is_locked}
          onClick={() => onChange(is_on ? null : DEFAULT_REMINDER_DAYS)}
          className={`${styles.switch} ${is_on ? styles.isOn : ""} shrink-0 disabled:cursor-not-allowed`}
        />
      </div>

      {is_on && (
        <div className={styles.reminderBody}>
          <div className={styles.chipGroup} role="radiogroup" aria-label="Days before the charge">
            {REMINDER_DAY_CHOICES.map((days) => (
              <button
                key={days}
                type="button"
                role="radio"
                aria-checked={value === days && !is_editing_custom}
                disabled={is_locked}
                onClick={() => {
                  closeCustomEditor();
                  if (value !== days) onChange(days);
                }}
                className={`${styles.chip} ${value === days && !is_editing_custom ? styles.isActive : ""}`}
              >
                {pluralDays(days)} before
              </button>
            ))}

            <button
              type="button"
              role="radio"
              aria-checked={is_custom_value || is_editing_custom}
              disabled={is_locked}
              onClick={() => (is_editing_custom ? closeCustomEditor() : openCustomEditor())}
              className={`${styles.chip} ${styles.chipCustom} ${is_custom_value || is_editing_custom ? styles.isActive : ""}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              {is_custom_value && !is_editing_custom ? `Custom, ${pluralDays(value ?? 0)}` : "Custom"}
            </button>
          </div>

          {is_editing_custom && (
            <div className={styles.customPanel} role="group" aria-label="Custom reminder days">
              <div className={styles.customTop}>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepperButton}
                    onClick={() => stepDraft(-1)}
                    disabled={is_locked || slider_days <= MIN_REMINDER_DAYS}
                    aria-label="One day less"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                      <path strokeLinecap="round" d="M5 12h14" />
                    </svg>
                  </button>
                  <label htmlFor={`${field_id}-days`} className={styles.stepperField}>
                    <input
                      ref={input_ref}
                      id={`${field_id}-days`}
                      type="number"
                      inputMode="numeric"
                      min={MIN_REMINDER_DAYS}
                      max={MAX_REMINDER_DAYS}
                      step={1}
                      value={custom_draft}
                      disabled={is_locked}
                      aria-invalid={!!draft_error}
                      aria-describedby={`${field_id}-hint`}
                      onChange={(event) => setCustomDraft(event.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                      onKeyDown={handleDraftKeyDown}
                      className={styles.stepperInput}
                    />
                    <span className={styles.stepperUnit}>{slider_days === 1 ? "day" : "days"}</span>
                  </label>
                  <button
                    type="button"
                    className={styles.stepperButton}
                    onClick={() => stepDraft(1)}
                    disabled={is_locked || slider_days >= MAX_REMINDER_DAYS}
                    aria-label="One day more"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>

                <div className={styles.customTimeline} aria-hidden>
                  <span className={styles.reminderTimelineDot} data-kind="reminder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                  <span className={styles.timelineLine}>
                    <span>{pluralDays(slider_days)}</span>
                  </span>
                  <span className={styles.reminderTimelineDot} data-kind="charge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  </span>
                </div>
              </div>

              <div className={styles.rangeWrap}>
                <input
                  type="range"
                  min={MIN_REMINDER_DAYS}
                  max={MAX_REMINDER_DAYS}
                  step={1}
                  value={slider_days}
                  disabled={is_locked}
                  aria-label="Days before the charge"
                  aria-valuetext={`${pluralDays(slider_days)} before the charge`}
                  onChange={(event) => setCustomDraft(event.target.value)}
                  className={styles.range}
                  style={{ "--range_fill": `${slider_fill}%` } as React.CSSProperties}
                />
                <div className={styles.rangeTicks} aria-hidden>
                  {REMINDER_SLIDER_TICKS.map((tick) => (
                    <button
                      key={tick}
                      type="button"
                      tabIndex={-1}
                      disabled={is_locked}
                      onClick={() => setCustomDraft(String(tick))}
                      className={tick === slider_days ? styles.isActive : ""}
                      style={{ left: `${((tick - MIN_REMINDER_DAYS) / (MAX_REMINDER_DAYS - MIN_REMINDER_DAYS)) * 100}%` }}
                    >
                      {tick}d
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.customFooter}>
                <p id={`${field_id}-hint`} className={`${styles.customHint} ${draft_error ? styles.isError : ""}`}>
                  {draft_error ?? `Any value from ${MIN_REMINDER_DAYS} to ${MAX_REMINDER_DAYS} days. Press Enter to apply.`}
                </p>
                <div className={styles.customActions}>
                  <button type="button" onClick={closeCustomEditor} className={styles.customCancel}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyCustomDays}
                    disabled={is_locked || !is_draft_valid}
                    className={styles.customApply}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {reminder_preview && (
            <p className={styles.reminderPreview} aria-live="polite">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {reminder_preview}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
