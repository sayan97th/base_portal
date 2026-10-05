"use client";

import { useCallback, useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { getToken } from "@/lib/api-client";
import type { InvoiceDetail } from "@/components/invoices/invoiceData";
import type { PaymentProfile } from "@/types/client/payment-profile";
import { invoicesService } from "@/services/client/invoices.service";
import { getPublicInvoice } from "@/services/public/invoice.service";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import { invoiceCardPaymentService } from "@/services/client/invoice-card-payment.service";
import InvoicePaymentForm from "./InvoicePaymentForm";
import { InvoicePaymentSummaryCard, InvoicePaymentSummaryToggle } from "./InvoicePaymentSummary";
import PaymentStatusScreen from "./PaymentStatusScreen";
import { MINIMUM_CHARGE_CENTS, formatUsd, getApiErrorStatus, parseAmountToCents } from "./invoicePaymentUtils";

interface InvoicePaymentViewProps {
  invoice_id: string;
  /** Share-link token. Empty for the authenticated client portal flow. */
  token: string;
}

type ViewState =
  | "loading"
  | "sign_in_required"
  | "not_found"
  | "access_denied"
  | "load_error"
  | "already_paid"
  | "not_payable"
  | "credits_invoice"
  | "ready"
  | "payment_succeeded"
  | "confirmation_failed";

const SUPPORT_EMAIL = "support@basesearchmarketing.com";

export default function InvoicePaymentView({ invoice_id, token }: InvoicePaymentViewProps) {
  const is_authenticated = token === "";

  const [view_state, setViewState] = useState<ViewState>("loading");
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [amount_due_cents, setAmountDueCents] = useState(0);
  const [payment_profiles, setPaymentProfiles] = useState<PaymentProfile[]>([]);
  const [pending_payment_intent_id, setPendingPaymentIntentId] = useState<string | null>(null);
  const [is_retrying_confirmation, setIsRetryingConfirmation] = useState(false);

  const invoice_detail_href = is_authenticated
    ? `/invoices/${encodeURIComponent(invoice_id)}`
    : `/invoices/${encodeURIComponent(invoice_id)}/view?token=${encodeURIComponent(token)}`;

  const loadInvoice = useCallback(async () => {
    setViewState("loading");

    if (is_authenticated && !getToken()) {
      setViewState("sign_in_required");
      return;
    }

    try {
      const invoice_detail = is_authenticated
        ? await invoicesService.getInvoiceDetail(invoice_id)
        : await getPublicInvoice(invoice_id, token);

      setInvoice(invoice_detail);

      if (invoice_detail.status === "paid") {
        setViewState("already_paid");
        return;
      }

      if (invoice_detail.status !== "unpaid" && invoice_detail.status !== "overdue") {
        setViewState("not_payable");
        return;
      }

      const total_cents = parseAmountToCents(invoice_detail.total);

      if (total_cents === null) {
        setViewState("credits_invoice");
        return;
      }

      if (total_cents < MINIMUM_CHARGE_CENTS) {
        setViewState("not_payable");
        return;
      }

      setAmountDueCents(total_cents);

      if (is_authenticated) {
        // Saved cards are a convenience — a failure here falls back to a new card.
        const saved_profiles = await paymentProfileService.fetchPaymentProfiles().catch(() => []);
        setPaymentProfiles(saved_profiles);
      }

      setViewState("ready");
    } catch (error_response) {
      const status_code = getApiErrorStatus(error_response);

      if (status_code === 404) {
        setViewState("not_found");
      } else if (status_code === 401 && is_authenticated) {
        setViewState("sign_in_required");
      } else if (status_code === 401 || status_code === 403) {
        setViewState("access_denied");
      } else {
        setViewState("load_error");
      }
    }
  }, [invoice_id, token, is_authenticated]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const recordPayment = useCallback(
    async (payment_intent_id: string) => {
      if (is_authenticated) {
        await invoiceCardPaymentService.confirmAuthenticatedPayment(invoice_id, payment_intent_id);
      } else {
        await invoiceCardPaymentService.confirmPublicPayment(invoice_id, token, payment_intent_id);
      }
    },
    [invoice_id, token, is_authenticated]
  );

  /** Re-reads the invoice to check whether a payment was recorded despite an error. */
  const isInvoicePaid = useCallback(async (): Promise<boolean> => {
    try {
      const invoice_detail = is_authenticated
        ? await invoicesService.getInvoiceDetail(invoice_id)
        : await getPublicInvoice(invoice_id, token);
      return invoice_detail.status === "paid";
    } catch {
      return false;
    }
  }, [invoice_id, token, is_authenticated]);

  const handlePaymentAuthorized = useCallback(
    async (payment_intent_id: string) => {
      setPendingPaymentIntentId(payment_intent_id);

      try {
        await recordPayment(payment_intent_id);
        setViewState("payment_succeeded");
      } catch {
        setViewState((await isInvoicePaid()) ? "payment_succeeded" : "confirmation_failed");
      }
    },
    [recordPayment, isInvoicePaid]
  );

  const handleRetryConfirmation = async () => {
    if (!pending_payment_intent_id) return;

    setIsRetryingConfirmation(true);

    try {
      await recordPayment(pending_payment_intent_id);
      setViewState("payment_succeeded");
    } catch {
      if (await isInvoicePaid()) {
        setViewState("payment_succeeded");
      }
    } finally {
      setIsRetryingConfirmation(false);
    }
  };

  if (view_state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-brand-500" />
          <p className="mt-4 text-sm font-medium text-gray-600">Loading invoice…</p>
        </div>
      </div>
    );
  }

  if (view_state === "sign_in_required") {
    return (
      <PaymentStatusScreen
        tone="neutral"
        title="Sign in to pay this invoice"
        description="Please sign in to your account to pay this invoice with your saved cards."
        primary_action={{
          label: "Sign in",
          href: `/signin?callbackUrl=${encodeURIComponent(`/invoices/${invoice_id}/pay`)}`,
        }}
      />
    );
  }

  if (view_state === "not_found") {
    return (
      <PaymentStatusScreen
        tone="neutral"
        title="Invoice not found"
        description="This invoice does not exist or the link is no longer valid."
        primary_action={is_authenticated ? { label: "Back to invoices", href: "/invoices" } : undefined}
      />
    );
  }

  if (view_state === "access_denied") {
    return (
      <PaymentStatusScreen
        tone="neutral"
        title="Access denied"
        description="This payment link is invalid or has been disabled by the sender."
      />
    );
  }

  if (view_state === "already_paid") {
    return (
      <PaymentStatusScreen
        tone="success"
        title="Invoice already paid"
        description="This invoice has already been paid. No further action is required."
        primary_action={{ label: "View invoice", href: invoice_detail_href }}
      />
    );
  }

  if (view_state === "credits_invoice") {
    return (
      <PaymentStatusScreen
        tone="neutral"
        title="Credits invoice"
        description="This invoice is denominated in account credits and cannot be paid by card."
        primary_action={{ label: "View invoice", href: invoice_detail_href }}
      />
    );
  }

  if (view_state === "not_payable") {
    return (
      <PaymentStatusScreen
        tone="warning"
        title="Payment not available"
        description="This invoice is not available for card payment. Please contact us if you have any questions."
        primary_action={{ label: "View invoice", href: invoice_detail_href }}
      />
    );
  }

  if (view_state === "payment_succeeded") {
    return (
      <PaymentStatusScreen
        tone="success"
        title="Payment successful"
        description={
          <>
            Your payment of <span className="font-semibold text-gray-900">{formatUsd(amount_due_cents)}</span> for
            invoice #{invoice?.invoice_number} has been processed. A receipt will be emailed to you shortly.
          </>
        }
        primary_action={{ label: "View invoice", href: invoice_detail_href }}
        secondary_action={is_authenticated ? { label: "Back to invoices", href: "/invoices" } : undefined}
      />
    );
  }

  if (view_state === "confirmation_failed") {
    return (
      <PaymentStatusScreen
        tone="warning"
        title="We couldn't finalize your payment"
        description={
          <>
            Your card was authorized, but we couldn&apos;t record the payment. Your card is only charged once the
            payment is recorded. Please try again, or contact{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand-600">
              {SUPPORT_EMAIL}
            </a>{" "}
            if the problem persists.
          </>
        }
        primary_action={{
          label: "Try again",
          onClick: handleRetryConfirmation,
          is_loading: is_retrying_confirmation,
        }}
      />
    );
  }

  if (view_state === "load_error" || !invoice) {
    return (
      <PaymentStatusScreen
        tone="warning"
        title="Something went wrong"
        description="We couldn't load this invoice. Please try again in a moment."
        primary_action={{ label: "Try again", onClick: loadInvoice }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-wide text-gray-900">BASE</span>
            <span className="hidden text-[11px] font-medium uppercase tracking-widest text-gray-400 sm:inline">
              Search Marketing
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            Secure checkout
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
          <section className="lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h1 className="text-2xl font-semibold text-gray-900">Pay invoice</h1>
              <p className="mt-1.5 text-sm text-gray-500">
                Invoice #{invoice.invoice_number} · Due {invoice.date_due}
              </p>

              <div className="mt-6 lg:hidden">
                <InvoicePaymentSummaryToggle invoice={invoice} amount_due_cents={amount_due_cents} />
              </div>

              <div className="mt-8">
                <Elements stripe={getStripe()}>
                  <InvoicePaymentForm
                    invoice={invoice}
                    amount_due_cents={amount_due_cents}
                    is_authenticated={is_authenticated}
                    token={token}
                    payment_profiles={payment_profiles}
                    onPaymentAuthorized={handlePaymentAuthorized}
                  />
                </Elements>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-gray-400">
              BASE Search Marketing — 2600 Executive Pkwy #100, Lehi, UT 84043
            </p>
          </section>

          <div className="hidden lg:col-span-2 lg:block">
            <div className="sticky top-8">
              <InvoicePaymentSummaryCard invoice={invoice} amount_due_cents={amount_due_cents} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
