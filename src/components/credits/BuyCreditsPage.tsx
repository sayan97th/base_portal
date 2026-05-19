"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Elements,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import type { StripeElementChangeEvent } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe";
import { creditsService } from "@/services/client/credits.service";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import { createPaymentIntent } from "@/services/client/stripe.service";
import type { CreditPackage } from "@/types/client/credits";
import type { PaymentProfile } from "@/types/client/payment-profile";

// ── Static credit packages ────────────────────────────────────────────────────

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_3000",
    name: "One-Time — 3,000 Credits",
    credits: 3000,
    price: 2640,
    original_price: 3000,
    discount_pct: 12,
    description: "Perfect for getting started with BASE services.",
  },
  {
    id: "credits_5000",
    name: "One-Time — 5,000 Credits",
    credits: 5000,
    price: 4400,
    original_price: 5000,
    discount_pct: 12,
    description: "Our most popular bundle for growing teams.",
    is_popular: true,
  },
  {
    id: "credits_10000",
    name: "One-Time — 10,000 Credits",
    credits: 10000,
    price: 8800,
    original_price: 10000,
    discount_pct: 12,
    description: "Maximum value for high-volume users.",
  },
];

type CheckoutStep = 1 | 2 | 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatCredits(amount: number): string {
  return amount.toLocaleString("en-US");
}

// ── Stripe element style ──────────────────────────────────────────────────────

const stripe_element_style = {
  style: {
    base: {
      fontSize: "14px",
      color: "#111827",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      fontSmoothing: "antialiased",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444", iconColor: "#ef4444" },
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

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

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <div className={`relative h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${checked ? "border-brand-500" : "border-gray-300 dark:border-gray-600"}`}>
      {checked && <div className="absolute inset-[3px] rounded-full bg-brand-500" />}
    </div>
  );
}

function MiniCard({ brand, last_four }: { brand: string; last_four: string }) {
  const gradients: Record<string, string> = {
    visa: "linear-gradient(135deg, #1a237e 0%, #0288d1 100%)",
    mastercard: "linear-gradient(135deg, #b71c1c 0%, #ff8f00 100%)",
    amex: "linear-gradient(135deg, #004d40 0%, #0097a7 100%)",
    discover: "linear-gradient(135deg, #e65100 0%, #ffb300 100%)",
  };
  const gradient = gradients[brand] ?? "linear-gradient(135deg, #4527a0 0%, #6a1b9a 100%)";
  return (
    <div
      className="relative flex h-11 w-[68px] shrink-0 flex-col justify-between overflow-hidden rounded-lg p-1.5 shadow-md"
      style={{ backgroundImage: gradient }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-lg" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)" }} />
      <div className="relative h-2 w-3.5 rounded-[2px]" style={{ background: "linear-gradient(135deg, #d4a846 0%, #f5d278 50%, #c9952a 100%)" }} />
      <p className="relative font-mono text-[8px] font-semibold tracking-wider text-white/90">•••• {last_four}</p>
    </div>
  );
}

// ── Step Indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1 as CheckoutStep, label: "Select Package" },
  { id: 2 as CheckoutStep, label: "Review Order" },
  { id: 3 as CheckoutStep, label: "Payment" },
];

