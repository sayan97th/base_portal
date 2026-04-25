"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Badge from "../ui/badge/Badge";
import { invoicesService } from "@/services/client/invoices.service";
import { useDebounce } from "@/hooks/useDebounce";
import { INVOICE_PRODUCT_CONFIG } from "./invoiceData";
import type { InvoiceSummary, ProductType } from "./invoiceData";

const PER_PAGE = 10;

const STATUS_BADGE: Record<
  string,
  { color: "success" | "warning" | "error" | "info" | "light"; dot: string; label: string }
> = {
  paid:    { color: "success", dot: "bg-success-500", label: "Paid" },
  unpaid:  { color: "warning", dot: "bg-warning-500", label: "Unpaid" },
  overdue: { color: "error",   dot: "bg-error-500",   label: "Overdue" },
  refund:  { color: "info",    dot: "bg-blue-500",    label: "Refund" },
  void:    { color: "light",   dot: "bg-gray-500",    label: "Void" },
};

function buildPageButtons(current: number, last: number): (number | "...")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(last - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < last - 2) pages.push("...");
  pages.push(last);
  return pages;
}

function ProductTypeBadges({ product_types }: { product_types?: ProductType[] }) {
  if (!product_types || product_types.length === 0) {
    return <span className="text-xs text-gray-400 dark:text-gray-600">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {product_types.map((pt) => {
        const cfg = INVOICE_PRODUCT_CONFIG[pt];
        return (
          <span
            key={pt}
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
          >
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

function InvoiceRowSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="flex gap-1">
            <div className="h-4 w-20 animate-pulse rounded border bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-16 animate-pulse rounded border bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        <div className="flex gap-6">
          <div className="h-3.5 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-3.5 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-5 w-14 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-7 w-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: InvoiceSummary }) {
  const cfg = STATUS_BADGE[invoice.status] ?? STATUS_BADGE.void;

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Left: invoice ID + product badges + dates + total */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        {/* Invoice ID + product type badges */}
        <div className="min-w-40 shrink-0 space-y-1.5">
          <Link
            href={`/invoices/${invoice.unique_id}`}
            className="font-mono text-xs font-semibold text-gray-800 hover:text-coral-500 hover:underline dark:text-gray-200"
          >
            {invoice.unique_id}
          </Link>
          <ProductTypeBadges product_types={invoice.product_types} />
        </div>

        {/* Date meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            <span className="mr-1 text-gray-400 dark:text-gray-600">Issued</span>
            {invoice.date}
          </span>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <span>
            <span className="mr-1 text-gray-400 dark:text-gray-600">Due</span>
            {invoice.date_due}
          </span>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">{invoice.total}</span>
        </div>
      </div>

      {/* Right: status + view */}
      <div className="flex shrink-0 items-center gap-2">
        <Badge
          variant="light"
          size="sm"
          color={cfg.color}
          startIcon={<span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
        >
          {cfg.label}
        </Badge>

        <Link
          href={`/invoices/${invoice.unique_id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-coral-200 bg-coral-50 px-3 py-1.5 text-xs font-medium text-coral-600 transition-colors hover:bg-coral-500 hover:text-white dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-400 dark:hover:bg-coral-500 dark:hover:text-white"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2.5C3.5 2.5 1.5 6 1.5 6C1.5 6 3.5 9.5 6 9.5C8.5 9.5 10.5 6 10.5 6C10.5 6 8.5 2.5 6 2.5Z" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          View
        </Link>
      </div>
    </div>
  );
}

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const debounced_search = useDebounce(search, 400);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await invoicesService.getInvoiceList({
        page,
        per_page: PER_PAGE,
        search: debounced_search || undefined,
      });
      setInvoices(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch {
      setError("Failed to load invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, debounced_search]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const range_start = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const range_end = Math.min(page * PER_PAGE, total);
  const page_buttons = buildPageButtons(page, last_page);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">Invoices</h1>
          {!loading && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {total}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M7.25 1.5C4.075 1.5 1.5 4.075 1.5 7.25C1.5 10.425 4.075 13 7.25 13C10.425 13 13 10.425 13 7.25C13 4.075 10.425 1.5 7.25 1.5Z"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path d="M11.5 11.5L14.5 14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Invoice, date, status, service…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
          <button
            onClick={loadInvoices}
            className="mt-1 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
        {/* Column labels */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-2 dark:border-gray-800 dark:bg-gray-800/40">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Invoice · Services</span>
          <span className="hidden text-xs font-medium text-gray-500 sm:block dark:text-gray-400">Status · Actions</span>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: PER_PAGE }).map((_, i) => (
              <InvoiceRowSkeleton key={i} />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {total === 0 && !search ? "No invoices found." : "No invoices match your search."}
            </p>
          </div>
        ) : (
          <div>
            {invoices.map((invoice) => (
              <InvoiceRow key={invoice.unique_id} invoice={invoice} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 px-1 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{range_start}–{range_end}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>{" "}
            results &nbsp;·&nbsp; Page{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{page}</span>{" "}
            of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{last_page}</span>
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 2.5L4.5 6L7.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Prev
            </button>

            {page_buttons.map((btn, i) =>
              btn === "..." ? (
                <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={btn}
                  onClick={() => setPage(btn as number)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                    btn === page
                      ? "border-coral-500 bg-coral-500 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {btn}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === last_page}
              className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Next
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
