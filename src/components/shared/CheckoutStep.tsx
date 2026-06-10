"use client";

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
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
import { creditsService } from "@/services/client/credits.service";
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

export type CheckoutStepHandle = {
  triggerSubmit: () => void;
};

interface CheckoutStepProps {
  billing_address: BillingAddress;
  onBillingChange: (field: keyof BillingAddress, value: string) => void;
  onPrevious: () => void;
  onComplete: (payment_intent_id: string, is_using_saved_method: boolean, credits_amount?: number) => void;
  onPayLater?: () => void;
  onPayWithCredits?: () => void;
  is_loading?: boolean;
  error_message?: string | null;
  total_amount: number;
  saved_billing_address?: BillingAddress | null;
  onApplySavedAddress?: () => void;
  back_label?: string;
  onProcessingChange?: (is_processing: boolean) => void;
  onCreditsChange?: (is_applying: boolean, credits_to_apply: number) => void;
  /** Called whenever a Stripe-level payment error occurs or is cleared. Used by
   *  the parent to surface the error in the order summary panel next to the
   *  checkout button so the user sees it regardless of scroll position. */
  onStripeError?: (error: string | null) => void;
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
      <div className="pointer-events-none absolute inset-0 rounded-lg" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)" }} />
      <div className="pointer-events-none absolute -bottom-3 -right-3 h-10 w-10 rounded-full opacity-20" style={{ background: "rgba(255,255,255,0.6)" }} />
      <div className="relative h-2 w-3.5 rounded-[2px]" style={{ background: "linear-gradient(135deg, #d4a846 0%, #f5d278 50%, #c9952a 100%)" }} />
      <p className="relative font-mono text-[8px] font-semibold tracking-wider text-white/90">•••• {last_four}</p>
    </div>
  );
}

