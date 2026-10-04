"use client";

import React, { useState } from "react";
import type { InvoiceDetail } from "../invoiceData";
import { formatCurrency } from "./payUtils";

// ── Invoice summary sidebar ───────────────────────────────────────────────────

export interface InvoiceSummaryProps {
  invoice: InvoiceDetail;
  total_cents: number;
}

export function InvoiceSummary({ invoice, total_cents }: InvoiceSummaryProps) {
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

// ── Mobile summary strip ──────────────────────────────────────────────────────

export function MobileSummaryStrip({ invoice, total_cents }: InvoiceSummaryProps) {
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
