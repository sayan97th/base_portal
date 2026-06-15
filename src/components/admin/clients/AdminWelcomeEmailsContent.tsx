"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { listAdminClients } from "@/services/admin/user.service";
import { sendBulkWelcomeEmail } from "@/services/admin/user.service";
import type { AdminUser, SortDirection } from "@/types/admin";
import { useDebounce } from "@/hooks/useDebounce";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(first_name: string, last_name: string): string {
  return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
}

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
];

function getAvatarColor(user_id: number): string {
  return AVATAR_COLORS[user_id % AVATAR_COLORS.length];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ClientAvatar({ user }: { user: AdminUser }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColor(user.id)}`}
    >
      {getInitials(user.first_name, user.last_name)}
    </div>
  );
}

function PasswordResetBadge({ has_reset }: { has_reset: boolean }) {
  if (has_reset) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
        Reset Done
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Pending
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3.5">
            <div className="h-4 w-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-36 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          </td>
          {Array.from({ length: 3 }).map((__, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Result summary banner ──────────────────────────────────────────────────────

interface SendResult {
  sent: number;
  skipped: number;
  failed: number;
}

function ResultBanner({ result, onDismiss }: { result: SendResult; onDismiss: () => void }) {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 dark:border-teal-500/20 dark:bg-teal-500/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/20">
            <svg className="h-5 w-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">Email blast completed</p>
            <p className="mt-0.5 text-xs text-teal-600 dark:text-teal-400">
              <span className="font-medium">{result.sent} sent</span>
              {result.skipped > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400">{result.skipped} skipped (already reset)</span>}
              {result.failed > 0 && <span className="ml-2 text-red-600 dark:text-red-400">{result.failed} failed</span>}
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-teal-500 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  count: number;
  send_to_all: boolean;
  is_loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmSendModal({ count, send_to_all, is_loading, onConfirm, onClose }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/15">
          <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>

        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
          Send platform welcome emails?
        </h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {send_to_all
            ? "A welcome email with a password-reset link will be sent to all clients who have not yet reset their password."
            : `A welcome email with a password-reset link will be sent to the ${count} selected client${count !== 1 ? "s" : ""} who have not yet reset their password.`}
          {" "}Clients who have already completed their reset will be skipped automatically.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={is_loading}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={is_loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {is_loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
                Yes, send emails
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminWelcomeEmailsContent() {
  const [clients, setClients] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search_input, setSearchInput] = useState("");
  const debounced_search = useDebounce(search_input, 450);
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");

  const [selected_ids, setSelectedIds] = useState<Set<number>>(new Set());
  const [page_all_checked, setPageAllChecked] = useState(false);

  const [show_confirm, setShowConfirm] = useState(false);
  const [confirm_send_all, setConfirmSendAll] = useState(false);
  const [is_sending, setIsSending] = useState(false);
  const [send_error, setSendError] = useState<string | null>(null);
  const [send_result, setSendResult] = useState<SendResult | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debounced_search]);

  const loadClients = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listAdminClients({
      page,
      search: debounced_search,
      sort_field: "created_at",
      sort_direction,
    })
      .then((data) => {
        if (!cancelled) {
          setClients(data.data);
          setLastPage(data.last_page);
          setTotal(data.total);
          setIsLoading(false);
          setPageAllChecked(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load clients. Please try again.");
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [page, debounced_search, sort_direction]);

  useEffect(() => {
    return loadClients();
  }, [loadClients]);

  // ── Selection handlers ─────────────────────────────────────────────────────

  function toggleClient(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePageAll() {
    if (page_all_checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        clients.forEach((c) => next.delete(c.id));
        return next;
      });
      setPageAllChecked(false);
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        clients.forEach((c) => next.add(c.id));
        return next;
      });
      setPageAllChecked(true);
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setPageAllChecked(false);
  }

  // ── Send handlers ──────────────────────────────────────────────────────────

  function openSendSelected() {
    setSendError(null);
    setConfirmSendAll(false);
    setShowConfirm(true);
  }

  function openSendAll() {
    setSendError(null);
    setConfirmSendAll(true);
    setShowConfirm(true);
  }

  async function handleConfirmSend() {
    setIsSending(true);
    setSendError(null);

    try {
      const payload = confirm_send_all
        ? { send_to_all: true }
        : { user_ids: Array.from(selected_ids) };

      const result = await sendBulkWelcomeEmail(payload);
      setSendResult({ sent: result.sent, skipped: result.skipped, failed: result.failed });
      setShowConfirm(false);
      clearSelection();
      loadClients();
    } catch {
      setSendError("Something went wrong sending the emails. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const pending_count = clients.filter((c) => c.password_reset_at === null).length;
  const selected_count = selected_ids.size;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/clients"
              className="text-sm text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              Clients
            </Link>
            <svg className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-300">Welcome Emails</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold text-gray-900 dark:text-white">
            Send Welcome Emails
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {is_loading
              ? "Loading clients…"
              : `${total} client${total !== 1 ? "s" : ""} total · select recipients and send the platform welcome email`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={openSendAll}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            Send to All Pending
          </button>

          <button
            onClick={openSendSelected}
            disabled={selected_count === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
            Send to Selected
            {selected_count > 0 && (
              <span className="ml-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
                {selected_count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Result banner ── */}
      {send_result && (
        <ResultBanner result={send_result} onDismiss={() => setSendResult(null)} />
      )}

      {/* ── Error banners ── */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}
      {send_error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {send_error}
        </div>
      )}

      {/* ── Stats strip ── */}
      {!is_loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Clients</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-5 py-4 dark:border-amber-500/20 dark:bg-amber-500/5">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Password Pending (this page)</p>
            <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{pending_count}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-5 py-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Selected</p>
            <p className="mt-1 text-2xl font-bold text-indigo-700 dark:text-indigo-300">{selected_count}</p>
          </div>
        </div>
      )}

      {/* ── Search & controls ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z" />
          </svg>
          <input
            type="text"
            placeholder="Search clients by name or email…"
            value={search_input}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>

        <select
          value={sort_direction}
          onChange={(e) => setSortDirection(e.target.value as SortDirection)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>

        {selected_count > 0 && (
          <button
            onClick={clearSelection}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/40">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={page_all_checked}
                    onChange={togglePageAll}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
                    aria-label="Select all on this page"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Password Reset
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {is_loading ? (
                <SkeletonRows />
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">No clients found</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {search_input ? "Try adjusting your search." : "Registered client accounts will appear here."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const has_reset = client.password_reset_at !== null;
                  const is_checked = selected_ids.has(client.id);
                  return (
                    <tr
                      key={client.id}
                      className={`cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-white/2 ${
                        is_checked ? "bg-indigo-50/40 dark:bg-indigo-500/5" : ""
                      }`}
                      onClick={() => toggleClient(client.id)}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={is_checked}
                          onChange={() => toggleClient(client.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
                        />
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <ClientAvatar user={client} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900 dark:text-white">
                              {client.first_name} {client.last_name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                        {client.company ?? (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                        {client.email}
                      </td>

                      {/* Password reset status */}
                      <td className="px-4 py-3.5">
                        <PasswordResetBadge has_reset={has_reset} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!is_loading && last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{page}</span>
              {" "}of{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{last_page}</span>
              {" "}&middot; {total} total
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(last_page, p + 1))}
                disabled={page === last_page}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm modal ── */}
      {show_confirm && (
        <ConfirmSendModal
          count={selected_count}
          send_to_all={confirm_send_all}
          is_loading={is_sending}
          onConfirm={handleConfirmSend}
          onClose={() => !is_sending && setShowConfirm(false)}
        />
      )}
    </div>
  );
}
