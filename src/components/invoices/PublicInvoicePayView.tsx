"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Elements } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe";
import { getPublicInvoice } from "@/services/public/invoice.service";
import {
  createInvoicePaymentIntent,
  confirmInvoicePayment,
} from "@/services/public/invoice-payment.service";
import { invoicesService } from "@/services/client/invoices.service";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import type { PaymentProfile } from "@/types/client/payment-profile";
import type { AutopaySettings } from "@/types/client/autopay";
import type { InvoiceDetail } from "./invoiceData";
import { InvoiceSummary, MobileSummaryStrip } from "./pay/InvoicePaySummary";
import PayStatusPage from "./pay/PayStatusPage";
import SavedCardList, { NEW_CARD_OPTION } from "./pay/SavedCardList";
import NewCardPaymentForm, { type ConfirmedCardPayment } from "./pay/NewCardPaymentForm";
import AutopayPanel from "./pay/AutopayPanel";
import { PayButton, PaymentErrorBanner, SecurePaymentNote } from "./pay/PayButton";
import {
  STRIPE_APPEARANCE,
  formatCardLabel,
  formatCurrency,
  getApiErrorMessage,
  isCardExpired,
  parseTotalCents,
} from "./pay/payUtils";

interface PublicInvoicePayViewProps {
  invoice_id: string;
  token: string;
}

type PageState =
  | "loading"
  | "error"
  | "not_found"
  | "unauthorized"
  | "already_paid"
  | "credits_invoice"
  | "invalid_status"
  | "ready"
  | "success"
  | "success_pending";

const AUTHORIZED_INTENT_STATUSES = new Set(["requires_capture", "succeeded"]);

