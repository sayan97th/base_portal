"use client";

import React, { useState } from "react";
import SearchableSelect from "./SearchableSelect";

export interface BillingAddress {
  address: string;
  city: string;
  country: string;
  state: string;
  postal_code: string;
  company: string;
}

export interface PaymentInfo {
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  cvc: string;
  name_on_card: string;
}

interface CheckoutStepProps {
  billing_address: BillingAddress;
  payment_info: PaymentInfo;
  onBillingChange: (field: keyof BillingAddress, value: string) => void;
  onPaymentChange: (field: keyof PaymentInfo, value: string) => void;
  onPrevious: () => void;
  onComplete: () => void;
}

interface CardErrors {
  card_number?: string;
  expiry?: string;
  cvc?: string;
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

const input_class =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800";

const input_error_class =
  "h-11 w-full rounded-lg border border-error-500 bg-transparent px-4 py-2.5 text-sm text-error-800 shadow-theme-xs placeholder:text-gray-400 focus:border-error-500 focus:outline-hidden focus:ring-3 focus:ring-error-500/10 dark:border-error-500 dark:bg-gray-900 dark:text-error-400 dark:placeholder:text-white/30";

const select_class =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

const label_class = "mt-1.5 text-xs text-gray-500 dark:text-gray-400";

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function validateCardNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 16) return false;

  let sum = 0;
  let is_even = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (is_even) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    is_even = !is_even;
  }
  return sum % 10 === 0;
}

function validateExpiry(month: string, year: string): boolean {
  if (!month || !year) return false;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (m < 1 || m > 12) return false;

  const now = new Date();
  const current_year = now.getFullYear() % 100;
  const current_month = now.getMonth() + 1;

  if (y < current_year) return false;
  if (y === current_year && m < current_month) return false;
  return true;
}

function validateCvc(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 3 && digits.length <= 4;
}

const CheckoutStep: React.FC<CheckoutStepProps> = ({
  billing_address,
  payment_info,
  onBillingChange,
  onPaymentChange,
  onPrevious,
  onComplete,
}) => {
  const [card_errors, setCardErrors] = useState<CardErrors>({});

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    onPaymentChange("card_number", formatted);
    if (card_errors.card_number) {
      setCardErrors((prev) => ({ ...prev, card_number: undefined }));
    }
  };

  const handleExpiryMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    onPaymentChange("expiry_month", raw);
    if (card_errors.expiry) {
      setCardErrors((prev) => ({ ...prev, expiry: undefined }));
    }
  };

  const handleExpiryYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    onPaymentChange("expiry_year", raw);
    if (card_errors.expiry) {
      setCardErrors((prev) => ({ ...prev, expiry: undefined }));
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    onPaymentChange("cvc", raw);
    if (card_errors.cvc) {
      setCardErrors((prev) => ({ ...prev, cvc: undefined }));
    }
  };

  const handleComplete = () => {
    const errors: CardErrors = {};

    if (!validateCardNumber(payment_info.card_number)) {
      errors.card_number = "Please enter a valid card number";
    }
    if (
      !validateExpiry(payment_info.expiry_month, payment_info.expiry_year)
    ) {
      errors.expiry = "Please enter a valid expiration date";
    }
    if (!validateCvc(payment_info.cvc)) {
      errors.cvc = "Please enter a valid CVC";
    }

    if (Object.keys(errors).length > 0) {
      setCardErrors(errors);
      return;
    }

    setCardErrors({});
    onComplete();
  };

  return (
    <div className="space-y-8">
      {/* Previous Link */}
      <button
        onClick={onPrevious}
        className="text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
      >
        &laquo; Previous
      </button>

      {/* Info Text */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Need to change your Quantities? Click &quot;Previous&quot; to edit your
        quantities. All information already inserted will automatically be saved.
      </p>

      {/* Billing Address */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Billing address
        </h2>
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
              <div className="pointer-events-none absolute right-3 top-3 translate-y-0">
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

            {/* Searchable State Select */}
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
                onChange={(e) => onBillingChange("postal_code", e.target.value)}
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
            <p className={label_class}>Company</p>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Payment Method
        </h2>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          {/* Card Icons */}
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

          {/* Card Number + MM/YY + CVC */}
          <div className="mb-4">
            <div className="flex gap-0 overflow-hidden rounded-lg border border-gray-300 shadow-theme-xs dark:border-gray-700">
              {/* Card Number */}
              <input
                type="text"
                value={payment_info.card_number}
                onChange={handleCardNumberChange}
                placeholder="Card number"
                inputMode="numeric"
                className={`h-11 flex-1 border-0 bg-transparent px-4 py-2.5 text-sm focus:outline-hidden dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
                  card_errors.card_number
                    ? "text-error-500 placeholder:text-error-300"
                    : "text-gray-800 placeholder:text-gray-400"
                }`}
              />
              {/* MM / YY */}
              <div className="flex items-center border-l border-gray-300 dark:border-gray-700">
                <input
                  type="text"
                  value={payment_info.expiry_month}
                  onChange={handleExpiryMonthChange}
                  placeholder="MM"
                  inputMode="numeric"
                  maxLength={2}
                  className={`h-11 w-10 border-0 bg-transparent px-0 py-2.5 text-center text-sm focus:outline-hidden dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
                    card_errors.expiry
                      ? "text-error-500 placeholder:text-error-300"
                      : "text-gray-800 placeholder:text-gray-400"
                  }`}
                />
                <span className="text-sm text-gray-400">/</span>
                <input
                  type="text"
                  value={payment_info.expiry_year}
                  onChange={handleExpiryYearChange}
                  placeholder="YY"
                  inputMode="numeric"
                  maxLength={2}
                  className={`h-11 w-10 border-0 bg-transparent px-0 py-2.5 text-center text-sm focus:outline-hidden dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
                    card_errors.expiry
                      ? "text-error-500 placeholder:text-error-300"
                      : "text-gray-800 placeholder:text-gray-400"
                  }`}
                />
              </div>
              {/* CVC */}
              <input
                type="text"
                value={payment_info.cvc}
                onChange={handleCvcChange}
                placeholder="CVC"
                inputMode="numeric"
                maxLength={4}
                className={`h-11 w-16 border-l border-gray-300 bg-transparent px-3 py-2.5 text-center text-sm focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
                  card_errors.cvc
                    ? "text-error-500 placeholder:text-error-300"
                    : "text-gray-800 placeholder:text-gray-400"
                }`}
              />
            </div>
            {/* Error Messages */}
            {(card_errors.card_number ||
              card_errors.expiry ||
              card_errors.cvc) && (
              <p className="mt-1.5 text-xs text-error-500">
                {card_errors.card_number ||
                  card_errors.expiry ||
                  card_errors.cvc}
              </p>
            )}
            <p className={label_class}>Card number</p>
          </div>

          {/* Name on Card */}
          <div>
            <input
              type="text"
              value={payment_info.name_on_card}
              onChange={(e) =>
                onPaymentChange("name_on_card", e.target.value)
              }
              placeholder="Name on card"
              className={input_class}
            />
            <p className={label_class}>Name on card</p>
          </div>
        </div>
      </div>

      {/* Complete Purchase Button */}
      <button
        onClick={handleComplete}
        className="w-full rounded-lg bg-coral-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
      >
        Complete Purchase
      </button>
    </div>
  );
};

export default CheckoutStep;
