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
import { invoice_list } from "./invoiceData";

const InvoicesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Invoices
      </h1>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
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
              {invoice_list.map((invoice) => (
                <TableRow
                  key={invoice.unique_id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
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
      </div>
    </div>
  );
};

export default InvoicesPage;