function pickDefaultPaymentOption(payment_profiles: PaymentProfile[]): string {
  const usable_profiles = payment_profiles.filter(
    (payment_profile) => !isCardExpired(payment_profile.expiry_month, payment_profile.expiry_year)
  );
  const default_profile = usable_profiles.find((payment_profile) => payment_profile.is_default) ?? usable_profiles[0];
  return default_profile?.id ?? NEW_CARD_OPTION;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PublicInvoicePayView({
  invoice_id,
  token,
}: PublicInvoicePayViewProps) {
  // Saved cards and autopay are only available to the signed-in invoice owner.
  // A public share link (token) never exposes or charges stored cards.
  const is_authenticated_flow = !token;

  const [page_state, setPageState] = useState<PageState>("loading");
  const [invoice_data, setInvoiceData] = useState<InvoiceDetail | null>(null);
  const [total_cents_value, setTotalCentsValue] = useState(0);
  const [payment_profiles, setPaymentProfiles] = useState<PaymentProfile[]>([]);
  const [selected_option, setSelectedOption] = useState<string>(NEW_CARD_OPTION);
  const [autopay_profile_id, setAutopayProfileId] = useState<string | null>(null);
  const [is_paying_with_saved_card, setIsPayingWithSavedCard] = useState(false);
  const [saved_card_error, setSavedCardError] = useState<string | null>(null);
  const [success_notice, setSuccessNotice] = useState<string | null>(null);

  const initializePaymentView = useCallback(async () => {
    try {
      const invoice_response = is_authenticated_flow
        ? await invoicesService.getInvoiceDetail(invoice_id)
        : await getPublicInvoice(invoice_id, token);
      setInvoiceData(invoice_response);

      if (invoice_response.status === "paid") {
        setPageState("already_paid");
        return;
      }

      if (invoice_response.status !== "unpaid" && invoice_response.status !== "overdue") {
        setPageState("invalid_status");
        return;
      }

      const total_cents_amount = parseTotalCents(invoice_response.total);
      if (total_cents_amount === null) {
        setPageState("credits_invoice");
        return;
      }

      if (total_cents_amount === 0) {
        setPageState("already_paid");
        return;
      }

      setTotalCentsValue(total_cents_amount);

      if (is_authenticated_flow) {
        // A failure here must not block payment — fall back to the new card form.
        const saved_profiles = await paymentProfileService.fetchPaymentProfiles().catch(() => []);
        setPaymentProfiles(saved_profiles);
        setSelectedOption(pickDefaultPaymentOption(saved_profiles));
      }

      setPageState("ready");
    } catch (error_response: unknown) {
      const api_error_response = error_response as { status_code?: number };
      if (api_error_response?.status_code === 404) {
        setPageState("not_found");
      } else if (
        api_error_response?.status_code === 403 ||
        api_error_response?.status_code === 401
      ) {
        setPageState("unauthorized");
      } else {
        setPageState("error");
      }
    }
  }, [invoice_id, token, is_authenticated_flow]);

  useEffect(() => {
    initializePaymentView();
  }, [initializePaymentView]);

  const elements_options = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: total_cents_value || 50,
      currency: "usd",
      paymentMethodTypes: ["card"],
      captureMethod: "manual",
      ...(is_authenticated_flow ? { setupFutureUsage: "off_session" as const } : {}),
      appearance: STRIPE_APPEARANCE,
    }),
    [total_cents_value, is_authenticated_flow]
  );

  const return_url = useMemo(() => {
    if (typeof window === "undefined") return "";
    const query_string = token
      ? `?token=${encodeURIComponent(token)}&status=success`
      : "?status=success";
    return `${window.location.origin}/invoices/${invoice_id}/pay${query_string}`;
  }, [invoice_id, token]);

  const handleAutopaySettingsChange = useCallback((autopay_settings: AutopaySettings) => {
    setAutopayProfileId(autopay_settings.is_enabled ? autopay_settings.payment_profile_id : null);
  }, []);

  /**
   * Records the authorized PaymentIntent against the invoice. The API verifies
   * it, marks the invoice paid and only then captures the funds.
   *
   * Throws with a readable message when the API rejects the payment (the
   * authorization is released, so the client is not charged). When the
   * outcome is unknown (network failure) the pending state asks the client
   * to check before paying again.
   */
  const handlePaymentAuthorized = useCallback(
    async ({ payment_intent_id, payment_method_id, save_card }: ConfirmedCardPayment) => {
      try {
        if (is_authenticated_flow) {
          await invoicesService.payClientInvoice(invoice_id, {
            payment_method: "credit_card",
            payment_intent_id,
          });
        } else {
          await confirmInvoicePayment(invoice_id, token, payment_intent_id);
        }
      } catch (error_response: unknown) {
        const api_error = error_response as { status_code?: number };
        if (!api_error?.status_code) {
          setPageState("success_pending");
          return;
        }
        throw {
          message: getApiErrorMessage(
            error_response,
            "Your payment could not be completed. Your card has not been charged."
          ),
        };
      }

      if (save_card && payment_method_id) {
        try {
          await paymentProfileService.createPaymentProfile({
            stripe_payment_method_id: payment_method_id,
            cardholder_name: null,
            is_default: payment_profiles.length === 0,
          });
          setSuccessNotice("Your card was saved for future payments. You can use it to turn on Autopay from your Invoices page.");
        } catch {
          // Non-critical: the payment already succeeded.
        }
      }

      setPageState("success");
    },
    [invoice_id, token, is_authenticated_flow, payment_profiles.length]
  );

  const handleCreateNewCardIntent = useCallback(
    async (save_card: boolean) => {
      if (is_authenticated_flow) {
        return invoicesService.createInvoicePaymentIntent(invoice_id, { save_card });
      }
      return createInvoicePaymentIntent(invoice_id, token);
    },
    [invoice_id, token, is_authenticated_flow]
  );

  const handleSavedCardPayment = async () => {
    setIsPayingWithSavedCard(true);
    setSavedCardError(null);

    try {
      const payment_intent = await invoicesService.createInvoicePaymentIntent(invoice_id, {
        payment_profile_id: selected_option,
      });

      const stripe_instance = await getStripe();
      if (!stripe_instance) {
        throw { message: "The payment system could not be loaded. Please refresh the page and try again." };
      }

      // The saved card is already attached to the intent; this only completes
      // 3D Secure when the client's bank asks for it.
      const { error, paymentIntent } = await stripe_instance.confirmCardPayment(payment_intent.client_secret);

      if (error) {
        setSavedCardError(error.message ?? "Your card was declined. Please try another card.");
        setIsPayingWithSavedCard(false);
        return;
      }

      if (!paymentIntent || !AUTHORIZED_INTENT_STATUSES.has(paymentIntent.status)) {
        setSavedCardError("The payment could not be completed. Please try again.");
        setIsPayingWithSavedCard(false);
        return;
      }

      await handlePaymentAuthorized({
        payment_intent_id: paymentIntent.id,
        payment_method_id: null,
        save_card: false,
      });
    } catch (error_response: unknown) {
      setSavedCardError(getApiErrorMessage(error_response, "We couldn't process the payment. Please try again."));
      setIsPayingWithSavedCard(false);
    }
  };

  if (page_state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-gray-200 border-t-brand-500" />
          <p className="mt-4 text-sm text-gray-600 font-medium">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (page_state === "not_found") {
    return (
      <PayStatusPage
        icon="document"
        title="Invoice not found"
        description="This invoice does not exist or the link has expired."
      />
    );
  }

  if (page_state === "unauthorized") {
    return (
      <PayStatusPage
        icon="lock"
        title="Access denied"
        description="This payment link is invalid or has been disabled by the sender."
      />
    );
  }

  if (page_state === "already_paid") {
    return (
      <PayStatusPage
        icon="check"
        title="Invoice already paid"
        description="This invoice has already been paid. No further action is required."
        success
      />
    );
  }

  if (page_state === "credits_invoice") {
    return (
      <PayStatusPage
        icon="info"
        title="Credits invoice"
        description="This invoice is denominated in account credits and cannot be paid with a credit card."
      />
    );
  }

  if (page_state === "invalid_status") {
    return (
      <PayStatusPage
        icon="warning"
        title="Payment not available"
        description="This invoice is no longer available for payment. Please contact support if you have any questions."
      />
    );
  }

  if (page_state === "success") {
    return (
      <PayStatusPage
        icon="check"
        title="Payment successful!"
        description={`Your payment of ${formatCurrency(total_cents_value / 100)} has been processed successfully. Thank you!${
          success_notice ? ` ${success_notice}` : ""
        }`}
        success
        action_link={is_authenticated_flow ? { label: "Return to Invoices", href: "/invoices" } : undefined}
      />
    );
  }

  if (page_state === "success_pending") {
    return (
      <PayStatusPage
        icon="info"
        title="Payment submitted"
        description={`Your payment of ${formatCurrency(total_cents_value / 100)} was submitted, but we couldn't confirm it yet. Please refresh this page in a few minutes before trying again — if the invoice still shows as unpaid, contact us at basesearchmarketing.com.`}
        action_link={is_authenticated_flow ? { label: "Return to Invoices", href: "/invoices" } : undefined}
      />
    );
  }

  if (page_state === "error" || !invoice_data) {
    return (
      <PayStatusPage
        icon="warning"
        title="Something went wrong"
        description="We couldn't load this payment page. Please try again or contact support."
      />
    );
  }

  const selected_profile = payment_profiles.find((payment_profile) => payment_profile.id === selected_option) ?? null;
  const is_new_card_selected = selected_profile === null;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Mobile summary strip */}
      <MobileSummaryStrip invoice={invoice_data} total_cents={total_cents_value} />

      <div className="flex items-center justify-center min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-3">
            {/* ── Left: payment form (main content) ─────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="flex flex-col bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-10 min-h-fit">
                {/* Logo */}
                <div className="mb-8 sm:mb-10">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold tracking-wide text-gray-900">
                      BASE
                    </span>
                    <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
                      Search Marketing
                    </span>
                  </div>
                </div>

                {/* Heading */}
                <div className="mb-8 sm:mb-10">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                    Complete your payment
                  </h1>
                  <p className="mt-2 sm:mt-2.5 text-sm sm:text-base text-gray-600">
                    Invoice #{invoice_data.invoice_number} &bull;{" "}
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(total_cents_value / 100)}
                    </span>{" "}
                    due
                  </p>
                </div>

                <div className="flex-1 mb-8 space-y-6 sm:space-y-8">
                  {payment_profiles.length > 0 && (
                    <SavedCardList
                      payment_profiles={payment_profiles}
                      selected_option={selected_option}
                      autopay_profile_id={autopay_profile_id}
                      disabled={is_paying_with_saved_card}
                      onSelect={(next_option) => {
                        setSavedCardError(null);
                        setSelectedOption(next_option);
                      }}
                    />
                  )}

                  {is_new_card_selected ? (
                    <Elements stripe={getStripe()} options={elements_options}>
                      <NewCardPaymentForm
                        total_cents={total_cents_value}
                        return_url={return_url}
                        allow_save_card={is_authenticated_flow}
                        onCreatePaymentIntent={handleCreateNewCardIntent}
                        onPaymentAuthorized={handlePaymentAuthorized}
                      />
                    </Elements>
                  ) : (
                    <div className="space-y-6 sm:space-y-8">
                      {saved_card_error && <PaymentErrorBanner message={saved_card_error} />}
                      <PayButton
                        type="button"
                        onClick={handleSavedCardPayment}
                        is_submitting={is_paying_with_saved_card}
                        label={`Pay ${formatCurrency(total_cents_value / 100)} with ${formatCardLabel(
                          selected_profile.card_brand,
                          selected_profile.last_four
                        )}`}
                      />
                      <SecurePaymentNote />
                    </div>
                  )}

                  {is_authenticated_flow && (
                    <AutopayPanel
                      appearance="light"
                      payment_profiles={payment_profiles}
                      onSettingsChange={handleAutopaySettingsChange}
                    />
                  )}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <p className="text-center text-xs sm:text-sm text-gray-500">
                    BASE Search Marketing &mdash; 2600 Executive Pkwy #100, Lehi, UT 84043
                  </p>
                </div>
              </div>
            </div>

            {/* ── Right: invoice summary (dark card) ──────────────────── */}
            <div className="hidden lg:flex lg:flex-col">
              <div className="bg-gray-900 rounded-2xl shadow-lg p-6 md:p-8 min-h-fit sticky top-8">
                <InvoiceSummary invoice={invoice_data} total_cents={total_cents_value} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
