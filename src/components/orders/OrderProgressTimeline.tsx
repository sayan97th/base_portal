"use client";

import React, { useEffect, useState } from "react";
import type { OrderUpdateEntry, OrderStatus } from "@/types/client/link-building";
import { fetchOrderUpdates } from "@/services/client/order-tracking.service";

interface OrderProgressTimelineProps {
  order_id: string;
  current_status: OrderStatus;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; ring: string; bg: string; text: string }
> = {
  pending: {
    label: "Pending",
    ring: "ring-warning-400",
    bg: "bg-warning-50 dark:bg-warning-500/10",
    text: "text-warning-700 dark:text-warning-400",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  processing: {
    label: "Processing",
    ring: "ring-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  completed: {
    label: "Completed",
    ring: "ring-success-400",
    bg: "bg-success-50 dark:bg-success-500/10",
    text: "text-success-700 dark:text-success-400",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  cancelled: {
    label: "Cancelled",
    ring: "ring-error-400",
    bg: "bg-error-50 dark:bg-error-500/10",
    text: "text-error-700 dark:text-error-400",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const ORDER_STAGES: OrderStatus[] = ["pending", "processing", "completed"];

function getStageProgress(status: OrderStatus): number {
  if (status === "cancelled") return -1;
  return ORDER_STAGES.indexOf(status);
}

interface StageStepProps {
  stage: OrderStatus;
  index: number;
  progress: number;
}

const StageStep: React.FC<StageStepProps> = ({ stage, index, progress }) => {
  const config = STATUS_CONFIG[stage];
  const is_completed = index < progress;
  const is_active = index === progress;
  const is_upcoming = index > progress;

  return (
    <div className="flex flex-1 flex-col items-center">
      <div
        className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all ${
          is_completed
            ? "bg-success-500 text-white shadow-sm shadow-success-200 dark:shadow-success-500/20"
            : is_active
            ? `ring-2 ${config.ring} ${config.bg} ${config.text}`
            : "bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600"
        }`}
      >
        {is_completed ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          config.icon
        )}
        {is_active && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 animate-ping rounded-full bg-current opacity-40" />
        )}
      </div>
      <span
        className={`mt-1.5 text-center text-xs font-medium ${
          is_active
            ? config.text
            : is_completed
            ? "text-success-600 dark:text-success-400"
            : "text-gray-400 dark:text-gray-600"
        }`}
      >
        {config.label}
      </span>
    </div>
  );
};

const SkeletonTimeline = () => (
  <div className="space-y-4">
    {[1, 2].map((i) => (
      <div key={i} className="flex gap-4 animate-pulse">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="mt-1 h-16 w-px bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="flex-1 pb-4">
          <div className="space-y-2">
            <div className="h-4 w-48 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

interface TimelineEntryProps {
  entry: OrderUpdateEntry;
  is_last: boolean;
}

const TimelineEntry: React.FC<TimelineEntryProps> = ({ entry, is_last }) => {
  const status_cfg = entry.status_change ? STATUS_CONFIG[entry.status_change] : null;

  return (
    <div className="flex gap-4">
      {/* Dot + line */}
      <div className="flex flex-col items-center">
        <div
          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-950 ${
            status_cfg
              ? `${status_cfg.bg} ${status_cfg.text} ring-offset-1`
              : "bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400"
          }`}
        >
          {status_cfg ? (
            status_cfg.icon
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          )}
        </div>
        {!is_last && <div className="mt-1 w-px flex-1 bg-gray-100 dark:bg-gray-800" />}
      </div>

      {/* Content card */}
      <div className={`flex-1 ${is_last ? "" : "pb-6"}`}>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {entry.title}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5">
              {entry.status_change && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${status_cfg?.bg} ${status_cfg?.text}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {STATUS_CONFIG[entry.status_change].label}
                </span>
              )}
              <time className="text-xs text-gray-400 dark:text-gray-500">
                {formatDate(entry.created_at)} · {formatTime(entry.created_at)}
              </time>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {entry.message}
          </p>
        </div>
      </div>
    </div>
  );
};

const OrderProgressTimeline: React.FC<OrderProgressTimelineProps> = ({
  order_id,
  current_status,
}) => {
  const [updates, setUpdates] = useState<OrderUpdateEntry[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchOrderUpdates(order_id);
        setUpdates(res.data);
      } catch {
        setError("Unable to load order updates.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [order_id]);

  const progress = getStageProgress(current_status);
  const is_cancelled = current_status === "cancelled";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          Order Progress
        </h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Real-time updates from our team as your order moves forward.
        </p>
      </div>

      {/* Progress Bar */}
      {!is_cancelled ? (
        <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800">
          <div className="relative flex items-start justify-between">
            {/* Connecting track */}
            <div className="absolute left-4 right-4 top-4 h-0.5 bg-gray-100 dark:bg-gray-800" />
            <div
              className="absolute left-4 top-4 h-0.5 bg-success-400 transition-all duration-700 dark:bg-success-500"
              style={{
                width:
                  progress === 0
                    ? "0%"
                    : progress === 1
                    ? "50%"
                    : "calc(100% - 2rem)",
              }}
            />
            {ORDER_STAGES.map((stage, idx) => (
              <StageStep key={stage} stage={stage} index={idx} progress={progress} />
            ))}
          </div>
        </div>
      ) : (
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2 rounded-lg bg-error-50 px-3.5 py-2.5 dark:bg-error-500/10">
            <svg className="h-4 w-4 shrink-0 text-error-500 dark:text-error-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-error-700 dark:text-error-400">
              This order has been cancelled.
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="px-5 py-5">
        {is_loading ? (
          <SkeletonTimeline />
        ) : error ? (
          <div className="rounded-lg border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        ) : updates.length === 0 ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Your order is being reviewed
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Updates will appear here once our team starts processing your order.
            </p>
          </div>
        ) : (
          <div>
            {updates.map((entry, idx) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                is_last={idx === updates.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      {!is_loading && !error && (
        <div className="border-t border-gray-50 px-5 py-3 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            You will receive an email notification each time a new update is posted.
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderProgressTimeline;
