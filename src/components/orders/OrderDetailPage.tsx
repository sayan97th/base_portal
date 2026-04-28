"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { linkBuildingService } from "@/services/client/link-building.service";
import { newContentService } from "@/services/client/new-content.service";
import { contentOptimizationService } from "@/services/client/content-optimization.service";
import { contentBriefsService } from "@/services/client/content-briefs.service";
import { findSessionByOrderId } from "@/lib/checkout-session";
import type { LinkBuildingOrderDetail } from "@/types/client/link-building";
import type { NewContentOrderDetail } from "@/types/client/new-content";
import type { ContentOptimizationOrderDetail } from "@/types/client/content-optimization";
import type { ContentBriefOrderDetail } from "@/types/client/content-briefs";
import type { CartProductType } from "@/types/client/unified-cart";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

interface NormalizedItem {
  id: string;
  label: string;
  meta: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface NormalizedDetail {
  id: string;
  title: string | null;
  notes: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  product_type: CartProductType;
  items: NormalizedItem[];
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
  { label: string; color: string; bg: string }
> = {
  link_building: {
    label: "Link Building",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-500/20",
  },
  new_content: {
    label: "New Content",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-100 dark:bg-blue-500/20",
  },
  content_optimization: {
    label: "Content Optimization",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-100 dark:bg-emerald-500/20",
  },
  content_brief: {
    label: "Content Briefs",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-500/20",
  },
};

function normalizeLinkBuilding(order_id: string, d: LinkBuildingOrderDetail): NormalizedDetail {
  return {
    id: d.id,
    title: d.order_title,
    notes: d.order_notes,
    total_amount: d.total_amount,
    status: d.status,
    created_at: d.created_at,
    product_type: "link_building",
    items: d.items.map((item) => ({
      id: item.id,
      label: item.dr_tier.label,
      meta: `${item.dr_tier.traffic_range} traffic · ${item.dr_tier.word_count.toLocaleString()} words`,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })),
  };
}

function normalizeNewContent(order_id: string, d: NewContentOrderDetail): NormalizedDetail {
  return {
    id: d.id,
    title: null,
    notes: d.order_notes,
    total_amount: d.total_amount,
    status: d.status,
    created_at: d.created_at,
    product_type: "new_content",
    items: d.items.map((item) => ({
      id: item.id,
      label: item.tier.label,
      meta: `${item.tier.turnaround_time} turnaround`,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })),
  };
}

function normalizeContentOptimization(order_id: string, d: ContentOptimizationOrderDetail): NormalizedDetail {
  return {
    id: d.id,
    title: null,
    notes: d.order_notes,
    total_amount: d.total_amount,
    status: d.status,
    created_at: d.created_at,
    product_type: "content_optimization",
    items: d.items.map((item) => ({
      id: item.id,
      label: item.tier.label,
      meta: `${item.tier.word_count_range} · ${item.tier.turnaround_days}d turnaround`,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })),
  };
}

function normalizeContentBriefs(order_id: string, d: ContentBriefOrderDetail): NormalizedDetail {
  return {
    id: d.id,
    title: null,
    notes: d.order_notes,
    total_amount: d.total_amount,
    status: d.status,
    created_at: d.created_at,
    product_type: "content_brief",
    items: d.items.map((item) => ({
      id: item.id,
      label: item.tier.label,
      meta: `${item.tier.turnaround_days}d turnaround`,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })),
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const BoltIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 5 }).map((__, j) => (
            <TableCell key={j} className="py-3">
              <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface OrderDetailPageProps {
  order_id: string;
}

const OrderDetailPage: React.FC<OrderDetailPageProps> = ({ order_id }) => {
  const router = useRouter();
  const search_params = useSearchParams();
  const product_type = (search_params.get("type") ?? "link_building") as CartProductType;

  const [detail, setDetail] = useState<NormalizedDetail | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session_link, setSessionLink] = useState<string | null>(null);

  useEffect(() => {
    const session = findSessionByOrderId(order_id);
    if (session) {
      setSessionLink(`/orders/session/${session.session_id}`);
    }
  }, [order_id]);

  useEffect(() => {
    const loadDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let normalized: NormalizedDetail;
        if (product_type === "link_building") {
          const d = await linkBuildingService.fetchLinkBuildingOrderDetail(order_id);
          normalized = normalizeLinkBuilding(order_id, d);
        } else if (product_type === "new_content") {
          const d = await newContentService.fetchOrderDetail(order_id);
          normalized = normalizeNewContent(order_id, d);
        } else if (product_type === "content_optimization") {
          const d = await contentOptimizationService.fetchOrderDetail(order_id);
          normalized = normalizeContentOptimization(order_id, d);
        } else {
          const d = await contentBriefsService.fetchOrderDetail(order_id);
          normalized = normalizeContentBriefs(order_id, d);
        }
        setDetail(normalized);
      } catch {
        setError("We couldn't load this order. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    loadDetail();
  }, [order_id, product_type]);

  const status_cfg = detail ? getStatusConfig(detail.status) : null;
  const type_cfg = PRODUCT_TYPE_CONFIG[product_type];

  return (
    <div className="space-y-6">
      {/* Back */}
      <div>
        <button
          onClick={() => router.push("/orders")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <BackIcon />
          Back to Orders
        </button>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-6 pt-4 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${type_cfg.bg} ${type_cfg.color}`}
              >
                {type_cfg.label}
              </span>
              {status_cfg && (
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
              )}
            </div>
            <h1 className="mt-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              {detail?.title ?? "Order Detail"}
            </h1>
            {detail && (
              <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                #{detail.id.slice(0, 8).toUpperCase()} · {formatDate(detail.created_at)}
              </p>
            )}
            {detail?.notes && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{detail.notes}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {session_link && (
              <Link
                href={session_link}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              >
                View Receipt
              </Link>
            )}
            {product_type === "link_building" && detail?.status !== "cancelled" && (
              <Link
                href={`/link-building/orders/${order_id}/tracking`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                <BoltIcon />
                Track Order
              </Link>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/20 dark:bg-error-500/10">
            <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
          </div>
        )}

        {/* Items table */}
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                {["Product", "Details", "Qty", "Unit Price", "Subtotal"].map((col) => (
                  <TableCell
                    key={col}
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {is_loading ? (
                <DetailSkeleton />
              ) : detail && detail.items.length > 0 ? (
                detail.items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                    <TableCell className="py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {item.label}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {item.meta}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 text-theme-sm dark:text-gray-300">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 text-theme-sm dark:text-gray-300">
                      {formatCurrency(item.unit_price)}
                    </TableCell>
                    <TableCell className="py-3 font-semibold text-gray-800 text-theme-sm dark:text-white/90">
                      {formatCurrency(item.subtotal)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-gray-400">
                    No items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Total */}
        {detail && (
          <div className="mt-4 flex justify-end">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex items-center gap-12">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(detail.total_amount)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailPage;
