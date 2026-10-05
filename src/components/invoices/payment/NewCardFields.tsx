"use client";

import React, { useState } from "react";
import { CardCvcElement, CardExpiryElement, CardNumberElement } from "@stripe/react-stripe-js";
import type { StripeCardNumberElementChangeEvent, StripeElementStyle } from "@stripe/stripe-js";
import CardBrandIcon from "./CardBrandIcon";

export interface NewCardFieldsValue {
  cardholder_name: string;
  postal_code: string;
  save_card: boolean;
}

export type CardFieldName = "card_number" | "card_expiry" | "card_cvc";

interface NewCardFieldsProps {
  value: NewCardFieldsValue;
  onChange: (value: NewCardFieldsValue) => void;
  onCardFieldChange: (field_name: CardFieldName, is_complete: boolean, error_message: string | null) => void;
  field_errors: Partial<Record<CardFieldName | "cardholder_name", string>>;
  is_disabled: boolean;
  /** Only authenticated clients can store a card on their account. */
  can_save_card: boolean;
}

const STRIPE_ELEMENT_STYLE: StripeElementStyle = {
  base: {
    color: "#111827",
    fontSize: "15px",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSmoothing: "antialiased",
    "::placeholder": { color: "#9ca3af" },
  },
  invalid: { color: "#dc2626", iconColor: "#dc2626" },
};

function fieldShellClass(is_focused: boolean, has_error: boolean): string {
  if (has_error) return "border-red-400 ring-2 ring-red-500/10";
  if (is_focused) return "border-brand-500 ring-2 ring-brand-500/15";
  return "border-gray-200 hover:border-gray-300";
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

export default function NewCardFields({
  value,
  onChange,
  onCardFieldChange,
  field_errors,
  is_disabled,
  can_save_card,
}: NewCardFieldsProps) {
  const [focused_field, setFocusedField] = useState<CardFieldName | "cardholder_name" | "postal_code" | null>(null);
  const [detected_brand, setDetectedBrand] = useState<string>("unknown");

  const handleCardNumberChange = (change_event: StripeCardNumberElementChangeEvent) => {
    setDetectedBrand(change_event.brand);
    onCardFieldChange("card_number", change_event.complete, change_event.error?.message ?? null);
  };

  const input_class =
    "w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition-all placeholder:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50";

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="cardholder_name" className="mb-1.5 block text-sm font-medium text-gray-700">
          Name on card
        </label>
        <input
          id="cardholder_name"
          type="text"
          autoComplete="cc-name"
          placeholder="Full name as shown on card"
          value={value.cardholder_name}
          disabled={is_disabled}
          onFocus={() => setFocusedField("cardholder_name")}
          onBlur={() => setFocusedField(null)}
          onChange={(input_event) => onChange({ ...value, cardholder_name: input_event.target.value })}
          className={`${input_class} ${fieldShellClass(focused_field === "cardholder_name", Boolean(field_errors.cardholder_name))}`}
        />
        <FieldError message={field_errors.cardholder_name} />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Card number</span>
        <div
          className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3.5 transition-all ${fieldShellClass(
            focused_field === "card_number",
            Boolean(field_errors.card_number)
          )}`}
        >
          <div className="min-w-0 flex-1">
            <CardNumberElement
              options={{ style: STRIPE_ELEMENT_STYLE, disabled: is_disabled, showIcon: false, placeholder: "1234 1234 1234 1234" }}
              onFocus={() => setFocusedField("card_number")}
              onBlur={() => setFocusedField(null)}
              onChange={handleCardNumberChange}
            />
          </div>
          <CardBrandIcon card_brand={detected_brand} size="sm" />
        </div>
        <FieldError message={field_errors.card_number} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Expiration</span>
          <div
            className={`rounded-xl border bg-white px-4 py-3.5 transition-all ${fieldShellClass(
              focused_field === "card_expiry",
              Boolean(field_errors.card_expiry)
            )}`}
          >
            <CardExpiryElement
              options={{ style: STRIPE_ELEMENT_STYLE, disabled: is_disabled }}
              onFocus={() => setFocusedField("card_expiry")}
              onBlur={() => setFocusedField(null)}
              onChange={(change_event) =>
                onCardFieldChange("card_expiry", change_event.complete, change_event.error?.message ?? null)
              }
            />
          </div>
          <FieldError message={field_errors.card_expiry} />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Security code</span>
          <div
            className={`rounded-xl border bg-white px-4 py-3.5 transition-all ${fieldShellClass(
              focused_field === "card_cvc",
              Boolean(field_errors.card_cvc)
            )}`}
          >
            <CardCvcElement
              options={{ style: STRIPE_ELEMENT_STYLE, disabled: is_disabled, placeholder: "CVC" }}
              onFocus={() => setFocusedField("card_cvc")}
              onBlur={() => setFocusedField(null)}
              onChange={(change_event) =>
                onCardFieldChange("card_cvc", change_event.complete, change_event.error?.message ?? null)
              }
            />
          </div>
          <FieldError message={field_errors.card_cvc} />
        </div>

        <div>
          <label htmlFor="billing_postal_code" className="mb-1.5 block text-sm font-medium text-gray-700">
            ZIP / Postal code
          </label>
          <input
            id="billing_postal_code"
            type="text"
            autoComplete="postal-code"
            placeholder="Optional"
            maxLength={20}
            value={value.postal_code}
            disabled={is_disabled}
            onFocus={() => setFocusedField("postal_code")}
            onBlur={() => setFocusedField(null)}
            onChange={(input_event) => onChange({ ...value, postal_code: input_event.target.value })}
            className={`${input_class} ${fieldShellClass(focused_field === "postal_code", false)}`}
          />
        </div>
      </div>

      {can_save_card && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-4">
          <input
            type="checkbox"
            checked={value.save_card}
            disabled={is_disabled}
            onChange={(input_event) => onChange({ ...value, save_card: input_event.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
          />
          <span>
            <span className="block text-sm font-medium text-gray-800">Save this card for future payments</span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Your card will be stored securely by Stripe and available for future invoices and orders.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
