"use client";

import React, { useEffect, useMemo, useState } from "react";
import { linkBuildingService } from "@/services/client/link-building.service";
import { orderDetailsService } from "@/services/client/order-details.service";
import type { LinkBuildingOrderDetail } from "@/types/client/link-building";
import LinkBuildingIntakeEditor, {
  type EditorItem,
} from "./LinkBuildingIntakeEditor";

interface LinkBuildingIntakeDataContentProps {
  order_id: string;
}

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
);

export default function LinkBuildingIntakeDataContent({
  order_id,
}: LinkBuildingIntakeDataContentProps) {
  const [order, setOrder] = useState<LinkBuildingOrderDetail | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await linkBuildingService.fetchLinkBuildingOrderDetail(order_id);
        if (!cancelled) setOrder(data);
      } catch {
        if (!cancelled) setError("We couldn't load this order. Please try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [order_id]);

  const editor_items = useMemo<EditorItem[]>(() => {
    if (!order) return [];
    return order.items.map((item) => ({
      id: item.id,
      label: item.dr_tier?.label ?? "Link Building",
      quantity: item.quantity,
      placements: item.placements.map((p) => ({
        id: p.id,
        keyword: p.keyword ?? "",
        landing_page: p.landing_page ?? "",
        exact_match: p.exact_match,
      })),
    }));
  }, [order]);

  if (is_loading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-5 w-28" />
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-4 w-80" />
        </div>
        <SkeletonBlock className="h-48 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
        <p className="text-sm font-medium text-error-600 dark:text-error-400">
          {error ?? "Order not found."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <LinkBuildingIntakeEditor
      order_id={order.id}
      order_title={order.order_title}
      created_at={order.created_at}
      status={order.status}
      items={editor_items}
      onSave={(placements) => orderDetailsService.submitLinkBuilding(order.id, placements)}
      back_href="/orders"
    />
  );
}
