"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { CardNumberElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { PaymentIntentResult } from "@stripe/stripe-js";
import type { InvoiceDetail } from "@/components/invoices/invoiceData";
import type { PaymentProfile } from "@/types/client/payment-profile";
import { invoiceCardPaymentService } from "@/services/client/invoice-card-payment.service";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import NewCardFields, { type CardFieldName, type NewCardFieldsValue } from "./NewCardFields";
import SavedCardOption from "./SavedCardOption";
import {
  formatUsd,
  getApiErrorMessage,
  isPaymentProfileExpired,
  pickPreferredPaymentProfile,
} from "./invoicePaymentUtils";

const NEW_CARD_OPTION = "new_card";

const AUTHORIZED_PAYMENT_STATUSES = ["requires_capture", "succeeded"];

type CardFieldState = Record<CardFieldName, { is_complete: boolean; error_message: string | null }>;

const INITIAL_CARD_FIELD_STATE: CardFieldState = {
  card_number: { is_complete: false, error_message: null },
  card_expiry: { is_complete: false, error_message: null },
  card_cvc: { is_complete: false, error_message: null },
};

const CARD_FIELD_REQUIRED_MESSAGES: Record<CardFieldName, string> = {
  card_number: "Enter your card number.",
  card_expiry: "Enter the card expiration date.",
  card_cvc: "Enter the card security code.",
};

interface InvoicePaymentFormProps {
  invoice: InvoiceDetail;
  amount_due_cents: number;
  is_authenticated: boolean;
  token: string;
  payment_profiles: PaymentProfile[];
  /** Called once Stripe has authorized the card; the parent records the payment. */
  onPaymentAuthorized: (payment_intent_id: string) => Promise<void>;
}

