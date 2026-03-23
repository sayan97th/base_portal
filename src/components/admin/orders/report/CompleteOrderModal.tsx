"use client";

import { useState, useEffect } from "react";
import type { OrderUser } from "@/types/admin";

interface CompleteOrderModalProps {
  is_open: boolean;
  is_submitting: boolean;
  order_id: string;
  user: OrderUser | null;
  onConfirm: (notify_user: boolean) => Promise<void>;
  onClose: () => void;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const CheckCircleIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MailIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const WHAT_HAPPENS = [
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    text: "Order status will be updated to Completed.",
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    text: "The order tracking timeline will reflect the completion.",
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    text: "No further status changes will be expected after completion.",
  },
];

export default function CompleteOrderModal({
  is_open,
  is_submitting,
  order_id: _order_id,
  user,
  onConfirm,
  onClose,
}: CompleteOrderModalProps) {
  const [notify_user, setNotifyUser] = useState(true);

  useEffect(() => {
    if (is_open) setNotifyUser(true);
  }, [is_open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && is_open && !is_submitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_submitting, onClose]);

  if (!is_open) return null;

  const client_name = user ? `${user.first_name} ${user.last_name}` : "the client";

  async function handleConfirm() {
    await onConfirm(notify_user);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !is_submitting && onClose()}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-success-400 to-success-600" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
              <CheckCircleIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mark Order as Completed
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This will finalize the order and mark it as fully delivered for{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">{client_name}</span>.
              </p>
            </div>
          </div>
        </div>

        {/* What will happen */}
        <div className="mx-6 mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-800/40">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            What will happen
          </p>
          <ul className="space-y-2.5">
            {WHAT_HAPPENS.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-success-500 dark:text-success-400">
                  {item.icon}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{item.text}</span>
              </li>
            ))}
            {notify_user && (
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-success-500 dark:text-success-400">
                  <MailIcon />
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {client_name} will receive an email confirming their order has been completed.
                </span>
              </li>
            )}
          </ul>
        </div>

        {/* Notify checkbox */}
        <div className="mx-6 mb-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-success-300 hover:bg-success-50/40 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-success-500/40 dark:hover:bg-success-500/5">
            <div className="flex h-5 items-center pt-0.5">
              <input
                type="checkbox"
                checked={notify_user}
                onChange={(e) => setNotifyUser(e.target.checked)}
                disabled={is_submitting}
                className="h-4 w-4 rounded border-gray-300 text-success-600 focus:ring-success-500 disabled:opacity-60 dark:border-gray-600"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <MailIcon />
                Notify client via email
              </div>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                Send a completion notification to{" "}
                {user?.email ?? "the client"} so they know their order has been finalized.
              </p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={is_submitting}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={is_submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-success-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-success-500/20 transition hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-success-600 dark:hover:bg-success-500"
          >
            {is_submitting ? (
              <>
                <SpinnerIcon />
                Completing...
              </>
            ) : (
              <>
                <CheckCircleIcon />
                Mark as Completed
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
