"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { useBillingAddress } from "@/hooks/useBillingAddress";
import SearchableSelect from "@/components/shared/SearchableSelect";

// ─── Brand configuration ──────────────────────────────────────────────────────

const brand_gradients: Record<string, string> = {
  visa: "linear-gradient(135deg, #1a237e 0%, #1565c0 60%, #0288d1 100%)",
  mastercard: "linear-gradient(135deg, #b71c1c 0%, #e53935 55%, #ff8f00 100%)",
  amex: "linear-gradient(135deg, #004d40 0%, #00796b 55%, #0097a7 100%)",
  discover: "linear-gradient(135deg, #e65100 0%, #f57c00 55%, #ffb300 100%)",
  unknown: "linear-gradient(135deg, #4527a0 0%, #7b1fa2 55%, #6a1b9a 100%)",
};

// ─── Static data ──────────────────────────────────────────────────────────────

const countries = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Brazil",
  "Mexico",
  "Japan",
  "South Korea",
  "India",
  "Singapore",
];

/** Maps full country names → ISO 3166-1 alpha-2 codes required by Stripe. */
const country_code_map: Record<string, string> = {
  "United States": "US",
  Canada: "CA",
  "United Kingdom": "GB",
  Australia: "AU",
  Germany: "DE",
  France: "FR",
  Spain: "ES",
  Italy: "IT",
  Netherlands: "NL",
  Brazil: "BR",
  Mexico: "MX",
  Japan: "JP",
  "South Korea": "KR",
  India: "IN",
  Singapore: "SG",
};

