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

interface NormalizedItem {
  id: string;
  label: string;
  meta: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
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
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon_bg: string;
    icon_color: string;
    divider: string;
  }
> = {
  link_building: {
    label: "Link Building",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    border: "border-violet-200 dark:border-violet-500/30",
    icon_bg: "bg-violet-100 dark:bg-violet-500/20",
    icon_color: "text-violet-600 dark:text-violet-400",
    divider: "divide-violet-100 dark:divide-violet-500/20",
  },
  new_content: {
    label: "New Content",
    color: "text-gray-700 dark:text-gray-300",
    bg: "bg-gray-50 dark:bg-gray-800/50",
    border: "border-gray-200 dark:border-gray-700",
    icon_bg: "bg-gray-100 dark:bg-gray-700",
    icon_color: "text-gray-500 dark:text-gray-400",
    divider: "divide-gray-100 dark:divide-gray-700/60",
  },
  content_optimization: {
    label: "Content Optimization",
    color: "text-gray-700 dark:text-gray-300",
    bg: "bg-gray-50 dark:bg-gray-800/50",
    border: "border-gray-200 dark:border-gray-700",
    icon_bg: "bg-gray-100 dark:bg-gray-700",
    icon_color: "text-gray-500 dark:text-gray-400",
    divider: "divide-gray-100 dark:divide-gray-700/60",
  },
  content_brief: {
    label: "Content Briefs",
    color: "text-gray-700 dark:text-gray-300",
    bg: "bg-gray-50 dark:bg-gray-800/50",
    border: "border-gray-200 dark:border-gray-700",
    icon_bg: "bg-gray-100 dark:bg-gray-700",
    icon_color: "text-gray-500 dark:text-gray-400",
    divider: "divide-gray-100 dark:divide-gray-700/60",
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className ?? "h-6 w-6"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BoltIcon = ({ className }: { className?: string }) => (
  <svg className={className ?? "h-3.5 w-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const DocumentTextIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const PRODUCT_ICONS: Record<CartProductType, React.FC> = {
  link_building: LinkIcon,
  new_content: DocumentTextIcon,
  content_optimization: SparklesIcon,
  content_brief: ClipboardIcon,
};

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({ item, divider_class }: { item: NormalizedItem; divider_class: string }) {
  return (
    <div className={`grid grid-cols-12 items-start gap-3 px-5 py-3.5 border-t ${divider_class}`}>
      <div className="col-span-7 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
          {item.label}
        </p>
        {item.meta && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {item.meta}
          </p>
        )}
      </div>
      <div className="col-span-2 text-center">
        <span className="inline-flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
          ×{item.quantity}
        </span>
      </div>
      <div className="col-span-3 text-right shrink-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {formatCurrency(item.subtotal)}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">
          {formatCurrency(item.unit_price)} ea.
        </p>
      </div>
    </div>
  );
}

// ─── Column Header ────────────────────────────────────────────────────────────

function ItemsTableHeader({ border_class }: { border_class: string }) {
  return (
    <div className={`grid grid-cols-12 items-center gap-3 px-5 py-2 border-t ${border_class} bg-black/2 dark:bg-white/2`}>
      <div className="col-span-7">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Item
        </span>
      </div>
      <div className="col-span-2 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Qty
        </span>
      </div>
      <div className="col-span-3 text-right">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Amount
        </span>
      </div>
    </div>
  );
}

// ─── Product Section Card ─────────────────────────────────────────────────────

function ProductSectionCard({
  section,
  items,
  track_href,
}: {
  section: ResolvedOrderSection;
  items?: NormalizedItem[];
  track_href?: string;
}) {
  const cfg = PRODUCT_TYPE_CONFIG[section.product_type];
  const status_cfg = getStatusConfig(section.status);
  const ProductIcon = PRODUCT_ICONS[section.product_type];
  const order_ref = `#${section.order_id.slice(0, 8).toUpperCase()}`;

  return (
    <div className={`rounded-xl border ${cfg.border} overflow-hidden`}>
      {/* Card Header */}
      <div className={`flex items-center justify-between px-5 py-3.5 ${cfg.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.icon_bg} ${cfg.icon_color}`}>
            <ProductIcon />
          </div>
          <div>
            <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{order_ref}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge
            variant="light"
            size="sm"
            color={status_cfg.color}
            startIcon={
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${status_cfg.dot}`} />
            }
          >
            {status_cfg.label}
          </Badge>
          {track_href && section.status !== "cancelled" && (
            <Link
              href={track_href}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
            >
              <BoltIcon />
              Track Order
            </Link>
          )}
        </div>
      </div>

      {/* Items */}
      {items && items.length > 0 ? (
        <>
          <ItemsTableHeader border_class={cfg.border} />
          <div className="bg-white dark:bg-gray-900/30">
            {items.map((item, index) => (
              <ItemRow key={`${item.id}-${index}`} item={item} divider_class={cfg.border} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/30">
          <p className="text-sm text-gray-500 dark:text-gray-400">{order_ref}</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {formatCurrency(section.total_amount)}
          </p>
        </div>
      )}

      {/* Section Subtotal */}
      <div className={`flex items-center justify-between px-5 py-3 border-t ${cfg.border} ${cfg.bg}`}>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {cfg.label} Subtotal
        </span>
        <span className={`text-sm font-bold ${cfg.color}`}>
          {formatCurrency(section.total_amount)}
        </span>
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
          <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-2.5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="flex justify-between px-5 py-2 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
            {["w-10", "w-8", "w-12"].map((w, j) => (
              <div key={j} className={`h-2.5 ${w} animate-pulse rounded bg-gray-200 dark:bg-gray-700`} />
            ))}
          </div>
          {Array.from({ length: 2 }).map((__, j) => (
            <div key={j} className="grid grid-cols-12 gap-3 px-5 py-3.5 border-t border-gray-100 dark:border-gray-800">
              <div className="col-span-7 space-y-1.5">
                <div className="h-3.5 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-2.5 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="col-span-2 flex justify-center">
                <div className="h-5 w-8 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="col-span-3 space-y-1.5 flex flex-col items-end">
                <div className="h-3.5 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-2.5 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-between">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
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
    const fetchDetails = async () => {
      const loaded = getCheckoutSession(session_id);
      if (!loaded) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      setSession(loaded);

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

    void fetchDetails();
  }, [session_id]);

  if (not_found) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-white/3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">
          Receipt Not Available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          This order receipt is no longer available or may have expired.
        </p>
        <Link
          href="/orders"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
        >
          View My Orders
          <ArrowRightIcon />
        </Link>
      </div>
    );
  }

  const order_date = session ? formatDate(session.created_at) : "";
  const order_time = session ? formatTime(session.created_at) : "";
  const session_short = session_id.slice(0, 8).toUpperCase();
  const lb_section = sections.find((s) => s.product_type === "link_building");

  const resolvedItems = (section: ResolvedOrderSection): NormalizedItem[] | undefined => {
    if (section.product_type === "link_building" && section.lb_detail) {
      return section.lb_detail.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        label: item.dr_tier.label,
        meta: `${item.dr_tier.traffic_range} traffic · DR tier`,
      }));
    }
    if (section.product_type === "new_content" && section.nc_detail) {
      return section.nc_detail.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        label: item.tier?.label ?? "—",
        meta: `${item.quantity} piece${item.quantity !== 1 ? "s" : ""} · ${item.tier?.turnaround_time ?? "?"} turnaround`,
      }));
    }
    if (section.product_type === "content_optimization" && section.co_detail) {
      return section.co_detail.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        label: item.tier?.label ?? "—",
        meta: `${item.quantity} page${item.quantity !== 1 ? "s" : ""} · ${item.tier?.word_count_range ?? "?"} · ${item.tier?.turnaround_days ?? "?"}d turnaround`,
      }));
    }
    if (section.product_type === "content_brief" && section.cb_detail) {
      return section.cb_detail.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        label: item.tier?.label ?? "—",
        meta: `${item.quantity} brief${item.quantity !== 1 ? "s" : ""} · ${item.tier?.turnaround_days ?? "?"}d turnaround`,
      }));
    }
    return undefined;
  };

  return (
    <div className="space-y-5">
      {/* Back navigation */}
      <button
        onClick={() => router.push("/orders")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <BackIcon />
        Back to Orders
      </button>

      {/* ── Confirmation Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-100 dark:border-brand-500/20 bg-linear-to-br from-brand-50 via-white to-brand-25 dark:from-brand-500/10 dark:via-gray-900 dark:to-brand-500/5 px-6 py-6">
        {/* Decorative ring */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-brand-200/60 dark:border-brand-500/10" />
        <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full border border-brand-300/40 dark:border-brand-500/15" />

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success-100 dark:bg-success-500/20 text-success-600 dark:text-success-400 shadow-sm">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Order Confirmed
                </h1>
                <span className="inline-flex items-center rounded-full border border-success-200 dark:border-success-500/30 bg-success-50 dark:bg-success-500/10 px-2 py-0.5 text-xs font-medium text-success-700 dark:text-success-400">
                  Payment Successful
                </span>
              </div>
              {session?.order_title && (
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {session.order_title}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-mono font-semibold text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">
                  #{session_short}
                </span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span>{order_date || "Loading…"}</span>
                {order_time && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>{order_time}</span>
                  </>
                )}
                {!is_loading && sections.length > 0 && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>{sections.length} product{sections.length !== 1 ? "s" : ""}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              All Orders
            </Link>
            <Link
              href="/store"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
            >
              <PlusIcon />
              New Order
            </Link>
          </div>
        </div>
      </div>

      {/* ── Order Items Card ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 overflow-hidden">
        {/* Card Top Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Order Summary
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {is_loading ? "Loading products…" : `${sections.length} product${sections.length !== 1 ? "s" : ""} ordered`}
            </p>
          </div>
          {!is_loading && session && (
            <div className="text-right">
              <p className="text-xs text-gray-400 dark:text-gray-500">Total Charged</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                {formatCurrency(session.total_amount)}
              </p>
            </div>
          )}
        </div>

        {/* Products */}
        <div className="px-4 sm:px-5 py-4 space-y-3">
          {is_loading ? (
            <SessionSkeleton />
          ) : (
            sections.map((section) => (
              <ProductSectionCard
                key={section.order_id}
                section={section}
                items={resolvedItems(section)}
                track_href={
                  section.product_type === "link_building"
                    ? `/link-building/orders/${section.order_id}/tracking`
                    : undefined
                }
              />
            ))
          )}
        </div>

        {/* Grand Total Row */}
        {!is_loading && session && (
          <div className="mx-4 sm:mx-5 mb-4 sm:mb-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden">
            {sections.length > 1 && (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {sections.map((s) => (
                  <div key={s.order_id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {PRODUCT_TYPE_CONFIG[s.product_type].label}
                    </span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {formatCurrency(s.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-success-100 dark:bg-success-500/20 flex items-center justify-center">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-success-600 dark:text-success-400" />
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Total Paid
                </span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(session.total_amount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Actions ── */}
      {!is_loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/2 px-5 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            A confirmation has been recorded for order{" "}
            <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
              #{session_short}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              View All Orders
            </Link>
            {lb_section && (
              <Link
                href={`/link-building/orders/${lb_section.order_id}/tracking`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
              >
                <BoltIcon />
                Track Link Building
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSessionPage;
