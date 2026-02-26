"use client";

import React from "react";
import Link from "next/link";
import Badge from "../ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../ui/table";
import { getInvoiceDetail } from "./invoiceData";
import { generateInvoicePdf } from "./generateInvoicePdf";

interface InvoiceDetailPageProps {
  invoice_id: string;
}

const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = ({
  invoice_id,
}) => {
  const invoice = getInvoiceDetail(invoice_id);

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-theme-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Invoices
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 dark:text-gray-400">
            Invoice not found.
          </p>
        </div>
      </div>
    );
  }

  const status_color = invoice.status === "paid" ? "success" : "error";
  const status_label = invoice.status === "paid" ? "Paid" : "Void";

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1.5 text-theme-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Back to Invoices
      </Link>

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
          Download
        </button>
      </div>

      {/* Invoice Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
        {/* Company Header */}
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          {/* Logo + Company */}
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

          {/* Invoice Badge + Meta */}
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
          {/* Billed To */}
          <div>
            <h3 className="mb-2 text-theme-sm font-semibold text-gray-900 dark:text-white">
              Invoiced to
            </h3>
            <div className="space-y-0.5 text-theme-sm text-gray-600 dark:text-gray-400">
              <p>{invoice.billed_to.company_name}</p>
              <p>{invoice.billed_to.company_description}</p>
              <p>{invoice.billed_to.address_line_1}</p>
              <p>{invoice.billed_to.address_line_2}</p>
              <p>{invoice.billed_to.state}</p>
              <p>{invoice.billed_to.country}</p>
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="sm:text-right">
            <dl className="space-y-1.5 text-theme-sm">
              {[
                { label: "Invoice number", value: invoice.invoice_number },
                { label: "Unique ID", value: invoice.unique_id },
                { label: "Date issued", value: invoice.date_issued },
                { label: "Date paid", value: invoice.date_paid },
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
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                Subtotal
              </dt>
              <dd className="text-gray-700 dark:text-gray-300">
                {invoice.subtotal}
              </dd>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <dt className="font-semibold text-gray-900 dark:text-white">
                Total
              </dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                {invoice.total}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                Credit
              </dt>
              <dd className="text-gray-700 dark:text-gray-300">
                {invoice.credit}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