function StepIndicator({ current_step }: { current_step: CheckoutStep }) {
  return (
    <div className="mb-8 flex items-center justify-center">
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const is_completed = current_step > step.id;
          const is_active = current_step === step.id;
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                    is_completed
                      ? "border-brand-500 bg-brand-500 text-white"
                      : is_active
                      ? "border-brand-500 bg-white text-brand-500 shadow-focus-ring dark:bg-gray-900"
                      : "border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                  }`}
                >
                  {is_completed ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold">{step.id}</span>
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium transition-colors ${
                    is_active
                      ? "text-brand-500"
                      : is_completed
                      ? "text-gray-700 dark:text-gray-300"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-3 mb-5 h-0.5 w-16 transition-all duration-300 sm:w-24 ${
                    current_step > step.id ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Package Card ──────────────────────────────────────────────────────────────

function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: CreditPackage;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex w-full flex-col rounded-2xl border-2 p-5 text-left transition-all duration-200 focus:outline-none ${
        selected
          ? "border-brand-500 bg-brand-50/60 shadow-[0_0_0_4px_rgba(236,60,137,0.08)] dark:bg-brand-500/10 dark:shadow-[0_0_0_4px_rgba(236,60,137,0.12)]"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-gray-600"
      }`}
    >
      {pkg.is_popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
          Most Popular
        </span>
      )}
      {selected && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      )}
      <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" />
        </svg>
        {pkg.discount_pct}% discount
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-extrabold tabular-nums ${selected ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-white"}`}>
          {formatCredits(pkg.credits)}
        </span>
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">CR</span>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{pkg.description}</p>
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700/60">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 line-through dark:text-gray-500">{formatUSD(pkg.original_price)}</p>
            <p className={`text-lg font-bold tabular-nums ${selected ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-white"}`}>
              {formatUSD(pkg.price)}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Save</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatUSD(pkg.original_price - pkg.price)}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Step 1: Select Package ────────────────────────────────────────────────────

function SelectPackageStep({
  packages,
  selected_pkg,
  onSelect,
  onContinue,
}: {
  packages: CreditPackage[];
  selected_pkg: CreditPackage;
  onSelect: (pkg: CreditPackage) => void;
  onContinue: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex items-start gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
          1
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Select Package</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Choose the credit bundle that best fits your needs</p>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              selected={selected_pkg.id === pkg.id}
              onSelect={() => onSelect(pkg)}
            />
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            All packages include a <strong>12% bulk discount</strong>. Credits are added to your account
            immediately after purchase and can be used across all BASE services.
          </p>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            Continue to Review
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Review Order ──────────────────────────────────────────────────────

function ReviewOrderStep({
  pkg,
  onBack,
  onContinue,
}: {
  pkg: CreditPackage;
  onBack: () => void;
  onContinue: () => void;
}) {
  const what_included = [
    `${formatCredits(pkg.credits)} credits added instantly to your account`,
    `Equivalent to ${formatUSD(pkg.credits)} USD in purchasing power`,
    "Credits never expire — use them at your own pace",
    "Redeemable on any BASE service",
    "Email receipt sent immediately after purchase",
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex items-start gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
          2
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Review Your Order</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Confirm the details before proceeding to payment</p>
        </div>
      </div>

      <div className="space-y-5 p-6">
        {/* Package visual card */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-600 via-brand-700 to-brand-900 p-6 shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">Credit Package</p>
              <p className="mt-2 text-4xl font-extrabold tabular-nums leading-none text-white">
                {formatCredits(pkg.credits)}
                <span className="ml-2 text-2xl font-bold text-white/50">CR</span>
              </p>
              <p className="mt-2 text-sm text-white/70">{pkg.description}</p>
              {pkg.is_popular && (
                <span className="mt-3 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most Popular
                </span>
              )}
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
          <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-3 dark:border-gray-800 dark:bg-white/2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Price Breakdown</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-600 dark:text-gray-400">Original price</span>
              <span className="text-sm text-gray-400 line-through dark:text-gray-500">{formatUSD(pkg.original_price)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" />
                </svg>
                Bulk discount ({pkg.discount_pct}% off)
              </span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                −{formatUSD(pkg.original_price - pkg.price)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-gray-50/60 px-5 py-4 dark:bg-white/2">
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Total due today</span>
                <p className="text-xs text-gray-400 dark:text-gray-500">One-time payment · No recurring charges</p>
              </div>
              <span className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">{formatUSD(pkg.price)}</span>
            </div>
          </div>
        </div>

        {/* What's included */}
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-5 dark:border-brand-500/20 dark:bg-brand-500/5">
          <h3 className="mb-3.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            What&apos;s Included
          </h3>
          <ul className="space-y-2.5">
            {what_included.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-xs text-gray-600 dark:text-gray-400">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            Proceed to Payment
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Payment Method ────────────────────────────────────────────────────

interface PaymentStepProps {
  payment_profiles: PaymentProfile[];
  profiles_loading: boolean;
  selected_profile_id: string | "new" | null;
  onSelectProfile: (id: string | "new" | null) => void;
  name_on_card: string;
  onNameOnCardChange: (v: string) => void;
  name_on_card_error?: string;
  stripe_errors: { card_number?: string; card_expiry?: string; card_cvc?: string };
  onElementChange: (field: "card_number" | "card_expiry" | "card_cvc", event: StripeElementChangeEvent) => void;
  save_for_future: boolean;
  onSaveForFutureChange: (v: boolean) => void;
  is_processing: boolean;
  purchase_error: string | null;
  selected_pkg: CreditPackage;
  onBack: () => void;
  onPurchase: () => void;
  stripe_ready: boolean;
}

function PaymentStep({
  payment_profiles,
  profiles_loading,
  selected_profile_id,
  onSelectProfile,
  name_on_card,
  onNameOnCardChange,
  name_on_card_error,
  stripe_errors,
  onElementChange,
  save_for_future,
  onSaveForFutureChange,
  is_processing,
  purchase_error,
  selected_pkg,
  onBack,
  onPurchase,
  stripe_ready,
}: PaymentStepProps) {
  const brand_labels: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
          3
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Payment Method</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {profiles_loading
              ? "Loading your saved cards…"
              : payment_profiles.length > 0
              ? "Select a saved card or add a new one"
              : "Enter your card details to complete the purchase"}
          </p>
        </div>
      </div>

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

      {!profiles_loading && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {/* Saved cards */}
          {payment_profiles.map((profile) => {
            const is_selected = selected_profile_id === profile.id;
            return (
              <label
                key={profile.id}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectProfile(is_selected ? null : profile.id);
                }}
                className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors ${
                  is_selected ? "bg-brand-50/70 dark:bg-brand-500/5" : "hover:bg-gray-50 dark:hover:bg-white/2"
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={profile.id}
                  checked={is_selected}
                  onChange={() => {}}
                  className="sr-only"
                />
                <RadioDot checked={is_selected} />
                <MiniCard brand={profile.card_brand} last_four={profile.last_four} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {brand_labels[profile.card_brand] ?? profile.card_brand}
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
                  <svg className="h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </label>
            );
          })}

          {/* New card option */}
          <div>
            <label
              onClick={(e) => {
                e.preventDefault();
                onSelectProfile(selected_profile_id === "new" ? null : "new");
              }}
              className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors ${
                selected_profile_id === "new" ? "bg-brand-50/70 dark:bg-brand-500/5" : "hover:bg-gray-50 dark:hover:bg-white/2"
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="new"
                checked={selected_profile_id === "new"}
                onChange={() => {}}
                className="sr-only"
              />
              <RadioDot checked={selected_profile_id === "new"} />
              <div className="flex h-11 w-[68px] shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {payment_profiles.length > 0 ? "Use a different card" : "Add a new card"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enter your card details below</p>
              </div>
            </label>

            {/* Inline card form */}
            {selected_profile_id === "new" && (
              <div className="border-t border-gray-100 bg-gray-50/40 px-6 pb-6 pt-5 dark:border-gray-800 dark:bg-white/1">
                <div className="space-y-4">
                  {/* Card Number */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Card Number
                    </label>
                    <div
                      className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                        stripe_errors.card_number
                          ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                          : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700"
                      }`}
                    >
                      <CardNumberElement
                        options={{ ...stripe_element_style, showIcon: true }}
                        className="w-full"
                        onChange={(e) => onElementChange("card_number", e)}
                      />
                    </div>
                    {stripe_errors.card_number && (
                      <p className="mt-1 text-xs text-red-500">{stripe_errors.card_number}</p>
                    )}
                  </div>

                  {/* Expiry + CVC */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Expiration Date
                      </label>
                      <div
                        className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                          stripe_errors.card_expiry
                            ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                            : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700"
                        }`}
                      >
                        <CardExpiryElement
                          options={stripe_element_style}
                          className="w-full"
                          onChange={(e) => onElementChange("card_expiry", e)}
                        />
                      </div>
                      {stripe_errors.card_expiry && (
                        <p className="mt-1 text-xs text-red-500">{stripe_errors.card_expiry}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        CVC
                      </label>
                      <div
                        className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                          stripe_errors.card_cvc
                            ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                            : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700"
                        }`}
                      >
                        <CardCvcElement
                          options={stripe_element_style}
                          className="w-full"
                          onChange={(e) => onElementChange("card_cvc", e)}
                        />
                      </div>
                      {stripe_errors.card_cvc && (
                        <p className="mt-1 text-xs text-red-500">{stripe_errors.card_cvc}</p>
                      )}
                    </div>
                  </div>

                  {/* Name on card */}
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      htmlFor="buy_name_on_card"
                    >
                      Name on Card
                    </label>
                    <input
                      id="buy_name_on_card"
                      type="text"
                      value={name_on_card}
                      onChange={(e) => onNameOnCardChange(e.target.value)}
                      placeholder="Full name as it appears on card"
                      className={`h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:text-white dark:placeholder:text-gray-500 ${
                        name_on_card_error
                          ? "border-red-400 bg-red-50/40 focus:border-red-400 focus:ring-red-400/20"
                          : "border-gray-200 bg-gray-50 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/3 dark:focus:border-brand-400"
                      }`}
                    />
                    <FieldError message={name_on_card_error} />
                  </div>

                  {/* Save for future */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 transition-colors hover:bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/5 dark:hover:bg-brand-500/10">
                    <input
                      type="checkbox"
                      checked={save_for_future}
                      onChange={(e) => onSaveForFutureChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 accent-brand-500 dark:border-gray-600"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">
                        Save for future purchases
                      </span>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Your card is securely stored by Stripe for faster checkout next time.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security notice */}
      <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 dark:border-gray-800">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          256-bit SSL encryption · Secured by Stripe
        </div>
        <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">Powered by Stripe</div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
        {purchase_error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 dark:border-red-500/20 dark:bg-red-500/10">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-red-700 dark:text-red-400">{purchase_error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={is_processing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>
          <button
            type="button"
            onClick={onPurchase}
            disabled={is_processing || profiles_loading || !stripe_ready || selected_profile_id === null}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {is_processing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                Complete Purchase — {formatUSD(selected_pkg.price)}
              </>
            )}
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
          By completing this purchase you agree to our{" "}
          <span className="font-medium text-gray-500 dark:text-gray-400">Terms of Service</span>.
        </p>
      </div>
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────

function PurchaseSuccessScreen({
  pkg,
  new_balance,
  onBuyMore,
}: {
  pkg: CreditPackage;
  new_balance: number;
  onBuyMore: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
          <svg className="h-12 w-12 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 shadow-lg">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Purchase Complete!</h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          +{formatCredits(pkg.credits)} credits
        </span>{" "}
        have been added to your account
      </p>

      <div className="mt-6 rounded-2xl bg-linear-to-br from-brand-600 via-brand-700 to-brand-900 px-8 py-5 shadow-lg">
        <p className="text-xs font-medium tracking-wide text-white/60">Your New Balance</p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums text-white">
          {formatCredits(new_balance)} <span className="text-xl text-white/60">CR</span>
        </p>
        <p className="mt-1 text-xs text-white/50">{formatUSD(new_balance)} USD equivalent</p>
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3.5 text-left dark:border-blue-500/25 dark:bg-blue-500/10">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          A confirmation email with your credit details has been sent to your inbox.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/credits"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          View My Credits
        </Link>
        <button
          type="button"
          onClick={onBuyMore}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Buy More Credits
        </button>
      </div>
    </div>
  );
}

// ── Inner Form (uses useStripe / useElements) ─────────────────────────────────

function BuyCreditsForm({ packages }: { packages: CreditPackage[] }) {
  const stripe = useStripe();
  const elements = useElements();

  // ── Step state ─────────────────────────────────────────────────────────────
  const [current_step, setCurrentStep] = useState<CheckoutStep>(1);

  // ── Package selection ──────────────────────────────────────────────────────
  const [selected_pkg, setSelectedPkg] = useState<CreditPackage>(packages[0]);

  // ── Payment profiles ───────────────────────────────────────────────────────
  const [payment_profiles, setPaymentProfiles] = useState<PaymentProfile[]>([]);
  const [profiles_loading, setProfilesLoading] = useState(true);
  const [selected_profile_id, setSelectedProfileId] = useState<string | "new" | null>(null);

  // ── New card form ──────────────────────────────────────────────────────────
  const [name_on_card, setNameOnCard] = useState("");
  const [name_on_card_error, setNameOnCardError] = useState<string>();
  const [stripe_errors, setStripeErrors] = useState<{
    card_number?: string;
    card_expiry?: string;
    card_cvc?: string;
  }>({});
  const [save_for_future, setSaveForFuture] = useState(false);

  // ── Purchase state ─────────────────────────────────────────────────────────
  const [is_processing, setIsProcessing] = useState(false);
  const [purchase_error, setPurchaseError] = useState<string | null>(null);
  const [purchase_result, setPurchaseResult] = useState<{ new_balance: number } | null>(null);

  // ── Load payment profiles ──────────────────────────────────────────────────
  useEffect(() => {
    async function loadProfiles() {
      try {
        const profiles = await paymentProfileService.fetchPaymentProfiles();
        setPaymentProfiles(profiles);
        const default_profile = profiles.find((p) => p.is_default) ?? profiles[0];
        setSelectedProfileId(default_profile ? default_profile.id : "new");
      } catch {
        setSelectedProfileId("new");
      } finally {
        setProfilesLoading(false);
      }
    }
    loadProfiles();
  }, []);

  // ── Navigation handlers ────────────────────────────────────────────────────

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleSelectPackage = useCallback((pkg: CreditPackage) => {
    setSelectedPkg(pkg);
  }, []);

  const handleContinueToReview = useCallback(() => {
    setCurrentStep(2);
    scrollTop();
  }, []);

  const handleContinueToPayment = useCallback(() => {
    setCurrentStep(3);
    scrollTop();
  }, []);

  const handleBackToPackages = useCallback(() => {
    setCurrentStep(1);
    scrollTop();
  }, []);

  const handleBackToReview = useCallback(() => {
    setCurrentStep(2);
    setPurchaseError(null);
    scrollTop();
  }, []);

  // ── Stripe element change ──────────────────────────────────────────────────

  const handleElementChange = useCallback(
    (field: "card_number" | "card_expiry" | "card_cvc", event: StripeElementChangeEvent) => {
      setStripeErrors((prev) => ({ ...prev, [field]: event.error?.message }));
    },
    []
  );

  // ── Form validation ────────────────────────────────────────────────────────

  const is_using_saved =
    selected_profile_id !== null && selected_profile_id !== "new";

  const validatePaymentForm = useCallback((): boolean => {
    let valid = true;
    if (!is_using_saved) {
      if (!name_on_card.trim()) {
        setNameOnCardError("Name on card is required.");
        valid = false;
      } else {
        setNameOnCardError(undefined);
      }
    }
    if (selected_profile_id === null) {
      setPurchaseError("Please select a payment method.");
      valid = false;
    }
    return valid;
  }, [name_on_card, is_using_saved, selected_profile_id]);

  // ── Purchase handler ───────────────────────────────────────────────────────

  const handlePurchase = useCallback(async () => {
    if (!stripe || !elements) return;
    if (!validatePaymentForm()) return;

    setIsProcessing(true);
    setPurchaseError(null);

    try {
      const amount_cents = Math.round(selected_pkg.price * 100);
      let payment_intent_id: string;

      if (is_using_saved) {
        const profile = payment_profiles.find((p) => p.id === selected_profile_id);
        if (!profile) throw new Error("Selected payment method not found.");

        const { client_secret, payment_intent_id: pi_id } = await createPaymentIntent({
          amount_cents,
          stripe_payment_method_id: profile.stripe_payment_method_id,
          metadata: { type: "credit_purchase", package_id: selected_pkg.id },
        });

        const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
          payment_method: profile.stripe_payment_method_id,
        });

        if (error) throw new Error(error.message ?? "Payment failed. Please try again.");
        if (paymentIntent?.status !== "succeeded" && paymentIntent?.status !== "requires_capture") {
          throw new Error("Payment could not be completed. Please try again.");
        }

        payment_intent_id = pi_id;
      } else {
        const card_element = elements.getElement(CardNumberElement);
        if (!card_element) throw new Error("Card element not found.");

        const { client_secret, payment_intent_id: pi_id } = await createPaymentIntent({
          amount_cents,
          metadata: { type: "credit_purchase", package_id: selected_pkg.id },
        });

        const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: card_element,
            billing_details: { name: name_on_card },
          },
        });

        if (error) throw new Error(error.message ?? "Payment failed. Please try again.");
        if (paymentIntent?.status !== "succeeded" && paymentIntent?.status !== "requires_capture") {
          throw new Error("Payment could not be completed. Please try again.");
        }

        payment_intent_id = pi_id;

        if (save_for_future && paymentIntent.payment_method) {
          try {
            await paymentProfileService.createPaymentProfile({
              stripe_payment_method_id:
                typeof paymentIntent.payment_method === "string"
                  ? paymentIntent.payment_method
                  : paymentIntent.payment_method.id,
              cardholder_name: name_on_card.trim() || null,
              is_default: payment_profiles.length === 0,
            });
          } catch {
            // Non-blocking — purchase still succeeded
          }
        }
      }

      const result = await creditsService.purchaseCredits({
        package_id: selected_pkg.id,
        credits_amount: selected_pkg.credits,
        amount_paid: selected_pkg.price,
        payment_intent_id,
      });

      setPurchaseResult({ new_balance: result.new_balance });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setPurchaseError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [
    stripe,
    elements,
    validatePaymentForm,
    selected_pkg,
    is_using_saved,
    payment_profiles,
    selected_profile_id,
    save_for_future,
    name_on_card,
  ]);

  const handleBuyMore = useCallback(() => {
    setPurchaseResult(null);
    setCurrentStep(1);
    setSelectedPkg(packages[0]);
    setPurchaseError(null);
    scrollTop();
  }, [packages]);

  // ── Success screen ─────────────────────────────────────────────────────────

  if (purchase_result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <PurchaseSuccessScreen
          pkg={selected_pkg}
          new_balance={purchase_result.new_balance}
          onBuyMore={handleBuyMore}
        />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/credits"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Credits
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">Buy Credits</span>
      </div>

      {/* Intro banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-linear-to-r from-brand-600 to-brand-800 p-6 shadow-lg">
        <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-4 right-32 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white">Buy Credits</h1>
            <p className="mt-1 text-sm text-white/70">
              Purchase a bulk order of credits — use them across any BASE service.
              Credits never expire and have 1:1 parity with USD.
            </p>
          </div>
          <div className="shrink-0">
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 backdrop-blur-sm">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-sm font-semibold text-white">12% bulk discount on all packages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current_step={current_step} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Main column ── */}
        <div className="lg:col-span-2">
          {current_step === 1 && (
            <SelectPackageStep
              packages={packages}
              selected_pkg={selected_pkg}
              onSelect={handleSelectPackage}
              onContinue={handleContinueToReview}
            />
          )}

          {current_step === 2 && (
            <ReviewOrderStep
              pkg={selected_pkg}
              onBack={handleBackToPackages}
              onContinue={handleContinueToPayment}
            />
          )}

          {current_step === 3 && (
            <PaymentStep
              payment_profiles={payment_profiles}
              profiles_loading={profiles_loading}
              selected_profile_id={selected_profile_id}
              onSelectProfile={(id) => {
                setSelectedProfileId(id);
                setPurchaseError(null);
              }}
              name_on_card={name_on_card}
              onNameOnCardChange={(v) => {
                setNameOnCard(v);
                if (v.trim()) setNameOnCardError(undefined);
              }}
              name_on_card_error={name_on_card_error}
              stripe_errors={stripe_errors}
              onElementChange={handleElementChange}
              save_for_future={save_for_future}
              onSaveForFutureChange={setSaveForFuture}
              is_processing={is_processing}
              purchase_error={purchase_error}
              selected_pkg={selected_pkg}
              onBack={handleBackToReview}
              onPurchase={handlePurchase}
              stripe_ready={!!stripe}
            />
          )}
        </div>

        {/* ── Right column: Summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Order summary card */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Order Summary</h3>
              </div>
              <div className="space-y-4 p-5">
                {/* Selected package */}
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selected_pkg.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{selected_pkg.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Credits</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCredits(selected_pkg.credits)} CR
                    </span>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Original price</span>
                    <span className="text-gray-400 line-through dark:text-gray-500">
                      {formatUSD(selected_pkg.original_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="text-xs">Discount ({selected_pkg.discount_pct}% off)</span>
                    <span className="text-xs font-semibold">
                      −{formatUSD(selected_pkg.original_price - selected_pkg.price)}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Total
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">USD</p>
                    </div>
                    <p className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">
                      {formatUSD(selected_pkg.price)}
                    </p>
                  </div>
                </div>

                {/* Progress tracker */}
                <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                  {STEPS.map((step, index) => {
                    const is_done = current_step > step.id;
                    const is_active = current_step === step.id;
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 px-4 py-2.5 ${
                          index < STEPS.length - 1
                            ? "border-b border-gray-50 dark:border-gray-800/50"
                            : ""
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                            is_done
                              ? "bg-brand-500 text-white"
                              : is_active
                              ? "border-2 border-brand-500 text-brand-500"
                              : "border-2 border-gray-200 text-gray-400 dark:border-gray-700"
                          }`}
                        >
                          {is_done ? (
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            step.id
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            is_active
                              ? "text-brand-500"
                              : is_done
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* What you get */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                What you get
              </p>
              <ul className="space-y-2.5">
                {[
                  { icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", text: "Instant credit delivery to your account" },
                  { icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", text: "Credits never expire" },
                  { icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", text: "1 credit = $1.00 USD value" },
                  { icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", text: "Use on any BASE service" },
                  {
                    icon: "M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75",
                    text: "Email receipt sent immediately",
                  },
                ].map(({ icon, text }, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Purchase history link */}
            <Link
              href="/credits/purchases"
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:bg-white/[0.04]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              View purchase history
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Outer Component (provides Stripe context) ─────────────────────────────────

const BuyCreditsPage: React.FC = () => {
  return (
    <Elements stripe={getStripe()}>
      <BuyCreditsForm packages={CREDIT_PACKAGES} />
    </Elements>
  );
};

export default BuyCreditsPage;
