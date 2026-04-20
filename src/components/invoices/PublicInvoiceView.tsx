"use client";

import React, { useState, useEffect } from "react";
import Badge from "../ui/badge/Badge";

const isBulkDiscount = (discount_type?: string): boolean =>
  discount_type === "bulk";

const getDiscountLabel = (discount_type?: string): string =>
  isBulkDiscount(discount_type) ? "Bulk Discount (10% off)" : "Discount";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../ui/table";
import { getPublicInvoice } from "@/services/public/invoice.service";
import { generateInvoicePdf } from "./generateInvoicePdf";
import type { InvoiceDetail } from "./invoiceData";

interface PublicInvoiceViewProps {
  invoice_id: string;
  token: string;
}

const PublicInvoiceView: React.FC<PublicInvoiceViewProps> = ({
  invoice_id,
  token,
}) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoice = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicInvoice(invoice_id, token);
        setInvoice(data);
      } catch (err: unknown) {
        const api_error = err as { message?: string; status_code?: number };
        if (api_error?.status_code === 404 || api_error?.message === "Invoice not found.") {
          setError("not_found");
        } else if (api_error?.status_code === 403 || api_error?.status_code === 401) {
          setError("unauthorized");
        } else {
          setError("Failed to load invoice. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoice_id, token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
      </div>
    );
  }

  if (error === "not_found" || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-900 dark:text-white">Invoice not found</p>
          <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
            This invoice does not exist or the link has expired.
          </p>
        </div>
      </div>
    );
  }

  if (error === "unauthorized") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-800">
          <p className="text-lg font-medium text-gray-900 dark:text-white">Access denied</p>
          <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
            This link is invalid or sharing has been disabled for this invoice.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-800">
          <p className="text-error-500">{error}</p>
        </div>
      </div>
    );
  }

  const status_color = invoice.status === "paid" ? "success" : "error";
  const status_label = invoice.status === "paid" ? "Paid" : "Void";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Invoice #{invoice.invoice_number}
            </h1>
            <Badge
              variant="light"
              size="sm"
              color={status_color}
              startIcon={
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    invoice.status === "paid" ? "bg-success-500" : "bg-error-500"
                  }`}
                />
              }
            >
              {status_label}
            </Badge>
          </div>
          <button
            onClick={() => generateInvoicePdf(invoice)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Download PDF
          </button>
        </div>

        {/* Invoice Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3 sm:p-8">
          {/* Company Header */}
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div>
              <div className="mb-4">
                <span className="text-2xl font-bold tracking-wide text-gray-900 dark:text-white">
                  BASE
                </span>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  SEARCH MARKETING
                </span>
              </div>
              <div className="space-y-0.5 text-theme-sm text-gray-600 dark:text-gray-400">
                <p>BASE Search Marketing</p>
                <p>2600 Executive Pkwy #100</p>
                <p>Lehi, UT 84043</p>
              </div>
            </div>

            <div className="text-right">
              <div className="mb-4 flex items-center justify-end gap-2">
                <span className="text-xl font-semibold text-gray-900 dark:text-white">
                  Invoice
                </span>
                <Badge
                  variant="light"
                  size="sm"
                  color={status_color}
                  startIcon={
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        invoice.status === "paid"
                          ? "bg-success-500"
                          : "bg-error-500"
                      }`}
                    />
                  }
                >
                  {status_label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Billing + Invoice Info */}
          <div className="mt-8 flex flex-col justify-between gap-8 sm:flex-row">
            <div>
              <h3 className="mb-2 text-theme-sm font-semibold text-gray-900 dark:text-white">
                Invoiced to
              </h3>
              {invoice.billed_to ? (
                <div className="space-y-0.5 text-theme-sm text-gray-600 dark:text-gray-400">
                  {invoice.billed_to.company_name && (
                    <p>{invoice.billed_to.company_name}</p>
                  )}
                  {invoice.billed_to.company_description && (
                    <p>{invoice.billed_to.company_description}</p>
                  )}
                  {invoice.billed_to.address_line_1 && (
                    <p>{invoice.billed_to.address_line_1}</p>
                  )}
                  {invoice.billed_to.address_line_2 && (
                    <p>{invoice.billed_to.address_line_2}</p>
                  )}
                  {invoice.billed_to.state && <p>{invoice.billed_to.state}</p>}
                  {invoice.billed_to.country && (
                    <p>{invoice.billed_to.country}</p>
                  )}
                </div>
              ) : (
                <p className="text-theme-sm text-gray-400 dark:text-gray-500">
                  No billing information available.
                </p>
              )}
            </div>

            <div className="sm:text-right">
              <dl className="space-y-1.5 text-theme-sm">
                {[
                  { label: "Invoice number", value: invoice.invoice_number },
                  { label: "Unique ID", value: invoice.unique_id },
                  { label: "Date issued", value: invoice.date_issued },
                  { label: "Date paid", value: invoice.date_paid ?? "—" },
                  { label: "Payment method", value: invoice.payment_method },
                ].map((field) => (
                  <div
                    key={field.label}
                    className="flex justify-between gap-8 sm:justify-end"
                  >
                    <dt className="text-gray-500 dark:text-gray-400">
                      {field.label}
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-10 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Item
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Price
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Quantity
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Item Total
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {invoice.line_items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-900 dark:text-white">
                        {item.item_name}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300">
                        {item.price}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300">
                        &times; {item.quantity}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right text-theme-sm text-gray-700 dark:text-gray-300">
                        {item.item_total}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 flex justify-end">
            <dl className="w-full max-w-xs space-y-2 text-theme-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Subtotal</dt>
                <dd className="text-gray-700 dark:text-gray-300">{invoice.subtotal}</dd>
              </div>

              {invoice.discount && (
                <div className="flex justify-between">
                  <dt className={`flex items-center gap-1.5 font-medium ${isBulkDiscount(invoice.discount_type) ? "text-violet-600 dark:text-violet-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                    {getDiscountLabel(invoice.discount_type)}
                  </dt>
                  <dd className={`font-semibold tabular-nums ${isBulkDiscount(invoice.discount_type) ? "text-violet-600 dark:text-violet-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    -{invoice.discount}
                  </dd>
                </div>
              )}

              {invoice.coupon_discounts && invoice.coupon_discounts.length > 0 && (
                <div className="space-y-1 border-t border-dashed border-gray-200 pt-2 dark:border-gray-700">
                  <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                    Coupons Applied
                  </p>
                  {invoice.coupon_discounts.map((coupon) => (
                    <div key={coupon.code} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {coupon.code}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}% off`
                            : "Fixed discount"}
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        -{coupon.discount_amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {invoice.credit && invoice.credit.startsWith("-") && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Credits Applied</dt>
                  <dd className="text-emerald-600 dark:text-emerald-400">{invoice.credit}</dd>
                </div>
              )}

              <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                <dt className="font-semibold text-gray-900 dark:text-white">Total</dt>
                <dd className="font-semibold text-gray-900 dark:text-white">{invoice.total}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-6">
          BASE Search Marketing &mdash; 2600 Executive Pkwy #100, Lehi, UT 84043
        </p>
      </div>
    </div>
  );
};

export default PublicInvoiceView;
