"use client";

import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import { StripeElementChangeEvent } from "@stripe/stripe-js";
import SearchableSelect from "./SearchableSelect";
import { createPaymentIntent } from "@/services/client/stripe.service";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import type { PaymentProfile } from "@/types/client/payment-profile";

// ─── Public interface ─────────────────────────────────────────────────────────

export interface BillingAddress {
  address: string;
  city: string;
  country: string;
  state: string;
  postal_code: string;
  company: string;
}

/** Imperative handle exposed via forwardRef so parents can trigger submit. */
export type CheckoutStepHandle = {
  triggerSubmit: () => void;
};

interface CheckoutStepProps {
  billing_address: BillingAddress;
  onBillingChange: (field: keyof BillingAddress, value: string) => void;
  onPrevious: () => void;
  onComplete: (payment_intent_id: string, is_using_saved_method: boolean) => void;
  is_loading?: boolean;
  error_message?: string | null;
  total_amount: number;
  saved_billing_address?: BillingAddress | null;
  onApplySavedAddress?: () => void;
  /** Called whenever the internal processing state changes so the parent can
   *  reflect it on an external submit button (e.g. in the order summary). */
  onProcessingChange?: (is_processing: boolean) => void;
}

interface StripeElementErrors {
  card_number?: string;
  card_expiry?: string;
  card_cvc?: string;
}

interface BillingAddressErrors {
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

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

const countries = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany",
  "France", "Spain", "Italy", "Netherlands", "Brazil", "Mexico",
  "Japan", "South Korea", "India", "Singapore",
];

/** Maps full country names to ISO 3166-1 alpha-2 codes required by Stripe. */
const country_code_map: Record<string, string> = {
  "United States": "US", "Canada": "CA", "United Kingdom": "GB",
  "Australia": "AU", "Germany": "DE", "France": "FR", "Spain": "ES",
  "Italy": "IT", "Netherlands": "NL", "Brazil": "BR", "Mexico": "MX",
  "Japan": "JP", "South Korea": "KR", "India": "IN", "Singapore": "SG",
};

const brand_gradients: Record<string, string> = {
  visa:       "linear-gradient(135deg, #1a237e 0%, #0288d1 100%)",
  mastercard: "linear-gradient(135deg, #b71c1c 0%, #ff8f00 100%)",
  amex:       "linear-gradient(135deg, #004d40 0%, #0097a7 100%)",
  discover:   "linear-gradient(135deg, #e65100 0%, #ffb300 100%)",
};

const brand_labels: Record<string, string> = {
  visa: "Visa", mastercard: "Mastercard",
  amex: "American Express", discover: "Discover",
};

// ─── Stripe element style ─────────────────────────────────────────────────────

