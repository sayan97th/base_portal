"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Badge from "../ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../ui/table";
import Pagination from "@/components/tables/Pagination";
import { invoicesService } from "@/services/client/invoices.service";
import type { InvoiceSummary } from "./invoiceData";

const PER_PAGE = 10;

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await invoicesService.getInvoiceList({ page, per_page: PER_PAGE });
      setInvoices(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch {
      setError("Failed to load invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Invoices
        </h1>
        {!loading && total > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} invoice{total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-theme-sm text-error-500">{error}</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              No invoices found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Invoice
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Date
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Date due
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Total
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.unique_id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/2"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm font-medium">
                      <Link
                        href={`/invoices/${invoice.unique_id}`}
                        className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        {invoice.unique_id}
                      </Link>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300">
                      {invoice.date}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300">
                      {invoice.date_due}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300">
                      {invoice.total}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <Badge
                        variant="light"
                        size="sm"
                        color={invoice.status === "paid" ? "success" : "error"}
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
                        {invoice.status === "paid" ? "Paid" : "Void"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {!loading && !error && last_page > 1 && (
        <div className="flex justify-end">
          <Pagination
            currentPage={page}
            totalPages={last_page}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
