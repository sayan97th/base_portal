"use client";

import React, { useState } from "react";
import Button from "../ui/button/Button";
import { ChevronLeftIcon } from "@/icons/index";
import type { PaymentMethod } from "./BillingPage";

// ─── Brand configuration ──────────────────────────────────────────────────────

const brand_gradients: Record<string, string> = {
  visa: "linear-gradient(135deg, #1a237e 0%, #1565c0 60%, #0288d1 100%)",
  mastercard: "linear-gradient(135deg, #b71c1c 0%, #e53935 55%, #ff8f00 100%)",
  amex: "linear-gradient(135deg, #004d40 0%, #00796b 55%, #0097a7 100%)",
  discover: "linear-gradient(135deg, #e65100 0%, #f57c00 55%, #ffb300 100%)",
  unknown: "linear-gradient(135deg, #4527a0 0%, #7b1fa2 55%, #6a1b9a 100%)",
};

const brand_labels: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectCardBrand(number: string): string {
  const digits = number.replace(/\s/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return "unknown";
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").substring(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiryDate(value: string): string {
  const digits = value.replace(/\D/g, "").substring(0, 4);
  if (digits.length >= 3) return `${digits.substring(0, 2)} / ${digits.substring(2)}`;
  return digits;
}

function getDisplayNumber(raw: string): string {
  const digits = raw.replace(/\s/g, "");
  const padded = digits.padEnd(16, "•");
  return `${padded.slice(0, 4)} ${padded.slice(4, 8)} ${padded.slice(8, 12)} ${padded.slice(12, 16)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const input_class =
  "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/3 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400 dark:focus:bg-white/5";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function CardBrandBadge({ brand }: { brand: string }) {
  const badge_colors: Record<string, string> = {
    visa: "#1a237e",
    mastercard: "#c62828",
    amex: "#004d40",
    discover: "#e65100",
  };

  if (!brand_labels[brand]) return null;

  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white"
      style={{ backgroundColor: badge_colors[brand] }}
    >
      {brand_labels[brand]}
    </span>
  );
}

// ─── Credit Card Preview ──────────────────────────────────────────────────────

interface CreditCardPreviewProps {
  card_number: string;
  cardholder_name: string;
  expiry_date: string;
  brand: string;
  cvc: string;
  is_flipped: boolean;
}

function CardBrandMark({ brand, size = "md" }: { brand: string; size?: "sm" | "md" }) {
  const text_size = size === "sm" ? "text-base" : "text-2xl";

  if (brand === "visa") {
    return (
      <span
        className={`font-bold italic text-white drop-shadow ${text_size}`}
        style={{ fontFamily: "Georgia, serif", letterSpacing: "-1px" }}
      >
        VISA
      </span>
    );
  }
  if (brand === "mastercard") {
    const circle_size = size === "sm" ? "h-5 w-5" : "h-8 w-8";
    return (
      <div className="flex">
        <div className={`${circle_size} rounded-full bg-red-500 opacity-90`} />
        <div className={`${circle_size} -ml-3 rounded-full bg-yellow-400 opacity-80`} />
      </div>
    );
  }
  if (brand === "amex") {
    return (
      <div className="rounded border border-white/40 px-1.5 py-0.5">
        <span className={`font-bold tracking-widest text-white ${size === "sm" ? "text-[9px]" : "text-xs"}`}>
          AMEX
        </span>
      </div>
    );
  }
  if (brand === "discover") {
    return (
      <div className="flex items-center gap-1">
        <span className={`font-bold tracking-widest text-white ${size === "sm" ? "text-[8px]" : "text-[10px]"}`}>
          DISCOVER
        </span>
        <div className={`rounded-full bg-orange-400 ${size === "sm" ? "h-3 w-3" : "h-5 w-5"}`} />
      </div>
    );
  }
  return (
    <svg
      className={`text-white/70 ${size === "sm" ? "h-4 w-4" : "h-5 w-5"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function CreditCardPreview({
  card_number,
  cardholder_name,
  expiry_date,
  brand,
  cvc,
  is_flipped,
}: CreditCardPreviewProps) {
  const gradient = brand_gradients[brand] ?? brand_gradients.unknown;

  return (
    <div className="relative h-52 w-80" style={{ perspective: "1000px" }}>
      {/* Flip inner */}
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: is_flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* ── Front face ─────────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl p-6 shadow-2xl"
          style={{
            backgroundImage: gradient,
            backfaceVisibility: "hidden",
          }}
        >
          {/* Glossy sheen */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.08) 100%)",
            }}
          />
          {/* Decorative circles */}
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-14 -left-10 h-44 w-44 rounded-full"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />

          {/* Top row: chip + brand */}
          <div className="relative flex items-start justify-between">
            {/* EMV chip */}
            <div
              className="h-9 w-12 overflow-hidden rounded-md"
              style={{
                background:
                  "linear-gradient(135deg, #d4a846 0%, #f5d278 40%, #c9952a 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 3px rgba(0,0,0,0.3)",
              }}
            >
              <div className="grid h-full grid-cols-3 gap-px p-[3px] opacity-50">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rounded-[1px] bg-yellow-900/40" />
                ))}
              </div>
            </div>
            <CardBrandMark brand={brand} />
          </div>

          {/* Card number */}
          <div className="relative mt-5">
            <p
              className="font-mono text-lg font-light tracking-[0.22em] text-white drop-shadow"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
            >
              {card_number}
            </p>
          </div>

          {/* Bottom row: name + expiry */}
          <div className="relative mt-5 flex items-end justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">
                Card Holder
              </p>
              <p
                className="mt-0.5 truncate font-mono text-sm font-semibold tracking-wider text-white"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
              >
                {cardholder_name || "FULL NAME"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">
                Expires
              </p>
              <p
                className="mt-0.5 font-mono text-sm font-semibold tracking-wider text-white"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
              >
                {expiry_date || "MM / YY"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Back face ──────────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl"
          style={{
            backgroundImage: gradient,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.08) 100%)",
            }}
          />

          {/* Magnetic stripe */}
          <div className="mt-8 h-10 w-full bg-black/70" />

          {/* Signature strip + CVC */}
          <div className="mx-5 mt-4 flex items-center gap-3">
            <div
              className="h-10 flex-1 rounded-l-md"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #e2e8f0 0px, #e2e8f0 7px, #f8fafc 7px, #f8fafc 14px)",
              }}
            />
            <div className="flex flex-col items-center rounded-r-md bg-white px-4 py-1.5 shadow-inner">
              <p className="text-[9px] font-medium uppercase tracking-widest text-gray-400">
                CVV
              </p>
              <p className="font-mono text-base font-bold tracking-widest text-gray-800">
                {cvc || "•••"}
              </p>
            </div>
          </div>

          {/* Brand on back */}
          <div className="mx-5 mt-4 flex justify-end">
            <CardBrandMark brand={brand} />
          </div>

          <p className="mt-3 px-5 text-[9px] leading-relaxed text-white/40">
            This card is property of the issuing bank. If found, please return to the nearest branch.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PaymentMethodFormProps {
  onBack: () => void;
  onSubmit: (method: PaymentMethod) => void;
}

