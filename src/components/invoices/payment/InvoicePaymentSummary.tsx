"use client";

import { useState } from "react";
import type { InvoiceDetail } from "@/components/invoices/invoiceData";
import { formatUsd } from "./invoicePaymentUtils";

interface InvoicePaymentSummaryProps {
  invoice: InvoiceDetail;
  amount_due_cents: number;
}

function SummaryLines({ invoice, amount_due_cents }: InvoicePaymentSummaryProps) {
  return (
    <>
      <ul className="space-y-4">
        {invoice.line_items.map((line_item, line_item_index) => (
          <li key={`${line_item.item_name}-${line_item_index}`} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{line_item.item_name}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {line_item.quantity} × {line_item.price}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-gray-900">{line_item.item_total}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-6 space-y-3 border-t border-gray-100 pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Subtotal</dt>
          <dd className="font-medium text-gray-900">{invoice.subtotal}</dd>
        </div>

        {invoice.discount && (
          <div className="flex justify-between">
            <dt className="text-gray-500">Discount</dt>
            <dd className="font-medium text-emerald-600">-{invoice.discount}</dd>
          </div>
        )}

        {invoice.coupon_discounts?.map((coupon_discount) => (
          <div key={coupon_discount.code} className="flex items-center justify-between gap-2">
            <dt>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-700">
                {coupon_discount.code}
              </span>
            </dt>
            <dd className="font-medium text-emerald-600">-{coupon_discount.discount_amount}</dd>
          </div>
        ))}

        <div className="flex items-end justify-between border-t border-gray-100 pt-4">
          <dt>
            <span className="block text-base font-semibold text-gray-900">Amount due</span>
            <span className="text-xs text-gray-400">USD</span>
          </dt>
          <dd className="text-2xl font-bold tracking-tight text-gray-900">{formatUsd(amount_due_cents)}</dd>
        </div>
      </dl>
    </>
  );
}

export function InvoicePaymentSummaryCard({ invoice, amount_due_cents }: InvoicePaymentSummaryProps) {
  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Invoice</p>
          <p className="mt-1 font-mono text-sm font-semibold text-gray-900">#{invoice.invoice_number}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            invoice.status === "overdue" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
          }`}
        >
          {invoice.status === "overdue" ? "Overdue" : "Unpaid"}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 text-xs">
        <div>
          <p className="text-gray-400">Issued</p>
          <p className="mt-0.5 font-medium text-gray-700">{invoice.date_issued}</p>
        </div>
        <div>
          <p className="text-gray-400">Due</p>
          <p className="mt-0.5 font-medium text-gray-700">{invoice.date_due}</p>
        </div>
        {invoice.billed_to?.company_name && (
          <div className="col-span-2">
            <p className="text-gray-400">Billed to</p>
            <p className="mt-0.5 font-medium text-gray-700">{invoice.billed_to.company_name}</p>
          </div>
        )}
      </div>

      <SummaryLines invoice={invoice} amount_due_cents={amount_due_cents} />
    </aside>
  );
}

export function InvoicePaymentSummaryToggle({ invoice, amount_due_cents }: InvoicePaymentSummaryProps) {
  const [is_expanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm lg:hidden">
      <button
        type="button"
        aria-expanded={is_expanded}
        onClick={() => setIsExpanded((current_value) => !current_value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4"
      >
        <span className="text-sm font-medium text-gray-700">
          {is_expanded ? "Hide" : "Show"} invoice summary
        </span>
        <span className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-900">{formatUsd(amount_due_cents)}</span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${is_expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>

      {is_expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
          <SummaryLines invoice={invoice} amount_due_cents={amount_due_cents} />
        </div>
      )}
    </div>
  );
}
