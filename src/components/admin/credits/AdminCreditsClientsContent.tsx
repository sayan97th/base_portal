"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { adminCreditsService } from "@/services/admin/credits.service";
import type { AdminCreditUser } from "@/types/admin/credits";
import type { PaginatedResponse } from "@/types/admin";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(first_name: string, last_name: string) {
  return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
}

function formatCredits(n: number) {
  return n.toLocaleString("en-US");
}

type BalanceTier = "high" | "medium" | "low" | "zero";
type SortField = "first_name" | "credit_balance";
type SortDir = "asc" | "desc";

function getBalanceTier(balance: number): BalanceTier {
  if (balance >= 1000) return "high";
  if (balance >= 200) return "medium";
  if (balance > 0) return "low";
  return "zero";
}

const TIER_CONFIG: Record<
  BalanceTier,
  { badge: string; bar: string; gradient: string; label: string }
> = {
  high: {
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    bar: "bg-emerald-400 dark:bg-emerald-500",
    gradient: "from-emerald-400 to-emerald-600",
    label: "Rich",
  },
  medium: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    bar: "bg-blue-400 dark:bg-blue-500",
    gradient: "from-blue-400 to-blue-600",
    label: "Active",
  },
  low: {
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    bar: "bg-amber-400 dark:bg-amber-500",
    gradient: "from-amber-400 to-amber-600",
    label: "Low",
  },
  zero: {
    badge: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    bar: "bg-gray-200 dark:bg-gray-700",
    gradient: "from-gray-300 to-gray-500",
    label: "Empty",
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ClientAvatar({
  client,
  size = "md",
}: {
  client: AdminCreditUser;
  size?: "sm" | "md" | "lg";
}) {
  const tier = getBalanceTier(client.credit_balance);
  const size_cls =
    size === "sm"
      ? "h-7 w-7 text-xs"
      : size === "lg"
        ? "h-12 w-12 text-base"
        : "h-9 w-9 text-sm";
  return (
    <div
      className={`${size_cls} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${TIER_CONFIG[tier].gradient} font-semibold text-white shadow-sm`}
    >
      {getInitials(client.first_name, client.last_name)}
    </div>
  );
}

function BalanceBadge({ balance }: { balance: number }) {
  const tier = getBalanceTier(balance);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${TIER_CONFIG[tier].badge}`}
    >
      {formatCredits(balance)} cr
    </span>
  );
}

function BalanceBar({
  balance,
  max_balance,
}: {
  balance: number;
  max_balance: number;
}) {
  const pct =
    max_balance > 0 ? Math.min(100, (balance / max_balance) * 100) : 0;
  const tier = getBalanceTier(balance);
  return (
    <div className="flex w-28 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${TIER_CONFIG[tier].bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 text-right text-[10px] tabular-nums text-gray-400 dark:text-gray-600">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

function TierBadge({ balance }: { balance: number }) {
  const tier = getBalanceTier(balance);
  const dot_cls =
    tier === "high"
      ? "bg-emerald-500"
      : tier === "medium"
        ? "bg-blue-500"
        : tier === "low"
          ? "bg-amber-500"
          : "bg-gray-300 dark:bg-gray-600";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TIER_CONFIG[tier].badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot_cls}`} />
      {TIER_CONFIG[tier].label}
    </span>
  );
}

// ── Sort Button ───────────────────────────────────────────────────────────────

function SortBtn({
  label,
  field,
  sort_field,
  sort_dir,
  onClick,
}: {
  label: string;
  field: SortField;
  sort_field: SortField;
  sort_dir: SortDir;
  onClick: (field: SortField) => void;
}) {
  const is_active = sort_field === field;
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        is_active
          ? "bg-brand-500 text-white shadow-sm"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.05] dark:text-gray-400 dark:hover:bg-white/10"
      }`}
    >
      {label}
      <svg
        className={`h-3 w-3 transition-transform ${is_active && sort_dir === "desc" ? "rotate-180" : ""} ${!is_active ? "opacity-0" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4.5 15.75 7.5-7.5 7.5 7.5"
        />
      </svg>
    </button>
  );
}

// ── Edit Credits Modal ────────────────────────────────────────────────────────

