"use client";

import React from "react";
import type { AdminClientPaymentProfile } from "@/services/admin/seo-packages-subscription.service";
import { cardBrandLabel } from "./subscription-format";
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
