"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  TrackingOrderSummary,
  OrderUpdate,
  CreateOrderUpdatePayload,
  OrderStatus,
  AdminOrderProductType,
} from "@/types/admin";
import {
  getTrackingOrder,
  listOrderUpdates,
  createOrderUpdate,
  deleteOrderUpdate,
  updateOrderStatus,
} from "@/services/admin/order-tracking.service";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeTime(iso: string): string {
  const diff_ms = Date.now() - new Date(iso).getTime();
  const diff_min = Math.floor(diff_ms / 60_000);
  if (diff_min < 1) return "just now";
  if (diff_min < 60) return `${diff_min}m ago`;
  const diff_h = Math.floor(diff_min / 60);
  if (diff_h < 24) return `${diff_h}h ago`;
  const diff_d = Math.floor(diff_h / 24);
  if (diff_d === 1) return "yesterday";
  if (diff_d < 7) return `${diff_d}d ago`;
  return formatShortDate(iso);
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ─── Product type config ───────────────────────────────────────────────────────

const PRODUCT_TYPE_CFG: Record<AdminOrderProductType, { label: string; badge: string; dot: string; full_view_url: (id: string) => string }> = {
  link_building: {
    label: "Link Building",
    badge: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20",
    dot: "bg-brand-500",
    full_view_url: (id) => `/admin/orders/${id}/tracking`,
  },
  new_content: {
    label: "New Content",
    badge: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20",
    dot: "bg-purple-500",
    full_view_url: (id) => `/admin/new-content/orders/${id}`,
  },
  content_optimization: {
    label: "Content Refresh",
    badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/20",
    dot: "bg-teal-500",
    full_view_url: (id) => `/admin/content-optimization/orders/${id}`,
  },
  content_brief: {
    label: "SME Content",
    badge: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20",
    dot: "bg-orange-500",
    full_view_url: (id) => `/admin/content-briefs/orders/${id}`,
  },
  content_refresh: {
    label: "Content Refresh",
    badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/20",
    dot: "bg-teal-500",
    full_view_url: (id) => `/admin/content-refresh/orders/${id}`,
  },
};

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<OrderStatus, { label: string; dot: string; badge: string; border_l: string }> = {
  new_request: {
    label: "New Request",
    dot: "bg-teal-500",
    badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/20",
    border_l: "border-l-teal-400",
  },
  pending: {
    label: "New Request",
    dot: "bg-teal-500",
    badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/20",
    border_l: "border-l-teal-400",
  },
  processing: {
    label: "Processing",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
    border_l: "border-l-blue-400",
  },
  completed: {
    label: "Completed",
    dot: "bg-success-500",
    badge: "bg-success-50 text-success-700 ring-success-200 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/20",
    border_l: "border-l-success-400",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-error-500",
    badge: "bg-error-50 text-error-700 ring-error-200 dark:bg-error-500/10 dark:text-error-400 dark:ring-error-500/20",
    border_l: "border-l-error-400",
  },
  payment_pending: {
    label: "Payment Pending",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    border_l: "border-l-amber-400",
  },
  pending_details: {
    label: "Pending Details",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    border_l: "border-l-amber-400",
  },
};

const UPDATE_STATUS_OPTS: OrderStatus[] = ["new_request", "processing", "completed", "cancelled"];
const FINALIZED_STATUSES: OrderStatus[] = ["completed", "cancelled"];

// ─── Icons ─────────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const MailIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const AlertIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const EmptyInboxIcon = () => (
  <svg className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.235 2.235 0 00-.1.661z" />
  </svg>
);

// ─── Skeleton ──────────────────────────────────────────────────────────────────

