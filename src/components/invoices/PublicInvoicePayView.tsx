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
}

function CheckoutForm({ invoice_id, token, total_cents, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [payment_error, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setPaymentError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/invoices/${invoice_id}/pay?token=${token}&status=success`,
      },
      redirect: "if_required",
    });

    if (error) {
      setPaymentError(error.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        await confirmInvoicePayment(invoice_id, token, paymentIntent.id);
      } catch {
        // Best-effort: payment succeeded on Stripe side; notify backend
      }
      onSuccess();
      return;
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <PaymentElement
          options={{
            layout: "tabs",
            fields: { billingDetails: { name: "auto" } },
          }}
        />
      </div>

      {payment_error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
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
          <p className="text-sm text-red-700">{payment_error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !stripe || !elements}
        className="w-full rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
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
            Processing payment...
          </span>
        ) : (
          `Complete Purchase · ${formatCurrency(total_cents / 100)}`
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 pt-1">
        <svg
          className="h-3.5 w-3.5 text-gray-400"
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
        <p className="text-xs text-gray-400">
          Payments are encrypted and secured by{" "}
          <span className="font-semibold text-gray-500">Stripe</span>
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
      <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Summary
      </p>

      <div className="flex-1 space-y-4">
        {invoice.line_items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{item.item_name}</p>
              <p className="mt-0.5 text-xs text-gray-400">Qty {item.quantity}</p>
            </div>
            <span className="shrink-0 text-sm font-medium text-white">
              {item.item_total}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-2.5 border-t border-white/10 pt-5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Subtotal</span>
          <span className="text-gray-300">{invoice.subtotal}</span>
        </div>

        {invoice.discount && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Discount</span>
            <span className="font-medium text-emerald-400">
              -{invoice.discount}
            </span>
          </div>
        )}

        {invoice.coupon_discounts && invoice.coupon_discounts.length > 0 && (
          <>
            {invoice.coupon_discounts.map((coupon) => (
              <div key={coupon.code} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-400">
                  {coupon.code}
                </span>
                <span className="text-sm font-medium text-emerald-400">
                  -{coupon.discount_amount}
                </span>
              </div>
            ))}
          </>
        )}

        <div className="flex items-end justify-between border-t border-white/10 pt-3">
          <div>
            <p className="text-sm font-semibold text-white">Total</p>
            <p className="text-xs text-gray-500">USD</p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-white">
            {formatCurrency(total_cents / 100)}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-white/5 bg-white/5 p-4">
        <p className="mb-1 text-xs font-medium text-gray-300">
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
}

function StatusPage({ icon, title, description, success = false }: StatusPageProps) {
  const icon_bg = success
    ? "bg-emerald-100 dark:bg-emerald-500/15"
    : "bg-gray-100 dark:bg-gray-800";
  const icon_color = success ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400";

  const icons: Record<StatusIcon, React.ReactNode> = {
    check: (
      <svg className={`h-7 w-7 ${icon_color}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    lock: (
      <svg className={`h-7 w-7 ${icon_color}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    warning: (
      <svg className={`h-7 w-7 ${icon_color}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    document: (
      <svg className={`h-7 w-7 ${icon_color}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    info: (
      <svg className={`h-7 w-7 ${icon_color}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${icon_bg}`}>
          {icons[icon]}
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
        {success && (
          <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3">
            <p className="text-xs text-emerald-700">
              A confirmation email will be sent to you shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mobile summary strip ──────────────────────────────────────────────────────

function MobileSummaryStrip({ invoice, total_cents }: InvoiceSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-gray-200 bg-gray-900 lg:hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <svg
            className="h-4 w-4 text-gray-400"
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
          <span className="text-sm font-bold text-white">
            {formatCurrency(total_cents / 100)}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 px-6 pb-5">
          {invoice.line_items.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{item.item_name}</p>
                <p className="mt-0.5 text-xs text-gray-400">Qty {item.quantity}</p>
              </div>
              <span className="shrink-0 text-sm text-white">{item.item_total}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="text-sm font-bold text-white">
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
  const [page_state, setPageState] = useState<PageState>("loading");
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [client_secret, setClientSecret] = useState<string | null>(null);
  const [total_cents, setTotalCents] = useState(0);

  const initialize = useCallback(async () => {
    try {
      const data = await getPublicInvoice(invoice_id, token);
      setInvoice(data);

      if (data.status === "paid") {
        setPageState("already_paid");
        return;
      }

      if (data.status === "void" || data.status === "refund") {
        setPageState("invalid_status");
        return;
      }

      const cents = parseTotalCents(data.total);
      if (cents === null) {
        setPageState("credits_invoice");
        return;
      }

      if (cents === 0) {
        setPageState("already_paid");
        return;
      }

      setTotalCents(cents);

      const result = await createInvoicePaymentIntent(cents, data.unique_id, token);
      setClientSecret(result.client_secret);
      setPageState("ready");
    } catch (err: unknown) {
      const api_error = err as { status_code?: number };
      if (api_error?.status_code === 404) {
        setPageState("not_found");
      } else if (
        api_error?.status_code === 403 ||
        api_error?.status_code === 401
      ) {
        setPageState("unauthorized");
      } else {
        setPageState("error");
      }
    }
  }, [invoice_id, token]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (page_state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
          <p className="mt-3 text-sm text-gray-500">Loading invoice...</p>
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
        description={`Your payment of ${formatCurrency(total_cents / 100)} has been processed successfully. Thank you!`}
        success
      />
    );
  }

  if (page_state === "error" || !invoice || !client_secret) {
    return (
      <StatusPage
        icon="warning"
        title="Something went wrong"
        description="We couldn't load this payment page. Please try again or contact support."
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile summary strip */}
      <MobileSummaryStrip invoice={invoice} total_cents={total_cents} />

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[1fr_440px]">
        {/* ── Left: payment form ─────────────────────────────── */}
        <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
          {/* Logo */}
          <div className="mb-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-wide text-gray-900">
                BASE
              </span>
              <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Search Marketing
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Complete your payment
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Invoice #{invoice.invoice_number} &bull;{" "}
              <span className="font-medium text-gray-700">
                {formatCurrency(total_cents / 100)}
              </span>{" "}
              due
            </p>
          </div>

          {/* Stripe Elements */}
          <div className="flex-1">
            <Elements
              stripe={getStripe()}
              options={{
                clientSecret: client_secret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#e91e8c",
                    colorBackground: "#ffffff",
                    colorText: "#111827",
                    colorDanger: "#ef4444",
                    fontFamily:
                      "ui-sans-serif, system-ui, -apple-system, sans-serif",
                    borderRadius: "8px",
                    spacingUnit: "4px",
                  },
                  rules: {
                    ".Input": {
                      border: "1px solid #e5e7eb",
                      boxShadow: "none",
                      padding: "10px 12px",
                    },
                    ".Input:focus": {
                      border: "1px solid #e91e8c",
                      boxShadow: "0 0 0 3px rgba(233,30,140,0.1)",
                    },
                    ".Label": {
                      color: "#374151",
                      fontSize: "13px",
                      fontWeight: "500",
                    },
                    ".Tab": {
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
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
                total_cents={total_cents}
                onSuccess={() => setPageState("success")}
              />
            </Elements>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            BASE Search Marketing &mdash; 2600 Executive Pkwy #100, Lehi, UT 84043
          </p>
        </div>

        {/* ── Right: invoice summary (dark) ──────────────────── */}
        <div className="hidden bg-gray-900 px-10 py-10 lg:flex lg:flex-col">
          <InvoiceSummary invoice={invoice} total_cents={total_cents} />
        </div>
      </div>
    </div>
  );
}
