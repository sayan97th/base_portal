"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { adminCreditsService } from "@/services/admin/credits.service";
import type {
  AdminCreditUser,
  AdminCreditTransaction,
  AdminCreditsStats,
} from "@/types/admin/credits";
import type { PaginatedResponse } from "@/types/admin";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(first_name: string, last_name: string): string {
  return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
}

function formatDate(date_string: string): string {
  return new Date(date_string).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCredits(amount: number): string {
  return amount.toLocaleString("en-US");
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: "brand" | "emerald" | "blue";
}) {
  const color_map = {
    brand: {
      bg: "bg-brand-50 dark:bg-brand-500/10",
      icon_bg: "bg-brand-100 dark:bg-brand-500/20",
      icon_text: "text-brand-600 dark:text-brand-400",
      value_text: "text-brand-700 dark:text-brand-300",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      icon_bg: "bg-emerald-100 dark:bg-emerald-500/20",
      icon_text: "text-emerald-600 dark:text-emerald-400",
      value_text: "text-emerald-700 dark:text-emerald-300",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-500/10",
      icon_bg: "bg-blue-100 dark:bg-blue-500/20",
      icon_text: "text-blue-600 dark:text-blue-400",
      value_text: "text-blue-700 dark:text-blue-300",
    },
  };
  const c = color_map[color];

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-gray-100 ${c.bg} p-5 dark:border-gray-800`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.icon_bg}`}
      >
        <span className={c.icon_text}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </p>
        <p className={`mt-0.5 text-2xl font-bold tabular-nums ${c.value_text}`}>
          {typeof value === "number" ? formatCredits(value) : value}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function UserAvatar({
  first_name,
  last_name,
  size = "md",
}: {
  first_name: string;
  last_name: string;
  size?: "sm" | "md";
}) {
  const size_classes = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <div
      className={`${size_classes} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-semibold text-white`}
    >
      {getInitials(first_name, last_name)}
    </div>
  );
}

// ── Client Search Select ──────────────────────────────────────────────────────

