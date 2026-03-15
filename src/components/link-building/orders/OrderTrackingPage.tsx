"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { LinkBuildingOrderDetail, OrderUpdateEntry, OrderStatus } from "@/types/client/link-building";
import { linkBuildingService } from "@/services/client/link-building.service";
import { fetchOrderUpdates } from "@/services/client/order-tracking.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function getDaysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STAGE_ORDER: OrderStatus[] = ["pending", "processing", "completed"];

type StageCfg = {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  ring: string;
  dot: string;
  glow: string;
};

const STAGE_CONFIG: Record<OrderStatus, StageCfg> = {
  pending: {
    label: "Order Received",
    description: "Your order has been placed and is awaiting review.",
    color: "text-warning-600 dark:text-warning-400",
    bg: "bg-warning-50 dark:bg-warning-500/10",
    ring: "ring-warning-300 dark:ring-warning-500/40",
    dot: "bg-warning-500",
    glow: "shadow-warning-500/20",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  processing: {
    label: "In Progress",
    description: "Our team is actively working on your link placements.",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    ring: "ring-blue-300 dark:ring-blue-500/40",
    dot: "bg-blue-500",
    glow: "shadow-blue-500/20",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  completed: {
    label: "Completed",
    description: "All link placements have been secured. Your order is done!",
    color: "text-success-600 dark:text-success-400",
    bg: "bg-success-50 dark:bg-success-500/10",
    ring: "ring-success-300 dark:ring-success-500/40",
    dot: "bg-success-500",
    glow: "shadow-success-500/20",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  cancelled: {
    label: "Cancelled",
    description: "This order has been cancelled.",
    color: "text-error-600 dark:text-error-400",
    bg: "bg-error-50 dark:bg-error-500/10",
    ring: "ring-error-300 dark:ring-error-500/40",
    dot: "bg-error-500",
    glow: "shadow-error-500/20",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Sk = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 ${className}`} />
);

// ─── Stage stepper ─────────────────────────────────────────────────────────────

interface StageStepperProps {
  status: OrderStatus;
}

const StageStepper: React.FC<StageStepperProps> = ({ status }) => {
  const is_cancelled = status === "cancelled";
  const active_idx = is_cancelled ? -1 : STAGE_ORDER.indexOf(status);
  const cfg = STAGE_CONFIG[status];

  return (
    <div>
      {/* Active stage hero */}
      <div className={`mb-6 flex items-center gap-4 rounded-2xl border p-5 ${cfg.bg} ${cfg.ring} ring-1`}>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg ${cfg.bg} ${cfg.glow} ${cfg.color}`}>
          {cfg.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-base font-bold ${cfg.color}`}>{cfg.label}</span>
            {status === "processing" && (
              <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-500" />
                Live
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{cfg.description}</p>
        </div>
      </div>

      {/* Step progression (non-cancelled) */}
      {!is_cancelled && (
        <div className="relative flex items-start justify-between px-2">
          {/* Track */}
          <div className="absolute left-8 right-8 top-5 h-0.5 bg-gray-100 dark:bg-gray-800" />
          <div
            className="absolute left-8 top-5 h-0.5 bg-gradient-to-r from-success-400 to-success-500 transition-all duration-700"
            style={{
              width: active_idx === 0 ? "0%" : active_idx === 1 ? "50%" : "calc(100% - 4rem)",
            }}
          />

          {STAGE_ORDER.map((stage, idx) => {
            const s = STAGE_CONFIG[stage];
            const is_done = idx < active_idx;
            const is_active = idx === active_idx;

            return (
              <div key={stage} className="relative z-10 flex flex-col items-center gap-2 px-1">
                <div
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                    is_done
                      ? "bg-success-500 text-white shadow-md shadow-success-500/25"
                      : is_active
                      ? `${s.bg} ${s.color} ring-2 ${s.ring} shadow-md ${s.glow}`
                      : "bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600"
                  }`}
                >
                  {is_done ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    s.icon
                  )}
                  {is_active && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
                  )}
                </div>
                <div className="text-center">
                  <div className={`text-xs font-semibold ${is_active ? s.color : is_done ? "text-success-600 dark:text-success-400" : "text-gray-400 dark:text-gray-600"}`}>
                    {s.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Timeline entry ────────────────────────────────────────────────────────────

interface TimelineEntryProps {
  entry: OrderUpdateEntry;
  is_last: boolean;
  index: number;
}

const TimelineEntry: React.FC<TimelineEntryProps> = ({ entry, is_last, index }) => {
  const status_cfg = entry.status_change ? STAGE_CONFIG[entry.status_change] : null;
  const is_latest = index === 0;

  return (
    <div className="flex gap-5">
      {/* Dot + line */}
      <div className="flex flex-col items-center">
        <div
          className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-950 transition-all ${
            is_latest
              ? "bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/20"
              : status_cfg
              ? `${status_cfg.bg} ${status_cfg.color} ring-offset-2 ${status_cfg.ring}`
              : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
          }`}
        >
          {is_latest ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          ) : status_cfg ? (
            status_cfg.icon
          ) : (
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 8 8">
              <circle cx="4" cy="4" r="3" />
            </svg>
          )}
          {is_latest && (
            <span className="absolute inset-0 rounded-full animate-ping bg-brand-400 opacity-30" />
          )}
        </div>
        {!is_last && (
          <div className="mt-1 w-0.5 flex-1 bg-gradient-to-b from-gray-200 to-transparent dark:from-gray-700" />
        )}
      </div>

      {/* Card */}
      <div className={`flex-1 ${is_last ? "pb-0" : "pb-8"}`}>
        <div
          className={`overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md ${
            is_latest
              ? "border-brand-100 bg-gradient-to-br from-white to-brand-50/30 dark:border-brand-500/20 dark:from-gray-900 dark:to-brand-500/5"
              : "border-gray-100 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
          }`}
        >
          {/* Pill header stripe */}
          {is_latest && (
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-1.5">
              <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">Latest Update</span>
            </div>
          )}

          <div className="px-5 py-4">
            {/* Header row */}
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{entry.title}</h4>
                {entry.status_change && status_cfg && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${status_cfg.bg} ${status_cfg.color} ${status_cfg.ring}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
                    {status_cfg.label}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <time className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {formatDate(entry.created_at)}
                </time>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatTime(entry.created_at)}
                </span>
              </div>
            </div>

            {/* Message */}
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {entry.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface OrderTrackingPageProps {
  order_id: string;
}

const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({ order_id }) => {
  const [order, setOrder] = useState<LinkBuildingOrderDetail | null>(null);
  const [updates, setUpdates] = useState<OrderUpdateEntry[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [order_data, updates_data] = await Promise.all([
          linkBuildingService.fetchLinkBuildingOrderDetail(order_id),
          fetchOrderUpdates(order_id),
        ]);
        setOrder(order_data);
        setUpdates(updates_data.data);
      } catch {
        setError("We couldn't load your order tracking information. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [order_id]);

  const days_active = order ? getDaysSince(order.created_at) : 0;

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (is_loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Sk className="h-5 w-36" />
        <Sk className="h-32 w-full rounded-2xl" />
        <Sk className="h-20 w-full rounded-2xl" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-5">
              <Sk className="h-9 w-9 shrink-0 rounded-full" />
              <Sk className="h-28 flex-1 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href={`/link-building/orders/${order_id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <BackIcon /> Back to Order
        </Link>
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm font-medium text-error-600 underline dark:text-error-400">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const total_links = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href={`/link-building/orders/${order_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <BackIcon />
        Back to Order Details
      </Link>

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Top gradient band */}
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />

        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {order.order_title ?? "Link Building Order"}
              </h1>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-mono text-gray-400 dark:text-gray-500">#{order.id.slice(0, 8).toUpperCase()}</span>
                {" "}·{" "}Placed {formatShortDate(order.created_at)}
              </p>
            </div>

            {/* Mini stats */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Updates", value: updates.length },
                { label: "Links", value: total_links },
                { label: days_active === 0 ? "Today" : `${days_active}d`, value: days_active === 0 ? "Placed" : "Active" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2 text-center dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stage stepper ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Order Status
        </h2>
        <StageStepper status={order.status} />
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Progress Updates
          </h2>
          {updates.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {updates.length} update{updates.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {updates.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center dark:border-gray-700 dark:bg-white/[0.02]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Updates coming soon
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-gray-400 dark:text-gray-500">
              Our team is reviewing your order. You'll receive an email as soon as there's any progress to share.
            </p>
          </div>
        ) : (
          <div>
            {updates.map((entry, idx) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                is_last={idx === updates.length - 1}
                index={idx}
              />
            ))}

            {/* Order placed anchor */}
            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 pb-2">
                <div className="rounded-xl border border-dashed border-gray-100 bg-gray-50/60 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/30">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Order placed</p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(order.created_at)} · {formatTime(order.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer note ────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 px-5 py-4 dark:border-brand-500/20 dark:bg-brand-500/5">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
        <p className="text-sm text-brand-700 dark:text-brand-400">
          You will receive an <strong>email notification</strong> every time our team posts a new update on your order.
        </p>
      </div>

      {/* ── Order details link ────────────────────────────────────────────────── */}
      <div className="flex justify-center pb-4">
        <Link
          href={`/link-building/orders/${order_id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
        >
          View Full Order Details
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
