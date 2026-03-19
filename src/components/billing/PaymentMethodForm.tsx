"use client";

import React, { useState } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripeCardNumberElementChangeEvent } from "@stripe/stripe-js";
import Button from "../ui/button/Button";
import { ChevronLeftIcon } from "@/icons/index";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import type { PaymentProfile } from "@/types/client/payment-profile";

// ─── Brand configuration ──────────────────────────────────────────────────────

const brand_gradients: Record<string, string> = {
  visa: "linear-gradient(135deg, #1a237e 0%, #1565c0 60%, #0288d1 100%)",
  mastercard: "linear-gradient(135deg, #b71c1c 0%, #e53935 55%, #ff8f00 100%)",
  amex: "linear-gradient(135deg, #004d40 0%, #00796b 55%, #0097a7 100%)",
  discover: "linear-gradient(135deg, #e65100 0%, #f57c00 55%, #ffb300 100%)",
  unknown: "linear-gradient(135deg, #4527a0 0%, #7b1fa2 55%, #6a1b9a 100%)",
};

// ─── Stripe element styling ───────────────────────────────────────────────────

function buildStripeStyle() {
  const is_dark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  return {
    base: {
      fontSize: "14px",
      color: is_dark ? "#f9fafb" : "#111827",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSmoothing: "antialiased",
      "::placeholder": {
        color: is_dark ? "#6b7280" : "#9ca3af",
      },
    },
    invalid: {
      color: "#ef4444",
    },
  };
}

// ─── Stripe element wrapper ───────────────────────────────────────────────────

function StripeFieldWrapper({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div
        className={`flex h-11 w-full items-center rounded-xl border bg-gray-50 px-4 transition-all focus-within:bg-white focus-within:ring-2 dark:bg-white/3 dark:focus-within:bg-white/5 ${
          error
            ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
            : "border-gray-200 focus-within:border-brand-500 focus-within:ring-brand-500/20 dark:border-gray-700 dark:focus-within:border-brand-400"
        }`}
      >
        {children}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

// ─── Regular input field ─────────────────────────────────────────────────────

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

const input_class =
  "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400 dark:focus:bg-white/5";

// ─── Card brand mark ──────────────────────────────────────────────────────────

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

// ─── Credit Card Preview ──────────────────────────────────────────────────────

interface CreditCardPreviewProps {
  cardholder_name: string;
  brand: string;
  is_flipped: boolean;
}

function CreditCardPreview({ cardholder_name, brand, is_flipped }: CreditCardPreviewProps) {
  const gradient = brand_gradients[brand] ?? brand_gradients.unknown;

  return (
    <div className="relative h-52 w-80" style={{ perspective: "1000px" }}>
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: is_flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl p-6 shadow-2xl"
          style={{ backgroundImage: gradient, backfaceVisibility: "hidden" }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.08) 100%)",
            }}
          />
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
            <div
              className="h-9 w-12 overflow-hidden rounded-md"
              style={{
                background: "linear-gradient(135deg, #d4a846 0%, #f5d278 40%, #c9952a 100%)",
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

          {/* Card number — always masked for security */}
          <div className="relative mt-5">
            <p
              className="font-mono text-lg font-light tracking-[0.22em] text-white drop-shadow"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
            >
              •••• •••• •••• ••••
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
                MM / YY
              </p>
            </div>
          </div>
        </div>

        {/* Back face */}
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
          <div className="mt-8 h-10 w-full bg-black/70" />
          <div className="mx-5 mt-4 flex items-center gap-3">
            <div
              className="h-10 flex-1 rounded-l-md"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #e2e8f0 0px, #e2e8f0 7px, #f8fafc 7px, #f8fafc 14px)",
              }}
            />
            <div className="flex flex-col items-center rounded-r-md bg-white px-4 py-1.5 shadow-inner">
              <p className="text-[9px] font-medium uppercase tracking-widest text-gray-400">CVV</p>
              <p className="font-mono text-base font-bold tracking-widest text-gray-800">•••</p>
            </div>
          </div>
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
  client_secret: string;
  is_first_card: boolean;
  onBack: () => void;
  onSuccess: (profile: PaymentProfile) => void;
}

