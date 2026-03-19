"use client";

import React, { useState } from "react";
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

export interface BillingAddress {
  address: string;
  city: string;
  country: string;
  state: string;
  postal_code: string;
  company: string;
}

interface CheckoutStepProps {
  billing_address: BillingAddress;
  onBillingChange: (field: keyof BillingAddress, value: string) => void;
  onPrevious: () => void;
  onComplete: (payment_intent_id: string) => void;
  is_loading?: boolean;
  error_message?: string | null;
  total_amount: number;
  saved_billing_address?: BillingAddress | null;
  onApplySavedAddress?: () => void;
}

interface StripeElementErrors {
  card_number?: string;
  card_expiry?: string;
  card_cvc?: string;
}

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
  "United States": "US",
  "Canada": "CA",
  "United Kingdom": "GB",
  "Australia": "AU",
  "Germany": "DE",
  "France": "FR",
  "Spain": "ES",
  "Italy": "IT",
  "Netherlands": "NL",
  "Brazil": "BR",
  "Mexico": "MX",
  "Japan": "JP",
  "South Korea": "KR",
  "India": "IN",
  "Singapore": "SG",
};

const input_class =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800";

const select_class =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

const label_class = "mt-1.5 text-xs text-gray-500 dark:text-gray-400";

const stripe_element_style = {
  style: {
    base: {
      fontSize: "14px",
      color: "#1d2939",
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      fontSmoothing: "antialiased",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444",
    },
  },
};