export default function InvoicePaymentForm({
  invoice,
  amount_due_cents,
  is_authenticated,
  token,
  payment_profiles,
  onPaymentAuthorized,
}: InvoicePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const preferred_payment_profile = useMemo(() => pickPreferredPaymentProfile(payment_profiles), [payment_profiles]);

  const [selected_option, setSelectedOption] = useState<string>(preferred_payment_profile?.id ?? NEW_CARD_OPTION);
  const [new_card_value, setNewCardValue] = useState<NewCardFieldsValue>({
    cardholder_name: "",
    postal_code: "",
    save_card: false,
  });
  const [card_field_state, setCardFieldState] = useState<CardFieldState>(INITIAL_CARD_FIELD_STATE);
  const [field_errors, setFieldErrors] = useState<Partial<Record<CardFieldName | "cardholder_name", string>>>({});
  const [form_error, setFormError] = useState<string | null>(null);
  const [is_submitting, setIsSubmitting] = useState(false);

  const has_saved_cards = is_authenticated && payment_profiles.length > 0;
  const selected_payment_profile =
    selected_option === NEW_CARD_OPTION
      ? null
      : payment_profiles.find((payment_profile) => payment_profile.id === selected_option) ?? null;
  const is_using_new_card = selected_payment_profile === null;

  const handleSelectOption = (option_value: string) => {
    setSelectedOption(option_value);
    setFormError(null);
  };

  const handleCardFieldChange = (field_name: CardFieldName, is_complete: boolean, error_message: string | null) => {
    setCardFieldState((current_state) => ({ ...current_state, [field_name]: { is_complete, error_message } }));
    setFieldErrors((current_errors) => ({ ...current_errors, [field_name]: error_message ?? undefined }));
  };

  const handleNewCardChange = (next_value: NewCardFieldsValue) => {
    setNewCardValue(next_value);
    if (next_value.cardholder_name.trim() !== "") {
      setFieldErrors((current_errors) => ({ ...current_errors, cardholder_name: undefined }));
    }
  };

  const validateNewCard = (): boolean => {
    const next_errors: Partial<Record<CardFieldName | "cardholder_name", string>> = {};

    if (new_card_value.cardholder_name.trim() === "") {
      next_errors.cardholder_name = "Enter the name on the card.";
    }

    (Object.keys(card_field_state) as CardFieldName[]).forEach((field_name) => {
      const field_state = card_field_state[field_name];
      if (field_state.error_message) {
        next_errors[field_name] = field_state.error_message;
      } else if (!field_state.is_complete) {
        next_errors[field_name] = CARD_FIELD_REQUIRED_MESSAGES[field_name];
      }
    });

    setFieldErrors(next_errors);
    return Object.keys(next_errors).length === 0;
  };

  const createPaymentIntent = () => {
    if (!is_authenticated) {
      return invoiceCardPaymentService.createPublicPaymentIntent(invoice.unique_id, token);
    }

    return invoiceCardPaymentService.createAuthenticatedPaymentIntent(
      invoice.unique_id,
      selected_payment_profile
        ? { payment_profile_id: selected_payment_profile.id }
        : { save_card: new_card_value.save_card }
    );
  };

  const confirmCard = (client_secret: string): Promise<PaymentIntentResult> => {
    if (!stripe || !elements) {
      return Promise.reject(new Error("Payment form is not ready."));
    }

    if (selected_payment_profile) {
      return stripe.confirmCardPayment(client_secret, {
        payment_method: selected_payment_profile.stripe_payment_method_id,
      });
    }

    const card_number_element = elements.getElement(CardNumberElement);
    if (!card_number_element) {
      return Promise.reject(new Error("Card details are not available."));
    }

    const postal_code = new_card_value.postal_code.trim();

    return stripe.confirmCardPayment(client_secret, {
      payment_method: {
        card: card_number_element,
        billing_details: {
          name: new_card_value.cardholder_name.trim(),
          ...(postal_code ? { address: { postal_code } } : {}),
        },
      },
    });
  };

  const saveNewCard = async (payment_method: string | { id: string } | null) => {
    if (!payment_method) return;

    try {
      await paymentProfileService.createPaymentProfile({
        stripe_payment_method_id: typeof payment_method === "string" ? payment_method : payment_method.id,
        cardholder_name: new_card_value.cardholder_name.trim() || null,
        is_default: payment_profiles.length === 0,
      });
    } catch {
      // Non-critical: the invoice payment already went through.
    }
  };

  const handleSubmit = async (form_event: React.FormEvent) => {
    form_event.preventDefault();
    if (!stripe || !elements || is_submitting) return;

    setFormError(null);

    if (selected_payment_profile && isPaymentProfileExpired(selected_payment_profile)) {
      setFormError("This card has expired. Please choose another card.");
      return;
    }

    if (is_using_new_card && !validateNewCard()) return;

    setIsSubmitting(true);

    try {
      const payment_intent = await createPaymentIntent();
      const confirm_result = await confirmCard(payment_intent.client_secret);

      if (confirm_result.error) {
        setFormError(confirm_result.error.message ?? "Your card could not be charged. Please try another card.");
        setIsSubmitting(false);
        return;
      }

      const confirmed_intent = confirm_result.paymentIntent;

      if (!confirmed_intent || !AUTHORIZED_PAYMENT_STATUSES.includes(confirmed_intent.status)) {
        setFormError("The payment was not completed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (is_authenticated && is_using_new_card && new_card_value.save_card) {
        await saveNewCard(confirmed_intent.payment_method);
      }

      await onPaymentAuthorized(confirmed_intent.id);
    } catch (error_response) {
      setFormError(getApiErrorMessage(error_response, "We couldn't process your payment. Please try again."));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <fieldset className="space-y-3" disabled={is_submitting}>
        <legend className="mb-3 text-sm font-semibold text-gray-900">
          {has_saved_cards ? "Choose a card" : "Card details"}
        </legend>

        {has_saved_cards && (
          <>
            {payment_profiles.map((payment_profile) => (
              <SavedCardOption
                key={payment_profile.id}
                payment_profile={payment_profile}
                is_selected={selected_option === payment_profile.id}
                is_disabled={is_submitting}
                onSelect={handleSelectOption}
              />
            ))}

            <label
              className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${
                is_using_new_card
                  ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/15"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="invoice_payment_method"
                value={NEW_CARD_OPTION}
                checked={is_using_new_card}
                onChange={() => handleSelectOption(NEW_CARD_OPTION)}
                className="h-4 w-4 shrink-0 accent-brand-500"
              />
              <span className="flex h-7 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-gray-900">Use a new card</span>
            </label>
          </>
        )}

        {is_using_new_card && (
          <div className={has_saved_cards ? "rounded-xl border border-gray-100 bg-white p-4 sm:p-5" : ""}>
            <NewCardFields
              value={new_card_value}
              onChange={handleNewCardChange}
              onCardFieldChange={handleCardFieldChange}
              field_errors={field_errors}
              is_disabled={is_submitting}
              can_save_card={is_authenticated}
            />
          </div>
        )}
      </fieldset>

      {form_error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm font-medium text-red-700">{form_error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={is_submitting || !stripe || !elements}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {is_submitting ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Processing payment…
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            Pay {formatUsd(amount_due_cents)}
          </>
        )}
      </button>

      <div className="space-y-2 text-center text-xs text-gray-500">
        <p>Only credit and debit cards are accepted. Payments are encrypted and processed securely by Stripe.</p>
        {!is_authenticated && (
          <p>
            Have an account?{" "}
            <Link
              href={`/invoices/${encodeURIComponent(invoice.unique_id)}/pay`}
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Sign in to pay with a saved card
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}
