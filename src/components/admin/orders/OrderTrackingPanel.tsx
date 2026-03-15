"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { OrderUpdate, CreateOrderUpdatePayload } from "@/types/admin";
import type { OrderStatus } from "@/types/admin";
import {
  listOrderUpdates,
  createOrderUpdate,
  deleteOrderUpdate,
} from "@/services/admin/order-tracking.service";
import AddOrderUpdateModal from "./AddOrderUpdateModal";

interface OrderTrackingPanelProps {
  order_id: string;
  current_status: OrderStatus;
  onStatusChange?: (new_status: OrderStatus) => void;
}

function formatRelativeTime(iso: string): string {
  const diff_ms = Date.now() - new Date(iso).getTime();
  const diff_min = Math.floor(diff_ms / 60_000);
  if (diff_min < 1) return "just now";
  if (diff_min < 60) return `${diff_min}m ago`;
  const diff_h = Math.floor(diff_min / 60);
  if (diff_h < 24) return `${diff_h}h ago`;
  const diff_d = Math.floor(diff_h / 24);
  if (diff_d < 7) return `${diff_d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_PILL: Record<OrderStatus, string> = {
  pending: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  processing: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  completed: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  cancelled: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
};

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const MailSentIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

interface UpdateItemProps {
  update: OrderUpdate;
  on_delete: (id: string) => void;
  is_deleting: boolean;
}

const UpdateItem: React.FC<UpdateItemProps> = ({ update, on_delete, is_deleting }) => {
  const [show_confirm, setShowConfirm] = useState(false);
  const initials = `${update.created_by.first_name[0]}${update.created_by.last_name[0]}`.toUpperCase();

  return (
    <div className="group relative flex gap-4">
      {/* Timeline line */}
      <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-100 group-last:hidden dark:bg-gray-800" />

      {/* Avatar */}
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-brand-100 text-xs font-bold text-brand-700 dark:border-gray-900 dark:bg-brand-500/20 dark:text-brand-400">
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          {/* Top row */}
          <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {update.title}
              </span>
              {update.status_change && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_PILL[update.status_change]}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {update.status_change}
                </span>
              )}
              {update.send_email && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                  <MailSentIcon />
                  Email sent
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <time
                dateTime={update.created_at}
                title={formatFullDate(update.created_at)}
                className="text-xs text-gray-400 dark:text-gray-500"
              >
                {formatRelativeTime(update.created_at)}
              </time>
              {/* Delete button */}
              {!show_confirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="hidden rounded-md p-1 text-gray-300 transition-colors hover:bg-error-50 hover:text-error-500 group-hover:flex dark:text-gray-600 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                  title="Delete update"
                >
                  <TrashIcon />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Delete?</span>
                  <button
                    onClick={() => on_delete(update.id)}
                    disabled={is_deleting}
                    className="rounded px-1.5 py-0.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 disabled:opacity-60 dark:text-error-400 dark:hover:bg-error-500/10"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {update.message}
          </p>

          {/* Footer: Author */}
          <div className="mt-3 flex items-center gap-1.5 border-t border-gray-50 pt-2.5 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Posted by{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {update.created_by.first_name} {update.created_by.last_name}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SkeletonUpdate = () => (
  <div className="flex gap-4">
    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
    <div className="flex-1 space-y-2 pb-6">
      <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-3 flex gap-2">
          <div className="h-4 w-48 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-4 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-3 w-4/5 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  </div>
);

const OrderTrackingPanel: React.FC<OrderTrackingPanelProps> = ({
  order_id,
  current_status,
  onStatusChange,
}) => {
  const [updates, setUpdates] = useState<OrderUpdate[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [is_modal_open, setIsModalOpen] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [deleting_id, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success_msg, setSuccessMsg] = useState<string | null>(null);

  const loadUpdates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listOrderUpdates(order_id);
      setUpdates(response.data);
    } catch {
      setError("Failed to load order updates.");
    } finally {
      setIsLoading(false);
    }
  }, [order_id]);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  async function handleSubmit(payload: CreateOrderUpdatePayload) {
    setIsSubmitting(true);
    try {
      const new_update = await createOrderUpdate(order_id, payload);
      setUpdates((prev) => [new_update, ...prev]);
      if (payload.status_change && payload.status_change !== current_status) {
        onStatusChange?.(payload.status_change);
      }
      setIsModalOpen(false);
      setSuccessMsg(
        payload.send_email
          ? "Update posted and email sent to client."
          : "Update posted successfully."
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setError("Failed to post update. Please try again.");
      setTimeout(() => setError(null), 4000);
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
      setError("Failed to delete update.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-brand-500 dark:text-brand-400">
              <ActivityIcon />
            </span>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Order Activity
            </h3>
            {updates.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {updates.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-600"
          >
            <PlusIcon />
            Add Update
          </button>
        </div>

        {/* Notifications */}
        <div className="px-5 pt-3 empty:pt-0">
          {success_msg && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-success-200 bg-success-50 px-3.5 py-2.5 text-sm text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success_msg}
            </div>
          )}
          {error && (
            <div className="mb-3 rounded-lg border border-error-200 bg-error-50 px-3.5 py-2.5 text-sm text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {is_loading ? (
            <div className="space-y-0">
              <SkeletonUpdate />
              <SkeletonUpdate />
            </div>
          ) : updates.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <ActivityIcon />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                No updates yet
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Post the first update to let the client know their order is in motion.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
              >
                <PlusIcon />
                Post first update
              </button>
            </div>
          ) : (
            <div className="space-y-0">
              {updates.map((update) => (
                <UpdateItem
                  key={update.id}
                  update={update}
                  on_delete={handleDelete}
                  is_deleting={deleting_id === update.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddOrderUpdateModal
        is_open={is_modal_open}
        is_submitting={is_submitting}
        current_status={current_status}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default OrderTrackingPanel;
