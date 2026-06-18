"use client";

import React, { useCallback, useEffect, useState } from "react";
import { listAdminTransactions } from "@/services/admin/transactions.service";
import type {
  AdminTransaction,
  AdminTransactionFilters,
  TransactionPaymentMethod,
  TransactionSortField,
  TransactionStatus,
  TransactionType,
  SortDirection,
} from "@/types/admin";
import { useDebounce } from "@/hooks/useDebounce";

const STATUS_STYLES: Record<TransactionStatus, string> = {
  success: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  failed:  "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
};

const TYPE_LABELS: Record<TransactionType, string> = {
  purchase:        "Purchase",
  credit_payment:  "Credit Payment",
  hybrid_payment:  "Hybrid Payment",
  failed_purchase: "Failed Purchase",
};

const TYPE_STYLES: Record<TransactionType, string> = {
  purchase:        "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  credit_payment:  "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  hybrid_payment:  "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  failed_purchase: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const METHOD_LABELS: Record<TransactionPaymentMethod, string> = {
  credit_card:     "Credit Card",
  account_credits: "Account Credits",
  hybrid:          "Hybrid",
};

function SortIcon({
  field,
  active_field,
  direction,
}: {
  field: TransactionSortField;
  active_field: TransactionSortField | undefined;
  direction: SortDirection;
}) {
  const is_active = active_field === field;
  return (
    <span
      className={`ml-1 inline-flex flex-col gap-px transition-opacity ${
        is_active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
      }`}
    >
      <svg
        className={`h-2.5 w-2.5 transition-colors ${
          is_active && direction === "asc" ? "text-brand-500" : "text-gray-400"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <svg
        className={`-mt-1 h-2.5 w-2.5 transition-colors ${
          is_active && direction === "desc" ? "text-brand-500" : "text-gray-400"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
}

const PER_PAGE = 25;

export default function AdminTransactionsContent() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current_page, setCurrentPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search_input, setSearchInput] = useState("");
  const debounced_search = useDebounce(search_input, 400);

  const [status_filter, setStatusFilter] = useState<TransactionStatus | "">("");
  const [type_filter, setTypeFilter] = useState<TransactionType | "">("");
  const [method_filter, setMethodFilter] = useState<TransactionPaymentMethod | "">("");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");
  const [sort_field, setSortField] = useState<TransactionSortField>("created_at");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");

  const fetchTransactions = useCallback(async (filters: AdminTransactionFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listAdminTransactions(filters);
      setTransactions(result.data);
      setCurrentPage(result.current_page);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch {
      setError("Failed to load transactions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions({
      page: current_page,
      per_page: PER_PAGE,
      search: debounced_search,
      status: status_filter,
      type: type_filter,
      payment_method: method_filter,
      date_from,
      date_to,
      sort_field,
      sort_direction,
    });
  }, [
    current_page,
    debounced_search,
    status_filter,
    type_filter,
    method_filter,
    date_from,
    date_to,
    sort_field,
    sort_direction,
    fetchTransactions,
  ]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setCurrentPage(1);
  };

  const handleSortToggle = (field: TransactionSortField) => {
    if (sort_field === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatAmount = (amount: number) =>
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            All payment actions recorded on the platform
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400">Total:</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-white">{total}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search user, session, payment ID..."
            value={search_input}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={status_filter}
          onChange={(e) => {
            setStatusFilter(e.target.value as TransactionStatus | "");
            handleFilterChange();
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>

        {/* Type filter */}
        <select
          value={type_filter}
          onChange={(e) => {
            setTypeFilter(e.target.value as TransactionType | "");
            handleFilterChange();
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Types</option>
          <option value="purchase">Purchase</option>
          <option value="credit_payment">Credit Payment</option>
          <option value="hybrid_payment">Hybrid Payment</option>
          <option value="failed_purchase">Failed Purchase</option>
        </select>

        {/* Payment method filter */}
        <select
          value={method_filter}
          onChange={(e) => {
            setMethodFilter(e.target.value as TransactionPaymentMethod | "");
            handleFilterChange();
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Methods</option>
          <option value="credit_card">Credit Card</option>
          <option value="account_credits">Account Credits</option>
          <option value="hybrid">Hybrid</option>
        </select>

        {/* Date from */}
        <input
          type="date"
          value={date_from}
          onChange={(e) => {
            setDateFrom(e.target.value);
            handleFilterChange();
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />

        {/* Date to */}
        <input
          type="date"
          value={date_to}
          onChange={(e) => {
            setDateTo(e.target.value);
            handleFilterChange();
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60">
                <th
                  className="group cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  onClick={() => handleSortToggle("created_at")}
                >
                  <span className="flex items-center">
                    Date
                    <SortIcon field="created_at" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  User
                </th>
                <th
                  className="group cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  onClick={() => handleSortToggle("type")}
                >
                  <span className="flex items-center">
                    Type
                    <SortIcon field="type" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>
                <th
                  className="group cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  onClick={() => handleSortToggle("status")}
                >
                  <span className="flex items-center">
                    Status
                    <SortIcon field="status" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>
                <th
                  className="group cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  onClick={() => handleSortToggle("payment_method")}
                >
                  <span className="flex items-center">
                    Method
                    <SortIcon field="payment_method" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>
                <th
                  className="group cursor-pointer whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  onClick={() => handleSortToggle("amount")}
                >
                  <span className="flex items-center justify-end">
                    Amount
                    <SortIcon field="amount" active_field={sort_field} direction={sort_direction} />
                  </span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Session / Order
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Payment ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {is_loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 rounded bg-gray-100 dark:bg-gray-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-red-500">
                    {error}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                  >
                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(tx.created_at)}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      {tx.user ? (
                        <div>
                          <p className="text-xs font-medium text-gray-800 dark:text-white">
                            {tx.user.first_name} {tx.user.last_name}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {tx.user.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_STYLES[tx.type]}`}
                      >
                        {TYPE_LABELS[tx.type]}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[tx.status]}`}
                      >
                        {tx.status}
                      </span>
                      {tx.status === "failed" && tx.error_message && (
                        <p
                          className="mt-0.5 max-w-[180px] truncate text-[10px] text-red-400 dark:text-red-500"
                          title={tx.error_message}
                        >
                          {tx.error_message}
                        </p>
                      )}
                    </td>

                    {/* Payment method */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      {METHOD_LABELS[tx.payment_method]}
                    </td>

                    {/* Amount */}
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          tx.status === "failed"
                            ? "text-gray-400 dark:text-gray-500"
                            : "text-gray-800 dark:text-white"
                        }`}
                      >
                        {tx.status === "failed" ? "—" : `$${formatAmount(tx.amount)}`}
                      </span>
                    </td>

                    {/* Session / Order */}
                    <td className="px-4 py-3">
                      {tx.session_title ? (
                        <p className="max-w-[160px] truncate text-xs font-medium text-gray-700 dark:text-gray-300" title={tx.session_title}>
                          {tx.session_title}
                        </p>
                      ) : null}
                      {tx.session_id && (
                        <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500" title={tx.session_id}>
                          {tx.session_id.substring(0, 12)}…
                        </p>
                      )}
                      {tx.order_id && (
                        <p
                          className="font-mono text-[10px] text-gray-400 dark:text-gray-500"
                          title={tx.order_id}
                        >
                          Order {tx.order_id.substring(0, 8)}…
                        </p>
                      )}
                      {tx.invoice_id && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                          Invoice #{tx.invoice_id}
                        </p>
                      )}
                      {!tx.session_title && !tx.session_id && !tx.order_id && !tx.invoice_id && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Payment intent ID */}
                    <td className="px-4 py-3">
                      {tx.payment_intent_id ? (
                        <span
                          className="font-mono text-[10px] text-gray-400 dark:text-gray-500"
                          title={tx.payment_intent_id}
                        >
                          {tx.payment_intent_id.substring(0, 16)}…
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!is_loading && !error && last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {current_page} of {last_page} &middot; {total} total
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={current_page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {Array.from({ length: Math.min(5, last_page) }, (_, i) => {
                const page = Math.max(1, Math.min(current_page - 2, last_page - 4)) + i;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                      page === current_page
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-500 dark:border-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(last_page, p + 1))}
                disabled={current_page >= last_page}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
