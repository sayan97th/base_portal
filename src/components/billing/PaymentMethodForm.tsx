"use client";

import React, { useState } from "react";
import Button from "../ui/button/Button";
import { ChevronLeftIcon } from "@/icons/index";
import type { PaymentMethod } from "./BillingPage";

interface PaymentMethodFormProps {
  onBack: () => void;
  onSubmit: (method: PaymentMethod) => void;
}

type PaymentTab = "card" | "bank";

const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({
  onBack,
  onSubmit,
}) => {
  const [active_tab, setActiveTab] = useState<PaymentTab>("card");
  const [card_number, setCardNumber] = useState("");
  const [expiry_date, setExpiryDate] = useState("");
  const [security_code, setSecurityCode] = useState("");
  const [country, setCountry] = useState("US");
  const [zip_code, setZipCode] = useState("");
  const [cardholder_name, setCardholderName] = useState("");
  const [is_submitting, setIsSubmitting] = useState(false);

  // Bank account fields
  const [routing_number, setRoutingNumber] = useState("");
  const [account_number, setAccountNumber] = useState("");
  const [account_holder_name, setAccountHolderName] = useState("");
  const [account_type, setAccountType] = useState("checking");

  function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, "").substring(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  function formatExpiryDate(value: string): string {
    const digits = value.replace(/\D/g, "").substring(0, 4);
    if (digits.length >= 3) {
      return `${digits.substring(0, 2)} / ${digits.substring(2)}`;
    }
    return digits;
  }

  function detectCardBrand(number: string): string {
    const digits = number.replace(/\s/g, "");
    if (/^4/.test(digits)) return "visa";
    if (/^5[1-5]/.test(digits)) return "mastercard";
    if (/^3[47]/.test(digits)) return "amex";
    if (/^6(?:011|5)/.test(digits)) return "discover";
    return "visa";
  }

  function handleCardNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCardNumber(formatCardNumber(e.target.value));
  }

  function handleExpiryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setExpiryDate(formatExpiryDate(e.target.value));
  }

  function handleSecurityCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").substring(0, 4);
    setSecurityCode(digits);
  }

  function handleZipCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/[^a-zA-Z0-9\s-]/g, "").substring(0, 10);
    setZipCode(value);
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

  function isBankFormValid(): boolean {
    return (
      routing_number.length === 9 &&
      account_number.length >= 4 &&
      account_holder_name.trim().length > 0
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
      expiry_year: expiry_parts[1],
      is_default: false,
    };

    // Simulate API delay
    setTimeout(() => {
      onSubmit(new_method);
      setIsSubmitting(false);
    }, 600);
  }

  function handleSubmitBank(e: React.FormEvent) {
    e.preventDefault();
    if (!isBankFormValid()) return;

    setIsSubmitting(true);

    const new_method: PaymentMethod = {
      id: crypto.randomUUID(),
      card_brand: "bank",
      last_four: account_number.slice(-4),
      expiry_month: "--",
      expiry_year: "--",
      is_default: false,
    };

    setTimeout(() => {
      onSubmit(new_method);
      setIsSubmitting(false);
    }, 600);
  }

  const tabs: { key: PaymentTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "card",
      label: "Card",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
        </svg>
      ),
    },
    {
      key: "bank",
      label: "US bank account",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zm-5-9L2 6v2h20V6z" />
        </svg>
      ),
    },
  ];

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
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ChevronLeftIcon />
        Billing information
      </button>

      {/* Title */}
      <h1 className="text-center text-2xl font-semibold text-gray-900 dark:text-white">
        Add payment method
      </h1>

      {/* Form Card */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:p-10">
        {/* Payment method tabs */}
        <div className="mb-8 flex gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg border-2 px-5 py-3 text-sm font-medium transition-all ${
                active_tab === tab.key
                  ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700"
              }`}
            >
              <span className={active_tab === tab.key ? "text-brand-500 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Card Form */}
        {active_tab === "card" && (
          <form onSubmit={handleSubmitCard} className="space-y-5">
            {/* Cardholder Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cardholder name
              </label>
              <input
                type="text"
                value={cardholder_name}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Full name on card"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
              />
            </div>

            {/* Card Number */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Card number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={card_number}
                  onChange={handleCardNumberChange}
                  placeholder="1234 1234 1234 1234"
                  inputMode="numeric"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 pr-14 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CardBrandIcon brand={detectCardBrand(card_number)} />
                </div>
              </div>
            </div>

            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Expiration date
                </label>
                <input
                  type="text"
                  value={expiry_date}
                  onChange={handleExpiryChange}
                  placeholder="MM / YY"
                  inputMode="numeric"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Security code
                </label>
                <input
                  type="text"
                  value={security_code}
                  onChange={handleSecurityCodeChange}
                  placeholder="CVC"
                  inputMode="numeric"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
                />
              </div>
            </div>

            {/* Country + ZIP */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:focus:border-brand-400"
                >
                  {country_options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ZIP code
                </label>
                <input
                  type="text"
                  value={zip_code}
                  onChange={handleZipCodeChange}
                  placeholder="12345"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
                />
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By providing your card information, you allow Base Search Marketing
              to charge your card for future payments in accordance with their
              terms.
            </p>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                disabled={!isCardFormValid() || is_submitting}
              >
                {is_submitting ? "Processing..." : "Add payment method"}
              </Button>
            </div>
          </form>
        )}

        {/* Bank Account Form */}
        {active_tab === "bank" && (
          <form onSubmit={handleSubmitBank} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Account holder name
              </label>
              <input
                type="text"
                value={account_holder_name}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="Full name"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Account type
              </label>
              <select
                value={account_type}
                onChange={(e) => setAccountType(e.target.value)}
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:focus:border-brand-400"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Routing number
                </label>
                <input
                  type="text"
                  value={routing_number}
                  onChange={(e) =>
                    setRoutingNumber(e.target.value.replace(/\D/g, "").substring(0, 9))
                  }
                  placeholder="110000000"
                  inputMode="numeric"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Account number
                </label>
                <input
                  type="text"
                  value={account_number}
                  onChange={(e) =>
                    setAccountNumber(e.target.value.replace(/\D/g, "").substring(0, 17))
                  }
                  placeholder="000123456789"
                  inputMode="numeric"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              By providing your bank account information, you authorize Base
              Search Marketing to debit your account for future payments in
              accordance with their terms.
            </p>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                disabled={!isBankFormValid() || is_submitting}
              >
                {is_submitting ? "Processing..." : "Add payment method"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

function CardBrandIcon({ brand }: { brand: string }) {
  const colors: Record<string, string> = {
    visa: "text-blue-600",
    mastercard: "text-orange-500",
    amex: "text-indigo-600",
    discover: "text-amber-500",
  };

  const labels: Record<string, string> = {
    visa: "VISA",
    mastercard: "MC",
    amex: "AMEX",
    discover: "DISC",
  };

  return (
    <span className={`text-xs font-bold ${colors[brand] || "text-gray-400"}`}>
      {labels[brand] || ""}
    </span>
  );
}

export default PaymentMethodForm;
