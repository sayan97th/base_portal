"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import { linkBuildingService } from "@/services/client/link-building.service";
import { newContentService } from "@/services/client/new-content.service";
import { contentOptimizationService } from "@/services/client/content-optimization.service";
import { contentBriefsService } from "@/services/client/content-briefs.service";
import {
  getCheckoutSession,
  type CheckoutSession,
} from "@/lib/checkout-session";
import type { LinkBuildingOrderDetail } from "@/types/client/link-building";
import type { NewContentOrderDetail } from "@/types/client/new-content";
import type { ContentOptimizationOrderDetail } from "@/types/client/content-optimization";
import type { ContentBriefOrderDetail } from "@/types/client/content-briefs";
import type { CartProductType } from "@/types/client/unified-cart";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

interface ResolvedOrderSection {
  order_id: string;
  product_type: CartProductType;
  total_amount: number;
  status: string;
  lb_detail?: LinkBuildingOrderDetail;
  nc_detail?: NewContentOrderDetail;
  co_detail?: ContentOptimizationOrderDetail;
  cb_detail?: ContentBriefOrderDetail;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusConfig(status: string): {
  color: "warning" | "info" | "success" | "error";
  label: string;
  dot: string;
} {
  switch (status as OrderStatus) {
    case "pending":
      return { color: "warning", label: "Pending", dot: "bg-warning-500" };
    case "processing":
      return { color: "info", label: "Processing", dot: "bg-blue-light-500" };
    case "completed":
      return { color: "success", label: "Completed", dot: "bg-success-500" };
    case "cancelled":
      return { color: "error", label: "Cancelled", dot: "bg-error-500" };
    default:
      return { color: "info", label: status, dot: "bg-gray-400" };
  }
}

const PRODUCT_TYPE_CONFIG: Record<
  CartProductType,
  { label: string; color: string; bg: string; border: string }
> = {
  link_building: {
    label: "Link Building",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    border: "border-violet-200 dark:border-violet-500/30",
  },
  new_content: {
    label: "New Content",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/30",
  },
  content_optimization: {
    label: "Content Optimization",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/30",
  },
  content_brief: {
    label: "Content Briefs",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/30",
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BoltIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

// ─── Sub-section renderers ────────────────────────────────────────────────────

function LinkBuildingSection({ section }: { section: ResolvedOrderSection }) {
  const detail = section.lb_detail;
  const cfg = PRODUCT_TYPE_CONFIG.link_building;
  const status_cfg = getStatusConfig(section.status);

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${cfg.border}`}>
        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        <div className="flex items-center gap-2">
          <Badge
            variant="light"
            size="sm"
            color={status_cfg.color}
            startIcon={<span className={`inline-block h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />}
          >
            {status_cfg.label}
          </Badge>
          {section.status !== "cancelled" && (
            <Link
              href={`/link-building/orders/${section.order_id}/tracking`}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              <BoltIcon />
              Track
            </Link>
          )}
        </div>
      </div>

      {detail ? (
        <div className="divide-y divide-violet-100 dark:divide-violet-500/20">
          {detail.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between px-4 py-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {item.dr_tier.dr_label}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {item.quantity} link{item.quantity !== 1 ? "s" : ""} · {item.dr_tier.traffic_range} traffic
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {formatCurrency(item.subtotal)}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatCurrency(item.unit_price)} × {item.quantity}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Order #{section.order_id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {formatCurrency(section.total_amount)}
          </p>
        </div>
      )}

      <div className={`flex justify-end px-4 py-2 border-t ${cfg.border}`}>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Subtotal: {formatCurrency(section.total_amount)}
        </p>
      </div>
    </div>
  );
}

function GenericOrderSection({
  section,
  items,
}: {
  section: ResolvedOrderSection;
  items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    label: string;
    meta?: string;
  }>;
}) {
  const cfg = PRODUCT_TYPE_CONFIG[section.product_type];
  const status_cfg = getStatusConfig(section.status);

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${cfg.border}`}>
        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        <Badge
          variant="light"
          size="sm"
          color={status_cfg.color}
          startIcon={<span className={`inline-block h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />}
        >
          {status_cfg.label}
        </Badge>
      </div>

      {items && items.length > 0 ? (
        <div className={`divide-y divide-gray-100 dark:divide-gray-700`}>
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between px-4 py-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {item.label}
                </p>
                {item.meta && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {item.meta}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {formatCurrency(item.subtotal)}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatCurrency(item.unit_price)} × {item.quantity}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Order #{section.order_id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {formatCurrency(section.total_amount)}
          </p>
        </div>
      )}

      <div className={`flex justify-end px-4 py-2 border-t ${cfg.border}`}>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Subtotal: {formatCurrency(section.total_amount)}
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SessionSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
          {Array.from({ length: 2 }).map((__, j) => (
            <div key={j} className="flex justify-between px-4 py-3">
              <div className="h-4 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface OrderSessionPageProps {
  session_id: string;
}

const OrderSessionPage: React.FC<OrderSessionPageProps> = ({ session_id }) => {
  const router = useRouter();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [sections, setSections] = useState<ResolvedOrderSection[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [not_found, setNotFound] = useState(false);

  useEffect(() => {
    const loaded = getCheckoutSession(session_id);
    if (!loaded) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    setSession(loaded);

    const fetchDetails = async () => {
      const resolved: ResolvedOrderSection[] = await Promise.all(
        loaded.orders.map(async (order) => {
          const base: ResolvedOrderSection = {
            order_id: order.order_id,
            product_type: order.product_type,
            total_amount: order.total_amount,
            status: "pending",
          };

          try {
            if (order.product_type === "link_building") {
              const lb = await linkBuildingService.fetchLinkBuildingOrderDetail(order.order_id);
              return { ...base, status: lb.status, lb_detail: lb };
            }
            if (order.product_type === "new_content") {
              const nc = await newContentService.fetchOrderDetail(order.order_id);
              return { ...base, status: nc.status, nc_detail: nc };
            }
            if (order.product_type === "content_optimization") {
              const co = await contentOptimizationService.fetchOrderDetail(order.order_id);
              return { ...base, status: co.status, co_detail: co };
            }
            if (order.product_type === "content_brief") {
              const cb = await contentBriefsService.fetchOrderDetail(order.order_id);
              return { ...base, status: cb.status, cb_detail: cb };
            }
          } catch {
            // fallback: show summary-only section
          }
          return base;
        })
      );

      setSections(resolved);
      setIsLoading(false);
    };

    fetchDetails();
  }, [session_id]);

  if (not_found) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This order receipt is no longer available.
        </p>
        <Link
          href="/orders"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  const order_date = session ? formatDate(session.created_at) : "";
  const session_short = session_id.slice(0, 8).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            onClick={() => router.push("/orders")}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <BackIcon />
            Back to Orders
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-50 text-success-500 dark:bg-success-500/10">
              <CheckCircleIcon />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Order Receipt
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                #{session_short} · {order_date || "Loading…"}
              </p>
            </div>
          </div>
          {session?.order_title && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 ml-13">
              {session.order_title}
            </p>
          )}
        </div>

        <Link
          href="/store"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Order
        </Link>
      </div>

      {/* Order sections */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-6 pt-4 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Products Purchased
        </h2>

        {is_loading ? (
          <SessionSkeleton />
        ) : (
          <div className="space-y-4">
            {sections.map((section) => {
              if (section.product_type === "link_building") {
                return (
                  <LinkBuildingSection key={section.order_id} section={section} />
                );
              }

              if (section.product_type === "new_content" && section.nc_detail) {
                const items = section.nc_detail.items.map((item) => ({
                  id: item.id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  subtotal: item.subtotal,
                  label: item.tier.label,
                  meta: `${item.quantity} piece${item.quantity !== 1 ? "s" : ""} · ${item.tier.turnaround_time} turnaround`,
                }));
                return (
                  <GenericOrderSection key={section.order_id} section={section} items={items} />
                );
              }

              if (section.product_type === "content_optimization" && section.co_detail) {
                const items = section.co_detail.items.map((item) => ({
                  id: item.id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  subtotal: item.subtotal,
                  label: item.tier.label,
                  meta: `${item.quantity} page${item.quantity !== 1 ? "s" : ""} · ${item.tier.word_count_range} · ${item.tier.turnaround_days}d turnaround`,
                }));
                return (
                  <GenericOrderSection key={section.order_id} section={section} items={items} />
                );
              }

              if (section.product_type === "content_brief" && section.cb_detail) {
                const items = section.cb_detail.items.map((item) => ({
                  id: item.id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  subtotal: item.subtotal,
                  label: item.tier.label,
                  meta: `${item.quantity} brief${item.quantity !== 1 ? "s" : ""} · ${item.tier.turnaround_days}d turnaround`,
                }));
                return (
                  <GenericOrderSection key={section.order_id} section={section} items={items} />
                );
              }

              return (
                <GenericOrderSection key={section.order_id} section={section} />
              );
            })}
          </div>
        )}

        {/* Total row */}
        {!is_loading && session && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Total Paid
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(session.total_amount)}
            </p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {!is_loading && (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            View All Orders
          </Link>
          {sections.some((s) => s.product_type === "link_building") && (
            <Link
              href={`/link-building/orders/${sections.find((s) => s.product_type === "link_building")?.order_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              <BoltIcon />
              Track Link Building
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderSessionPage;