const us_states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District Of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

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
      "::placeholder": { color: is_dark ? "#6b7280" : "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  };
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const label_class = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

function getInputClass(has_error?: boolean) {
  const base =
    "h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:text-white dark:placeholder:text-gray-500";
  if (has_error) {
    return `${base} border-red-400 bg-red-50/40 focus:border-red-400 focus:ring-red-400/20 dark:border-red-500/60 dark:bg-red-500/5 dark:focus:border-red-400`;
  }
  return `${base} border-gray-200 bg-gray-50 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:focus:border-brand-400 dark:focus:bg-white/5`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
      <svg
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      {message}
    </p>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Stripe field wrapper ─────────────────────────────────────────────────────

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
      <label className={label_class}>{label}</label>
      <div
        className={`flex h-11 w-full items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
          error
            ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
            : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700 dark:focus-within:border-brand-400"
        }`}
      >
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

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
        <span
          className={`font-bold tracking-widest text-white ${size === "sm" ? "text-[9px]" : "text-xs"}`}
        >
          AMEX
        </span>
      </div>
    );
  }
  if (brand === "discover") {
    return (
      <div className="flex items-center gap-1">
        <span
          className={`font-bold tracking-widest text-white ${size === "sm" ? "text-[8px]" : "text-[10px]"}`}
        >
          DISCOVER
        </span>
        <div
          className={`rounded-full bg-orange-400 ${size === "sm" ? "h-3 w-3" : "h-5 w-5"}`}
        />
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

function CreditCardPreview({
  cardholder_name,
  brand,
  is_flipped,
}: {
  cardholder_name: string;
  brand: string;
  is_flipped: boolean;
}) {
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
        {/* Front */}
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
          <div className="relative mt-5">
            <p
              className="font-mono text-lg font-light tracking-[0.22em] text-white drop-shadow"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
            >
              •••• •••• •••• ••••
            </p>
          </div>
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

        {/* Back */}
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
            This card is property of the issuing bank. If found, please return to the nearest
            branch.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalBillingAddress {
  address: string;
  city: string;
  country: string;
  state: string;
  postal_code: string;
  company: string;
}

interface BillingAddressErrors {
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

interface PaymentMethodFormProps {
  client_secret: string;
  is_first_card: boolean;
  onBack: () => void;
  onSuccess: (profile: PaymentProfile) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({
  client_secret,
  is_first_card,
  onBack,
  onSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { saved_billing_address, has_saved_address } = useBillingAddress();

  // ── Card detail state ──────────────────────────────────────────────────────
  const [cardholder_name, setCardholderName] = useState("");
  const [is_default, setIsDefault] = useState(is_first_card);
  const [is_cvc_focused, setIsCvcFocused] = useState(false);

  // ── Billing address state ──────────────────────────────────────────────────
  const [billing_address, setBillingAddress] = useState<LocalBillingAddress>({
    address: "",
    city: "",
    country: "United States",
    state: "",
    postal_code: "",
    company: "",
  });
  const [billing_errors, setBillingErrors] = useState<BillingAddressErrors>({});

  // ── Submission state ───────────────────────────────────────────────────────
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  // ── Stripe element state ───────────────────────────────────────────────────
  const [card_brand, setCardBrand] = useState("unknown");
  const [stripe_errors, setStripeErrors] = useState({ number: "", expiry: "", cvc: "" });
  const [field_complete, setFieldComplete] = useState({
    number: false,
    expiry: false,
    cvc: false,
  });

  const stripe_style = buildStripeStyle();

  // Pre-fill billing address from saved profile
  useEffect(() => {
    if (!saved_billing_address) return;
    setBillingAddress({
      address: saved_billing_address.address ?? "",
      city: saved_billing_address.city ?? "",
      country: saved_billing_address.country ?? "United States",
      state: saved_billing_address.state ?? "",
      postal_code: saved_billing_address.postal_code ?? "",
      company: saved_billing_address.company ?? "",
    });
  }, [saved_billing_address]);

  function handleBillingChange(field: keyof LocalBillingAddress, value: string) {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
    if (field in billing_errors) {
      setBillingErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof BillingAddressErrors];
        return next;
      });
    }
  }

  function handleApplySavedAddress() {
    if (!saved_billing_address) return;
    setBillingAddress({
      address: saved_billing_address.address ?? "",
      city: saved_billing_address.city ?? "",
      country: saved_billing_address.country ?? "United States",
      state: saved_billing_address.state ?? "",
      postal_code: saved_billing_address.postal_code ?? "",
      company: saved_billing_address.company ?? "",
    });
    setBillingErrors({});
  }

  function handleCardNumberChange(e: StripeCardNumberElementChangeEvent) {
    setCardBrand(e.brand ?? "unknown");
    setFieldComplete((prev) => ({ ...prev, number: e.complete }));
    setStripeErrors((prev) => ({ ...prev, number: e.error?.message ?? "" }));
  }

  const validateBillingAddress = useCallback((): boolean => {
    const errors: BillingAddressErrors = {};
    if (!billing_address.address.trim()) errors.address = "Street address is required.";
    if (!billing_address.city.trim()) errors.city = "City is required.";
    if (!billing_address.state.trim()) errors.state = "State / Province is required.";
    if (!billing_address.postal_code.trim()) errors.postal_code = "Postal / ZIP code is required.";
    setBillingErrors(errors);
    return Object.keys(errors).length === 0;
  }, [billing_address]);

  function isCardComplete() {
    return field_complete.number && field_complete.expiry && field_complete.cvc;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !isCardComplete()) return;
    if (!validateBillingAddress()) return;

    const card_number_element = elements.getElement(CardNumberElement);
    if (!card_number_element) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const country_code = country_code_map[billing_address.country] ?? "US";

      // Confirm the SetupIntent — billing address is stored with the payment method in Stripe
      const { setupIntent, error: stripe_error } = await stripe.confirmCardSetup(client_secret, {
        payment_method: {
          card: card_number_element,
          billing_details: {
            name: cardholder_name.trim() || undefined,
            address: {
              line1: billing_address.address.trim() || undefined,
              city: billing_address.city.trim() || undefined,
              state: billing_address.state.trim() || undefined,
              postal_code: billing_address.postal_code.trim() || undefined,
              country: country_code,
            },
          },
        },
      });

      if (stripe_error) {
        setSubmitError(stripe_error.message ?? "Card verification failed.");
        return;
      }

      if (!setupIntent?.payment_method) {
        setSubmitError("Something went wrong. Please try again.");
        return;
      }

      const stripe_payment_method_id =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;

      // Save the payment method + billing address to our backend
      const profile = await paymentProfileService.createPaymentProfile({
        stripe_payment_method_id,
        cardholder_name: cardholder_name.trim() || null,
        is_default,
        billing_address: {
          address_line1: billing_address.address.trim() || null,
          city: billing_address.city.trim() || null,
          state: billing_address.state.trim() || null,
          postal_code: billing_address.postal_code.trim() || null,
          country: country_code,
          company: billing_address.company.trim() || null,
        },
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Payment Method</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your card information is encrypted and processed securely by Stripe.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── Card preview (sticky on large screens) ── */}
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

        {/* ── Form sections ── */}
        <form onSubmit={handleSubmit} className="min-w-0 flex-1 space-y-5">
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

          {/* ── Card Details section ── */}
          <SectionCard>
            <SectionHeader
              title="Card Details"
              subtitle="Enter the information printed on your card."
              action={
                <div className="hidden items-center gap-1 sm:flex">
                  {[
                    { bg: "#1a1f71", label: "VISA", italic: true },
                    { bg: "#eb001b", label: "MC", italic: false },
                    { bg: "#006fcf", label: "AMEX", italic: false },
                    { bg: "#ff6000", label: "DISC", italic: false },
                  ].map(({ bg, label, italic }) => (
                    <span
                      key={label}
                      className="flex h-5 items-center rounded px-1.5"
                      style={{ background: bg }}
                    >
                      <span className={`text-[8px] font-bold text-white ${italic ? "italic" : ""}`}>
                        {label}
                      </span>
                    </span>
                  ))}
                </div>
              }
            />

            <div className="space-y-4 px-6 py-5">
              {/* Cardholder name */}
              <div>
                <label className={label_class}>Name on Card</label>
                <input
                  type="text"
                  value={cardholder_name}
                  onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                  placeholder="Full name as it appears on card"
                  className={getInputClass()}
                />
              </div>

              {/* Card number */}
              <StripeFieldWrapper label="Card Number" error={stripe_errors.number}>
                <CardNumberElement
                  options={{ style: stripe_style, showIcon: true }}
                  className="w-full"
                  onChange={handleCardNumberChange}
                />
              </StripeFieldWrapper>

              {/* Expiry + CVC */}
              <div className="grid grid-cols-2 gap-3">
                <StripeFieldWrapper label="Expiration Date" error={stripe_errors.expiry}>
                  <CardExpiryElement
                    options={{ style: stripe_style }}
                    className="w-full"
                    onChange={(e) => {
                      setFieldComplete((prev) => ({ ...prev, expiry: e.complete }));
                      setStripeErrors((prev) => ({ ...prev, expiry: e.error?.message ?? "" }));
                    }}
                  />
                </StripeFieldWrapper>

                <StripeFieldWrapper label="Security Code (CVC)" error={stripe_errors.cvc}>
                  <CardCvcElement
                    options={{ style: stripe_style }}
                    className="w-full"
                    onFocus={() => setIsCvcFocused(true)}
                    onBlur={() => setIsCvcFocused(false)}
                    onChange={(e) => {
                      setFieldComplete((prev) => ({ ...prev, cvc: e.complete }));
                      setStripeErrors((prev) => ({ ...prev, cvc: e.error?.message ?? "" }));
                    }}
                  />
                </StripeFieldWrapper>
              </div>
            </div>

            {/* Set as default */}
            <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
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

            {/* Section footer */}
            <div className="flex items-center gap-1.5 border-t border-gray-100 px-6 py-3 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
              256-bit SSL encryption · Secured by Stripe
            </div>
          </SectionCard>

          {/* ── Billing Address section ── */}
          <SectionCard>
            <SectionHeader
              title="Billing Address"
              subtitle="Must match the address on file with your card issuer."
              action={
                has_saved_address ? (
                  <button
                    type="button"
                    onClick={handleApplySavedAddress}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    Use saved address
                  </button>
                ) : null
              }
            />

            <div className="px-6 py-5">
              {/* Saved address info banner */}
              {has_saved_address && saved_billing_address && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-500/20 dark:bg-blue-500/5">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                    />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Saved address on file
                    </p>
                    <p className="mt-0.5 truncate text-xs text-blue-600 dark:text-blue-400">
                      {[
                        saved_billing_address.address,
                        saved_billing_address.city,
                        saved_billing_address.state,
                        saved_billing_address.postal_code,
                        saved_billing_address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Street Address + City */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label_class}>
                      Street Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={billing_address.address}
                      onChange={(e) => handleBillingChange("address", e.target.value)}
                      placeholder="123 Main St"
                      className={getInputClass(!!billing_errors.address)}
                    />
                    <FieldError message={billing_errors.address} />
                  </div>

                  <div>
                    <label className={label_class}>
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={billing_address.city}
                      onChange={(e) => handleBillingChange("city", e.target.value)}
                      placeholder="New York"
                      className={getInputClass(!!billing_errors.city)}
                    />
                    <FieldError message={billing_errors.city} />
                  </div>
                </div>

                {/* Country + State + Postal Code */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className={label_class}>Country</label>
                    <div className="relative">
                      <select
                        value={billing_address.country}
                        onChange={(e) => handleBillingChange("country", e.target.value)}
                        className={`${getInputClass()} cursor-pointer appearance-none pr-10`}
                      >
                        {countries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-3.5">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-500"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={label_class}>
                      State / Province <span className="text-red-400">*</span>
                    </label>
                    <SearchableSelect
                      value={billing_address.state}
                      options={billing_address.country === "United States" ? us_states : []}
                      onChange={(val) => handleBillingChange("state", val)}
                      placeholder={
                        billing_address.country === "United States"
                          ? "Search state…"
                          : "e.g. Ontario"
                      }
                    />
                    <FieldError message={billing_errors.state} />
                  </div>

                  <div>
                    <label className={label_class}>
                      Postal / ZIP Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={billing_address.postal_code}
                      onChange={(e) =>
                        handleBillingChange(
                          "postal_code",
                          e.target.value.replace(/[^a-zA-Z0-9\s-]/g, "").substring(0, 10)
                        )
                      }
                      placeholder="10001"
                      className={getInputClass(!!billing_errors.postal_code)}
                    />
                    <FieldError message={billing_errors.postal_code} />
                  </div>
                </div>

                {/* Company (optional) */}
                <div className="max-w-xs">
                  <label className={label_class}>
                    Company{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={billing_address.company}
                    onChange={(e) => handleBillingChange("company", e.target.value)}
                    placeholder="Your company name"
                    className={getInputClass()}
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between pt-1">
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
              disabled={!isCardComplete() || is_submitting || !stripe}
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
  );
};

export default PaymentMethodForm;