function EditCreditsModal({
  client,
  onClose,
  onSuccess,
}: {
  client: AdminCreditUser;
  onClose: () => void;
  onSuccess: (new_balance: number) => void;
}) {
  const [op, setOp] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [amount_err, setAmountErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [api_err, setApiErr] = useState<string | null>(null);
  const [success_balance, setSuccessBalance] = useState<number | null>(null);

  const tier = getBalanceTier(client.credit_balance);
  const parsed_amount = parseFloat(amount) || 0;
  const preview_balance =
    amount && !isNaN(parsed_amount)
      ? Math.max(
          0,
          client.credit_balance + (op === "credit" ? 1 : -1) * parsed_amount
        )
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmountErr(null);
    setApiErr(null);
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setAmountErr("Enter a valid amount greater than 0.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminCreditsService.assignCredits({
        user_id: client.id,
        amount: parsed,
        type: op,
        description: note.trim() || undefined,
      });
      setSuccessBalance(res.new_balance);
      onSuccess(res.new_balance);
    } catch (err: unknown) {
      setApiErr(
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Edit Credits
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add or deduct credits for this client
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Client info card */}
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <ClientAvatar client={client} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">
                {client.first_name} {client.last_name}
              </p>
              <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                {client.email}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Current balance
              </p>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  tier === "high"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : tier === "medium"
                      ? "text-blue-600 dark:text-blue-400"
                      : tier === "low"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {formatCredits(client.credit_balance)}
                <span className="ml-0.5 text-sm font-normal">cr</span>
              </p>
            </div>
          </div>
        </div>

        {/* Success state */}
        {success_balance !== null ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
              <svg
                className="h-7 w-7 text-emerald-600 dark:text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
              Credits updated successfully
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              New balance:{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCredits(success_balance)} cr
              </span>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06]"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {/* Operation */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Operation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["credit", "debit"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOp(type)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                      op === type
                        ? type === "credit"
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "border-red-400 bg-red-50 text-red-700 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      {type === "credit" ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 12h-15"
                        />
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
                htmlFor="modal_amount"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Amount <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <input
                  id="modal_amount"
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountErr(null);
                  }}
                  placeholder="e.g. 500"
                  className={`h-11 w-full rounded-xl border pl-10 pr-4 text-sm text-gray-900 transition-all focus:outline-none focus:ring-2 dark:text-white dark:placeholder:text-gray-500 ${
                    amount_err
                      ? "border-red-400 bg-red-50/40 focus:border-red-400 focus:ring-red-400/20 dark:border-red-500/60 dark:bg-red-500/5"
                      : "border-gray-200 bg-gray-50 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:focus:border-brand-400"
                  }`}
                />
              </div>
              {amount_err && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  {amount_err}
                </p>
              )}
              {preview_balance !== null && !amount_err && (
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  New balance after {op === "credit" ? "adding" : "deducting"}:{" "}
                  <strong
                    className={
                      op === "credit"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    }
                  >
                    {formatCredits(preview_balance)} cr
                  </strong>
                </p>
              )}
            </div>

            {/* Note */}
            <div>
              <label
                htmlFor="modal_note"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Note{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="modal_note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for this credit adjustment…"
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            {api_err && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 dark:border-red-500/20 dark:bg-red-500/10">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {api_err}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  op === "credit"
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                    : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                }`}
              >
                {submitting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Processing…
                  </>
                ) : op === "credit" ? (
                  "Add Credits"
                ) : (
                  "Deduct Credits"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Client Table Row ──────────────────────────────────────────────────────────

function ClientRow({
  client,
  max_balance,
  onEdit,
}: {
  client: AdminCreditUser;
  max_balance: number;
  onEdit: (client: AdminCreditUser) => void;
}) {
  return (
    <tr className="group border-b border-gray-100 transition-colors last:border-0 hover:bg-brand-50/30 dark:border-gray-800 dark:hover:bg-white/[0.015]">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <ClientAvatar client={client} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {client.first_name} {client.last_name}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {client.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <BalanceBadge balance={client.credit_balance} />
      </td>
      <td className="hidden px-5 py-3.5 md:table-cell">
        <BalanceBar balance={client.credit_balance} max_balance={max_balance} />
      </td>
      <td className="hidden px-5 py-3.5 lg:table-cell">
        <TierBadge balance={client.credit_balance} />
      </td>
      <td className="px-5 py-3.5 text-right">
        <button
          type="button"
          onClick={() => onEdit(client)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
            />
          </svg>
          Edit
        </button>
      </td>
    </tr>
  );
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-2.5 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="hidden h-1.5 w-28 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700 md:block" />
          <div className="h-7 w-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  current_page,
  last_page,
  total,
  onPageChange,
}: {
  current_page: number;
  last_page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages: (number | "...")[] = [];
  if (last_page <= 7) {
    for (let i = 1; i <= last_page; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current_page > 3) pages.push("...");
    const start = Math.max(2, current_page - 1);
    const end = Math.min(last_page - 1, current_page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current_page < last_page - 2) pages.push("...");
    pages.push(last_page);
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Page {current_page} of {last_page}
        <span className="ml-1.5 text-gray-400 dark:text-gray-600">
          ({total} total)
        </span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, current_page - 1))}
          disabled={current_page === 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-7 w-7 items-center justify-center text-xs text-gray-400"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                current_page === p
                  ? "bg-brand-500 text-white shadow-sm"
                  : "border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(last_page, current_page + 1))}
          disabled={current_page === last_page}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminCreditsClientsContent() {
  const [clients, setClients] =
    useState<PaginatedResponse<AdminCreditUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced_search, setDebouncedSearch] = useState("");
  const [sort_field, setSortField] = useState<SortField>("credit_balance");
  const [sort_dir, setSortDir] = useState<SortDir>("desc");
  const [edit_client, setEditClient] = useState<AdminCreditUser | null>(null);
  const debounce_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce_ref.current) clearTimeout(debounce_ref.current);
    debounce_ref.current = setTimeout(() => setDebouncedSearch(search), 320);
    return () => {
      if (debounce_ref.current) clearTimeout(debounce_ref.current);
    };
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced_search, sort_field, sort_dir]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminCreditsService.fetchClientsList({
        page,
        search: debounced_search || undefined,
        sort_by: sort_field,
        sort_dir,
      });
      setClients(data);
    } catch {
      setClients(null);
    } finally {
      setLoading(false);
    }
  }, [page, debounced_search, sort_field, sort_dir]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleSort = (field: SortField) => {
    if (sort_field === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "credit_balance" ? "desc" : "asc");
    }
  };

  const handleEditSuccess = (client_id: number, new_balance: number) => {
    setClients((prev) =>
      prev
        ? {
            ...prev,
            data: prev.data.map((c) =>
              c.id === client_id ? { ...c, credit_balance: new_balance } : c
            ),
          }
        : null
    );
    setEditClient((prev) =>
      prev ? { ...prev, credit_balance: new_balance } : null
    );
  };

  const max_balance =
    clients?.data.reduce((m, c) => Math.max(m, c.credit_balance), 0) ?? 0;

  const page_credits =
    clients?.data.reduce((s, c) => s + c.credit_balance, 0) ?? 0;
  const zero_count =
    clients?.data.filter((c) => c.credit_balance === 0).length ?? 0;
  const avg_balance =
    clients && clients.data.length > 0
      ? Math.round(page_credits / clients.data.length)
      : 0;

  const stat_cards = [
    {
      label: "Total Clients",
      value: (clients?.total ?? 0).toLocaleString(),
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          />
        </svg>
      ),
      colors: {
        wrap: "border-brand-100 bg-brand-50/60 dark:border-brand-500/20 dark:bg-brand-500/5",
        icon: "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400",
        value: "text-brand-700 dark:text-brand-300",
      },
    },
    {
      label: "Credits on Page",
      value: formatCredits(page_credits) + " cr",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ),
      colors: {
        wrap: "border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5",
        icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
        value: "text-emerald-700 dark:text-emerald-300",
      },
    },
    {
      label: "Avg Balance",
      value: formatCredits(avg_balance) + " cr",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
          />
        </svg>
      ),
      colors: {
        wrap: "border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/5",
        icon: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
        value: "text-blue-700 dark:text-blue-300",
      },
    },
    {
      label: "Zero Balance",
      value: String(zero_count),
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      ),
      colors: {
        wrap: "border-amber-100 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5",
        icon: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
        value: "text-amber-700 dark:text-amber-300",
      },
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Clients Credits
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and manage credit balances across all clients
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat_cards.map((s) => (
          <div
            key={s.label}
            className={`flex items-center gap-3 rounded-2xl border p-4 ${s.colors.wrap}`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.colors.icon}`}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {s.label}
              </p>
              <p
                className={`mt-0.5 truncate text-lg font-bold tabular-nums ${s.colors.value}`}
              >
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table card ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-9 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Sort buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Sort:
            </span>
            <SortBtn
              label="Name"
              field="first_name"
              sort_field={sort_field}
              sort_dir={sort_dir}
              onClick={handleSort}
            />
            <SortBtn
              label="Balance"
              field="credit_balance"
              sort_field={sort_field}
              sort_dir={sort_dir}
              onClick={handleSort}
            />
          </div>

          {!loading && clients && (
            <p className="ml-auto text-xs text-gray-400 dark:text-gray-500">
              {clients.total} client{clients.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <TableSkeleton />
        ) : clients && clients.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.02]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Client
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Balance
                    </th>
                    <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 md:table-cell">
                      Distribution
                    </th>
                    <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 lg:table-cell">
                      Tier
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.data.map((client) => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      max_balance={max_balance}
                      onEdit={setEditClient}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {clients.last_page > 1 && (
              <Pagination
                current_page={clients.current_page}
                last_page={clients.last_page}
                total={clients.total}
                onPageChange={setPage}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg
                className="h-8 w-8 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
              No clients found
            </p>
            {search && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                No results for &ldquo;{search}&rdquo; — try a different term.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {edit_client && (
        <EditCreditsModal
          client={edit_client}
          onClose={() => setEditClient(null)}
          onSuccess={(new_balance) =>
            handleEditSuccess(edit_client.id, new_balance)
          }
        />
      )}
    </div>
  );
}
