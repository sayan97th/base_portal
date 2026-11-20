"use client";

import React, { useId } from "react";
import styles from "./GiftCardReward.module.scss";
import { CheckIcon, MailIcon } from "./GiftCardIcons";
import {
  GIFT_CARD_BRAND_OPTIONS,
  isValidGiftCardEmail,
  type GiftCardBrand,
  type GiftCardBrandOption,
  type GiftCardRewardDetails,
} from "@/types/client/gift-card-rewards";

interface GiftCardRewardFormProps {
  value: GiftCardRewardDetails;
  onChange: (value: GiftCardRewardDetails) => void;
  brands?: GiftCardBrandOption[];
  email_error?: string | null;
  brand_error?: string | null;
  disabled?: boolean;
  /** Shows numbered step markers that turn into checks once each field is done. */
  show_steps?: boolean;
  /** Offers a one click shortcut to use this email (for example the account email). */
  suggested_email?: string | null;
}

function StepMarker({ number, is_done }: { number: number; is_done: boolean }) {
  return (
    <span className={`${styles.stepMarker} ${is_done ? styles.stepMarkerDone : ""}`} aria-hidden="true">
      {is_done ? <CheckIcon /> : number}
    </span>
  );
}

/**
 * Brand picker (Amazon, Visa, Target) plus the email where the gift card
 * should be sent. Fully controlled, shared by checkout and the order page.
 */
export default function GiftCardRewardForm({
  value,
  onChange,
  brands = GIFT_CARD_BRAND_OPTIONS,
  email_error,
  brand_error,
  disabled = false,
  show_steps = false,
  suggested_email = null,
}: GiftCardRewardFormProps) {
  const email_id = useId();
  const brand_label_id = useId();

  const is_brand_done = value.gift_card_brand !== "";
  const is_email_done = isValidGiftCardEmail(value.recipient_email);
  const can_use_suggested_email =
    !!suggested_email && suggested_email.trim().toLowerCase() !== value.recipient_email.trim().toLowerCase();

  const selectBrand = (brand: GiftCardBrand) => {
    if (disabled) return;
    onChange({ ...value, gift_card_brand: brand });
  };

  return (
    <div className={styles.formStack}>
      <div>
        <span id={brand_label_id} className={styles.fieldLabel}>
          {show_steps && <StepMarker number={1} is_done={is_brand_done} />}
          Which gift card would you like?
        </span>
        <div className={styles.brandGrid} role="radiogroup" aria-labelledby={brand_label_id}>
          {brands.map((brand) => {
            const is_selected = value.gift_card_brand === brand.value;
            return (
              <button
                key={brand.value}
                type="button"
                role="radio"
                aria-checked={is_selected}
                disabled={disabled}
                onClick={() => selectBrand(brand.value)}
                className={`${styles.brandTile} ${is_selected ? styles.brandTileSelected : ""}`}
              >
                {is_selected && (
                  <span className={styles.brandCheck}>
                    <CheckIcon />
                  </span>
                )}
                <span className={`${styles.miniCard} ${styles[`miniCard_${brand.value}`] ?? ""}`}>
                  <span className={styles.miniCardBrand}>{brand.label}</span>
                  <span className={styles.miniCardChip} />
                </span>
                <span className={styles.brandName}>{brand.label}</span>
              </button>
            );
          })}
        </div>
        {brand_error && <p className={styles.fieldError}>{brand_error}</p>}
      </div>

      <div>
        <label htmlFor={email_id} className={styles.fieldLabel}>
          {show_steps && <StepMarker number={2} is_done={is_email_done} />}
          Where should we send it?
        </label>
        <div className={styles.inputWrap}>
          <MailIcon className={styles.inputIcon} />
          <input
            id={email_id}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={value.recipient_email}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, recipient_email: e.target.value })}
            className={`${styles.input} ${email_error ? styles.inputError : ""}`}
            aria-invalid={!!email_error}
          />
        </div>
        {email_error && <p className={styles.fieldError}>{email_error}</p>}
        {can_use_suggested_email && !disabled && (
          <button
            type="button"
            className={styles.suggestionChip}
            onClick={() => onChange({ ...value, recipient_email: (suggested_email ?? "").trim() })}
          >
            Use my account email
            <span className={styles.suggestionChipValue}>{suggested_email}</span>
          </button>
        )}
      </div>
    </div>
  );
}