const CheckoutStep: React.FC<CheckoutStepProps> = ({
  billing_address,
  onBillingChange,
  onPrevious,
  onComplete,
  is_loading = false,
  error_message,
  total_amount,
  saved_billing_address,
  onApplySavedAddress,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [name_on_card, setNameOnCard] = useState("");
  const [stripe_errors, setStripeErrors] = useState<StripeElementErrors>({});
  const [is_processing, setIsProcessing] = useState(false);
  const [stripe_error, setStripeError] = useState<string | null>(null);

  const handleElementChange = (
    field: keyof StripeElementErrors,
    event: StripeElementChangeEvent
  ) => {
    if (event.error) {
      setStripeErrors((prev) => ({ ...prev, [field]: event.error!.message }));
    } else {
      setStripeErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleComplete = async () => {
    if (!stripe || !elements) return;

    const card_number_element = elements.getElement(CardNumberElement);
    if (!card_number_element) return;

    if (!name_on_card.trim()) {
      setStripeError("Please enter the name on your card.");
      return;
    }

    setIsProcessing(true);
    setStripeError(null);

    try {
      // Step 1: Create a PaymentIntent on the server
      const amount_cents = Math.round(total_amount * 100);
      const { client_secret } = await createPaymentIntent({ amount_cents });

      // Step 2: Confirm the card payment using Stripe.js
      const country_code = country_code_map[billing_address.country] ?? "US";

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        client_secret,
        {
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
        }
      );

      if (error) {
        setStripeError(error.message ?? "Payment failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "requires_capture") {
        // Step 3: Hand off the PaymentIntent ID to the parent to create the order
        onComplete(paymentIntent.id);
      } else {
        setStripeError("Payment could not be completed. Please try again.");
        setIsProcessing(false);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setStripeError(message);
      setIsProcessing(false);
    }
  };

  const is_busy = is_processing || is_loading;

  return (
    <div className="space-y-8">
      {/* Previous Link */}
      <button
        onClick={onPrevious}
        disabled={is_busy}
        className="text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 disabled:opacity-50 dark:text-brand-400 dark:hover:text-brand-300"
      >
        &laquo; Previous
      </button>

      {/* Info Text */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Need to change your quantities? Click &quot;Previous&quot; to edit. All
        information already inserted will automatically be saved.
      </p>

      {/* Billing Address */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Billing address
        </h2>

        {/* Saved address banner */}
        {saved_billing_address && (
          <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-900/20">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400"
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
              <div>
                <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                  Saved billing address found
                </p>
                <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-400">
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
            {onApplySavedAddress && (
              <button
                type="button"
                onClick={onApplySavedAddress}
                className="shrink-0 rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 shadow-theme-xs transition-colors hover:bg-brand-50 dark:border-brand-700 dark:bg-transparent dark:text-brand-300 dark:hover:bg-brand-900/30"
              >
                Use saved address
              </button>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Address + City */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <input
                type="text"
                value={billing_address.address}
                onChange={(e) => onBillingChange("address", e.target.value)}
                placeholder="Address"
                className={input_class}
              />
              <p className={label_class}>Address</p>
            </div>
            <div>
              <input
                type="text"
                value={billing_address.city}
                onChange={(e) => onBillingChange("city", e.target.value)}
                placeholder="City"
                className={input_class}
              />
              <p className={label_class}>City</p>
            </div>
          </div>

          {/* Country + State + Postal */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="relative">
              <select
                value={billing_address.country}
                onChange={(e) => onBillingChange("country", e.target.value)}
                className={select_class}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-3">
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
              <p className={label_class}>Country</p>
            </div>

            <SearchableSelect
              value={billing_address.state}
              options={us_states}
              onChange={(val) => onBillingChange("state", val)}
              label="State / Province / Region"
              placeholder="Search..."
            />

            <div>
              <input
                type="text"
                value={billing_address.postal_code}
                onChange={(e) =>
                  onBillingChange("postal_code", e.target.value)
                }
                placeholder="Postal / Zip Code"
                className={input_class}
              />
              <p className={label_class}>Postal / Zip Code</p>
            </div>
          </div>

          {/* Company */}
          <div className="max-w-sm">
            <input
              type="text"
              value={billing_address.company}
              onChange={(e) => onBillingChange("company", e.target.value)}
              placeholder="Company"
              className={input_class}
            />
            <p className={label_class}>Company (optional)</p>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Payment Method
        </h2>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          {/* Card brand icons */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-coral-500">
              <div className="h-2.5 w-2.5 rounded-full bg-coral-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-7 items-center rounded bg-[#1a1f71] px-1.5">
                <span className="text-[10px] font-bold italic text-white">
                  VISA
                </span>
              </span>
              <span className="flex h-7 items-center rounded bg-[#eb001b] px-1">
                <span className="text-[10px] font-bold text-white">MC</span>
              </span>
              <span className="flex h-7 items-center rounded bg-[#ff6000] px-1">
                <span className="text-[10px] font-bold text-white">DISC</span>
              </span>
              <span className="flex h-7 items-center rounded bg-[#006fcf] px-1">
                <span className="text-[10px] font-bold text-white">AMEX</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                and more...
              </span>
            </div>
          </div>

          {/* Stripe Card Elements */}
          <div className="mb-4">
            {/* Card Number + Expiry + CVC in a single bordered row */}
            <div className="flex gap-0 overflow-hidden rounded-lg border border-gray-300 shadow-theme-xs dark:border-gray-700">
              {/* Card Number */}
              <div className="flex h-11 flex-1 items-center bg-white px-4 dark:bg-gray-900">
                <CardNumberElement
                  options={stripe_element_style}
                  className="w-full"
                  onChange={(e) => handleElementChange("card_number", e)}
                />
              </div>

              {/* Expiry */}
              <div className="flex h-11 w-24 shrink-0 items-center border-l border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900">
                <CardExpiryElement
                  options={stripe_element_style}
                  className="w-full"
                  onChange={(e) => handleElementChange("card_expiry", e)}
                />
              </div>

              {/* CVC */}
              <div className="flex h-11 w-16 shrink-0 items-center border-l border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900">
                <CardCvcElement
                  options={stripe_element_style}
                  className="w-full"
                  onChange={(e) => handleElementChange("card_cvc", e)}
                />
              </div>
            </div>

            {/* Stripe element errors */}
            {(stripe_errors.card_number ||
              stripe_errors.card_expiry ||
              stripe_errors.card_cvc) && (
              <p className="mt-1.5 text-xs text-error-500">
                {stripe_errors.card_number ||
                  stripe_errors.card_expiry ||
                  stripe_errors.card_cvc}
              </p>
            )}
            <p className={label_class}>Card number · Expiry · CVC</p>
          </div>

          {/* Name on card */}
          <div>
            <input
              type="text"
              value={name_on_card}
              onChange={(e) => setNameOnCard(e.target.value)}
              placeholder="Name on card"
              className={input_class}
            />
            <p className={label_class}>Name on card</p>
          </div>
        </div>

        {/* Secure payment badge */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
          Payments are secured and encrypted by Stripe
        </div>
      </div>

      {/* Error messages */}
      {(stripe_error || error_message) && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-900 dark:bg-error-900/20 dark:text-error-400">
          {stripe_error || error_message}
        </div>
      )}

      {/* Complete Purchase Button */}
      <button
        onClick={handleComplete}
        disabled={is_busy || !stripe || !elements}
        className="w-full rounded-lg bg-coral-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
      >
        {is_processing
          ? "Processing payment..."
          : is_loading
          ? "Placing order..."
          : "Complete Purchase"}
      </button>
    </div>
  );
};

export default CheckoutStep;
