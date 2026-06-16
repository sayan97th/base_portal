"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  listAdminClients,
  startBulkWelcomeEmail,
  sendTestWelcomeEmail,
  getPendingClientsCount,
  getBulkEmailBatchStatus,
  stopBulkEmailBatch,
} from "@/services/admin/user.service";
import type {
  AdminUser,
  ClientSortField,
  PasswordResetStatusFilter,
  SortDirection,
  BulkEmailBatch,
} from "@/types/admin";
import { useDebounce } from "@/hooks/useDebounce";
import WelcomeEmailsFiltersBar from "@/components/admin/clients/WelcomeEmailsFiltersBar";

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
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColor(user.id)}`}
    >
      {getInitials(user.first_name, user.last_name)}
    </div>
  );
}

function PasswordResetBadge({ has_reset, reset_at }: { has_reset: boolean; reset_at: string | null }) {
  if (has_reset && reset_at) {
    return (
      <div className="inline-flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
          Reset Done
        </span>
        <span className="pl-0.5 text-[10px] text-gray-400 dark:text-gray-500">
          {new Date(reset_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      Pending
    </span>
  );
}

function WelcomeEmailBadge({ sent_at }: { sent_at: string | null }) {
  if (sent_at) {
    return (
      <div className="inline-flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          Sent
        </span>
        <span className="pl-0.5 text-[10px] text-gray-400 dark:text-gray-500">
          {new Date(sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
      Not sent
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          <td className="px-5 py-4 align-top">
            <div className="h-4 w-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="px-5 py-4 align-top">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-36 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          </td>
          <td className="px-5 py-4 align-top">
            <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="px-5 py-4 align-top">
            <div className="h-3.5 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="px-5 py-4 align-top">
            <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
          </td>
          <td className="px-5 py-4 align-top">
            <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Batch Progress Panel ───────────────────────────────────────────────────────

interface BatchProgressPanelProps {
  batch: BulkEmailBatch;
  is_stopping: boolean;
  onStop: () => void;
  onDismiss: () => void;
}

function BatchProgressPanel({ batch, is_stopping, onStop, onDismiss }: BatchProgressPanelProps) {
  const is_done = batch.status === "completed" || batch.status === "stopped";
  const progress_pct = batch.total_count > 0
    ? Math.min(100, Math.round((batch.processed_count / batch.total_count) * 100))
    : 0;

  const status_color = batch.status === "completed"
    ? "border-teal-200 bg-teal-50 dark:border-teal-500/20 dark:bg-teal-500/10"
    : batch.status === "stopped"
    ? "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
    : "border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10";

  const bar_color = batch.status === "completed"
    ? "bg-teal-500"
    : batch.status === "stopped"
    ? "bg-amber-500"
    : "bg-indigo-500";

  const title_color = batch.status === "completed"
    ? "text-teal-800 dark:text-teal-300"
    : batch.status === "stopped"
    ? "text-amber-800 dark:text-amber-300"
    : "text-indigo-800 dark:text-indigo-300";

  const title = batch.status === "completed"
    ? "Email blast completed"
    : batch.status === "stopped"
    ? "Email blast stopped"
    : "Sending emails in progress…";

  return (
    <div className={`rounded-xl border px-5 py-4 ${status_color}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">

          {/* Icon */}
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/60 dark:bg-white/10">
            {batch.status === "processing" ? (
              <svg className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : batch.status === "completed" ? (
              <svg className="h-5 w-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${title_color}`}>{title}</p>

            {/* Progress bar */}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/50 dark:bg-black/20">
              <div
                className={`h-full rounded-full transition-all duration-500 ${bar_color}`}
                style={{ width: `${progress_pct}%` }}
              />
            </div>

            {/* Stats row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{batch.processed_count}</span>
                {" / "}{batch.total_count} processed
                {" "}
                <span className="text-gray-400">({progress_pct}%)</span>
              </span>
              {batch.sent_count > 0 && (
                <span className="text-teal-600 dark:text-teal-400">
                  <span className="font-semibold">{batch.sent_count}</span> sent
                </span>
              )}
              {batch.skipped_count > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  <span className="font-semibold">{batch.skipped_count}</span> skipped
                </span>
              )}
              {batch.failed_count > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  <span className="font-semibold">{batch.failed_count}</span> failed
                </span>
              )}
            </div>

            {batch.status === "processing" && (
              <p className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400">
                Emails are being queued and sent progressively. You can stop at any time.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {batch.status === "processing" && (
            <button
              onClick={onStop}
              disabled={is_stopping}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {is_stopping ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Stopping…
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                  </svg>
                  Stop sending
                </>
              )}
            </button>
          )}

          {is_done && (
            <button
              onClick={onDismiss}
              className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Test Email Modal ───────────────────────────────────────────────────────────

interface TestEmailModalProps {
  is_loading: boolean;
  on_send: (email: string) => void;
  on_close: () => void;
  success_message: string | null;
  error_message: string | null;
}

function TestEmailModal({ is_loading, on_send, on_close, success_message, error_message }: TestEmailModalProps) {
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) on_send(email.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
        onClick={!is_loading ? on_close : undefined}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900">

        {/* Header */}
        <div className="flex items-start gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/15">
            <svg className="h-6 w-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Send Test Welcome Email</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Preview the welcome email format before sending to real clients.
            </p>
          </div>
          <button
            onClick={on_close}
            disabled={is_loading}
            className="shrink-0 text-gray-400 hover:text-gray-600 disabled:opacity-40 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">

          <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 dark:border-violet-500/20 dark:bg-violet-500/5">
            <div className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <p className="text-xs text-violet-700 dark:text-violet-300">
                A sample welcome email with a placeholder reset link will be delivered to the address you enter below. No client records are affected.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="test-email-input" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Recipient email address
            </label>
            <input
              id="test-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={is_loading}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
            />
          </div>

          {success_message && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {success_message}
            </div>
          )}
          {error_message && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error_message}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={on_close}
              disabled={is_loading}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={is_loading || !email.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-600"
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
                  Send Test Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  count: number;
  send_to_all: boolean;
  pending_count: number | null;
  is_loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmSendModal({ count, send_to_all, pending_count, is_loading, onConfirm, onClose }: ConfirmModalProps) {
  const recipients = send_to_all ? pending_count : count;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
        onClick={!is_loading ? onClose : undefined}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900">

        {/* Header */}
        <div className="flex items-start gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/15">
            <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Confirm Welcome Email Blast
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {send_to_all
                ? recipients !== null
                  ? `You are about to send to ${recipients} pending client${recipients !== 1 ? "s" : ""}`
                  : "You are about to send to all pending clients"
                : `You are about to send to ${count} selected client${count !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">

          {send_to_all && recipients !== null && (
            <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                  {recipients} client{recipients !== 1 ? "s" : ""} will receive this email
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  These are all clients who have not yet reset their password.
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              What will happen
            </p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/15">
                  <svg className="h-3 w-3 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  A <span className="font-medium text-gray-900 dark:text-white">platform welcome email</span> will be sent to each eligible recipient containing a unique password-reset link.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/15">
                  <svg className="h-3 w-3 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Clients who have <span className="font-medium text-gray-900 dark:text-white">already reset their password</span> will be skipped automatically — they will not receive a duplicate email.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-500/15">
                  <svg className="h-3 w-3 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Emails are sent <span className="font-medium text-gray-900 dark:text-white">progressively in the background</span> at a controlled rate. You can stop the process at any time.
                </p>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 dark:border-indigo-500/20 dark:bg-indigo-500/5">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                {send_to_all
                  ? "Target: all clients whose password has not been reset yet."
                  : `Target: ${count} selected client${count !== 1 ? "s" : ""} — pending ones will be emailed, already-reset ones will be skipped.`}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
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
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {is_loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
                Confirm &amp; Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2500;

export default function AdminWelcomeEmailsContent() {
  const [clients, setClients] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search_input, setSearchInput] = useState("");
  const debounced_search = useDebounce(search_input, 450);
  const [sort_field, setSortField] = useState<ClientSortField | undefined>("created_at");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");
  const [password_reset_status, setPasswordResetStatus] = useState<PasswordResetStatusFilter>("");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");

  const [selected_ids, setSelectedIds] = useState<Set<number>>(new Set());
  const [page_all_checked, setPageAllChecked] = useState(false);

  const [show_confirm, setShowConfirm] = useState(false);
  const [confirm_send_all, setConfirmSendAll] = useState(false);
  const [pending_count, setPendingCount] = useState<number | null>(null);
  const [is_fetching_pending_count, setIsFetchingPendingCount] = useState(false);
  const [is_starting, setIsStarting] = useState(false);
  const [start_error, setStartError] = useState<string | null>(null);

  // ── Batch progress state ──────────────────────────────────────────────────
  const [active_batch, setActiveBatch] = useState<BulkEmailBatch | null>(null);
  const [is_stopping, setIsStopping] = useState(false);
  const poll_ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const [show_test_modal, setShowTestModal] = useState(false);
  const [is_sending_test, setIsSendingTest] = useState(false);
  const [test_success, setTestSuccess] = useState<string | null>(null);
  const [test_error, setTestError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debounced_search, sort_field, sort_direction, password_reset_status, date_from, date_to]);

  const loadClients = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listAdminClients({
      page,
      search: debounced_search,
      sort_field,
      sort_direction,
      password_reset_status: password_reset_status || undefined,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
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
  }, [page, debounced_search, sort_field, sort_direction, password_reset_status, date_from, date_to]);

  useEffect(() => {
    return loadClients();
  }, [loadClients]);

  // ── Batch polling ─────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (poll_ref.current) {
      clearInterval(poll_ref.current);
      poll_ref.current = null;
    }
  }, []);

  const startPolling = useCallback((batch_id: number) => {
    stopPolling();
    poll_ref.current = setInterval(async () => {
      try {
        const updated = await getBulkEmailBatchStatus(batch_id);
        setActiveBatch(updated);
        if (updated.status !== "processing") {
          stopPolling();
          loadClients();
        }
      } catch {
        // keep polling silently on transient errors
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling, loadClients]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ── Selection handlers ────────────────────────────────────────────────────

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

  function handleClearAll() {
    setSearchInput("");
    setSortField("created_at");
    setSortDirection("desc");
    setPasswordResetStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function handleSortChange(field: ClientSortField, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
  }

  // ── Send handlers ─────────────────────────────────────────────────────────

  function openSendSelected() {
    setStartError(null);
    setConfirmSendAll(false);
    setShowConfirm(true);
  }

  async function openSendAll() {
    setStartError(null);
    setConfirmSendAll(true);
    setPendingCount(null);
    setIsFetchingPendingCount(true);
    try {
      const result = await getPendingClientsCount();
      setPendingCount(result.pending_count);
    } catch {
      setPendingCount(null);
    } finally {
      setIsFetchingPendingCount(false);
    }
    setShowConfirm(true);
  }

  async function handleConfirmSend() {
    setIsStarting(true);
    setStartError(null);

    try {
      const payload = confirm_send_all
        ? { send_to_all: true }
        : { user_ids: Array.from(selected_ids) };

      const response = await startBulkWelcomeEmail(payload);

      const initial_batch: BulkEmailBatch = {
        batch_id: response.batch_id,
        status: response.status,
        total_count: response.total_count,
        sent_count: 0,
        skipped_count: 0,
        failed_count: 0,
        processed_count: 0,
        completed_at: null,
        stopped_at: null,
      };

      setActiveBatch(initial_batch);
      setShowConfirm(false);
      clearSelection();
      startPolling(response.batch_id);
    } catch {
      setStartError("Something went wrong starting the email blast. Please try again.");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleStopBatch() {
    if (!active_batch) return;
    setIsStopping(true);
    try {
      await stopBulkEmailBatch(active_batch.batch_id);
      const updated = await getBulkEmailBatchStatus(active_batch.batch_id);
      setActiveBatch(updated);
      stopPolling();
      loadClients();
    } catch {
      // swallow — the poll will pick up the stopped status anyway
    } finally {
      setIsStopping(false);
    }
  }

  function dismissBatch() {
    stopPolling();
    setActiveBatch(null);
  }

  // ── Test email handlers ───────────────────────────────────────────────────

  function openTestModal() {
    setTestSuccess(null);
    setTestError(null);
    setShowTestModal(true);
  }

  async function handleSendTestEmail(email: string) {
    setIsSendingTest(true);
    setTestSuccess(null);
    setTestError(null);

    try {
      const result = await sendTestWelcomeEmail({ email });
      setTestSuccess(result.message);
    } catch {
      setTestError("Failed to send test email. Please try again.");
    } finally {
      setIsSendingTest(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const selected_count = selected_ids.size;
  const is_blast_active = active_batch?.status === "processing";

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
              : `${total} client${total !== 1 ? "s" : ""} · select recipients and send the platform welcome email`}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {selected_count > 0 && !is_blast_active && (
            <button
              onClick={clearSelection}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Clear selection ({selected_count})
            </button>
          )}

          <button
            onClick={openTestModal}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
            Send Test Email
          </button>

          <button
            onClick={openSendAll}
            disabled={is_blast_active}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            Send to All Pending
          </button>

          <button
            onClick={openSendSelected}
            disabled={selected_count === 0 || is_blast_active}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-600"
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

      {/* ── Batch progress panel ── */}
      {active_batch && (
        <BatchProgressPanel
          batch={active_batch}
          is_stopping={is_stopping}
          onStop={handleStopBatch}
          onDismiss={dismissBatch}
        />
      )}

      {/* ── Error banners ── */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}
      {start_error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {start_error}
        </div>
      )}

      {/* ── Filters bar ── */}
      <WelcomeEmailsFiltersBar
        search_value={search_input}
        on_search_change={setSearchInput}
        password_reset_status={password_reset_status}
        on_password_reset_status_change={setPasswordResetStatus}
        sort_field={sort_field}
        sort_direction={sort_direction}
        on_sort_change={handleSortChange}
        date_from={date_from}
        date_to={date_to}
        on_date_from_change={setDateFrom}
        on_date_to_change={setDateTo}
        total={total}
        is_loading={is_loading}
        on_clear_all={handleClearAll}
      />

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/40">
                <th className="w-12 px-5 py-3.5">
                  <input
                    type="checkbox"
                    checked={page_all_checked}
                    onChange={togglePageAll}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
                    aria-label="Select all on this page"
                  />
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Client
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Company
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Joined
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Welcome Email
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Password Reset
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {is_loading ? (
                <SkeletonRows />
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">No clients found</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {search_input || password_reset_status || date_from || date_to
                          ? "Try adjusting your search or filters."
                          : "Registered client accounts will appear here."}
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
                      className={`cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-white/[0.02] ${
                        is_checked ? "bg-indigo-50/40 dark:bg-indigo-500/5" : ""
                      }`}
                      onClick={() => toggleClient(client.id)}
                    >
                      {/* Checkbox */}
                      <td className="w-12 align-top px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={is_checked}
                          onChange={() => toggleClient(client.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
                        />
                      </td>

                      {/* Client */}
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <ClientAvatar user={client} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900 dark:text-white">
                              {client.first_name} {client.last_name}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {client.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-5 py-4 align-top text-sm text-gray-600 dark:text-gray-400">
                        {client.company ?? (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4 align-top text-sm text-gray-500 dark:text-gray-400">
                        {new Date(client.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Welcome email status */}
                      <td className="px-5 py-4 align-top">
                        <WelcomeEmailBadge sent_at={client.welcome_email_sent_at} />
                      </td>

                      {/* Password reset status */}
                      <td className="px-5 py-4 align-top">
                        <PasswordResetBadge has_reset={has_reset} reset_at={client.password_reset_at} />
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
          pending_count={pending_count}
          is_loading={is_starting || is_fetching_pending_count}
          onConfirm={handleConfirmSend}
          onClose={() => !is_starting && setShowConfirm(false)}
        />
      )}

      {/* ── Test email modal ── */}
      {show_test_modal && (
        <TestEmailModal
          is_loading={is_sending_test}
          on_send={handleSendTestEmail}
          on_close={() => !is_sending_test && setShowTestModal(false)}
          success_message={test_success}
          error_message={test_error}
        />
      )}
    </div>
  );
}
