"use client";

import { useState, useEffect } from "react";
import type { OrderStatus } from "@/types/admin";

interface ChangeOrderStatusModalProps {
  is_open: boolean;
  is_submitting: boolean;
  current_status: OrderStatus;
  onConfirm: (new_status: OrderStatus, notify_user: boolean) => Promise<void>;
  onClose: () => void;
}

// ── Status config ─────────────────────────────────────────────────────────────

interface StatusOption {
  value: OrderStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  ring: string;
  bg: string;
  bg_active: string;
  border: string;
  border_active: string;
  text: string;
  badge_bg: string;
  badge_text: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "pending",
    label: "Pending",
    description: "Order received, awaiting processing to begin.",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    ring: "focus-within:ring-warning-500/30",
    bg: "bg-white dark:bg-gray-800/60",
    bg_active: "bg-warning-50 dark:bg-warning-500/10",
    border: "border-gray-200 dark:border-gray-700",
    border_active: "border-warning-300 dark:border-warning-500/40",
    text: "text-warning-700 dark:text-warning-400",
    badge_bg: "bg-warning-100 dark:bg-warning-500/20",
    badge_text: "text-warning-700 dark:text-warning-300",
  },
  {
    value: "processing",
    label: "Processing",
    description: "Work is actively underway on this order.",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    ring: "focus-within:ring-blue-500/30",
    bg: "bg-white dark:bg-gray-800/60",
    bg_active: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-gray-200 dark:border-gray-700",
    border_active: "border-blue-300 dark:border-blue-500/40",
    text: "text-blue-700 dark:text-blue-400",
    badge_bg: "bg-blue-100 dark:bg-blue-500/20",
    badge_text: "text-blue-700 dark:text-blue-300",
  },
  {
    value: "completed",
    label: "Completed",
    description: "All deliverables have been fulfilled.",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    ring: "focus-within:ring-success-500/30",
    bg: "bg-white dark:bg-gray-800/60",
    bg_active: "bg-success-50 dark:bg-success-500/10",
    border: "border-gray-200 dark:border-gray-700",
    border_active: "border-success-300 dark:border-success-500/40",
    text: "text-success-700 dark:text-success-400",
    badge_bg: "bg-success-100 dark:bg-success-500/20",
    badge_text: "text-success-700 dark:text-success-300",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    description: "Order has been cancelled and will not be fulfilled.",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    ring: "focus-within:ring-error-500/30",
    bg: "bg-white dark:bg-gray-800/60",
    bg_active: "bg-error-50 dark:bg-error-500/10",
    border: "border-gray-200 dark:border-gray-700",
    border_active: "border-error-300 dark:border-error-500/40",
    text: "text-error-700 dark:text-error-400",
    badge_bg: "bg-error-100 dark:bg-error-500/20",
    badge_text: "text-error-700 dark:text-error-300",
  },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

const ArrowsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
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

const XIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChangeOrderStatusModal({
  is_open,
  is_submitting,
  current_status,
  onConfirm,
  onClose,
}: ChangeOrderStatusModalProps) {
  const [selected_status, setSelectedStatus] = useState<OrderStatus>(current_status);
  const [notify_user, setNotifyUser] = useState(true);

  useEffect(() => {
    if (is_open) {
      setSelectedStatus(current_status);
      setNotifyUser(true);
    }
  }, [is_open, current_status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && is_open && !is_submitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_submitting, onClose]);

  if (!is_open) return null;

  const is_same_status = selected_status === current_status;
  const current_option = STATUS_OPTIONS.find((s) => s.value === current_status)!;
  const selected_option = STATUS_OPTIONS.find((s) => s.value === selected_status)!;

  async function handleConfirm() {
    if (is_same_status) return;
    await onConfirm(selected_status, notify_user);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !is_submitting && onClose()}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <ArrowsIcon />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Change Order Status
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Update the order status and optionally notify the client.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={is_submitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <XIcon />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current status */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Current status:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${current_option.badge_bg} ${current_option.badge_text}`}
            >
              {current_option.icon}
              {current_option.label}
            </span>
          </div>

          {/* Status selector */}
          <div>
            <p className="mb-2.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              Select new status
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STATUS_OPTIONS.map((opt) => {
                const is_selected = selected_status === opt.value;
                const is_current = current_status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedStatus(opt.value)}
                    disabled={is_submitting}
                    className={`relative flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-60 ${
                      is_selected
                        ? `${opt.bg_active} ${opt.border_active}`
                        : `${opt.bg} ${opt.border} hover:border-gray-300 dark:hover:border-gray-600`
                    }`}
                  >
                    {/* Radio dot */}
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        is_selected
                          ? `border-current ${opt.text}`
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {is_selected && (
                        <span className={`h-2 w-2 rounded-full bg-current ${opt.text}`} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className={`flex items-center gap-1.5 text-sm font-medium ${is_selected ? opt.text : "text-gray-700 dark:text-gray-300"}`}>
                        {opt.icon}
                        {opt.label}
                        {is_current && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                            current
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tracking note */}
          {!is_same_status && (
            <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Changing status from{" "}
                <span className={`font-semibold ${current_option.text}`}>{current_option.label}</span>{" "}
                to{" "}
                <span className={`font-semibold ${selected_option.text}`}>{selected_option.label}</span>{" "}
                will be reflected immediately on the order tracking timeline.
              </p>
            </div>
          )}

          {/* Notify checkbox */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50/30 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5">
            <div className="flex h-5 items-center pt-0.5">
              <input
                type="checkbox"
                checked={notify_user}
                onChange={(e) => setNotifyUser(e.target.checked)}
                disabled={is_submitting}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60 dark:border-gray-600"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <MailIcon />
                Notify client via email
              </div>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                Send an email to the client informing them about this status change.
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
            disabled={is_submitting || is_same_status}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {is_submitting ? (
              <>
                <SpinnerIcon />
                Updating...
              </>
            ) : (
              <>
                <ArrowsIcon />
                {is_same_status ? "No Changes" : "Update Status"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
