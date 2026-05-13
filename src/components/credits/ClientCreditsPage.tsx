"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { creditsService } from "@/services/client/credits.service";
import type {
  CreditBalanceSummary,
  CreditTransaction,
  CreditTransactionListResponse,
} from "@/types/client/credits";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCredits(amount: number): string {
  return amount.toLocaleString("en-US");
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date_string: string): string {
  return new Date(date_string).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateFull(date_string: string): string {
  return new Date(date_string).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

// ── Balance Hero Card ─────────────────────────────────────────────────────────

function BalanceHeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 shadow-lg">
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-3.5 w-28 animate-pulse rounded-full bg-white/20" />
          <div className="h-10 w-40 animate-pulse rounded-lg bg-white/20" />
          <div className="h-3.5 w-36 animate-pulse rounded-full bg-white/20" />
        </div>
        <div className="flex gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 w-28 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

function BalanceHeroCard({ summary }: { summary: CreditBalanceSummary }) {
  const pct_used =
    summary.balance + (summary.balance > 0 ? 0 : 0) > 0
      ? Math.min(100, Math.round((summary.balance / (summary.balance + 1)) * 100))
      : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 shadow-lg">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-14 -left-5 h-36 w-36 rounded-full bg-white/5" />

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Main balance */}
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-xs font-medium tracking-wide text-white/70">Available Credits</p>
          </div>

          <div className="flex items-end gap-2">
            <p className="text-4xl font-extrabold tabular-nums text-white leading-none">
              {formatCredits(summary.balance)}
            </p>
            <p className="mb-0.5 text-sm font-semibold text-white/60">CR</p>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5">
              <svg className="h-3 w-3 text-emerald-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-xs font-semibold text-white/90">
                {formatUSD(summary.dollar_value)} USD equivalent
              </p>
            </div>
          </div>
        </div>

        {/* Side stats */}
        <div className="flex flex-wrap gap-2.5 lg:flex-col lg:items-end">
          <div className="flex flex-col items-start rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur-sm lg:items-end">
            <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider">Conversion Rate</p>
            <p className="mt-0.5 text-sm font-bold text-white">1 CR = $1.00</p>
            <p className="text-[10px] text-white/50">1:1 USD parity</p>
          </div>
          <div className="flex flex-col items-start rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur-sm lg:items-end">
            <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider">Status</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]" />
              <p className="text-sm font-bold text-white">
                {summary.balance > 0 ? "Active" : "Empty"}
              </p>
            </div>
            <p className="text-[10px] text-white/50">
              {summary.balance > 0 ? "Ready to use" : "Contact support"}
            </p>
          </div>
        </div>
      </div>

      {/* Thin usage progress bar at bottom */}
      {summary.balance > 0 && (
        <div className="relative z-10 mt-4">
          <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
            <span>Balance overview</span>
            <span>{formatCredits(summary.balance)} credits available</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-700"
              style={{ width: `${Math.max(pct_used, 8)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Info Banner ───────────────────────────────────────────────────────────────

function InfoBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/25 dark:bg-blue-500/10">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
        <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">How credits work</p>
        <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">
          Credits have a 1:1 parity with USD — 1 credit equals $1.00. They can be applied toward your orders and invoices.
          Credits assigned to your account never expire. Contact your account manager if you have questions about your balance.
        </p>
      </div>
    </div>
  );
}

// ── Transaction Row ───────────────────────────────────────────────────────────

function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-gray-100 px-4 py-4 last:border-0 dark:border-gray-800">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-4 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-14 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

function TransactionRow({ tx }: { tx: CreditTransaction }) {
  const is_credit = tx.type === "credit";

  return (
    <div className="flex items-center gap-4 border-b border-gray-100 px-4 py-4 last:border-0 transition-colors hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-white/[0.02]">
      {/* Type icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          is_credit
            ? "bg-emerald-100 dark:bg-emerald-500/15"
            : "bg-red-100 dark:bg-red-500/15"
        }`}
      >
        <svg
          className={`h-4 w-4 ${is_credit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          {is_credit ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          )}
        </svg>
      </div>

      {/* Description + date */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {tx.description ?? (is_credit ? "Credits added to account" : "Credits applied to payment")}
        </p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500" title={formatDateFull(tx.created_at)}>
          {formatDate(tx.created_at)}
        </p>
      </div>

      {/* Amount + badge */}
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-bold tabular-nums ${
            is_credit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
          }`}
        >
          {is_credit ? "+" : "−"}
          {formatCredits(tx.amount)} CR
        </p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          {is_credit ? `+${formatUSD(tx.amount)}` : `−${formatUSD(tx.amount)}`}
        </p>
      </div>

      {/* Type badge */}
      <div className="hidden shrink-0 sm:block">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            is_credit
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
          }`}
        >
          {is_credit ? "Received" : "Used"}
        </span>
      </div>
    </div>
  );
}

// ── Recent Transactions Mini List (from summary) ──────────────────────────────

function RecentMiniList({ transactions }: { transactions: CreditTransaction[] }) {
  if (transactions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Your last {transactions.length} transactions</p>
      </div>
      <div>
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 border-b border-gray-100 px-5 py-3 last:border-0 dark:border-gray-800"
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                tx.type === "credit"
                  ? "bg-emerald-100 dark:bg-emerald-500/15"
                  : "bg-red-100 dark:bg-red-500/15"
              }`}
            >
              <svg
                className={`h-3.5 w-3.5 ${tx.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                {tx.type === "credit" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                )}
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                {tx.description ?? (tx.type === "credit" ? "Credits added" : "Credits used")}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{formatDate(tx.created_at)}</p>
            </div>
            <p
              className={`shrink-0 text-xs font-bold tabular-nums ${
                tx.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
              }`}
            >
              {tx.type === "credit" ? "+" : "−"}
              {formatCredits(tx.amount)} CR
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat Cards ────────────────────────────────────────────────────────────────

function StatCards({ transactions }: { transactions: CreditTransaction[] }) {
  const total_received = transactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);

  const total_used = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  const stats = [
    {
      label: "Total Purchased",
      value: `+${formatCredits(total_received)} CR`,
      sub: formatUSD(total_received),
      color: "emerald" as const,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      label: "Total Used",
      value: `−${formatCredits(total_used)} CR`,
      sub: formatUSD(total_used),
      color: "red" as const,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
    {
      label: "Transactions",
      value: transactions.length.toString(),
      sub: "all time",
      color: "blue" as const,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
        </svg>
      ),
    },
  ];

  const color_map = {
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-100 dark:border-emerald-500/20",
      icon_bg: "bg-emerald-100 dark:bg-emerald-500/20",
      icon_text: "text-emerald-600 dark:text-emerald-400",
      value_text: "text-emerald-700 dark:text-emerald-300",
    },
    red: {
      bg: "bg-red-50 dark:bg-red-500/10",
      border: "border-red-100 dark:border-red-500/20",
      icon_bg: "bg-red-100 dark:bg-red-500/20",
      icon_text: "text-red-600 dark:text-red-400",
      value_text: "text-red-700 dark:text-red-300",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-500/10",
      border: "border-blue-100 dark:border-blue-500/20",
      icon_bg: "bg-blue-100 dark:bg-blue-500/20",
      icon_text: "text-blue-600 dark:text-blue-400",
      value_text: "text-blue-700 dark:text-blue-300",
    },
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((s) => {
        const c = color_map[s.color];
        return (
          <div
            key={s.label}
            className={`flex items-center gap-4 rounded-2xl border ${c.border} ${c.bg} p-5`}
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.icon_bg}`}>
              <span className={c.icon_text}>{s.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {s.label}
              </p>
              <p className={`mt-0.5 text-xl font-bold tabular-nums ${c.value_text}`}>{s.value}</p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{s.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const PER_PAGE = 10;

const ClientCreditsPage: React.FC = () => {
  const [summary, setSummary] = useState<CreditBalanceSummary | null>(null);
  const [summary_loading, setSummaryLoading] = useState(true);
  const [summary_error, setSummaryError] = useState<string | null>(null);

  const [tx_data, setTxData] = useState<CreditTransactionListResponse | null>(null);
  const [tx_loading, setTxLoading] = useState(true);
  const [tx_error, setTxError] = useState<string | null>(null);
  const [tx_page, setTxPage] = useState(1);
  const [tx_filter, setTxFilter] = useState<"" | "credit" | "debit">("");

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await creditsService.fetchBalanceSummary();
      setSummary(data);
    } catch {
      setSummaryError("Unable to load your credit balance. Please try again.");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    setTxError(null);
    try {
      const data = await creditsService.fetchTransactions(tx_page);
      setTxData(data);
    } catch {
      setTxError("Unable to load transactions. Please try again.");
    } finally {
      setTxLoading(false);
    }
  }, [tx_page]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const all_transactions = tx_data?.data ?? [];

  const filtered_transactions =
    tx_filter === ""
      ? all_transactions
      : all_transactions.filter((t) => t.type === tx_filter);

  const page_buttons = buildPageButtons(tx_page, tx_data?.last_page ?? 1);
  const total = tx_data?.total ?? 0;
  const last_page = tx_data?.last_page ?? 1;
  const range_start = total === 0 ? 0 : (tx_page - 1) * PER_PAGE + 1;
  const range_end = Math.min(tx_page * PER_PAGE, total);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-brand-600 shadow-sm">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Credits</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View your available credits and transaction history
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/credits/purchases"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            Purchase History
          </Link>
          <Link
            href="/credits/buy"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Buy Credits
          </Link>
        </div>
      </div>

      {/* ── Balance Hero ── */}
      {summary_loading ? (
        <BalanceHeroSkeleton />
      ) : summary_error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{summary_error}</p>
            <button
              onClick={loadSummary}
              className="mt-1 text-sm font-medium text-red-600 underline hover:text-red-700 dark:text-red-400"
            >
              Try again
            </button>
          </div>
        </div>
      ) : summary ? (
        <BalanceHeroCard summary={summary} />
      ) : null}

      {/* ── Stat Cards (from tx history) ── */}
      {!tx_loading && !tx_error && all_transactions.length > 0 && (
        <StatCards transactions={all_transactions} />
      )}
      {tx_loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {/* ── Info Banner ── */}
      <InfoBanner />

      {/* ── Two-column: recent (sidebar) + full history ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent mini list (from summary) */}
        {!summary_loading && summary && summary.recent_transactions.length > 0 && (
          <div className="xl:col-span-1">
            <RecentMiniList transactions={summary.recent_transactions} />
          </div>
        )}

        {/* Full transaction history */}
        <div className={summary && summary.recent_transactions.length > 0 ? "xl:col-span-2" : "xl:col-span-3"}>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            {/* Header + filter tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Transaction History
                </h2>
                {!tx_loading && total > 0 && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {total} transaction{total !== 1 ? "s" : ""} on your account
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {([
                  { key: "" as const, label: "All" },
                  { key: "credit" as const, label: "Received" },
                  { key: "debit" as const, label: "Used" },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTxFilter(key);
                      setTxPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      tx_filter === key
                        ? "bg-brand-500 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.05] dark:text-gray-400 dark:hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction list */}
            {tx_loading ? (
              <div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TransactionRowSkeleton key={i} />
                ))}
              </div>
            ) : tx_error ? (
              <div className="flex flex-col items-center justify-center px-6 py-14">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
                  <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">{tx_error}</p>
                <button
                  onClick={loadTransactions}
                  className="mt-2 text-sm font-medium text-brand-500 underline hover:text-brand-600"
                >
                  Try again
                </button>
              </div>
            ) : filtered_transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg className="h-7 w-7 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {tx_filter === "" ? "No transactions yet" : `No ${tx_filter === "credit" ? "received" : "used"} credits`}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {tx_filter === ""
                    ? "Credits assigned to your account will appear here."
                    : "Switch to \"All\" to see your full history."}
                </p>
                {tx_filter !== "" && (
                  <button
                    onClick={() => setTxFilter("")}
                    className="mt-3 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                  >
                    Show all transactions
                  </button>
                )}
              </div>
            ) : (
              <div>
                {filtered_transactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!tx_loading && !tx_error && total > PER_PAGE && (
              <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">{range_start}–{range_end}</span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>{" "}
                  transactions
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTxPage((p) => p - 1)}
                    disabled={tx_page === 1}
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
                        onClick={() => setTxPage(btn as number)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                          btn === tx_page
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        }`}
                      >
                        {btn}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setTxPage((p) => p + 1)}
                    disabled={tx_page === last_page}
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
        </div>
      </div>
    </div>
  );
};

export default ClientCreditsPage;
