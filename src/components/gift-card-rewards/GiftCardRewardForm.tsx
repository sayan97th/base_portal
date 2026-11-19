"use client";

import React, { useId } from "react";
import styles from "./GiftCardReward.module.scss";
import { CheckIcon, MailIcon } from "./GiftCardIcons";
import {
  GIFT_CARD_BRAND_OPTIONS,
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
}: GiftCardRewardFormProps) {
  const email_id = useId();
  const brand_label_id = useId();

  const selectBrand = (brand: GiftCardBrand) => {
    if (disabled) return;
    onChange({ ...value, gift_card_brand: brand });
  };

  return (
    <div className={styles.formStack}>
      <div>
        <span id={brand_label_id} className={styles.fieldLabel}>
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
      </div>
    </div>
  );
}