const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({
  client_secret,
  is_first_card,
  onBack,
  onSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [cardholder_name, setCardholderName] = useState("");
  const [country, setCountry] = useState("US");
  const [zip_code, setZipCode] = useState("");
  const [is_default, setIsDefault] = useState(is_first_card);
  const [is_cvc_focused, setIsCvcFocused] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  // Stripe element state
  const [card_brand, setCardBrand] = useState("unknown");
  const [field_errors, setFieldErrors] = useState({
    number: "",
    expiry: "",
    cvc: "",
  });
  const [field_complete, setFieldComplete] = useState({
    number: false,
    expiry: false,
    cvc: false,
  });

  const stripe_style = buildStripeStyle();

  function handleCardNumberChange(e: StripeCardNumberElementChangeEvent) {
    setCardBrand(e.brand ?? "unknown");
    setFieldComplete((prev) => ({ ...prev, number: e.complete }));
    setFieldErrors((prev) => ({ ...prev, number: e.error?.message ?? "" }));
  }

  function isFormValid() {
    return (
      field_complete.number &&
      field_complete.expiry &&
      field_complete.cvc &&
      zip_code.trim().length >= 3
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !isFormValid()) return;

    const card_number_element = elements.getElement(CardNumberElement);
    if (!card_number_element) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Confirm the SetupIntent with Stripe
      const { setupIntent, error: stripe_error } = await stripe.confirmCardSetup(
        client_secret,
        {
          payment_method: {
            card: card_number_element,
            billing_details: {
              name: cardholder_name || undefined,
              address: { postal_code: zip_code, country },
            },
          },
        }
      );

      if (stripe_error) {
        setSubmitError(stripe_error.message ?? "Card verification failed.");
        return;
      }

      if (!setupIntent?.payment_method) {
        setSubmitError("Something went wrong. Please try again.");
        return;
      }

      // Save the payment method to our backend
      const stripe_payment_method_id =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;

      const profile = await paymentProfileService.createPaymentProfile({
        stripe_payment_method_id,
        cardholder_name: cardholder_name.trim() || null,
        is_default,
      });

      onSuccess(profile);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to save payment method. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

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
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
      >
        <ChevronLeftIcon />
        Back to Billing
      </button>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Add Payment Method
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your card information is encrypted and processed securely by Stripe.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Card preview */}
        <div className="flex flex-col items-center gap-4 lg:sticky lg:top-8 lg:w-80 lg:shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            Live Preview
          </p>
          <CreditCardPreview
            cardholder_name={cardholder_name}
            brand={card_brand}
            is_flipped={is_cvc_focused}
          />
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Focus the CVC field to flip the card
          </p>
        </div>

        {/* Form */}
        <div className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Global error */}
            {submit_error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">{submit_error}</p>
              </div>
            )}

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

            {/* Card number (Stripe Element) */}
            <StripeFieldWrapper label="Card Number" error={field_errors.number}>
              <CardNumberElement
                options={{ style: stripe_style, showIcon: true }}
                className="w-full py-0.5"
                onChange={handleCardNumberChange}
              />
            </StripeFieldWrapper>

            {/* Expiry + CVC (Stripe Elements) */}
            <div className="grid grid-cols-2 gap-4">
              <StripeFieldWrapper label="Expiration Date" error={field_errors.expiry}>
                <CardExpiryElement
                  options={{ style: stripe_style }}
                  className="w-full py-0.5"
                  onChange={(e) => {
                    setFieldComplete((prev) => ({ ...prev, expiry: e.complete }));
                    setFieldErrors((prev) => ({ ...prev, expiry: e.error?.message ?? "" }));
                  }}
                />
              </StripeFieldWrapper>

              <StripeFieldWrapper label="Security Code" error={field_errors.cvc}>
                <CardCvcElement
                  options={{ style: stripe_style }}
                  className="w-full py-0.5"
                  onFocus={() => setIsCvcFocused(true)}
                  onBlur={() => setIsCvcFocused(false)}
                  onChange={(e) => {
                    setFieldComplete((prev) => ({ ...prev, cvc: e.complete }));
                    setFieldErrors((prev) => ({ ...prev, cvc: e.error?.message ?? "" }));
                  }}
                />
              </StripeFieldWrapper>
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
                  onChange={(e) =>
                    setZipCode(
                      e.target.value.replace(/[^a-zA-Z0-9\s-]/g, "").substring(0, 10)
                    )
                  }
                  placeholder="12345"
                  className={input_class}
                />
              </FormField>
            </div>

            {/* Set as default */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_default"
                checked={is_default}
                disabled={is_first_card}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700"
              />
              <label
                htmlFor="is_default"
                className="cursor-pointer text-sm text-gray-700 dark:text-gray-300"
              >
                Set as default payment method
                {is_first_card && (
                  <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                    (automatically set for your first card)
                  </span>
                )}
              </label>
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
                Card details are processed directly by Stripe and never touch our servers.
                Protected with 256-bit SSL encryption.
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
                disabled={!isFormValid() || is_submitting || !stripe}
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
                    Saving...
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