const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({ onBack, onSubmit }) => {
  const [card_number, setCardNumber] = useState("");
  const [expiry_date, setExpiryDate] = useState("");
  const [security_code, setSecurityCode] = useState("");
  const [country, setCountry] = useState("US");
  const [zip_code, setZipCode] = useState("");
  const [cardholder_name, setCardholderName] = useState("");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [is_cvc_focused, setIsCvcFocused] = useState(false);

  function handleCardNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCardNumber(formatCardNumber(e.target.value));
  }

  function handleExpiryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setExpiryDate(formatExpiryDate(e.target.value));
  }

  function handleSecurityCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSecurityCode(e.target.value.replace(/\D/g, "").substring(0, 4));
  }

  function handleZipCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setZipCode(e.target.value.replace(/[^a-zA-Z0-9\s-]/g, "").substring(0, 10));
  }

  function isCardFormValid(): boolean {
    const digits = card_number.replace(/\s/g, "");
    const expiry_digits = expiry_date.replace(/\D/g, "");
    return (
      digits.length >= 13 &&
      expiry_digits.length === 4 &&
      security_code.length >= 3 &&
      zip_code.length >= 3
    );
  }

  function handleSubmitCard(e: React.FormEvent) {
    e.preventDefault();
    if (!isCardFormValid()) return;

    setIsSubmitting(true);
    const digits = card_number.replace(/\s/g, "");
    const expiry_parts = expiry_date.replace(/\s/g, "").split("/");

    const new_method: PaymentMethod = {
      id: crypto.randomUUID(),
      card_brand: detectCardBrand(digits),
      last_four: digits.slice(-4),
      expiry_month: expiry_parts[0],
      expiry_year: expiry_parts[1]?.trim() ?? "",
      is_default: false,
    };

    setTimeout(() => {
      onSubmit(new_method);
      setIsSubmitting(false);
    }, 800);
  }

  const current_brand = detectCardBrand(card_number);
  const display_number = getDisplayNumber(card_number);

  const country_options = [
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "GB", label: "United Kingdom" },
    { value: "AU", label: "Australia" },
    { value: "DE", label: "Germany" },
    { value: "FR", label: "France" },
    { value: "MX", label: "Mexico" },
    { value: "BR", label: "Brazil" },
  ];

  return (
    <div className="space-y-8">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
      >
        <ChevronLeftIcon />
        Back to Billing
      </button>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Payment Method</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your card information is encrypted and stored securely.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Card preview */}
        <div className="flex flex-col items-center gap-4 lg:sticky lg:top-8 lg:w-80 lg:shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            Live Preview
          </p>
          <CreditCardPreview
            card_number={display_number}
            cardholder_name={cardholder_name}
            expiry_date={expiry_date}
            brand={current_brand}
            cvc={security_code}
            is_flipped={is_cvc_focused}
          />
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Click the security code field to flip your card
          </p>
        </div>

        {/* Form */}
        <div className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
          <form onSubmit={handleSubmitCard} className="space-y-5">
            {/* Cardholder name */}
            <FormField label="Cardholder Name">
              <input
                type="text"
                value={cardholder_name}
                onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                placeholder="FULL NAME ON CARD"
                className={input_class}
              />
            </FormField>

            {/* Card number */}
            <FormField label="Card Number">
              <div className="relative">
                <input
                  type="text"
                  value={card_number}
                  onChange={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                  className={`${input_class} pr-16`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CardBrandBadge brand={current_brand} />
                </div>
              </div>
            </FormField>

            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Expiration Date">
                <input
                  type="text"
                  value={expiry_date}
                  onChange={handleExpiryChange}
                  placeholder="MM / YY"
                  inputMode="numeric"
                  className={input_class}
                />
              </FormField>
              <FormField label="Security Code">
                <input
                  type="text"
                  value={security_code}
                  onChange={handleSecurityCodeChange}
                  onFocus={() => setIsCvcFocused(true)}
                  onBlur={() => setIsCvcFocused(false)}
                  placeholder="CVC"
                  inputMode="numeric"
                  className={input_class}
                />
              </FormField>
            </div>

            {/* Country + ZIP */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Country">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={`${input_class} cursor-pointer`}
                >
                  {country_options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="ZIP / Postal Code">
                <input
                  type="text"
                  value={zip_code}
                  onChange={handleZipCodeChange}
                  placeholder="12345"
                  className={input_class}
                />
              </FormField>
            </div>

            {/* Security notice */}
            <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/2">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                By providing your card information, you authorize us to charge your card for future
                payments per our terms. Protected with 256-bit SSL encryption.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onBack}
                className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <Button
                variant="primary"
                size="md"
                disabled={!isCardFormValid() || is_submitting}
              >
                {is_submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Add Payment Method"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodForm;
