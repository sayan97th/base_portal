"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useCellHoverCard } from "@/hooks/useCellHoverCard";
import { describeRecentDomainUsageRule } from "@/lib/link-building-domain-usage";
import type { LinkBuildingRecentDomainUsage } from "@/types/admin/link-building-order";

const CARD_WIDTH = 300;

interface RecentDomainUsageCardProps {
  usage: LinkBuildingRecentDomainUsage;
  /** The row's Landing Page, the page the domain was already used for. */
  landing_page: string;
  /** The Partnership cell, hovering it opens the card and the card is placed under it. */
  anchor_el: HTMLElement | null;
  /** True while the Partnership cell is selected, the card then stays open so keyboard users see it too. */
  is_active: boolean;
}

/**
 * Warning card of a Partnership cell highlighted in red: explains that the domain
 * was already used for the row's landing page in the last months, which order
 * used it and when, so the writer knows why the cell is red and picks another site.
 */
export default function RecentDomainUsageCard({ usage, landing_page, anchor_el, is_active }: RecentDomainUsageCardProps) {
  const { is_open, card_ref, keepOpen, scheduleClose } = useCellHoverCard({
    anchor_el,
    enabled: true,
    is_active,
    width: CARD_WIDTH,
  });

  if (!is_open || typeof document === "undefined") return null;

  // The card is portaled, but React still bubbles its events to the cell, which
  // would start a range selection or open the editor.
  const stopCellEvent = (e: React.SyntheticEvent) => e.stopPropagation();
  const window_label = usage.window_months === 1 ? "month" : `${usage.window_months} months`;
  const shown_landing_page = landing_page.replace(/^https?:\/\//, "");

  return createPortal(
    <div
      ref={card_ref}
      role="tooltip"
      className="fixed z-[60] rounded-lg border border-red-200 bg-white p-3 text-xs shadow-lg dark:border-red-900 dark:bg-gray-800"
      style={{ top: -9999, left: -9999, width: CARD_WIDTH }}
      onMouseEnter={keepOpen}
      onMouseLeave={scheduleClose}
      onMouseDown={stopCellEvent}
      onMouseUp={stopCellEvent}
      onClick={stopCellEvent}
      onDoubleClick={stopCellEvent}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        Domain used recently
      </div>

      <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
        {usage.count === 1
          ? `This domain was already used for this landing page in the last ${window_label}.`
          : `This domain was already used ${usage.count} times for this landing page in the last ${window_label}.`}
      </p>

      <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-gray-500 dark:text-gray-400">{usage.count === 1 ? "Order" : "Latest order"}</dt>
        <dd className="select-text font-medium text-gray-800 dark:text-gray-200">{usage.last_order_id}</dd>
        <dt className="text-gray-500 dark:text-gray-400">Requested</dt>
        <dd className="font-medium text-gray-800 dark:text-gray-200">{usage.last_request_date}</dd>
        {shown_landing_page && (
          <>
            <dt className="text-gray-500 dark:text-gray-400">Landing page</dt>
            <dd className="min-w-0 truncate font-medium text-gray-800 dark:text-gray-200" title={landing_page}>
              {shown_landing_page}
            </dd>
          </>
        )}
      </dl>

      <p className="mt-2.5 rounded-md bg-red-50 px-2 py-1.5 font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
        Choose a different site for this landing page.
      </p>

      <p className="mt-2 border-t border-gray-100 pt-2 text-[10px] leading-snug text-gray-400 dark:border-gray-700 dark:text-gray-500">
        {describeRecentDomainUsageRule(usage.window_months)}
      </p>
    </div>,
    document.body
  );
}