function ClientSearchSelect({
  selected_client,
  onSelect,
}: {
  selected_client: AdminCreditUser | null;
  onSelect: (client: AdminCreditUser | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminCreditUser[]>([]);
  const [is_open, setIsOpen] = useState(false);
  const [is_loading, setIsLoading] = useState(false);
  const container_ref = useRef<HTMLDivElement>(null);
  const input_ref = useRef<HTMLInputElement>(null);
  const debounce_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await adminCreditsService.searchClients(term);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounce_ref.current) clearTimeout(debounce_ref.current);
    debounce_ref.current = setTimeout(() => search(query), 320);
    return () => {
      if (debounce_ref.current) clearTimeout(debounce_ref.current);
    };
  }, [query, search]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (client: AdminCreditUser) => {
    onSelect(client);
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
    setResults([]);
    setTimeout(() => input_ref.current?.focus(), 0);
  };

  return (
    <div ref={container_ref} className="relative">
      {selected_client ? (
        <div className="flex h-11 items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/60 px-3 dark:border-brand-700/40 dark:bg-brand-500/10">
          <UserAvatar
            first_name={selected_client.first_name}
            last_name={selected_client.last_name}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {selected_client.first_name} {selected_client.last_name}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {selected_client.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-white/60 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
            aria-label="Clear selection"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div
          className={`flex h-11 items-center gap-2.5 rounded-lg border bg-gray-50 px-3 transition-all dark:bg-white/[0.03] ${
            is_open
              ? "border-brand-500 ring-2 ring-brand-500/20 dark:border-brand-400"
              : "border-gray-200 dark:border-gray-700"
          }`}
        >
          <svg
            className="h-4 w-4 shrink-0 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={input_ref}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search by name or email…"
            className="h-full w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white dark:placeholder:text-gray-500"
          />
          {is_loading && (
            <svg className="h-4 w-4 shrink-0 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
      )}

      {is_open && !selected_client && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {results.length === 0 && !is_loading && query.trim() && (
            <div className="px-4 py-5 text-center">
              <svg className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 1 0-4.773-4.773 3.375 3.375 0 0 0 4.774 4.774ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">No clients found</p>
            </div>
          )}
          {results.length === 0 && !is_loading && !query.trim() && (
            <div className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">
              Start typing to search clients…
            </div>
          )}
          {results.length > 0 && (
            <ul className="max-h-60 overflow-y-auto py-1">
              {results.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(client)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <UserAvatar
                      first_name={client.first_name}
                      last_name={client.last_name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {client.first_name} {client.last_name}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {client.email}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                      {formatCredits(client.credit_balance)} cr
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Transaction Row ───────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: AdminCreditTransaction }) {
  const is_credit = tx.type === "credit";
  return (
    <tr className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-white/[0.02]">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <UserAvatar
            first_name={tx.user.first_name}
            last_name={tx.user.last_name}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {tx.user.first_name} {tx.user.last_name}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {tx.user.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-right">
        <span
          className={`text-sm font-semibold tabular-nums ${
            is_credit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
          }`}
        >
          {is_credit ? "+" : "−"}
          {formatCredits(tx.amount)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            is_credit
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
          }`}
        >
          {is_credit ? "Added" : "Deducted"}
        </span>
      </td>
      <td className="max-w-[160px] px-4 py-3.5">
        <p className="truncate text-sm text-gray-600 dark:text-gray-400">
          {tx.description ?? <span className="italic text-gray-400 dark:text-gray-600">—</span>}
        </p>
      </td>
      <td className="px-4 py-3.5 text-right text-xs text-gray-500 dark:text-gray-400">
        {formatDate(tx.created_at)}
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminCreditsContent() {
  // Stats
  const [stats, setStats] = useState<AdminCreditsStats | null>(null);
  const [stats_loading, setStatsLoading] = useState(true);

  // Assign form
  const [selected_client, setSelectedClient] = useState<AdminCreditUser | null>(null);
  const [credit_type, setCreditType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [amount_error, setAmountError] = useState<string | null>(null);
  const [client_error, setClientError] = useState<string | null>(null);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const [last_assigned_balance, setLastAssignedBalance] = useState<number | null>(null);

  // Transaction history
  const [transactions, setTransactions] = useState<PaginatedResponse<AdminCreditTransaction> | null>(null);
  const [tx_loading, setTxLoading] = useState(true);
  const [tx_page, setTxPage] = useState(1);
  const [tx_type_filter, setTxTypeFilter] = useState<"credit" | "debit" | "">("");

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await adminCreditsService.fetchStats();
      setStats(data);
    } catch {
      // Stats are decorative — fail silently
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const data = await adminCreditsService.fetchTransactions({
        page: tx_page,
        type: tx_type_filter || undefined,
      });
      setTransactions(data);
    } catch {
      setTransactions(null);
    } finally {
      setTxLoading(false);
    }
  }, [tx_page, tx_type_filter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmountError(null);
    setClientError(null);
    setSubmitError(null);
    setLastAssignedBalance(null);

    let has_error = false;
    if (!selected_client) {
      setClientError("Please select a client.");
      has_error = true;
    }
    const parsed_amount = parseFloat(amount);
    if (!amount || isNaN(parsed_amount) || parsed_amount <= 0) {
      setAmountError("Please enter a valid amount greater than 0.");
      has_error = true;
    }
    if (has_error) return;

    setIsSubmitting(true);
    try {
      const result = await adminCreditsService.assignCredits({
        user_id: selected_client!.id,
        amount: parsed_amount,
        type: credit_type,
        description: description.trim() || undefined,
      });
      setLastAssignedBalance(result.new_balance);
      // Update the client's displayed balance if still selected
      setSelectedClient((prev) =>
        prev ? { ...prev, credit_balance: result.new_balance } : null
      );
      setAmount("");
      setDescription("");
      // Refresh stats and transactions after assignment
      loadStats();
      setTxPage(1);
      loadTransactions();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to assign credits. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Credits Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Assign and manage account credits for your clients
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats_loading ? (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Credits Issued"
              value={stats?.total_credits_issued ?? 0}
              subtitle="All-time credits added"
              color="brand"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
            />
            <StatCard
              title="Active Credit Users"
              value={stats?.users_with_credits ?? 0}
              subtitle="Clients with positive balance"
              color="blue"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              }
            />
            <StatCard
              title="Used This Month"
              value={stats?.credits_used_this_month ?? 0}
              subtitle="Credits redeemed in payments"
              color="emerald"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Left: Assign Credits form ── */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            {/* Form header */}
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Assign Credits</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Add or deduct credits from a client account
              </p>
            </div>

            <form onSubmit={handleAssign} className="px-6 py-5 space-y-5">
              {/* Client select */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Client <span className="text-red-400">*</span>
                </label>
                <ClientSearchSelect
                  selected_client={selected_client}
                  onSelect={(c) => {
                    setSelectedClient(c);
                    setClientError(null);
                    setLastAssignedBalance(null);
                  }}
                />
                {client_error && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {client_error}
                  </p>
                )}
              </div>

              {/* Client balance card */}
              {selected_client && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        first_name={selected_client.first_name}
                        last_name={selected_client.last_name}
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selected_client.first_name} {selected_client.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selected_client.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current balance</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCredits(selected_client.credit_balance)}
                        <span className="ml-1 text-xs font-normal text-gray-400">cr</span>
                      </p>
                    </div>
                  </div>
                  {lastAssignedBalance !== null && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Credits updated. New balance: <strong>{formatCredits(lastAssignedBalance)}</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Operation type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Operation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["credit", "debit"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCreditType(type)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                        credit_type === type
                          ? type === "credit"
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "border-red-400 bg-red-50 text-red-700 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        {type === "credit" ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        )}
                      </svg>
                      {type === "credit" ? "Add Credits" : "Deduct Credits"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label
                  htmlFor="credit_amount"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Amount <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <input
                    id="credit_amount"
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setAmountError(null);
                    }}
                    placeholder="e.g. 500"
                    className={`h-11 w-full rounded-lg border pl-10 pr-4 text-sm text-gray-900 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:text-white dark:placeholder:text-gray-500 ${
                      amount_error
                        ? "border-red-400 bg-red-50/40 focus:border-red-400 focus:ring-red-400/20 dark:border-red-500/60 dark:bg-red-500/5"
                        : "border-gray-200 bg-gray-50 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:focus:border-brand-400"
                    }`}
                  />
                  {amount && !amount_error && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                      <span className="text-xs font-medium text-gray-400">= ${parseFloat(amount || "0").toFixed(2)}</span>
                    </div>
                  )}
                </div>
                {amount_error && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {amount_error}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">1 credit = $1.00 USD</p>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="credit_description"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Note{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="credit_description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Reason for this credit adjustment…"
                  className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400 dark:focus:bg-white/5"
                />
              </div>

              {/* Submit error */}
              {submit_error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 dark:border-red-500/20 dark:bg-red-500/10">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-400">{submit_error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={is_submitting}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  credit_type === "credit"
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:ring-2 focus:ring-emerald-500/30"
                    : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:ring-2 focus:ring-red-500/30"
                }`}
              >
                {is_submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      {credit_type === "credit" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                      )}
                    </svg>
                    {credit_type === "credit" ? "Add Credits" : "Deduct Credits"}
                  </>
                )}
              </button>

              {/* 1:1 parity note */}
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 dark:border-blue-500/20 dark:bg-blue-500/5">
                <svg className="h-3.5 w-3.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Credits have a 1:1 parity with USD — 1 credit equals $1.00.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* ── Right: Transaction history ── */}
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            {/* Table header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Transaction History
                </h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  All credit adjustments across clients
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(["", "credit", "debit"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setTxTypeFilter(type);
                      setTxPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      tx_type_filter === type
                        ? "bg-brand-500 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.05] dark:text-gray-400 dark:hover:bg-white/10"
                    }`}
                  >
                    {type === "" ? "All" : type === "credit" ? "Added" : "Deducted"}
                  </button>
                ))}
              </div>
            </div>

            {/* Table body */}
            {tx_loading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="h-7 w-7 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-2.5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            ) : transactions && transactions.data.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.02]">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Client
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Credits
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Type
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Note
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.data.map((tx) => (
                        <TransactionRow key={tx.id} tx={tx} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {transactions.last_page > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Page {transactions.current_page} of {transactions.last_page}
                      <span className="ml-1.5 text-gray-400 dark:text-gray-600">
                        ({transactions.total} total)
                      </span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                        disabled={tx_page === 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxPage((p) => Math.min(transactions.last_page, p + 1))}
                        disabled={tx_page === transactions.last_page}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg className="h-7 w-7 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                  No transactions yet
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Assign credits to a client to see transactions here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
