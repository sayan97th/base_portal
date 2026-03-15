"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AdminOrder, OrderStatus } from "@/types/admin";
import type { OrderUpdate, CreateOrderUpdatePayload } from "@/types/admin";
import { getAdminOrder } from "@/services/admin/order.service";
import {
  listOrderUpdates,
  createOrderUpdate,
  deleteOrderUpdate,
} from "@/services/admin/order-tracking.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff_ms = Date.now() - new Date(iso).getTime();
  const diff_min = Math.floor(diff_ms / 60_000);
  if (diff_min < 1) return "just now";
  if (diff_min < 60) return `${diff_min}m ago`;
  const diff_h = Math.floor(diff_min / 60);
  if (diff_h < 24) return `${diff_h}h ago`;
  const diff_d = Math.floor(diff_h / 24);
  if (diff_d === 1) return "yesterday";
  if (diff_d < 30) return `${diff_d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// ─── Status config ─────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string;
  dot: string;
  badge: string;
  border: string;
  icon: React.ReactNode;
};

const STATUS_STAGES: OrderStatus[] = ["pending", "processing", "completed"];

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    dot: "bg-warning-500",
    badge: "bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:ring-warning-500/20",
    border: "border-warning-200 dark:border-warning-500/30",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  processing: {
    label: "Processing",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
    border: "border-blue-200 dark:border-blue-500/30",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  completed: {
    label: "Completed",
    dot: "bg-success-500",
    badge: "bg-success-50 text-success-700 ring-success-200 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/20",
    border: "border-success-200 dark:border-success-500/30",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-error-500",
    badge: "bg-error-50 text-error-700 ring-error-200 dark:bg-error-500/10 dark:text-error-400 dark:ring-error-500/20",
    border: "border-error-200 dark:border-error-500/30",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

// ─── Icons ─────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const MailIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Sk = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

// ─── Progress Steps ───────────────────────────────────────────────────────────

interface ProgressStepsProps {
  status: OrderStatus;
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ status }) => {
  const current_idx = STATUS_STAGES.indexOf(status);
  const is_cancelled = status === "cancelled";

  if (is_cancelled) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-error-200 bg-error-50 px-5 py-3.5 dark:border-error-500/20 dark:bg-error-500/10">
        <span className="text-error-500 dark:text-error-400">{STATUS_CONFIG.cancelled.icon}</span>
        <span className="text-sm font-medium text-error-700 dark:text-error-400">
          This order was cancelled and is no longer being processed.
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-between">
      {/* track */}
      <div className="absolute inset-x-6 top-4 h-0.5 bg-gray-100 dark:bg-gray-800" />
      <div
        className="absolute left-6 top-4 h-0.5 bg-gradient-to-r from-success-400 to-success-500 transition-all duration-700"
        style={{ width: current_idx === 0 ? "0%" : current_idx === 1 ? "calc(50% - 0.25rem)" : "calc(100% - 3rem)" }}
      />

      {STATUS_STAGES.map((stage, idx) => {
        const cfg = STATUS_CONFIG[stage];
        const is_done = idx < current_idx;
        const is_active = idx === current_idx;

        return (
          <div key={stage} className="relative z-10 flex flex-col items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all duration-300 ${
                is_done
                  ? "bg-success-500 text-white shadow-lg shadow-success-500/30"
                  : is_active
                  ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-950 ring-current ${cfg.badge} text-current`
                  : "bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600"
              }`}
            >
              {is_done ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <span className="scale-110">{cfg.icon}</span>
              )}
              {is_active && (
                <span className="absolute h-full w-full animate-ping rounded-full bg-current opacity-20" />
              )}
            </div>
            <span
              className={`text-xs font-semibold ${
                is_active
                  ? "text-gray-800 dark:text-white"
                  : is_done
                  ? "text-success-600 dark:text-success-400"
                  : "text-gray-400 dark:text-gray-600"
              }`}
            >
              {cfg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Update Card ──────────────────────────────────────────────────────────────

interface UpdateCardProps {
  update: OrderUpdate;
  index: number;
  total: number;
  on_delete: (id: string) => void;
  is_deleting: boolean;
}

const UpdateCard: React.FC<UpdateCardProps> = ({ update, index, total, on_delete, is_deleting }) => {
  const [confirm_delete, setConfirmDelete] = useState(false);
  const status_cfg = update.status_change ? STATUS_CONFIG[update.status_change] : null;
  const initials = `${update.created_by.first_name[0]}${update.created_by.last_name[0]}`.toUpperCase();
  const is_last = index === total - 1;

  return (
    <div className="group relative flex gap-5">
      {/* Vertical connector line */}
      {!is_last && (
        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-800" />
      )}

      {/* Avatar bubble */}
      <div className="relative z-10 flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white shadow-md shadow-brand-500/20 ring-2 ring-white dark:ring-gray-950">
          {initials}
        </div>
        {index === 0 && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success-500 ring-2 ring-white dark:ring-gray-950">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        )}
      </div>

      {/* Card */}
      <div className={`mb-6 flex-1 overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900 ${
        index === 0
          ? "border-brand-100 shadow-brand-500/5 dark:border-brand-500/20"
          : "border-gray-100 dark:border-gray-800"
      }`}>
        {/* Card header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {update.title}
            </h4>
            {status_cfg && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${status_cfg.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${update.status_change ? STATUS_CONFIG[update.status_change].dot : ""}`} />
                {status_cfg.label}
              </span>
            )}
            {update.send_email && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-600 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20">
                <MailIcon />
                Email sent
              </span>
            )}
            {index === 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20">
                Latest
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!confirm_delete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="hidden rounded-lg p-1.5 text-gray-300 transition-all hover:bg-error-50 hover:text-error-500 group-hover:flex dark:text-gray-700 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                title="Delete this update"
              >
                <TrashIcon />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-error-100 bg-error-50 px-2 py-1 dark:border-error-500/20 dark:bg-error-500/10">
                <span className="text-xs text-error-600 dark:text-error-400">Delete?</span>
                <button
                  onClick={() => on_delete(update.id)}
                  disabled={is_deleting}
                  className="rounded px-1.5 py-0.5 text-xs font-semibold text-error-600 transition hover:bg-error-100 disabled:opacity-60 dark:text-error-400 dark:hover:bg-error-500/20"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gray-50 dark:bg-gray-800" />

        {/* Message body */}
        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {update.message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-50 bg-gray-50/50 px-5 py-2.5 dark:border-gray-800 dark:bg-gray-800/30">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {initials}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {update.created_by.first_name} {update.created_by.last_name}
            </span>
          </div>
          <time
            dateTime={update.created_at}
            title={formatFullDate(update.created_at)}
            className="text-xs text-gray-400 dark:text-gray-500"
          >
            {formatRelativeTime(update.created_at)}
          </time>
        </div>
      </div>
    </div>
  );
};

