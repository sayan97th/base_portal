"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { getPublicInvoice } from "@/services/public/invoice.service";
import {
  createInvoicePaymentIntent,
  confirmInvoicePayment,
} from "@/services/public/invoice-payment.service";
import { invoicesService } from "@/services/client/invoices.service";
import type { InvoiceDetail } from "./invoiceData";

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
  | "success";

function parseTotalCents(total: string): number | null {
  if (/credits/i.test(total)) return null;
  const cleaned = total.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const amount = parseFloat(cleaned);
  if (isNaN(amount)) return null;
  return Math.round(amount * 100);
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

// ── Stripe checkout form ──────────────────────────────────────────────────────

interface CheckoutFormProps {
  invoice_id: string;
  token: string;
  total_cents: number;
  onSuccess: () => void;
  on_confirm_payment: (payment_intent_id: string) => Promise<void>;
}

function CheckoutForm({ invoice_id, token, total_cents, onSuccess, on_confirm_payment }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [is_submitting, setIsSubmitting] = useState(false);
  const [payment_error_message, setPaymentErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setPaymentErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/invoices/${invoice_id}/pay?token=${token}&status=success`,
      },
      redirect: "if_required",
    });

    if (error) {
      setPaymentErrorMessage(error.message ?? "Payment failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        await on_confirm_payment(paymentIntent.id);
      } catch {
        // Best-effort: payment succeeded on Stripe side; notify backend
      }
      onSuccess();
      return;
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
        <PaymentElement
          options={{
            layout: "tabs",
            fields: { billingDetails: { name: "auto" } },
          }}
        />
      </div>

      {payment_error_message && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:p-5">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm text-red-700 font-medium">{payment_error_message}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={is_submitting || !stripe || !elements}
        className="w-full rounded-xl bg-brand-500 py-3.5 sm:py-4 px-4 sm:px-6 text-sm sm:text-base font-semibold text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md"
      >
        {is_submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Processing payment...</span>
          </span>
        ) : (
          <span>Complete Purchase · {formatCurrency(total_cents / 100)}</span>
        )}
      </button>

      <div className="flex items-center justify-center gap-2">
        <svg
          className="h-4 w-4 text-gray-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <p className="text-xs text-gray-500">
          Payments are encrypted and secured by{" "}
          <span className="font-semibold text-gray-600">Stripe</span>
        </p>
      </div>
    </form>
  );
}

// ── Invoice summary sidebar ───────────────────────────────────────────────────

interface InvoiceSummaryProps {
  invoice: InvoiceDetail;
  total_cents: number;
}

function InvoiceSummary({ invoice, total_cents }: InvoiceSummaryProps) {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-6 sm:mb-8 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Payment Summary
      </p>

      <div className="flex-1 space-y-4 sm:space-y-5">
        {invoice.line_items.map((line_item, index_item) => (
          <div key={index_item} className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base font-medium text-white">{line_item.item_name}</p>
              <p className="mt-1 text-xs text-gray-400">Qty {line_item.quantity}</p>
            </div>
            <span className="shrink-0 text-sm sm:text-base font-medium text-white">
              {line_item.item_total}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 sm:mt-10 space-y-3 sm:space-y-4 border-t border-white/10 pt-6 sm:pt-8">
        <div className="flex justify-between text-sm sm:text-base">
          <span className="text-gray-400">Subtotal</span>
          <span className="text-gray-300 font-medium">{invoice.subtotal}</span>
        </div>

        {invoice.discount && (
          <div className="flex justify-between text-sm sm:text-base">
            <span className="text-gray-400">Discount</span>
            <span className="font-semibold text-emerald-400">
              -{invoice.discount}
            </span>
          </div>
        )}

        {invoice.coupon_discounts && invoice.coupon_discounts.length > 0 && (
          <>
            {invoice.coupon_discounts.map((coupon_item) => (
              <div key={coupon_item.code} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-2 sm:px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-emerald-400">
                  {coupon_item.code}
                </span>
                <span className="text-sm sm:text-base font-semibold text-emerald-400">
                  -{coupon_item.discount_amount}
                </span>
              </div>
            ))}
          </>
        )}

        <div className="flex items-end justify-between border-t border-white/10 pt-4 sm:pt-6">
          <div>
            <p className="text-sm sm:text-base font-semibold text-white">Total</p>
            <p className="text-xs text-gray-500">USD</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {formatCurrency(total_cents / 100)}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mt-10 rounded-xl border border-white/5 bg-white/5 p-4 sm:p-5">
        <p className="mb-1.5 text-xs sm:text-sm font-medium text-gray-300">
          Invoice #{invoice.invoice_number}
        </p>
        <p className="text-xs text-gray-500">
          Issued {invoice.date_issued} &bull; Due {invoice.date_due}
        </p>
      </div>
    </div>
  );
}

// ── Status / feedback pages ───────────────────────────────────────────────────

type StatusIcon = "check" | "lock" | "warning" | "document" | "info";

interface StatusPageProps {
  icon: StatusIcon;
  title: string;
  description: string;
  success?: boolean;
  action_link?: { label: string; href: string };
}

function StatusPage({ icon, title, description, success = false, action_link }: StatusPageProps) {
  const icon_background = success
    ? "bg-emerald-100 dark:bg-emerald-500/15"
    : "bg-gray-100 dark:bg-gray-800";
  const icon_color_class = success ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400";

  const icon_map: Record<StatusIcon, React.ReactNode> = {
    check: (
      <svg className={`h-8 w-8 ${icon_color_class}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    lock: (
      <svg className={`h-8 w-8 ${icon_color_class}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    warning: (
      <svg className={`h-8 w-8 ${icon_color_class}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    document: (
      <svg className={`h-8 w-8 ${icon_color_class}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    info: (
      <svg className={`h-8 w-8 ${icon_color_class}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 sm:p-10 md:p-12 text-center shadow-lg">
        <div className={`mx-auto mb-6 sm:mb-8 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full ${icon_background}`}>
          {icon_map[icon]}
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base leading-relaxed text-gray-600">{description}</p>
        {success && (
          <div className="mt-6 sm:mt-8 rounded-xl bg-emerald-50 px-4 sm:px-5 py-3 sm:py-4">
            <p className="text-xs sm:text-sm text-emerald-700 font-medium">
              A confirmation email will be sent to you shortly.
            </p>
          </div>
        )}
        {action_link && (
          <a
            href={action_link.href}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {action_link.label}
          </a>
        )}
      </div>
    </div>
  );
}

// ── Mobile summary strip ──────────────────────────────────────────────────────

function MobileSummaryStrip({ invoice, total_cents }: InvoiceSummaryProps) {
  const [is_expanded, setIsExpanded] = useState(false);
  return (
    <div className="border-b border-gray-200 bg-gray-900 lg:hidden">
      <button
        onClick={() => setIsExpanded((expanded_value) => !expanded_value)}
        className="flex w-full items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-white">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
            />
          </svg>
          Order summary
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold text-white">
            {formatCurrency(total_cents / 100)}
          </span>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${is_expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {is_expanded && (
        <div className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-5 bg-gray-800/50 border-t border-gray-700">
          {invoice.line_items.map((line_item, index_item) => (
            <div key={index_item} className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{line_item.item_name}</p>
                <p className="mt-1 text-xs text-gray-400">Qty {line_item.quantity}</p>
              </div>
              <span className="shrink-0 text-sm text-white font-medium">{line_item.item_total}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-gray-600 pt-3 sm:pt-4">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="text-sm sm:text-base font-bold text-white">
              {formatCurrency(total_cents / 100)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PublicInvoicePayView({
  invoice_id,
  token,
}: PublicInvoicePayViewProps) {
  const is_authenticated_flow = !token;

  const [page_state, setPageState] = useState<PageState>("loading");
  const [invoice_data, setInvoiceData] = useState<InvoiceDetail | null>(null);
  const [client_secret_value, setClientSecretValue] = useState<string | null>(null);
  const [total_cents_value, setTotalCentsValue] = useState(0);

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

      if (invoice_response.status === "void" || invoice_response.status === "refund") {
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

      const payment_intent_result = await createInvoicePaymentIntent(total_cents_amount, invoice_response.unique_id, token);
      setClientSecretValue(payment_intent_result.client_secret);
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
      <StatusPage
        icon="document"
        title="Invoice not found"
        description="This invoice does not exist or the link has expired."
      />
    );
  }

  if (page_state === "unauthorized") {
    return (
      <StatusPage
        icon="lock"
        title="Access denied"
        description="This payment link is invalid or has been disabled by the sender."
      />
    );
  }

  if (page_state === "already_paid") {
    return (
      <StatusPage
        icon="check"
        title="Invoice already paid"
        description="This invoice has already been paid. No further action is required."
        success
      />
    );
  }

  if (page_state === "credits_invoice") {
    return (
      <StatusPage
        icon="info"
        title="Credits invoice"
        description="This invoice is denominated in account credits and cannot be paid with a credit card."
      />
    );
  }

  if (page_state === "invalid_status") {
    return (
      <StatusPage
        icon="warning"
        title="Payment not available"
        description="This invoice is no longer available for payment. Please contact support if you have any questions."
      />
    );
  }

  if (page_state === "success") {
    return (
      <StatusPage
        icon="check"
        title="Payment successful!"
        description={`Your payment of ${formatCurrency(total_cents_value / 100)} has been processed successfully. Thank you!`}
        success
        action_link={is_authenticated_flow ? { label: "Return to Invoices", href: "/invoices" } : undefined}
      />
    );
  }

  if (page_state === "error" || !invoice_data || !client_secret_value) {
    return (
      <StatusPage
        icon="warning"
        title="Something went wrong"
        description="We couldn't load this payment page. Please try again or contact support."
      />
    );
  }

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

                {/* Stripe Elements */}
                <div className="flex-1 mb-8">
                  <Elements
                    stripe={getStripe()}
                    options={{
                      clientSecret: client_secret_value,
                      appearance: {
                        theme: "stripe",
                        variables: {
                          colorPrimary: "#e91e8c",
                          colorBackground: "#ffffff",
                          colorText: "#111827",
                          colorDanger: "#ef4444",
                          fontFamily:
                            "ui-sans-serif, system-ui, -apple-system, sans-serif",
                          borderRadius: "12px",
                          spacingUnit: "4px",
                        },
                        rules: {
                          ".Input": {
                            border: "1px solid #e5e7eb",
                            boxShadow: "none",
                            padding: "12px 14px",
                          },
                          ".Input:focus": {
                            border: "1px solid #e91e8c",
                            boxShadow: "0 0 0 3px rgba(233,30,140,0.1)",
                          },
                          ".Label": {
                            color: "#374151",
                            fontSize: "14px",
                            fontWeight: "500",
                          },
                          ".Tab": {
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                          },
                          ".Tab--selected": {
                            border: "1px solid #e91e8c",
                            boxShadow: "0 0 0 2px rgba(233,30,140,0.15)",
                          },
                        },
                      },
                    }}
                  >
                    <CheckoutForm
                      invoice_id={invoice_id}
                      token={token}
                      total_cents={total_cents_value}
                      onSuccess={() => setPageState("success")}
                      on_confirm_payment={
                        is_authenticated_flow
                          ? async (payment_intent_id) => {
                              await invoicesService.payClientInvoice(invoice_id, {
                                payment_method: "credit_card",
                                payment_intent_id,
                              });
                              await invoicesService.sendInvoicePaymentNotification(invoice_id);
                            }
                          : (payment_intent_id) =>
                              confirmInvoicePayment(invoice_id, token, payment_intent_id)
                      }
                    />
                  </Elements>
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