const stripe_element_style = {
  style: {
    base: {
      fontSize: "14px",
      color: "#111827",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      fontSmoothing: "antialiased",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444", iconColor: "#ef4444" },
  },
};

// ─── CSS class constants ──────────────────────────────────────────────────────

const label_class =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

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
      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      {message}
    </p>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniCard({ brand, last_four }: { brand: string; last_four: string }) {
  const gradient = brand_gradients[brand] ?? "linear-gradient(135deg, #4527a0 0%, #6a1b9a 100%)";
  return (
    <div
      className="relative flex h-11 w-[68px] shrink-0 flex-col justify-between overflow-hidden rounded-lg p-1.5 shadow-md"
      style={{ backgroundImage: gradient }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-3 -right-3 h-10 w-10 rounded-full opacity-20"
        style={{ background: "rgba(255,255,255,0.6)" }}
      />
      <div
        className="relative h-2 w-3.5 rounded-[2px]"
        style={{ background: "linear-gradient(135deg, #d4a846 0%, #f5d278 50%, #c9952a 100%)" }}
      />
      <p className="relative font-mono text-[8px] font-semibold tracking-wider text-white/90">
        •••• {last_four}
      </p>
    </div>
  );
}

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <div
      className={`relative h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
        checked ? "border-brand-500" : "border-gray-300 dark:border-gray-600"
      }`}
    >
      {checked && (
        <div className="absolute inset-[3px] rounded-full bg-brand-500" />
      )}
    </div>
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
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const CheckoutStep = forwardRef<CheckoutStepHandle, CheckoutStepProps>(function CheckoutStep({
  billing_address,
  onBillingChange,
  onPrevious,
  onComplete,
  is_loading = false,
  error_message,
  total_amount,
  saved_billing_address,
  onApplySavedAddress,
  onProcessingChange,
}, ref) {
  const stripe = useStripe();
  const elements = useElements();

  // New card entry state
  const [name_on_card, setNameOnCard] = useState("");
  const [name_on_card_error, setNameOnCardError] = useState<string | undefined>();
  const [stripe_errors, setStripeErrors] = useState<StripeElementErrors>({});
  const [save_for_future, setSaveForFuture] = useState(false);

  // Billing address validation errors
  const [billing_errors, setBillingErrors] = useState<BillingAddressErrors>({});

  // Payment processing state
  const [is_processing, setIsProcessing] = useState(false);
  const [stripe_error, setStripeError] = useState<string | null>(null);

  // Saved payment profiles
  const [payment_profiles, setPaymentProfiles] = useState<PaymentProfile[]>([]);
  const [profiles_loading, setProfilesLoading] = useState(true);
  const [selected_profile_id, setSelectedProfileId] = useState<string | "new">("new");

  useEffect(() => {
    async function loadProfiles() {
      try {
        const profiles = await paymentProfileService.fetchPaymentProfiles();
        setPaymentProfiles(profiles);
        const default_profile = profiles.find((p) => p.is_default) ?? profiles[0];
        if (default_profile) {
          setSelectedProfileId(default_profile.id);
        }
      } catch {
        // Silently fail — user can still enter a new card
      } finally {
        setProfilesLoading(false);
      }
    }
    loadProfiles();
  }, []);

  const is_using_saved = selected_profile_id !== "new";

  const handleElementChange = (
    field: keyof StripeElementErrors,
    event: StripeElementChangeEvent
  ) => {
    setStripeErrors((prev) => ({
      ...prev,
      [field]: event.error ? event.error.message : undefined,
    }));
  };

  const validateNewCardFields = useCallback((): boolean => {
    let has_errors = false;

    if (!name_on_card.trim()) {
      setNameOnCardError("Please enter the name on your card.");
      has_errors = true;
    } else {
      setNameOnCardError(undefined);
    }

    const errors: BillingAddressErrors = {};
    if (!billing_address.address.trim()) errors.address = "Street address is required.";
    if (!billing_address.city.trim()) errors.city = "City is required.";
    if (!billing_address.state.trim()) errors.state = "State / Province is required.";
    if (!billing_address.postal_code.trim()) errors.postal_code = "Postal / ZIP code is required.";
    setBillingErrors(errors);
    if (Object.keys(errors).length > 0) has_errors = true;

    return !has_errors;
  }, [name_on_card, billing_address]);

  const handleBillingFieldChange = useCallback(
    (field: keyof BillingAddress, value: string) => {
      onBillingChange(field, value);
      if (field in billing_errors) {
        setBillingErrors((prev) => {
          const next = { ...prev };
          delete next[field as keyof BillingAddressErrors];
          return next;
        });
      }
    },
    [onBillingChange, billing_errors]
  );

  const handleComplete = useCallback(async () => {
    if (!stripe || !elements) return;

    if (!is_using_saved) {
      const card_number_element = elements.getElement(CardNumberElement);
      if (!card_number_element) return;
      if (!validateNewCardFields()) return;
    }

    setIsProcessing(true);
    onProcessingChange?.(true);
    setStripeError(null);

    try {
      const amount_cents = Math.round(total_amount * 100);

      let confirm_result;

      if (is_using_saved) {
        const profile = payment_profiles.find((p) => p.id === selected_profile_id);
        if (!profile) throw new Error("Selected payment method not found.");

        // Pass the PM id so the server can attach the Stripe Customer to the
        // PaymentIntent — Stripe requires this for customer-attached cards.
        const { client_secret } = await createPaymentIntent({
          amount_cents,
          stripe_payment_method_id: profile.stripe_payment_method_id,
        });

        confirm_result = await stripe.confirmCardPayment(client_secret, {
          payment_method: profile.stripe_payment_method_id,
        });
      } else {
        const { client_secret } = await createPaymentIntent({ amount_cents });
        const card_number_element = elements.getElement(CardNumberElement)!;
        const country_code = country_code_map[billing_address.country] ?? "US";
        confirm_result = await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: card_number_element,
            billing_details: {
              name: name_on_card,
              address: {
                line1: billing_address.address,
                city: billing_address.city,
                state: billing_address.state,
                postal_code: billing_address.postal_code,
                country: country_code,
              },
            },
          },
        });
      }

      const { error, paymentIntent } = confirm_result;

      if (error) {
        setStripeError(error.message ?? "Payment failed. Please try again.");
        setIsProcessing(false);
        onProcessingChange?.(false);
        return;
      }

      if (
        paymentIntent?.status === "succeeded" ||
        paymentIntent?.status === "requires_capture"
      ) {
        // Optionally save the new card for future use
        if (!is_using_saved && save_for_future && paymentIntent.payment_method) {
          try {
            const pm_id =
              typeof paymentIntent.payment_method === "string"
                ? paymentIntent.payment_method
                : paymentIntent.payment_method.id;
            await paymentProfileService.createPaymentProfile({
              stripe_payment_method_id: pm_id,
              cardholder_name: name_on_card.trim() || null,
              is_default: payment_profiles.length === 0,
            });
          } catch {
            // Don't block the order if card saving fails
          }
        }
        onComplete(paymentIntent.id, is_using_saved);
      } else {
        setStripeError("Payment could not be completed. Please try again.");
        setIsProcessing(false);
        onProcessingChange?.(false);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setStripeError(message);
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  }, [
    stripe, elements, is_using_saved, validateNewCardFields, total_amount,
    payment_profiles, selected_profile_id, billing_address, save_for_future,
    name_on_card, onComplete, onProcessingChange,
  ]);

  useImperativeHandle(ref, () => ({ triggerSubmit: handleComplete }), [handleComplete]);

  const is_busy = is_processing || is_loading;

  return (
    <div className="space-y-5">
      {/* ── Back button ── */}
      <button
        onClick={onPrevious}
        disabled={is_busy}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Keywords
      </button>

      {/* ── Payment Method Section ── */}
      <SectionCard>
        <SectionHeader
          title="Payment Method"
          subtitle={
            profiles_loading
              ? "Loading your saved cards…"
              : payment_profiles.length > 0
              ? "Select a saved card or add a new one"
              : "Enter your card details to complete the purchase"
          }
          action={
            <div className="hidden items-center gap-1 sm:flex">
              {[
                { bg: "#1a1f71", label: "VISA",  italic: true  },
                { bg: "#eb001b", label: "MC",     italic: false },
                { bg: "#006fcf", label: "AMEX",   italic: false },
                { bg: "#ff6000", label: "DISC",   italic: false },
              ].map(({ bg, label, italic }) => (
                <span
                  key={label}
                  className="flex h-5 items-center rounded px-1.5"
                  style={{ background: bg }}
                >
                  <span
                    className={`text-[8px] font-bold text-white ${italic ? "italic" : ""}`}
                  >
                    {label}
                  </span>
                </span>
              ))}
            </div>
          }
        />

        {/* Loading skeleton */}
        {profiles_loading && (
          <div className="animate-pulse divide-y divide-gray-100 dark:divide-gray-800">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="h-11 w-[68px] rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-36 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment options list */}
        {!profiles_loading && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Saved profiles */}
            {payment_profiles.map((profile) => {
              const is_selected = selected_profile_id === profile.id;
              const brand_label = brand_labels[profile.card_brand] ?? profile.card_brand;
              return (
                <label
                  key={profile.id}
                  className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors ${
                    is_selected
                      ? "bg-brand-50/70 dark:bg-brand-500/5"
                      : "hover:bg-gray-50 dark:hover:bg-white/2"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_profile"
                    value={profile.id}
                    checked={is_selected}
                    onChange={() => setSelectedProfileId(profile.id)}
                    className="sr-only"
                  />
                  <RadioDot checked={is_selected} />
                  <MiniCard brand={profile.card_brand} last_four={profile.last_four} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {brand_label}
                      </span>
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                        •••• {profile.last_four}
                      </span>
                      {profile.is_default && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Expires {profile.expiry_month} / {profile.expiry_year}
                    </p>
                  </div>
                  {is_selected && (
                    <svg
                      className="h-4 w-4 shrink-0 text-brand-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </label>
              );
            })}

            {/* "Add new card" option */}
            <div>
              <label
                className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors ${
                  !is_using_saved
                    ? "bg-brand-50/70 dark:bg-brand-500/5"
                    : "hover:bg-gray-50 dark:hover:bg-white/2"
                }`}
              >
                <input
                  type="radio"
                  name="payment_profile"
                  value="new"
                  checked={!is_using_saved}
                  onChange={() => setSelectedProfileId("new")}
                  className="sr-only"
                />
                <RadioDot checked={!is_using_saved} />
                <div className="flex h-11 w-[68px] shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {payment_profiles.length > 0 ? "Use a different card" : "Add a new card"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter your card details below
                  </p>
                </div>
              </label>

              {/* Inline card form — visible when "new" is selected */}
              {!is_using_saved && (
                <div className="border-t border-gray-100 bg-gray-50/40 px-6 pb-6 pt-5 dark:border-gray-800 dark:bg-white/1">
                  <div className="space-y-4">
                    {/* Card number */}
                    <div>
                      <label className={label_class}>Card Number</label>
                      <div
                        className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                          stripe_errors.card_number
                            ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                            : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700 dark:focus-within:border-brand-400"
                        }`}
                      >
                        <CardNumberElement
                          options={{ ...stripe_element_style, showIcon: true }}
                          className="w-full"
                          onChange={(e) => handleElementChange("card_number", e)}
                        />
                      </div>
                      {stripe_errors.card_number && (
                        <p className="mt-1 text-xs text-red-500">{stripe_errors.card_number}</p>
                      )}
                    </div>

                    {/* Expiry + CVC */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={label_class}>Expiration Date</label>
                        <div
                          className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                            stripe_errors.card_expiry
                              ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                              : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700 dark:focus-within:border-brand-400"
                          }`}
                        >
                          <CardExpiryElement
                            options={stripe_element_style}
                            className="w-full"
                            onChange={(e) => handleElementChange("card_expiry", e)}
                          />
                        </div>
                        {stripe_errors.card_expiry && (
                          <p className="mt-1 text-xs text-red-500">{stripe_errors.card_expiry}</p>
                        )}
                      </div>
                      <div>
                        <label className={label_class}>Security Code (CVC)</label>
                        <div
                          className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                            stripe_errors.card_cvc
                              ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                              : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700 dark:focus-within:border-brand-400"
                          }`}
                        >
                          <CardCvcElement
                            options={stripe_element_style}
                            className="w-full"
                            onChange={(e) => handleElementChange("card_cvc", e)}
                          />
                        </div>
                        {stripe_errors.card_cvc && (
                          <p className="mt-1 text-xs text-red-500">{stripe_errors.card_cvc}</p>
                        )}
                      </div>
                    </div>

                    {/* Name on card */}
                    <div>
                      <label className={label_class} htmlFor="checkout_name_on_card">
                        Name on Card
                      </label>
                      <input
                        id="checkout_name_on_card"
                        type="text"
                        value={name_on_card}
                        onChange={(e) => {
                          setNameOnCard(e.target.value);
                          if (e.target.value.trim()) setNameOnCardError(undefined);
                        }}
                        placeholder="Full name as it appears on card"
                        className={getInputClass(!!name_on_card_error)}
                      />
                      <FieldError message={name_on_card_error} />
                    </div>

                    {/* Save for future purchases */}
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 transition-colors hover:bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/5 dark:hover:bg-brand-500/10">
                      <input
                        type="checkbox"
                        checked={save_for_future}
                        onChange={(e) => setSaveForFuture(e.target.checked)}
                        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">
                          Save this card for future purchases
                        </span>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          Your card is securely stored by Stripe for faster checkouts.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section footer: security notice */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 dark:border-gray-800">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
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
          <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
            <svg
              className="h-3 w-3"
              viewBox="0 0 32 32"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M0 0h32v32H0z" fill="none" />
              <path d="M16 3C8.268 3 2 9.268 2 17c0 5.4 2.952 10.13 7.333 12.666V22h-2v-5h2v-3.8C9.333 9.72 11.887 7 15.36 7H20v5h-2.667c-1.474 0-1.666.933-1.666 1.867V17H20l-.667 5h-3.666v7.666C19.948 28.73 24 23.33 24 17c0-7.732-6.268-14-8-14z" />
            </svg>
            Powered by Stripe
          </div>
        </div>
      </SectionCard>

      {/* ── Billing Address Section — only required for new card payments ── */}
      {!is_using_saved && (
        <SectionCard>
          <SectionHeader
            title="Billing Address"
            subtitle="Address associated with your new card"
            action={
              saved_billing_address && onApplySavedAddress ? (
                <button
                  type="button"
                  onClick={onApplySavedAddress}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Use saved address
                </button>
              ) : null
            }
          />

          <div className="px-6 py-5">
            {/* Saved address info banner */}
            {saved_billing_address && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-500/20 dark:bg-blue-500/5">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Saved address on file</p>
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
              {/* Address + City */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label_class}>
                    Street Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={billing_address.address}
                    onChange={(e) => handleBillingFieldChange("address", e.target.value)}
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
                    onChange={(e) => handleBillingFieldChange("city", e.target.value)}
                    placeholder="New York"
                    className={getInputClass(!!billing_errors.city)}
                  />
                  <FieldError message={billing_errors.city} />
                </div>
              </div>

              {/* Country + State + Postal */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={label_class}>Country</label>
                  <div className="relative">
                    <select
                      value={billing_address.country}
                      onChange={(e) => handleBillingFieldChange("country", e.target.value)}
                      className={`${getInputClass()} cursor-pointer appearance-none pr-10`}
                    >
                      {countries.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-3.5">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500" />
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
                    options={us_states}
                    onChange={(val) => handleBillingFieldChange("state", val)}
                    placeholder="Search state…"
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
                    onChange={(e) => handleBillingFieldChange("postal_code", e.target.value)}
                    placeholder="10001"
                    className={getInputClass(!!billing_errors.postal_code)}
                  />
                  <FieldError message={billing_errors.postal_code} />
                </div>
              </div>

              {/* Company */}
              <div className="max-w-xs">
                <label className={label_class}>
                  Company{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={billing_address.company}
                  onChange={(e) => handleBillingFieldChange("company", e.target.value)}
                  placeholder="Your company name"
                  className={getInputClass()}
                />
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── Helper note ── */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Need to change your selection? Click{" "}
        <span className="font-medium text-gray-500 dark:text-gray-400">
          &quot;Back to Keywords&quot;
        </span>{" "}
        above — all entered information will be preserved.
      </p>

      {/* ── Error messages ── */}
      {(stripe_error || error_message) && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-400">
            {stripe_error || error_message}
          </p>
        </div>
      )}

    </div>
  );
});

export default CheckoutStep;