// ─── Add Update Form (right panel) ───────────────────────────────────────────

const STATUS_OPTS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface AddUpdateFormProps {
  current_status: OrderStatus;
  is_submitting: boolean;
  success_msg: string | null;
  error_msg: string | null;
  onSubmit: (payload: CreateOrderUpdatePayload) => Promise<void>;
}

const AddUpdateForm: React.FC<AddUpdateFormProps> = ({
  current_status,
  is_submitting,
  success_msg,
  error_msg,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [status_change, setStatusChange] = useState<OrderStatus>(current_status);
  const [send_email, setSendEmail] = useState(true);
  const [field_errors, setFieldErrors] = useState<{ title?: string; message?: string }>({});

  useEffect(() => {
    setStatusChange(current_status);
  }, [current_status]);

  function validate(): boolean {
    const errs: typeof field_errors = {};
    if (!title.trim()) errs.title = "Title is required.";
    if (!message.trim()) errs.message = "Message is required.";
    setFieldErrors(errs);
    return !Object.keys(errs).length;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ title: title.trim(), message: message.trim(), status_change, send_email });
    setTitle("");
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Feedback */}
      {success_msg && (
        <div className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400">
          <CheckCircleIcon />
          {success_msg}
        </div>
      )}
      {error_msg && (
        <div className="rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          {error_msg}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Update Title <span className="text-error-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (field_errors.title) setFieldErrors(p => ({ ...p, title: undefined })); }}
          placeholder="e.g. Links submitted to publishers"
          disabled={is_submitting}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:opacity-60 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
            field_errors.title ? "border-error-300 dark:border-error-500" : "border-gray-200 focus:border-brand-400 dark:border-gray-700"
          }`}
        />
        {field_errors.title && <p className="mt-1 text-xs text-error-600 dark:text-error-400">{field_errors.title}</p>}
      </div>

      {/* Message */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Message <span className="text-error-500">*</span>
        </label>
        <textarea
          rows={5}
          value={message}
          onChange={(e) => { setMessage(e.target.value); if (field_errors.message) setFieldErrors(p => ({ ...p, message: undefined })); }}
          placeholder="Describe what's happening with this order in detail…"
          disabled={is_submitting}
          className={`w-full resize-none rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:opacity-60 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
            field_errors.message ? "border-error-300 dark:border-error-500" : "border-gray-200 focus:border-brand-400 dark:border-gray-700"
          }`}
        />
        {field_errors.message && <p className="mt-1 text-xs text-error-600 dark:text-error-400">{field_errors.message}</p>}
      </div>

      {/* Status change */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Update Order Status
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTS.map((opt) => {
            const cfg = STATUS_CONFIG[opt.value];
            const is_selected = status_change === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusChange(opt.value)}
                disabled={is_submitting}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition disabled:opacity-60 ${
                  is_selected
                    ? `${cfg.badge} ${cfg.border} ring-1 ring-inset ${cfg.border}`
                    : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200 hover:bg-white dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
                {opt.value === current_status && (
                  <span className="ml-auto text-[10px] opacity-60">current</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Email toggle */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4 transition hover:bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10">
        <div className="flex h-5 items-center">
          <input
            type="checkbox"
            checked={send_email}
            onChange={(e) => setSendEmail(e.target.checked)}
            disabled={is_submitting}
            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-60"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-sky-700 dark:text-sky-400">
            <MailIcon />
            Notify client via email
          </div>
          <p className="mt-0.5 text-xs text-sky-600/80 dark:text-sky-500">
            An email with this update will be sent directly to the customer.
          </p>
        </div>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={is_submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:from-brand-600 hover:to-brand-700 disabled:opacity-60"
      >
        {is_submitting ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Posting update…
          </>
        ) : (
          <>
            <PlusIcon />
            Post Update
          </>
        )}
      </button>
    </form>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface AdminOrderTrackingContentProps {
  order_id: string;
}

const AdminOrderTrackingContent: React.FC<AdminOrderTrackingContentProps> = ({ order_id }) => {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [updates, setUpdates] = useState<OrderUpdate[]>([]);
  const [current_status, setCurrentStatus] = useState<OrderStatus>("pending");
  const [is_loading, setIsLoading] = useState(true);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [deleting_id, setDeletingId] = useState<string | null>(null);
  const [success_msg, setSuccessMsg] = useState<string | null>(null);
  const [error_msg, setErrorMsg] = useState<string | null>(null);
  const [load_error, setLoadError] = useState<string | null>(null);

  const timeline_ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [order_data, updates_data] = await Promise.all([
        getAdminOrder(order_id),
        listOrderUpdates(order_id),
      ]);
      setOrder(order_data);
      setCurrentStatus(order_data.status);
      setUpdates(updates_data.data);
    } catch {
      setLoadError("Failed to load order tracking data.");
    } finally {
      setIsLoading(false);
    }
  }, [order_id]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(payload: CreateOrderUpdatePayload) {
    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const new_update = await createOrderUpdate(order_id, payload);
      setUpdates((prev) => [new_update, ...prev]);
      if (payload.status_change && payload.status_change !== current_status) {
        setCurrentStatus(payload.status_change);
      }
      setSuccessMsg(
        payload.send_email
          ? "Update posted — email sent to client."
          : "Update posted successfully."
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      timeline_ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setErrorMsg("Could not post the update. Please try again.");
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(update_id: string) {
    setDeletingId(update_id);
    try {
      await deleteOrderUpdate(order_id, update_id);
      setUpdates((prev) => prev.filter((u) => u.id !== update_id));
    } catch {
      setErrorMsg("Could not delete the update.");
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setDeletingId(null);
    }
  }

  const days_since = order ? getDaysSince(order.created_at) : 0;
  const status_cfg = STATUS_CONFIG[current_status];

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (is_loading) {
    return (
      <div className="space-y-6">
        <Sk className="h-5 w-32" />
        <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <Sk className="mb-4 h-8 w-64" />
          <Sk className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-4 lg:col-span-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-5">
                <Sk className="h-10 w-10 shrink-0 rounded-full" />
                <Sk className="h-40 flex-1 rounded-2xl" />
              </div>
            ))}
          </div>
          <div className="col-span-12 lg:col-span-4">
            <Sk className="h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (load_error || !order) {
    return (
      <div className="space-y-4">
        <Link
          href={`/admin/orders/${order_id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200"
        >
          <BackIcon /> Back to Order
        </Link>
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-400">{load_error}</p>
          <button onClick={load} className="mt-3 text-sm font-medium text-error-600 underline dark:text-error-400">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href={`/admin/orders/${order_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        <BackIcon />
        Back to Order Details
      </Link>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {order.order_title || "Order Tracking"}
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status_cfg.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
                {status_cfg.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-mono text-gray-400 dark:text-gray-500">#{order.id.slice(0, 8).toUpperCase()}</span>
              {" "}·{" "}
              {order.user.first_name} {order.user.last_name}
              {" "}·{" "}
              Placed {formatShortDate(order.created_at)}
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Updates", value: updates.length },
              { label: "Days active", value: days_since === 0 ? "Today" : `${days_since}d` },
              { label: "Order value", value: formatCurrency(order.total_amount) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-center dark:border-gray-800 dark:bg-gray-800/50">
                <div className="text-base font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress steps */}
        <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
          <ProgressSteps status={current_status} />
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">

        {/* ── Timeline column ─────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-8" ref={timeline_ref}>
          {updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center dark:border-gray-700 dark:bg-white/[0.02]">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No updates posted yet</p>
              <p className="mt-1 max-w-sm text-sm text-gray-400 dark:text-gray-500">
                Use the form on the right to post the first update. The client will be notified by email.
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {/* Section label */}
              <div className="mb-5 flex items-center gap-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Activity Log
                </h2>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {updates.length} update{updates.length !== 1 ? "s" : ""}
                </span>
              </div>

              {updates.map((update, idx) => (
                <UpdateCard
                  key={update.id}
                  update={update}
                  index={idx}
                  total={updates.length}
                  on_delete={handleDelete}
                  is_deleting={deleting_id === update.id}
                />
              ))}

              {/* Order created entry */}
              <div className="flex gap-5">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 pb-2">
                  <div className="rounded-xl border border-dashed border-gray-100 bg-gray-50/50 px-5 py-3.5 dark:border-gray-800 dark:bg-gray-800/30">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Order placed by{" "}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {order.user.first_name} {order.user.last_name}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {formatFullDate(order.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky right panel ──────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-4">
          <div className="sticky top-6 space-y-4">
            {/* Add update form */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <PlusIcon />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  New Update
                </h3>
              </div>
              <div className="p-5">
                <AddUpdateForm
                  current_status={current_status}
                  is_submitting={is_submitting}
                  success_msg={success_msg}
                  error_msg={error_msg}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Order Summary</h3>
              </div>
              <dl className="divide-y divide-gray-50 dark:divide-gray-800">
                {[
                  { label: "Customer", value: `${order.user.first_name} ${order.user.last_name}` },
                  { label: "Email", value: order.user.email },
                  { label: "Items", value: `${order.items.length} item${order.items.length !== 1 ? "s" : ""}` },
                  { label: "Total", value: formatCurrency(order.total_amount) },
                  { label: "Placed", value: formatShortDate(order.created_at) },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3 px-5 py-2.5">
                    <dt className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{row.label}</dt>
                    <dd className="text-xs font-medium text-gray-800 text-right dark:text-white/80 truncate max-w-[160px]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="px-5 py-4 border-t border-gray-50 dark:border-gray-800">
                <Link
                  href={`/admin/orders/${order_id}`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  View full order details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderTrackingContent;
