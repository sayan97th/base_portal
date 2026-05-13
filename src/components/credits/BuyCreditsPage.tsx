"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Elements, useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";
import type { StripeElementChangeEvent } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe";
import { useAuth } from "@/context/AuthContext";
import { creditsService } from "@/services/client/credits.service";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import { createPaymentIntent } from "@/services/client/stripe.service";
import type { CreditPackage } from "@/types/client/credits";
import type { PaymentProfile } from "@/types/client/payment-profile";

// ── Static credit packages (matches screenshot, can be replaced with API data) ──

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_3000",
    name: "One-Time — 3,000 Credits",
    credits: 3000,
    price: 2700,
    original_price: 3000,
    discount_pct: 10,
    description: "Purchase 3,000 credits at a 10% discount.",
  },
  {
    id: "credits_5000",
    name: "One-Time — 5,000 Credits",
    credits: 5000,
    price: 4500,
    original_price: 5000,
    discount_pct: 10,
    description: "Purchase 5,000 credits at a 10% discount.",
    is_popular: true,
  },
  {
    id: "credits_10000",
    name: "One-Time — 10,000 Credits",
    credits: 10000,
    price: 9000,
    original_price: 10000,
    discount_pct: 10,
    description: "Purchase 10,000 credits at a 10% discount.",
  },
];

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

const label_cls = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

function inputCls(has_error?: boolean) {
  const base =
    "h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:text-white dark:placeholder:text-gray-500";
  if (has_error) {
    return `${base} border-red-400 bg-red-50/40 focus:border-red-400 focus:ring-red-400/20 dark:border-red-500/60 dark:bg-red-500/5`;
  }
  return `${base} border-gray-200 bg-gray-50 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:focus:border-brand-400`;
}

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

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      {children}
    </div>
  );
}

function SectionHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
        {step}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
    </div>
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
      {/* Popular badge */}
      {pkg.is_popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
          Most Popular
        </span>
      )}

      {/* Selected indicator */}
      {selected && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      )}

      {/* Discount badge */}
      <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" />
        </svg>
        {pkg.discount_pct}% discount
      </span>

      {/* Credits */}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-extrabold tabular-nums ${selected ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-white"}`}>
          {formatCredits(pkg.credits)}
        </span>
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">CR</span>
      </div>

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{pkg.description}</p>

      {/* Price */}
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700/60">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 line-through">{formatUSD(pkg.original_price)}</p>
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
      {/* Animated check */}
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

      {/* New balance card */}
      <div className="mt-6 rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-8 py-5 shadow-lg">
        <p className="text-xs font-medium tracking-wide text-white/60">Your New Balance</p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums text-white">
          {formatCredits(new_balance)} <span className="text-xl text-white/60">CR</span>
        </p>
        <p className="mt-1 text-xs text-white/50">{formatUSD(new_balance)} USD equivalent</p>
      </div>

      {/* Email notice */}
      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3.5 text-left dark:border-blue-500/25 dark:bg-blue-500/10">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          A confirmation email with your credit details has been sent to your inbox.
        </p>
      </div>

      {/* Actions */}
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

interface BuyCreditsFormProps {
  packages: CreditPackage[];
}

function BuyCreditsForm({ packages }: BuyCreditsFormProps) {
  const { user } = useAuth();
  const stripe = useStripe();
  const elements = useElements();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selected_pkg, setSelectedPkg] = useState<CreditPackage>(packages[0]);

  const [first_name, setFirstName] = useState(user?.first_name ?? "");
  const [last_name, setLastName] = useState(user?.last_name ?? "");
  const [first_name_error, setFirstNameError] = useState<string>();
  const [last_name_error, setLastNameError] = useState<string>();

  const [payment_profiles, setPaymentProfiles] = useState<PaymentProfile[]>([]);
  const [profiles_loading, setProfilesLoading] = useState(true);
  const [selected_profile_id, setSelectedProfileId] = useState<string | "new" | null>(null);

  const [name_on_card, setNameOnCard] = useState("");
  const [name_on_card_error, setNameOnCardError] = useState<string>();
  const [stripe_errors, setStripeErrors] = useState<{ card_number?: string; card_expiry?: string; card_cvc?: string }>({});
  const [save_for_future, setSaveForFuture] = useState(false);

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
        if (default_profile) {
          setSelectedProfileId(default_profile.id);
        } else {
          setSelectedProfileId("new");
        }
      } catch {
        setSelectedProfileId("new");
      } finally {
        setProfilesLoading(false);
      }
    }
    loadProfiles();
  }, []);

  // Sync user name when auth loads
  useEffect(() => {
    if (user) {
      setFirstName((prev) => (prev === "" ? user.first_name : prev));
      setLastName((prev) => (prev === "" ? user.last_name : prev));
    }
  }, [user]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const handleElementChange = useCallback((field: "card_number" | "card_expiry" | "card_cvc", event: StripeElementChangeEvent) => {
    setStripeErrors((prev) => ({ ...prev, [field]: event.error?.message }));
  }, []);

  const is_using_saved = selected_profile_id !== null && selected_profile_id !== "new";

  const validateForm = useCallback((): boolean => {
    let valid = true;
    if (!first_name.trim()) { setFirstNameError("First name is required."); valid = false; }
    else setFirstNameError(undefined);
    if (!last_name.trim()) { setLastNameError("Last name is required."); valid = false; }
    else setLastNameError(undefined);

    if (!is_using_saved) {
      if (!name_on_card.trim()) { setNameOnCardError("Name on card is required."); valid = false; }
      else setNameOnCardError(undefined);
    }

    if (selected_profile_id === null) {
      setPurchaseError("Please select a payment method.");
      valid = false;
    }
    return valid;
  }, [first_name, last_name, name_on_card, is_using_saved, selected_profile_id]);

  // ── Purchase handler ───────────────────────────────────────────────────────

  const handlePurchase = useCallback(async () => {
    if (!stripe || !elements) return;
    if (!validateForm()) return;

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

        if (save_for_future && !is_using_saved && paymentIntent.payment_method) {
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
            // Non-blocking
          }
        }
      }

      // Record the purchase in Laravel (adds credits + sends email)
      const result = await creditsService.purchaseCredits({
        package_id: selected_pkg.id,
        credits_amount: selected_pkg.credits,
        amount_paid: selected_pkg.price,
        payment_intent_id,
      });

      setPurchaseResult({ new_balance: result.new_balance });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setPurchaseError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [stripe, elements, validateForm, selected_pkg, is_using_saved, payment_profiles, selected_profile_id, save_for_future, name_on_card]);

  // ── Success screen ─────────────────────────────────────────────────────────

  if (purchase_result) {
    return (
      <PurchaseSuccessScreen
        pkg={selected_pkg}
        new_balance={purchase_result.new_balance}
        onBuyMore={() => setPurchaseResult(null)}
      />
    );
  }

  // ── Form render ────────────────────────────────────────────────────────────

  const brand_labels: Record<string, string> = {
    visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* ── Page header ── */}
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

      {/* ── Intro banner ── */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-800 p-5 shadow-lg">
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
        <p className="text-sm font-medium text-white/80">
          Purchase a bulk order of credits — you can use these credits to purchase any of BASE&apos;s services.
          Credits never expire and have a 1:1 parity with USD.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left column ── */}
        <div className="space-y-5 lg:col-span-2">

          {/* Step 1: Package selection */}
          <SectionCard>
            <SectionHeader step={1} title="Select Package" subtitle="Choose the credit bundle that best fits your needs" />
            <div className="p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    selected={selected_pkg.id === pkg.id}
                    onSelect={() => {
                      setSelectedPkg(pkg);
                      setPurchaseError(null);
                    }}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  All packages include a <strong>10% bulk discount</strong>. Credits are added to your account
                  immediately after purchase and can be used across all BASE services.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Step 2: Contact Information */}
          <SectionCard>
            <SectionHeader step={2} title="Contact Information" subtitle="Your purchase confirmation will be sent here" />
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label_cls} htmlFor="buy_first_name">First Name</label>
                  <input
                    id="buy_first_name"
                    type="text"
                    value={first_name}
                    onChange={(e) => { setFirstName(e.target.value); if (e.target.value.trim()) setFirstNameError(undefined); }}
                    placeholder="First name"
                    className={inputCls(!!first_name_error)}
                  />
                  <FieldError message={first_name_error} />
                </div>
                <div>
                  <label className={label_cls} htmlFor="buy_last_name">Last Name</label>
                  <input
                    id="buy_last_name"
                    type="text"
                    value={last_name}
                    onChange={(e) => { setLastName(e.target.value); if (e.target.value.trim()) setLastNameError(undefined); }}
                    placeholder="Last name"
                    className={inputCls(!!last_name_error)}
                  />
                  <FieldError message={last_name_error} />
                </div>
              </div>
              <div>
                <label className={label_cls}>Email Address</label>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  className="h-11 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  To change your email, go to{" "}
                  <Link href="/profile" className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
                    your profile
                  </Link>
                  .
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Step 3: Payment Method */}
          <SectionCard>
            <SectionHeader
              step={3}
              title="Payment"
              subtitle={profiles_loading ? "Loading your saved cards…" : payment_profiles.length > 0 ? "Select a saved card or add a new one" : "Enter your card details to complete the purchase"}
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

            {!profiles_loading && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {/* Saved cards */}
                {payment_profiles.map((profile) => {
                  const is_selected = selected_profile_id === profile.id;
                  return (
                    <label
                      key={profile.id}
                      onClick={(e) => { e.preventDefault(); setPurchaseError(null); setSelectedProfileId(is_selected ? null : profile.id); }}
                      className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors ${is_selected ? "bg-brand-50/70 dark:bg-brand-500/5" : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"}`}
                    >
                      <input type="radio" name="payment_method" value={profile.id} checked={is_selected} onChange={() => {}} className="sr-only" />
                      <RadioDot checked={is_selected} />
                      <MiniCard brand={profile.card_brand} last_four={profile.last_four} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {brand_labels[profile.card_brand] ?? profile.card_brand}
                          </span>
                          <span className="font-mono text-sm text-gray-500 dark:text-gray-400">•••• {profile.last_four}</span>
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
                    onClick={(e) => { e.preventDefault(); setPurchaseError(null); setSelectedProfileId(selected_profile_id === "new" ? null : "new"); }}
                    className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors ${selected_profile_id === "new" ? "bg-brand-50/70 dark:bg-brand-500/5" : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"}`}
                  >
                    <input type="radio" name="payment_method" value="new" checked={selected_profile_id === "new"} onChange={() => {}} className="sr-only" />
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
                    <div className="border-t border-gray-100 bg-gray-50/40 px-6 pb-6 pt-5 dark:border-gray-800 dark:bg-white/[0.01]">
                      <div className="space-y-4">
                        {/* Card Number */}
                        <div>
                          <label className={label_cls}>Card Number</label>
                          <div className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                            stripe_errors.card_number
                              ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                              : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700"
                          }`}>
                            <CardNumberElement
                              options={{ ...stripe_element_style, showIcon: true }}
                              className="w-full"
                              onChange={(e) => handleElementChange("card_number", e)}
                            />
                          </div>
                          {stripe_errors.card_number && <p className="mt-1 text-xs text-red-500">{stripe_errors.card_number}</p>}
                        </div>

                        {/* Expiry + CVC */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={label_cls}>Expiration Date</label>
                            <div className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                              stripe_errors.card_expiry
                                ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                                : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700"
                            }`}>
                              <CardExpiryElement options={stripe_element_style} className="w-full" onChange={(e) => handleElementChange("card_expiry", e)} />
                            </div>
                            {stripe_errors.card_expiry && <p className="mt-1 text-xs text-red-500">{stripe_errors.card_expiry}</p>}
                          </div>
                          <div>
                            <label className={label_cls}>CVC</label>
                            <div className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                              stripe_errors.card_cvc
                                ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                                : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700"
                            }`}>
                              <CardCvcElement options={stripe_element_style} className="w-full" onChange={(e) => handleElementChange("card_cvc", e)} />
                            </div>
                            {stripe_errors.card_cvc && <p className="mt-1 text-xs text-red-500">{stripe_errors.card_cvc}</p>}
                          </div>
                        </div>

                        {/* Name on card */}
                        <div>
                          <label className={label_cls} htmlFor="buy_name_on_card">Name on Card</label>
                          <input
                            id="buy_name_on_card"
                            type="text"
                            value={name_on_card}
                            onChange={(e) => { setNameOnCard(e.target.value); if (e.target.value.trim()) setNameOnCardError(undefined); }}
                            placeholder="Full name as it appears on card"
                            className={inputCls(!!name_on_card_error)}
                          />
                          <FieldError message={name_on_card_error} />
                        </div>

                        {/* Save for future */}
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 transition-colors hover:bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/5 dark:hover:bg-brand-500/10">
                          <input
                            type="checkbox"
                            checked={save_for_future}
                            onChange={(e) => setSaveForFuture(e.target.checked)}
                            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 accent-brand-500 dark:border-gray-600"
                          />
                          <div>
                            <span className="text-sm font-semibold text-gray-800 dark:text-white">Save for future purchases</span>
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

            {/* Security footer */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 dark:border-gray-800">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                256-bit SSL encryption · Secured by Stripe
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                Powered by Stripe
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Right column: Summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Summary</h3>
              </div>

              <div className="p-5 space-y-4">
                {/* Selected package */}
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selected_pkg.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{selected_pkg.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatUSD(selected_pkg.price)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Qty</span>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">1</span>
                  </div>
                </div>

                {/* Credits breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Credits</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCredits(selected_pkg.credits)} CR</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Price</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatUSD(selected_pkg.price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="text-xs">Discount ({selected_pkg.discount_pct}% off)</span>
                    <span className="text-xs font-semibold">−{formatUSD(selected_pkg.original_price - selected_pkg.price)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Total</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">USD</p>
                    </div>
                    <p className="text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">
                      {formatUSD(selected_pkg.price)}
                    </p>
                  </div>
                </div>

                {/* Error message */}
                {purchase_error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 dark:border-red-500/20 dark:bg-red-500/10">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-xs text-red-700 dark:text-red-400">{purchase_error}</p>
                  </div>
                )}

                {/* Purchase button */}
                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={is_processing || profiles_loading || !stripe}
                  className="relative w-full overflow-hidden rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {is_processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      Purchase {formatCredits(selected_pkg.credits)} Credits
                    </span>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                  By completing this purchase you agree to our{" "}
                  <span className="font-medium text-gray-500 dark:text-gray-400">Terms of Service</span>.
                </p>
              </div>
            </div>

            {/* What you get */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">What you get</p>
              <ul className="space-y-2.5">
                {[
                  { icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", text: "Instant credit delivery to your account" },
                  { icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", text: "Credits never expire" },
                  { icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", text: "1 credit = $1.00 USD value" },
                  { icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", text: "Use on any BASE service" },
                  { icon: "M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75", text: "Email receipt sent immediately" },
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

            {/* Link to purchase history */}
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
