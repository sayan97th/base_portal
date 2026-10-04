"use client";

import React, { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { PayButton, PaymentErrorBanner, SecurePaymentNote } from "./PayButton";
import { formatCurrency, getApiErrorMessage } from "./payUtils";

export interface ConfirmedCardPayment {
  payment_intent_id: string;
  payment_method_id: string | null;
  save_card: boolean;
}

interface NewCardPaymentFormProps {
  total_cents: number;
  return_url: string;
  /** Shows the "Save this card" checkbox (authenticated clients only). */
  allow_save_card: boolean;
  onCreatePaymentIntent: (save_card: boolean) => Promise<{ client_secret: string }>;
  onPaymentAuthorized: (confirmed_payment: ConfirmedCardPayment) => Promise<void>;
}

/**
 * New card form rendered inside a deferred-intent <Elements> provider
 * (mode: "payment", card only). The PaymentIntent is created on submit, so no
 * intent is created for visitors who never pay, and only credit/debit cards
 * are offered — no Link, wallets, bank debits or BNPL methods.
 */
export default function NewCardPaymentForm({
  total_cents,
  return_url,
  allow_save_card,
  onCreatePaymentIntent,
  onPaymentAuthorized,
}: NewCardPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [is_submitting, setIsSubmitting] = useState(false);
  const [save_card, setSaveCard] = useState(allow_save_card);
  const [payment_error_message, setPaymentErrorMessage] = useState<string | null>(null);

  const handleSaveCardChange = (checked_value: boolean) => {
    setSaveCard(checked_value);
    // The Elements options must match the PaymentIntent created on submit.
    elements?.update({ setupFutureUsage: checked_value ? "off_session" : null });
  };

  const handleSubmit = async (submit_event: React.FormEvent) => {
    submit_event.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setPaymentErrorMessage(null);

    try {
      const submit_result = await elements.submit();
      if (submit_result?.error) {
        setPaymentErrorMessage(submit_result.error.message ?? "Please check your card details.");
        setIsSubmitting(false);
        return;
      }

      const should_save_card = allow_save_card && save_card;
      const { client_secret } = await onCreatePaymentIntent(should_save_card);

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: client_secret,
        confirmParams: { return_url },
        redirect: "if_required",
      });

      if (error) {
        setPaymentErrorMessage(error.message ?? "Payment failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (paymentIntent && (paymentIntent.status === "requires_capture" || paymentIntent.status === "succeeded")) {
        const payment_method_id =
          typeof paymentIntent.payment_method === "string"
            ? paymentIntent.payment_method
            : paymentIntent.payment_method?.id ?? null;

        await onPaymentAuthorized({
          payment_intent_id: paymentIntent.id,
          payment_method_id,
          save_card: should_save_card,
        });
        return;
      }

      setPaymentErrorMessage("The payment could not be completed. Please try again.");
      setIsSubmitting(false);
    } catch (error_response: unknown) {
      setPaymentErrorMessage(getApiErrorMessage(error_response, "We couldn't start the payment. Please try again."));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "never", googlePay: "never" },
            fields: { billingDetails: { name: "auto" } },
          }}
        />

        {allow_save_card && (
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg bg-gray-50 px-3.5 py-3">
            <input
              type="checkbox"
              checked={save_card}
              onChange={(change_event) => handleSaveCardChange(change_event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
            />
            <span className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">Save this card for future payments</span>
              <span className="block text-xs text-gray-500">
                It will appear as a saved card on your next checkout or invoice payment.
              </span>
            </span>
          </label>
        )}
      </div>

      {payment_error_message && <PaymentErrorBanner message={payment_error_message} />}

      <PayButton
        label={`Complete Purchase · ${formatCurrency(total_cents / 100)}`}
        is_submitting={is_submitting}
        disabled={!stripe || !elements}
      />

      <SecurePaymentNote />
    </form>
  );
}
