"use client";

import React from "react";

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

const us_states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
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

const select_class =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

const label_class =
  "mt-1.5 text-xs text-gray-500 dark:text-gray-400";

const CheckoutStep: React.FC<CheckoutStepProps> = ({
  billing_address,
  payment_info,
  onBillingChange,
  onPaymentChange,
  onPrevious,
  onComplete,
}) => {
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
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500" />
                </svg>
              </div>
              <p className={label_class}>Country</p>
            </div>
            <div className="relative">
              <select
                value={billing_address.state}
                onChange={(e) => onBillingChange("state", e.target.value)}
                className={select_class}
              >
                {us_states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500" />
                </svg>
              </div>
              <p className={label_class}>State / Province / Region</p>
            </div>
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
                <span className="text-[10px] font-bold italic text-white">VISA</span>
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

          {/* Card Number */}
          <div className="mb-4">
            <input
              type="text"
              value={payment_info.card_number}
              onChange={(e) => onPaymentChange("card_number", e.target.value)}
              placeholder="Card number"
              className={input_class}
            />
            <p className={label_class}>Card number</p>
          </div>

          {/* Name on Card */}
          <div>
            <input
              type="text"
              value={payment_info.name_on_card}
              onChange={(e) => onPaymentChange("name_on_card", e.target.value)}
              placeholder="Name on card"
              className={input_class}
            />
            <p className={label_class}>Name on card</p>
          </div>
        </div>
      </div>

      {/* Complete Purchase Button */}
      <button
        onClick={onComplete}
        className="w-full rounded-lg bg-coral-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
      >
        Complete Purchase
      </button>
    </div>
  );
};

export default CheckoutStep;