function RadioDot({ checked, color = "brand" }: { checked: boolean; color?: "brand" | "amber" }) {
  const active = color === "amber" ? "border-amber-500" : "border-brand-500";
  const dot_bg = color === "amber" ? "bg-amber-500" : "bg-brand-500";
  return (
    <div className={`relative h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${checked ? active : "border-gray-300 dark:border-gray-600"}`}>
      {checked && <div className={`absolute inset-[3px] rounded-full ${dot_bg}`} />}
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

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Credits Apply Panel ──────────────────────────────────────────────────────

interface CreditsApplyPanelProps {
  credit_balance: number;
  total_amount: number;
  is_applying: boolean;
  is_credits_sufficient: boolean;
  credits_to_apply: number;
  credits_input: string;
  onToggle: (enabled: boolean) => void;
  onSliderChange: (value: number) => void;
  onInputChange: (raw: string) => void;
  onInputBlur: () => void;
  onApplyMax: () => void;
}

function CreditsApplyPanel({
  credit_balance,
  total_amount,
  is_applying,
  is_credits_sufficient,
  credits_to_apply,
  credits_input,
  onToggle,
  onSliderChange,
  onInputChange,
  onInputBlur,
  onApplyMax,
}: CreditsApplyPanelProps) {
  const max_credits = Math.min(credit_balance, Math.ceil(total_amount));
  const remaining_after_order = Math.max(0, credit_balance - credits_to_apply);

  return (
    <SectionCard>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15">
            <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Account Credits</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {credit_balance.toLocaleString()} credits available · ${credit_balance.toLocaleString()} value · 1 credit = $1.00
            </p>
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 dark:bg-emerald-500/15">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            ${credit_balance.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">

        {/* ── Sufficient credits + currently applying: full-coverage confirmation ── */}
        {is_credits_sufficient && is_applying ? (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/8">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  Your credits fully cover this order
                </p>
                <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                  {credits_to_apply} credits will be used · ${remaining_after_order.toLocaleString()} will remain in your balance
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/3">
              <span className="text-xs text-gray-500 dark:text-gray-400">No card or additional payment required</span>
              <button
                type="button"
                onClick={() => onToggle(false)}
                className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
              >
                Pay with card instead →
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Toggle row ── */}
            <div
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                is_applying
                  ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/8"
                  : "border-gray-200 bg-gray-50/60 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/2 dark:hover:bg-white/4"
              }`}
              onClick={() => onToggle(!is_applying)}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${is_applying ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <svg
                    className={`h-4 w-4 transition-colors ${is_applying ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"}`}
                    fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-semibold transition-colors ${is_applying ? "text-emerald-800 dark:text-emerald-300" : "text-gray-800 dark:text-gray-200"}`}>
                    Apply credits to this order
                  </p>
                  {is_credits_sufficient && !is_applying ? (
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Your balance is enough to cover this order — no card required
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Use your balance as a discount · no expiry
                    </p>
                  )}
                </div>
              </div>

              {/* Toggle switch */}
              <div
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${is_applying ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${is_applying ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </div>
            </div>

            {/* ── Partial-credits slider: only when applying and credits do NOT fully cover ── */}
            {is_applying && !is_credits_sufficient && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Credits to apply</span>
                    <button
                      type="button"
                      onClick={onApplyMax}
                      className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      Apply maximum →
                    </button>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={max_credits}
                    step={1}
                    value={credits_to_apply}
                    onChange={(e) => onSliderChange(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-emerald-500 dark:bg-gray-700"
                    style={{
                      background: max_credits > 0
                        ? `linear-gradient(to right, #10b981 0%, #10b981 ${(credits_to_apply / max_credits) * 100}%, #e5e7eb ${(credits_to_apply / max_credits) * 100}%, #e5e7eb 100%)`
                        : undefined,
                    }}
                  />

                  <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                    <span>0 credits</span>
                    <span>{max_credits.toLocaleString()} credits</span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={0}
                        max={max_credits}
                        value={credits_input}
                        onChange={(e) => onInputChange(e.target.value)}
                        onBlur={onInputBlur}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 pr-16 text-sm font-semibold text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                      <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-gray-400">credits</span>
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                    <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        -${credits_to_apply.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const CheckoutStep = forwardRef<CheckoutStepHandle, CheckoutStepProps>(function CheckoutStep({
  billing_address,
  onBillingChange,
  onPrevious,
  onComplete,
  onPayLater,
  onPayWithCredits,
  is_loading = false,
  error_message,
  total_amount,
  saved_billing_address,
  onApplySavedAddress,
  back_label = "Back to Keywords",
  onProcessingChange,
  onCreditsChange,
  onStripeError,
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

  const reportStripeError = useCallback((msg: string | null) => {
    setStripeError(msg);
    onStripeError?.(msg);
  }, [onStripeError]);

  // Saved payment profiles
  const [payment_profiles, setPaymentProfiles] = useState<PaymentProfile[]>([]);
  const [profiles_loading, setProfilesLoading] = useState(true);
  const [selected_profile_id, setSelectedProfileId] = useState<string | "new" | "pay_later" | null>(null);

  // Payment method validation error (shown when user submits without selecting a method)
  const [payment_required_error, setPaymentRequiredError] = useState<string | null>(null);

  // Account credits
  const [credit_balance, setCreditBalance] = useState(0);
  const [credits_loading, setCreditsLoading] = useState(true);

  // Credits apply state
  const [is_applying_credits, setIsApplyingCredits] = useState(false);
  const [credits_to_apply, setCreditsToApply] = useState(0);
  const [credits_input, setCreditsInput] = useState("0");

  // Tracks whether auto-apply has already fired (runs once after credits load)
  const has_auto_applied = useRef(false);

  // ── Derived values ────────────────────────────────────────────
  const max_credits_to_apply = Math.min(credit_balance, Math.ceil(total_amount));
  const effective_credits = is_applying_credits ? credits_to_apply : 0;
  const amount_after_credits = Math.max(0, total_amount - effective_credits);
  const is_fully_paid_by_credits = is_applying_credits && amount_after_credits <= 0;

  // True when the credit balance alone is enough to pay the entire order
  const has_credits_sufficient =
    !credits_loading && credit_balance > 0 && credit_balance >= total_amount && total_amount > 0;

  const is_pay_later = selected_profile_id === "pay_later";
  const is_using_saved = selected_profile_id !== null && selected_profile_id !== "new" && !is_pay_later;
  const no_payment_method_selected = selected_profile_id === null;

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

  useEffect(() => {
    async function loadCredits() {
      try {
        const { balance } = await creditsService.fetchCreditBalance();
        setCreditBalance(balance);
      } catch {
        // Silently fail — credits panel hidden
      } finally {
        setCreditsLoading(false);
      }
    }
    loadCredits();
  }, []);

  // Auto-apply credits when the balance is sufficient to cover the full order.
  // This runs exactly once after the credits balance is loaded.
  useEffect(() => {
    if (credits_loading || has_auto_applied.current) return;
    has_auto_applied.current = true;

    if (credit_balance >= total_amount && total_amount > 0) {
      const credits_needed = Math.ceil(total_amount);
      setIsApplyingCredits(true);
      setCreditsToApply(credits_needed);
      setCreditsInput(String(credits_needed));
    }
  }, [credits_loading, credit_balance, total_amount]);

  useEffect(() => {
    onCreditsChange?.(is_applying_credits, is_applying_credits ? credits_to_apply : 0);
  }, [is_applying_credits, credits_to_apply, onCreditsChange]);

  // When the parent adjusts total_amount (e.g., switching between discounted and
  // full-price base when credits are toggled), re-calibrate credits_to_apply to
  // the new maximum so the user's credits always cover the correct amount.
  const prev_total_amount_ref = useRef(total_amount);
  useEffect(() => {
    const prev = prev_total_amount_ref.current;
    prev_total_amount_ref.current = total_amount;
    if (!is_applying_credits || total_amount === prev || !has_auto_applied.current) return;
    const new_max = Math.min(credit_balance, Math.ceil(total_amount));
    setCreditsToApply(new_max);
    setCreditsInput(String(new_max));
  }, [total_amount, is_applying_credits, credit_balance]);

  // ── Credits handlers ──────────────────────────────────────────

  const handleCreditsToggle = useCallback((enabled: boolean) => {
    setIsApplyingCredits(enabled);
    if (enabled) {
      const max = Math.min(credit_balance, Math.ceil(total_amount));
      setCreditsToApply(max);
      setCreditsInput(String(max));
    } else {
      setCreditsToApply(0);
      setCreditsInput("0");
    }
  }, [credit_balance, total_amount]);

  const handleCreditsSliderChange = useCallback((value: number) => {
    const clamped = Math.min(Math.max(0, Math.round(value)), max_credits_to_apply);
    setCreditsToApply(clamped);
    setCreditsInput(String(clamped));
  }, [max_credits_to_apply]);

  const handleCreditsInputChange = useCallback((raw: string) => {
    setCreditsInput(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      setCreditsToApply(Math.min(Math.max(0, parsed), max_credits_to_apply));
    }
  }, [max_credits_to_apply]);

  const handleCreditsInputBlur = useCallback(() => {
    setCreditsInput(String(credits_to_apply));
  }, [credits_to_apply]);

  const handleCreditsApplyMax = useCallback(() => {
    setCreditsToApply(max_credits_to_apply);
    setCreditsInput(String(max_credits_to_apply));
  }, [max_credits_to_apply]);

  // ── Stripe element change ─────────────────────────────────────

  const handleElementChange = (field: keyof StripeElementErrors, event: StripeElementChangeEvent) => {
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

  // ── Shared Stripe charge helper ───────────────────────────────

  const chargeCard = useCallback(async (amount_cents: number) => {
    if (!stripe || !elements) throw new Error("Stripe not loaded.");

    if (is_using_saved) {
      const profile = payment_profiles.find((p) => p.id === selected_profile_id);
      if (!profile) throw new Error("Selected payment method not found.");
      const { client_secret } = await createPaymentIntent({
        amount_cents,
        stripe_payment_method_id: profile.stripe_payment_method_id,
      });
      return stripe.confirmCardPayment(client_secret, {
        payment_method: profile.stripe_payment_method_id,
      });
    }

    const { client_secret } = await createPaymentIntent({ amount_cents });
    const card_element = elements.getElement(CardNumberElement)!;
    const country_code = country_code_map[billing_address.country] ?? "US";
    return stripe.confirmCardPayment(client_secret, {
      payment_method: {
        card: card_element,
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
  }, [stripe, elements, is_using_saved, payment_profiles, selected_profile_id, billing_address, name_on_card]);

  const trySaveCard = useCallback(async (payment_method_id: string | { id: string }) => {
    try {
      const pm_id = typeof payment_method_id === "string" ? payment_method_id : payment_method_id.id;
      await paymentProfileService.createPaymentProfile({
        stripe_payment_method_id: pm_id,
        cardholder_name: name_on_card.trim() || null,
        is_default: payment_profiles.length === 0,
      });
    } catch {
      // Don't block the order if card saving fails
    }
  }, [name_on_card, payment_profiles.length]);

  // ── Main submit handler ───────────────────────────────────────

  const handleComplete = useCallback(async () => {
    setPaymentRequiredError(null);

    // ── Validate payment method selection ──
    if (!is_fully_paid_by_credits && !is_pay_later && no_payment_method_selected) {
      const error =
        is_applying_credits && credits_to_apply > 0
          ? `A payment method is required. Your credits cover $${credits_to_apply.toFixed(2)} but the remaining $${amount_after_credits.toFixed(2)} must be paid with a card. Please select a payment method above.`
          : "Please select a payment method to complete your purchase.";
      setPaymentRequiredError(error);
      return;
    }

    // ── Pay Later ──
    if (is_pay_later) {
      onPayLater?.();
      return;
    }

    // ── Full credits payment ──
    if (is_fully_paid_by_credits) {
      setIsProcessing(true);
      onProcessingChange?.(true);
      reportStripeError(null);

      if (onPayWithCredits) {
        // Legacy override path (e.g. invoice payment): pre-deduct credits and let
        // the caller handle the rest. Rollback responsibility belongs to the caller.
        try {
          await creditsService.payWithCredits({
            amount: credits_to_apply,
            description: "Order payment via account credits",
          });
          onPayWithCredits();
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to process credit payment. Please try again.";
          reportStripeError(message);
          setIsProcessing(false);
          onProcessingChange?.(false);
        }
      } else {
        // Atomic path: the backend deducts credits and creates all orders inside a
        // single DB transaction. If order creation fails, the credits deduction is
        // rolled back automatically — credits can never be lost on a backend error.
        onComplete(`credits_pay_${credits_to_apply}`, false);
      }
      return;
    }

    // ── Hybrid: partial credits + card ──
    if (is_applying_credits && credits_to_apply > 0) {
      if (!stripe || !elements) return;
      if (!is_using_saved && !validateNewCardFields()) return;

      setIsProcessing(true);
      onProcessingChange?.(true);
      reportStripeError(null);

      try {
        const amount_cents = Math.round(amount_after_credits * 100);
        const { error, paymentIntent } = await chargeCard(amount_cents);

        if (error) {
          reportStripeError(error.message ?? "Payment failed. Please try again.");
          setIsProcessing(false);
          onProcessingChange?.(false);
          return;
        }

        if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "requires_capture") {
          if (!is_using_saved && save_for_future && paymentIntent.payment_method) {
            await trySaveCard(paymentIntent.payment_method as string | { id: string });
          }
          // Credits are deducted atomically on the backend during order creation.
          // Passing credits_to_apply lets the server verify the card charge amount
          // and deduct the credits as part of the same DB transaction.
          onComplete(paymentIntent.id, is_using_saved, credits_to_apply);
        } else {
          reportStripeError("Payment could not be completed. Please try again.");
          setIsProcessing(false);
          onProcessingChange?.(false);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        reportStripeError(message);
        setIsProcessing(false);
        onProcessingChange?.(false);
      }
      return;
    }

    // ── Pure card payment ──
    if (!stripe || !elements) return;
    if (!is_using_saved) {
      const card_element = elements.getElement(CardNumberElement);
      if (!card_element) return;
      if (!validateNewCardFields()) return;
    }

    setIsProcessing(true);
    onProcessingChange?.(true);
    reportStripeError(null);

    try {
      const amount_cents = Math.round(total_amount * 100);
      const { error, paymentIntent } = await chargeCard(amount_cents);

      if (error) {
        reportStripeError(error.message ?? "Payment failed. Please try again.");
        setIsProcessing(false);
        onProcessingChange?.(false);
        return;
      }

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "requires_capture") {
        if (!is_using_saved && save_for_future && paymentIntent.payment_method) {
          await trySaveCard(paymentIntent.payment_method as string | { id: string });
        }
        onComplete(paymentIntent.id, is_using_saved);
      } else {
        reportStripeError("Payment could not be completed. Please try again.");
        setIsProcessing(false);
        onProcessingChange?.(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      reportStripeError(message);
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  }, [
    is_pay_later, onPayLater,
    is_fully_paid_by_credits, credits_to_apply, onPayWithCredits, onComplete,
    is_applying_credits, amount_after_credits, stripe, elements, is_using_saved,
    validateNewCardFields, chargeCard, save_for_future, trySaveCard,
    total_amount, onProcessingChange, reportStripeError,
    no_payment_method_selected,
  ]);

  useImperativeHandle(ref, () => ({ triggerSubmit: handleComplete }), [handleComplete]);

  const is_busy = is_processing || is_loading;

  // Show billing address form only when the new card option is explicitly selected
  const needs_billing_address = selected_profile_id === "new" && !is_fully_paid_by_credits;

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
        {back_label}
      </button>

      {/* ── Account Credits Section ── */}
      {!credits_loading && credit_balance > 0 && (
        <CreditsApplyPanel
          credit_balance={credit_balance}
          total_amount={total_amount}
          is_applying={is_applying_credits}
          is_credits_sufficient={has_credits_sufficient}
          credits_to_apply={credits_to_apply}
          credits_input={credits_input}
          onToggle={handleCreditsToggle}
          onSliderChange={handleCreditsSliderChange}
          onInputChange={handleCreditsInputChange}
          onInputBlur={handleCreditsInputBlur}
          onApplyMax={handleCreditsApplyMax}
        />
      )}

      {/* Credits skeleton while loading */}
      {credits_loading && (
        <div className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-52 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Method Section — hidden when credits fully cover order ── */}
      {!is_fully_paid_by_credits && (
        <SectionCard>
          <SectionHeader
            title="Payment Method"
            subtitle={
              profiles_loading
                ? "Loading your saved cards…"
                : is_applying_credits && credits_to_apply > 0
                ? `$${amount_after_credits.toFixed(2)} remaining after $${credits_to_apply.toFixed(2)} in credits — select a payment method`
                : payment_profiles.length > 0
                ? "Select a saved card or add a new one — click a selected method to deselect it"
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
                  <span key={label} className="flex h-5 items-center rounded px-1.5" style={{ background: bg }}>
                    <span className={`text-[8px] font-bold text-white ${italic ? "italic" : ""}`}>{label}</span>
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

          {!profiles_loading && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* Saved profiles */}
              {payment_profiles.map((profile) => {
                const is_selected = selected_profile_id === profile.id;
                const brand_label = brand_labels[profile.card_brand] ?? profile.card_brand;
                return (
                  <label
                    key={profile.id}
                    onClick={(e) => {
                      e.preventDefault();
                      setPaymentRequiredError(null);
                      setSelectedProfileId(is_selected ? null : profile.id);
                    }}
                    className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors ${
                      is_selected ? "bg-brand-50/70 dark:bg-brand-500/5" : "hover:bg-gray-50 dark:hover:bg-white/2"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_profile"
                      value={profile.id}
                      checked={is_selected}
                      onChange={() => {}}
                      className="sr-only"
                    />
                    <RadioDot checked={is_selected} />
                    <MiniCard brand={profile.card_brand} last_four={profile.last_four} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{brand_label}</span>
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

              {/* Pay Later option */}
              {onPayLater && (
                <div>
                  <label
                    onClick={(e) => {
                      e.preventDefault();
                      setPaymentRequiredError(null);
                      setSelectedProfileId(is_pay_later ? null : "pay_later");
                    }}
                    className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors ${
                      is_pay_later ? "bg-amber-50/80 dark:bg-amber-500/5" : "hover:bg-gray-50 dark:hover:bg-white/2"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_profile"
                      value="pay_later"
                      checked={is_pay_later}
                      onChange={() => {}}
                      className="sr-only"
                    />
                    <RadioDot checked={is_pay_later} color="amber" />
                    <div className="flex h-11 w-[68px] shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10">
                      <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Pay Later</p>
                        <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400">
                          No card required
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Place your order now and pay when it&apos;s convenient
                      </p>
                    </div>
                    {is_pay_later && (
                      <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </label>

                  {is_pay_later && (
                    <div className="border-t border-amber-100 bg-amber-50/60 px-6 pb-6 pt-5 dark:border-amber-500/15 dark:bg-amber-500/5">
                      <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-500/20 dark:bg-gray-900/60">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
                            <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">How Pay Later works</p>
                            <ul className="mt-2.5 space-y-2">
                              {[
                                { icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", text: "Your order is created immediately and reserved for you." },
                                { icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z", text: "An invoice will be generated and available in My Invoices." },
                                { icon: "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z", text: "Work begins only after payment is received." },
                                { icon: "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z", text: "Pay anytime from My Invoices before your order is delivered." },
                              ].map(({ icon, text }, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                  <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                                  </svg>
                                  <span className="text-xs text-gray-600 dark:text-gray-400">{text}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Add new card option */}
              <div>
                <label
                  onClick={(e) => {
                    e.preventDefault();
                    setPaymentRequiredError(null);
                    setSelectedProfileId(selected_profile_id === "new" ? null : "new");
                  }}
                  className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors ${
                    selected_profile_id === "new"
                      ? "bg-brand-50/70 dark:bg-brand-500/5"
                      : "hover:bg-gray-50 dark:hover:bg-white/2"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_profile"
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
                      {/* Card number */}
                      <div>
                        <label className={label_class}>Card Number</label>
                        <div className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                          stripe_errors.card_number
                            ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                            : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700 dark:focus-within:border-brand-400"
                        }`}>
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
                          <div className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                            stripe_errors.card_expiry
                              ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                              : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700 dark:focus-within:border-brand-400"
                          }`}>
                            <CardExpiryElement options={stripe_element_style} className="w-full" onChange={(e) => handleElementChange("card_expiry", e)} />
                          </div>
                          {stripe_errors.card_expiry && (
                            <p className="mt-1 text-xs text-red-500">{stripe_errors.card_expiry}</p>
                          )}
                        </div>
                        <div>
                          <label className={label_class}>Security Code (CVC)</label>
                          <div className={`flex h-11 items-center overflow-hidden rounded-lg border bg-white px-4 shadow-sm transition-all focus-within:ring-2 dark:bg-gray-900 ${
                            stripe_errors.card_cvc
                              ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                              : "border-gray-200 focus-within:border-brand-400 focus-within:ring-brand-500/20 dark:border-gray-700 dark:focus-within:border-brand-400"
                          }`}>
                            <CardCvcElement options={stripe_element_style} className="w-full" onChange={(e) => handleElementChange("card_cvc", e)} />
                          </div>
                          {stripe_errors.card_cvc && (
                            <p className="mt-1 text-xs text-red-500">{stripe_errors.card_cvc}</p>
                          )}
                        </div>
                      </div>

                      {/* Name on card */}
                      <div>
                        <label className={label_class} htmlFor="checkout_name_on_card">Name on Card</label>
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

                      {/* Save for future */}
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 transition-colors hover:bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/5 dark:hover:bg-brand-500/10">
                        <input
                          type="checkbox"
                          checked={save_for_future}
                          onChange={(e) => setSaveForFuture(e.target.checked)}
                          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <div>
                          <span className="text-sm font-semibold text-gray-800 dark:text-white">Save this card for future purchases</span>
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

          {/* Inline warning: partial credits applied but no payment method selected */}
          {!profiles_loading && is_applying_credits && !is_fully_paid_by_credits && no_payment_method_selected && credits_to_apply > 0 && (
            <div className="border-t border-amber-100 bg-amber-50/60 px-6 py-4 dark:border-amber-500/15 dark:bg-amber-500/5">
              <div className="flex items-start gap-2.5">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Your credits cover <strong>${credits_to_apply.toFixed(2)}</strong> of your order. A payment method is required to pay the remaining <strong>${amount_after_credits.toFixed(2)}</strong> — please select an option above.
                </p>
              </div>
            </div>
          )}

          {/* No payment method selected and no credits covering the order */}
          {!profiles_loading && no_payment_method_selected && (!is_applying_credits || credits_to_apply === 0) && (
            <div className="border-t border-gray-100 bg-gray-50/40 px-6 py-3 dark:border-gray-800 dark:bg-white/1">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                No payment method selected. Select an option above or apply your account credits to cover the order.
              </p>
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
              <svg className="h-3 w-3" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                <path d="M0 0h32v32H0z" fill="none" />
                <path d="M16 3C8.268 3 2 9.268 2 17c0 5.4 2.952 10.13 7.333 12.666V22h-2v-5h2v-3.8C9.333 9.72 11.887 7 15.36 7H20v5h-2.667c-1.474 0-1.666.933-1.666 1.867V17H20l-.667 5h-3.666v7.666C19.948 28.73 24 23.33 24 17c0-7.732-6.268-14-8-14z" />
              </svg>
              Powered by Stripe
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── Billing Address ── only needed for new card payments ── */}
      {needs_billing_address && (
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
            {saved_billing_address && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-500/20 dark:bg-blue-500/5">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Saved address on file</p>
                  <p className="mt-0.5 truncate text-xs text-blue-600 dark:text-blue-400">
                    {[saved_billing_address.address, saved_billing_address.city, saved_billing_address.state, saved_billing_address.postal_code, saved_billing_address.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label_class}>Street Address <span className="text-red-400">*</span></label>
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
                  <label className={label_class}>City <span className="text-red-400">*</span></label>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={label_class}>Country</label>
                  <div className="relative">
                    <select
                      value={billing_address.country}
                      onChange={(e) => handleBillingFieldChange("country", e.target.value)}
                      className={`${getInputClass()} cursor-pointer appearance-none pr-10`}
                    >
                      {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-3.5">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={label_class}>State / Province <span className="text-red-400">*</span></label>
                  <SearchableSelect
                    value={billing_address.state}
                    options={us_states}
                    onChange={(val) => handleBillingFieldChange("state", val)}
                    placeholder="Search state…"
                  />
                  <FieldError message={billing_errors.state} />
                </div>
                <div>
                  <label className={label_class}>Postal / ZIP Code <span className="text-red-400">*</span></label>
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

              <div className="max-w-xs">
                <label className={label_class}>Company <span className="font-normal text-gray-400">(optional)</span></label>
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
        <span className="font-medium text-gray-500 dark:text-gray-400">&quot;{back_label}&quot;</span>{" "}
        above — all entered information will be preserved.
      </p>

      {/* ── Payment method required error ── */}
      {payment_required_error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-700 dark:text-amber-400">{payment_required_error}</p>
        </div>
      )}

      {/* ── Error messages ── */}
      {(stripe_error || error_message) && (() => {
        const active_message = stripe_error || error_message!;
        const lines = active_message.split("\n").filter(Boolean);
        return (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div className="text-sm text-red-700 dark:text-red-400">
              {lines.length > 1 ? (
                <ul className="list-disc list-inside space-y-1">
                  {lines.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              ) : (
                <p>{active_message}</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
});

export default CheckoutStep;