const Sk = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className ?? ""}`} />
);

// ─── Status Change Dialog ──────────────────────────────────────────────────────

interface StatusChangeDialogProps {
  is_open: boolean;
  order_title: string;
  current_status: OrderStatus;
  new_status: OrderStatus;
  is_loading: boolean;
  onConfirm: (notify_user: boolean) => void;
  onCancel: () => void;
}

const StatusChangeDialog: React.FC<StatusChangeDialogProps> = ({
  is_open, order_title, current_status, new_status, is_loading, onConfirm, onCancel,
}) => {
  const [notify_user, setNotifyUser] = useState(false);

  useEffect(() => {
    if (is_open) setNotifyUser(false);
  }, [is_open]);

  if (!is_open) return null;

  const from_cfg = STATUS_CFG[current_status];
  const to_cfg   = STATUS_CFG[new_status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!is_loading ? onCancel : undefined} />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400">
          <AlertIcon />
        </div>
        <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-white">Change order status</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          You are about to change the status of{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">{order_title || "this order"}</span>.
        </p>
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${from_cfg.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${from_cfg.dot}`} />{from_cfg.label}
          </span>
          <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${to_cfg.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${to_cfg.dot}`} />{to_cfg.label}
          </span>
        </div>
        <label className="mb-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={notify_user}
            onChange={(e) => setNotifyUser(e.target.checked)}
            disabled={is_loading}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60"
          />
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Notify client of this change</span>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              An email will be sent to the client informing them of the status change.
            </p>
          </div>
        </label>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={is_loading} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={() => onConfirm(notify_user)} disabled={is_loading} className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:bg-brand-600 disabled:opacity-60">
            {is_loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating…
              </span>
            ) : "Confirm change"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Update Form ───────────────────────────────────────────────────────────────

interface UpdateFormProps {
  current_status: OrderStatus;
  is_submitting: boolean;
  onSubmit: (payload: CreateOrderUpdatePayload) => Promise<void>;
}

const UpdateForm: React.FC<UpdateFormProps> = ({ current_status, is_submitting, onSubmit }) => {
  const [title, setTitle]               = useState("");
  const [message, setMessage]           = useState("");
  const [status_change, setStatusChange] = useState<OrderStatus>(current_status);
  const [send_email, setSendEmail]       = useState(true);
  const [errors, setErrors]             = useState<{ title?: string; message?: string }>({});

  useEffect(() => { setStatusChange(current_status); }, [current_status]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!title.trim()) e.title = "Required";
    if (!message.trim()) e.message = "Required";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ title: title.trim(), message: message.trim(), status_change, send_email });
    setTitle("");
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((p) => ({ ...p, title: undefined })); }}
          placeholder="Update title…"
          disabled={is_submitting}
          className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
            errors.title ? "border-error-300 dark:border-error-500" : "border-gray-200 focus:border-brand-400 dark:border-gray-700"
          }`}
        />
        {errors.title && <p className="mt-0.5 text-xs text-error-500">{errors.title}</p>}
      </div>

      <div>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => { setMessage(e.target.value); if (errors.message) setErrors((p) => ({ ...p, message: undefined })); }}
          placeholder="Describe what's happening with this order…"
          disabled={is_submitting}
          className={`w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
            errors.message ? "border-error-300 dark:border-error-500" : "border-gray-200 focus:border-brand-400 dark:border-gray-700"
          }`}
        />
        {errors.message && <p className="mt-0.5 text-xs text-error-500">{errors.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {UPDATE_STATUS_OPTS.map((s) => {
          const c = STATUS_CFG[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusChange(s)}
              disabled={is_submitting}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                status_change === s
                  ? `${c.badge} ring-1 border-transparent`
                  : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-white dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${c.dot}`} />
              {c.label}
              {s === current_status && <span className="ml-auto text-[9px] opacity-50">now</span>}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={send_email}
            onChange={(e) => setSendEmail(e.target.checked)}
            disabled={is_submitting}
            className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60"
          />
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <MailIcon />
            Notify client
          </span>
        </label>

        <button
          type="submit"
          disabled={is_submitting}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/25 transition hover:bg-brand-600 disabled:opacity-60"
        >
          {is_submitting ? (
            <>
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Posting…
            </>
          ) : (
            <><PlusIcon />Post Update</>
          )}
        </button>
      </div>
    </form>
  );
};

// ─── Status Changer (for finalized orders) ────────────────────────────────────

interface StatusChangerProps {
  current_status: OrderStatus;
  onRequestChange: (new_status: OrderStatus) => void;
}

const StatusChanger: React.FC<StatusChangerProps> = ({ current_status, onRequestChange }) => {
  const [selected, setSelected] = useState<OrderStatus>(current_status);

  useEffect(() => { setSelected(current_status); }, [current_status]);

  const other_statuses = UPDATE_STATUS_OPTS.filter((s) => s !== current_status);

  return (
    <div className="rounded-xl border border-warning-200 bg-warning-50/60 p-4 dark:border-warning-500/20 dark:bg-warning-500/[0.06]">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-warning-600 dark:text-warning-400"><AlertIcon /></span>
        <p className="text-xs font-semibold text-warning-800 dark:text-warning-300">
          This order is{" "}
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ${STATUS_CFG[current_status].badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CFG[current_status].dot}`} />
            {STATUS_CFG[current_status].label}
          </span>
          . You can reopen it by changing the status.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Change to:</span>
        <div className="flex flex-wrap gap-1.5">
          {other_statuses.map((s) => {
            const c = STATUS_CFG[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelected(s)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  selected === s
                    ? `${c.badge} ring-1 border-transparent`
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${c.dot}`} />{c.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onRequestChange(selected)}
          disabled={selected === current_status}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600 disabled:opacity-40"
        >
          Apply change
        </button>
      </div>
    </div>
  );
};

// ─── Timeline Item ─────────────────────────────────────────────────────────────

interface TimelineItemProps {
  update: OrderUpdate;
  is_last: boolean;
  on_delete: (id: string) => void;
  is_deleting: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ update, is_last, on_delete, is_deleting }) => {
  const [confirm, setConfirm] = useState(false);
  const cfg      = update.status_change ? STATUS_CFG[update.status_change] : null;
  const initials = `${update.created_by.first_name[0]}${update.created_by.last_name[0]}`.toUpperCase();

  return (
    <div className="group relative flex gap-3">
      {!is_last && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-100 dark:bg-gray-800" />
      )}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
        {initials}
      </div>
      <div className={`flex-1 ${is_last ? "" : "pb-5"}`}>
        <div className="rounded-xl border border-gray-100 bg-white p-3.5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-1.5 flex flex-wrap items-start justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">{update.title}</span>
              {cfg && (
                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${cfg.badge}`}>
                  <span className={`h-1 w-1 rounded-full ${update.status_change ? STATUS_CFG[update.status_change].dot : ""}`} />
                  {cfg.label}
                </span>
              )}
              {update.send_email && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20">
                  <MailIcon />sent
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <time title={formatFullDate(update.created_at)} className="text-[10px] text-gray-400 dark:text-gray-500">
                {formatRelativeTime(update.created_at)}
              </time>
              {!confirm ? (
                <button
                  onClick={() => setConfirm(true)}
                  className="hidden rounded p-0.5 text-gray-300 hover:bg-error-50 hover:text-error-500 group-hover:block dark:text-gray-700 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                >
                  <TrashIcon />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button onClick={() => on_delete(update.id)} disabled={is_deleting} className="text-[10px] font-semibold text-error-500 hover:underline disabled:opacity-60">Yes</button>
                  <span className="text-gray-300">/</span>
                  <button onClick={() => setConfirm(false)} className="text-[10px] text-gray-400 hover:underline">No</button>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{update.message}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface AdminOrderTrackingDetailProps {
  order_id: string;
}

const AdminOrderTrackingDetail: React.FC<AdminOrderTrackingDetailProps> = ({ order_id }) => {
  const router = useRouter();

  const [order, setOrder]               = useState<TrackingOrderSummary | null>(null);
  const [current_status, setCurrentStatus] = useState<OrderStatus>("pending");
  const [updates, setUpdates]           = useState<OrderUpdate[]>([]);
  const [is_loading_order, setIsLoadingOrder]   = useState(true);
  const [is_loading_updates, setIsLoadingUpdates] = useState(true);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [deleting_id, setDeletingId]    = useState<string | null>(null);
  const [feedback, setFeedback]         = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [order_error, setOrderError]    = useState<string | null>(null);
  const [dialog_open, setDialogOpen]    = useState(false);
  const [dialog_new_status, setDialogNewStatus] = useState<OrderStatus>("pending");
  const [dialog_loading, setDialogLoading] = useState(false);

  useEffect(() => {
    setIsLoadingOrder(true);
    setOrderError(null);
    getTrackingOrder(order_id)
      .then((res) => {
        setOrder(res.data);
        setCurrentStatus(res.data.status);
      })
      .catch(() => setOrderError("Order not found or could not be loaded."))
      .finally(() => setIsLoadingOrder(false));
  }, [order_id]);

  useEffect(() => {
    setIsLoadingUpdates(true);
    listOrderUpdates(order_id)
      .then((res) => setUpdates(res.data))
      .catch(() => setFeedback({ type: "error", msg: "Could not load updates." }))
      .finally(() => setIsLoadingUpdates(false));
  }, [order_id]);

  const showFeedback = useCallback((type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  async function handleSubmit(payload: CreateOrderUpdatePayload) {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const new_update   = await createOrderUpdate(order_id, payload);
      const next_updates = [new_update, ...updates];
      setUpdates(next_updates);
      if (payload.status_change && payload.status_change !== current_status) {
        setCurrentStatus(payload.status_change);
        setOrder((prev) => prev ? { ...prev, status: payload.status_change as OrderStatus } : prev);
      }
      showFeedback("success", payload.send_email ? "Update posted — client notified." : "Update posted.");
    } catch {
      showFeedback("error", "Failed to post update. Try again.");
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
      showFeedback("error", "Could not delete update.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleRequestStatusChange(new_status: OrderStatus) {
    setDialogNewStatus(new_status);
    setDialogOpen(true);
  }

  async function handleConfirmStatusChange(notify_user: boolean) {
    setDialogLoading(true);
    try {
      await updateOrderStatus(order_id, dialog_new_status, notify_user);
      setCurrentStatus(dialog_new_status);
      setOrder((prev) => prev ? { ...prev, status: dialog_new_status } : prev);
      setDialogOpen(false);
      showFeedback(
        "success",
        notify_user
          ? `Status changed to ${STATUS_CFG[dialog_new_status].label} — client notified.`
          : `Status changed to ${STATUS_CFG[dialog_new_status].label}.`
      );
    } catch {
      showFeedback("error", "Failed to update status. Try again.");
    } finally {
      setDialogLoading(false);
    }
  }

  const is_finalized = FINALIZED_STATUSES.includes(current_status);

  // ── Render: loading ─────────────────────────────────────────────────────────

  if (is_loading_order) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <Sk className="h-8 w-8 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Sk className="h-5 w-64" />
            <Sk className="h-3 w-40" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <Sk className="h-28 rounded-2xl" />
          <Sk className="h-48 rounded-2xl" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Sk className="h-8 w-8 shrink-0 rounded-full" />
              <Sk className="h-20 flex-1 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render: error ───────────────────────────────────────────────────────────

  if (order_error || !order) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-2 text-sm text-error-600 dark:text-error-400">{order_error ?? "Order not found."}</p>
        <button onClick={() => router.push("/admin/tracking")} className="text-sm font-medium text-brand-500 underline hover:text-brand-600">
          ← Back to Order Tracking
        </button>
      </div>
    );
  }

  const product_cfg = PRODUCT_TYPE_CFG[order.product_type];
  const cfg         = STATUS_CFG[current_status];

  return (
    <>
      <StatusChangeDialog
        is_open={dialog_open}
        order_title={order.order_title ?? product_cfg.label + " Order"}
        current_status={current_status}
        new_status={dialog_new_status}
        is_loading={dialog_loading}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setDialogOpen(false)}
      />

      <div className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

        {/* ── Top bar ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start gap-4">
            {/* Back button */}
            <Link
              href="/admin/tracking"
              className="mt-0.5 flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <BackIcon />
              Back
            </Link>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-bold text-gray-900 dark:text-white">
                  {order.order_title || product_cfg.label + " Order"}
                </h1>
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cfg.badge}`}>
                  {current_status === "processing" ? (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                    </span>
                  ) : (
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  )}
                  {cfg.label}
                </span>
                {/* Product badge */}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${product_cfg.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${product_cfg.dot}`} />
                  {product_cfg.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
                {" · "}{order.user.first_name} {order.user.last_name}
                {" · "}<span className="text-gray-400">{order.user.email}</span>
              </p>
            </div>
          </div>

          {/* Stats + full view */}
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              {[
                { label: "updates", value: updates.length },
                { label: "items",   value: order.items_count },
                { label: "total",   value: formatCurrency(order.total_amount) },
                { label: "placed",  value: formatShortDate(order.created_at) },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-center dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="text-xs font-bold text-gray-800 dark:text-white">{s.value}</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
            <Link
              href={product_cfg.full_view_url(order.id)}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ExternalLinkIcon />
              Full view
            </Link>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Update form panel ───────────────────────────────────────────── */}
          <div className="w-full max-w-lg shrink-0 overflow-y-auto border-r border-gray-100 dark:border-gray-800">
            <div className="p-5">
              {/* Status changer for finalized orders */}
              {is_finalized && (
                <div className="mb-5">
                  <StatusChanger current_status={current_status} onRequestChange={handleRequestStatusChange} />
                </div>
              )}

              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <PlusIcon />
                </div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Post New Update
                </h2>
              </div>

              {feedback && (
                <div className={`mb-4 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                  feedback.type === "success"
                    ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400"
                    : "border-error-200 bg-error-50 text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400"
                }`}>
                  {feedback.msg}
                </div>
              )}

              <UpdateForm
                current_status={current_status}
                is_submitting={is_submitting}
                onSubmit={handleSubmit}
              />
            </div>
          </div>

          {/* ── Activity timeline ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Activity Log
              </h2>
              {updates.length > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {updates.length} update{updates.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {is_loading_updates ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Sk className="h-8 w-8 shrink-0 rounded-full" />
                    <Sk className="h-20 flex-1 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : updates.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <EmptyInboxIcon />
                <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">No updates yet</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Post the first update to keep the client informed.
                </p>
              </div>
            ) : (
              <div>
                {updates.map((u, idx) => (
                  <TimelineItem
                    key={u.id}
                    update={u}
                    is_last={idx === updates.length - 1}
                    on_delete={handleDelete}
                    is_deleting={deleting_id === u.id}
                  />
                ))}
                {/* Order placed marker */}
                <div className="mt-2 flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-600">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 rounded-xl border border-dashed border-gray-100 bg-gray-50/60 px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-800/30">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Order placed</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{formatFullDate(order.created_at)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminOrderTrackingDetail;
