"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Badge from "../ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../ui/table";
import { invoicesService } from "@/services/client/invoices.service";
import { generateInvoicePdf } from "./generateInvoicePdf";
import { INVOICE_PRODUCT_CONFIG } from "./invoiceData";
import type { InvoiceDetail, InvoiceLineItem, ProductType } from "./invoiceData";

interface InvoiceDetailPageProps {
  invoice_id: string;
}

const STATUS_CONFIG: Record<
  string,
  { color: "success" | "warning" | "error" | "info" | "light"; dot: string; label: string }
> = {
  paid:    { color: "success", dot: "bg-success-500", label: "Paid" },
  unpaid:  { color: "warning", dot: "bg-warning-500", label: "Unpaid" },
  overdue: { color: "error",   dot: "bg-error-500",   label: "Overdue" },
  refund:  { color: "info",    dot: "bg-blue-500",    label: "Refund" },
  void:    { color: "light",   dot: "bg-gray-500",    label: "Void" },
};

const PRODUCT_TYPE_ORDER: ProductType[] = [
  "link_building",
  "new_content",
  "content_optimization",
  "content_brief",
];

function groupLineItemsByProductType(
  items: InvoiceLineItem[]
): Map<ProductType | "other", InvoiceLineItem[]> {
  const map = new Map<ProductType | "other", InvoiceLineItem[]>();
  for (const item of items) {
    const key: ProductType | "other" = item.product_type ?? "other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

function getOrderedProductTypes(
  grouped: Map<ProductType | "other", InvoiceLineItem[]>
): (ProductType | "other")[] {
  const result: (ProductType | "other")[] = [];
  for (const pt of PRODUCT_TYPE_ORDER) {
    if (grouped.has(pt)) result.push(pt);
  }
  if (grouped.has("other")) result.push("other");
  return result;
}

const BackLink: React.FC = () => (
  <Link
    href="/invoices"
    className="inline-flex items-center gap-1.5 text-theme-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
  >
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
    Back to Invoices
  </Link>
);

function LineItemsTable({ items }: { items: InvoiceLineItem[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-gray-800/60">
          <TableRow>
            <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              Item
            </TableCell>
            <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              Price
            </TableCell>
            <TableCell isHeader className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              Qty
            </TableCell>
            <TableCell isHeader className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              Item Total
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {items.map((item, index) => (
            <TableRow key={index} className="hover:bg-gray-50/50 dark:hover:bg-white/1">
              <TableCell className="px-5 py-3.5 text-theme-sm text-gray-900 dark:text-white">
                {item.item_name}
              </TableCell>
              <TableCell className="px-5 py-3.5 text-theme-sm text-gray-600 dark:text-gray-400">
                {item.price}
              </TableCell>
              <TableCell className="px-5 py-3.5 text-theme-sm text-gray-600 dark:text-gray-400">
                &times; {item.quantity}
              </TableCell>
              <TableCell className="px-5 py-3.5 text-right text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                {item.item_total}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ServicesIncludedBanner({ product_types }: { product_types: ProductType[] }) {
  if (product_types.length <= 1) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-brand-200/60 bg-linear-to-r from-brand-50/80 via-brand-50/40 to-transparent dark:border-brand-500/20 dark:from-brand-500/10 dark:via-brand-500/5 dark:to-transparent">
      <div className="px-5 py-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          Services included in this invoice
        </p>
        <div className="flex flex-wrap gap-2">
          {product_types.map((pt) => {
            const cfg = INVOICE_PRODUCT_CONFIG[pt];
            return (
              <span
                key={pt}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                {cfg.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GroupedLineItems({ invoice }: { invoice: InvoiceDetail }) {
  const has_product_types = invoice.line_items.some((item) => item.product_type);

  if (!has_product_types) {
    return (
      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <LineItemsTable items={invoice.line_items} />
      </div>
    );
  }

  const grouped = groupLineItemsByProductType(invoice.line_items);
  const ordered_types = getOrderedProductTypes(grouped);

  return (
    <div className="mt-8 space-y-3">
      {ordered_types.map((pt) => {
        const items = grouped.get(pt) ?? [];
        const is_known = pt !== "other";
        const cfg = is_known ? INVOICE_PRODUCT_CONFIG[pt as ProductType] : null;

        return (
          <div
            key={pt}
            className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
          >
            {/* Section header */}
            {cfg ? (
              <div
                className={`flex items-center gap-2.5 border-b px-5 py-2.5 ${cfg.bg} ${cfg.border}`}
              >
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-2.5 dark:border-gray-700 dark:bg-gray-800/40">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Other</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </div>
            )}

            <LineItemsTable items={items} />
          </div>
        );
      })}
    </div>
  );
}

const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = ({ invoice_id }) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoice = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await invoicesService.getInvoiceDetail(invoice_id);
        setInvoice(data);
      } catch (err: unknown) {
        const api_error = err as { message?: string };
        if (api_error?.message === "Invoice not found.") {
          setError("not_found");
        } else {
          setError("Failed to load invoice. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoice_id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
        </div>
      </div>
    );
  }

  if (error === "not_found" || !invoice) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/3">
          <p className="text-gray-500 dark:text-gray-400">Invoice not found.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/3">
          <p className="text-error-500">{error}</p>
        </div>
      </div>
    );
  }

  const status_cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.void;

  const known_product_types = [
    ...new Set(
      invoice.line_items
        .map((item) => item.product_type)
        .filter((pt): pt is ProductType => !!pt)
    ),
  ].sort(
    (a, b) => PRODUCT_TYPE_ORDER.indexOf(a) - PRODUCT_TYPE_ORDER.indexOf(b)
  );

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Invoice #{invoice.invoice_number}
          </h1>
          <Badge
            variant="light"
            size="sm"
            color={status_cfg.color}
            startIcon={<span className={`inline-block h-2 w-2 rounded-full ${status_cfg.dot}`} />}
          >
            {status_cfg.label}
          </Badge>
        </div>
        <button
          onClick={() => generateInvoicePdf(invoice)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download PDF
        </button>
      </div>

      {/* Invoice Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3 sm:p-8">

        {/* Company Header */}
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <div className="mb-4">
              <span className="text-2xl font-bold tracking-wide text-gray-900 dark:text-white">BASE</span>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">SEARCH MARKETING</span>
            </div>
            <div className="space-y-0.5 text-theme-sm text-gray-500 dark:text-gray-400">
              <p>BASE Search Marketing</p>
              <p>2600 Executive Pkwy #100</p>
              <p>Lehi, UT 84043</p>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="mb-4 flex items-center gap-2 sm:justify-end">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">Invoice</span>
              <Badge
                variant="light"
                size="sm"
                color={status_cfg.color}
                startIcon={<span className={`inline-block h-2 w-2 rounded-full ${status_cfg.dot}`} />}
              >
                {status_cfg.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Billing + Invoice Meta */}
        <div className="mt-8 flex flex-col justify-between gap-8 sm:flex-row">
          {/* Billed To */}
          <div>
            <h3 className="mb-2 text-theme-sm font-semibold text-gray-900 dark:text-white">
              Invoiced to
            </h3>
            {invoice.billed_to ? (
              <div className="space-y-0.5 text-theme-sm text-gray-500 dark:text-gray-400">
                {invoice.billed_to.company_name && <p>{invoice.billed_to.company_name}</p>}
                {invoice.billed_to.company_description && <p>{invoice.billed_to.company_description}</p>}
                {invoice.billed_to.address_line_1 && <p>{invoice.billed_to.address_line_1}</p>}
                {invoice.billed_to.address_line_2 && <p>{invoice.billed_to.address_line_2}</p>}
                {invoice.billed_to.state && <p>{invoice.billed_to.state}</p>}
                {invoice.billed_to.country && <p>{invoice.billed_to.country}</p>}
              </div>
            ) : (
              <p className="text-theme-sm text-gray-400 dark:text-gray-500">
                No billing information available.
              </p>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="sm:text-right">
            <dl className="space-y-1.5 text-theme-sm">
              {[
                { label: "Invoice number", value: invoice.invoice_number },
                { label: "Unique ID", value: invoice.unique_id },
                { label: "Date issued", value: invoice.date_issued },
                { label: "Date due", value: invoice.date_due },
                { label: "Date paid", value: invoice.date_paid ?? "—" },
                { label: "Payment method", value: invoice.payment_method },
              ].map((field) => (
                <div key={field.label} className="flex justify-between gap-8 sm:justify-end">
                  <dt className="text-gray-500 dark:text-gray-400">{field.label}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Services included banner (multi-product only) */}
        <ServicesIncludedBanner product_types={known_product_types} />

        {/* Line Items — grouped by product type when available */}
        <GroupedLineItems invoice={invoice} />

        {/* Summary */}
        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-theme-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-gray-500 dark:text-gray-400">Subtotal</dt>
              <dd className="text-gray-700 dark:text-gray-300">{invoice.subtotal}</dd>
            </div>

            {invoice.discount && (
              <div className="flex justify-between">
                <dt className="flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                  Bulk Discount (10% off)
                </dt>
                <dd className="font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                  -{invoice.discount}
                </dd>
              </div>
            )}

            {invoice.coupon_discounts && invoice.coupon_discounts.length > 0 && (
              <>
                <div className="border-t border-dashed border-gray-200 pt-2 dark:border-gray-700">
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                    Coupons applied
                  </p>
                  {invoice.coupon_discounts.map((coupon) => (
                    <div key={coupon.code} className="flex items-center justify-between gap-2 py-0.5">
                      <dt className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded border border-success-300 bg-success-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
                          {coupon.code}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}% off`
                            : "Fixed discount"}
                        </span>
                      </dt>
                      <dd className="font-medium text-success-600 dark:text-success-400">
                        -{coupon.discount_amount}
                      </dd>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <dt className="font-semibold text-gray-900 dark:text-white">Total</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{invoice.total}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-500 dark:text-gray-400">Credit</dt>
              <dd className="text-gray-700 dark:text-gray-300">{invoice.credit}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
