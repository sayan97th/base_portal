"use client";

import React, { useMemo } from "react";
import { useCart } from "@/context/CartContext";
import {
  buildLbReviewRows,
  buildNcReviewRows,
  buildCoReviewRows,
  computeProductSubtotal,
  formatCurrency,
  type LbReviewRow,
  type NcReviewRow,
  type CoReviewRow,
} from "@/services/client/order-review.service";

interface OrderReviewStepProps {
  onBack: () => void;
  onNext: () => void;
  back_label?: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReviewField({
  label,
  value,
  is_url = false,
}: {
  label: string;
  value: string;
  is_url?: boolean;
}) {
  const is_empty = !value.trim();
  return (
    <div className="flex gap-3">
      <span className="w-36 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {is_empty ? (
        <span className="text-xs italic text-gray-300 dark:text-gray-600">—</span>
      ) : is_url ? (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 truncate text-xs font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
        >
          {value}
        </a>
      ) : (
        <span className="text-xs font-medium text-gray-800 dark:text-white/80">{value}</span>
      )}
    </div>
  );
}

function SectionBadge({
  label,
  color,
  icon,
}: {
  label: string;
  color: "coral" | "blue" | "violet" | "emerald";
  icon: React.ReactNode;
}) {
  const color_classes = {
    coral:
      "border-coral-200 bg-coral-50 text-coral-700 dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-300",
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
    violet:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${color_classes[color]}`}
    >
      {icon}
      {label}
    </span>
  );
}

function LbSection({ rows }: { rows: LbReviewRow[] }) {
  const subtotal = rows.reduce((s, r) => s + r.unit_price, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SectionBadge
          label="Link Building"
          color="coral"
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          }
        />
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Subtotal: ${formatCurrency(subtotal)}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-white/[0.03]">
            <tr>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                #
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                DR Tier
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Keyword
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Landing Page
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Exact
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Price
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row, idx) => (
              <tr key={idx} className="bg-white dark:bg-white/[0.01]">
                <td className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">
                  {idx + 1}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full border border-coral-200 bg-coral-50 px-2.5 py-0.5 text-xs font-semibold text-coral-700 dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-300">
                    {row.dr_tier_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-medium text-gray-800 dark:text-white/80">
                  {row.keyword || <span className="italic text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                  {row.landing_page ? (
                    <a
                      href={row.landing_page.startsWith("http") ? row.landing_page : `https://${row.landing_page}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-[200px] truncate text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                    >
                      {row.landing_page}
                    </a>
                  ) : (
                    <span className="italic text-gray-300 dark:text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.exact_match ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      No
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-xs font-semibold text-gray-800 tabular-nums dark:text-white/80">
                  ${formatCurrency(row.unit_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NcSection({ rows }: { rows: NcReviewRow[] }) {
  const subtotal = rows.reduce((s, r) => s + r.unit_price, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SectionBadge
          label="New Content"
          color="blue"
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
        />
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Subtotal: ${formatCurrency(subtotal)}
        </span>
      </div>

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
          >
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {row.instance_label}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-800 tabular-nums dark:text-white/80">
                ${formatCurrency(row.unit_price)}
              </span>
            </div>
            <div className="space-y-2.5 px-5 py-4">
              <ReviewField label="Keyword Phrase" value={row.keyword_phrase} />
              <ReviewField label="Secondary Keywords" value={row.secondary_keywords} />
              <ReviewField label="Content Type" value={row.type_of_content} />
              <ReviewField label="Notes" value={row.notes} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoSection({
  rows,
  label,
  url_label = "Content Page URL",
  badge_color = "violet",
  badge_icon,
}: {
  rows: CoReviewRow[];
  label: string;
  url_label?: string;
  badge_color?: "violet" | "emerald";
  badge_icon: React.ReactNode;
}) {
  const subtotal = rows.reduce((s, r) => s + r.unit_price, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SectionBadge label={label} color={badge_color} icon={badge_icon} />
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Subtotal: ${formatCurrency(subtotal)}
        </span>
      </div>

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
          >
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                    badge_color === "violet" ? "bg-violet-500" : "bg-emerald-500"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {row.tier_name}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-800 tabular-nums dark:text-white/80">
                ${formatCurrency(row.unit_price)}
              </span>
            </div>
            <div className="space-y-2.5 px-5 py-4">
              <ReviewField label="Primary Keyword" value={row.primary_keyword} />
              <ReviewField label="Secondary Keywords" value={row.secondary_keywords} />
              <ReviewField label={url_label} value={row.content_page_url} is_url />
              <ReviewField label="Notes" value={row.notes} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OrderReviewStep({
  onBack,
  onNext,
  back_label = "Back to Intake Form",
}: OrderReviewStepProps) {
  const {
    items,
    order_title,
    order_notes,
    subtotal,
    bulk_discount_amount,
    bulk_discount_details,
    total_discount,
    total,
    applied_coupons,
    getKeywordDataForTier,
    getIntakeDataForTier,
    getContentOptimizationIntakeDataForTier,
    getContentBriefIntakeDataForTier,
  } = useCart();

  const applied_bulk_details = bulk_discount_details.filter((d) => d.is_applied);

  const lb_items = useMemo(() => items.filter((i) => i.product_type === "link_building"), [items]);
  const nc_items = useMemo(() => items.filter((i) => i.product_type === "new_content"), [items]);
  const co_items = useMemo(() => items.filter((i) => i.product_type === "content_optimization"), [items]);
  const cb_items = useMemo(() => items.filter((i) => i.product_type === "content_brief"), [items]);

  const lb_rows = useMemo(
    () => buildLbReviewRows(lb_items, getKeywordDataForTier),
    [lb_items, getKeywordDataForTier]
  );
  const nc_rows = useMemo(
    () => buildNcReviewRows(nc_items, getIntakeDataForTier),
    [nc_items, getIntakeDataForTier]
  );
  const co_rows = useMemo(
    () => buildCoReviewRows(co_items, getContentOptimizationIntakeDataForTier),
    [co_items, getContentOptimizationIntakeDataForTier]
  );
  const cb_rows = useMemo(
    () => buildCoReviewRows(cb_items, getContentBriefIntakeDataForTier),
    [cb_items, getContentBriefIntakeDataForTier]
  );

  const has_lb = lb_rows.length > 0;
  const has_nc = nc_rows.length > 0;
  const has_co = co_rows.length > 0;
  const has_cb = cb_rows.length > 0;

  const has_discount = bulk_discount_amount > 0 || total_discount > 0;

  // Whether any placement/row is missing its required intake details. When true,
  // the order can still be purchased and will be parked in "Pending Details".
  const has_missing_details = useMemo(() => {
    const lb_missing = lb_rows.some((r) => !r.keyword.trim() || !r.landing_page.trim());
    const nc_missing = nc_rows.some((r) => !r.keyword_phrase.trim() || !r.type_of_content.trim());
    const co_missing = co_rows.some((r) => !r.primary_keyword.trim() || !r.content_page_url.trim());
    const cb_missing = cb_rows.some((r) => !r.primary_keyword.trim() || !r.content_page_url.trim());
    return lb_missing || nc_missing || co_missing || cb_missing;
  }, [lb_rows, nc_rows, co_rows, cb_rows]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order Review</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review all details below before proceeding to payment.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {back_label}
        </button>
      </div>

      {/* Confirmation banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/8">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Please review your order details carefully. You can go{" "}
          <button
            type="button"
            onClick={onBack}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            back to the intake form
          </button>{" "}
          to make changes before completing payment.
        </p>
      </div>

      {/* Pending-details banner */}
      {has_missing_details && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/8">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Some intake details are still missing. You can complete your purchase now, and the
            order will be marked{" "}
            <span className="font-semibold">Pending Details</span>{" "}
            so you (or your team) can add the remaining details later from My Orders. The
            turnaround clock starts once the details are submitted.
          </p>
        </div>
      )}

      {/* Order title & notes */}
      {(order_title || order_notes) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="mb-2 flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Order Details
            </span>
          </div>
          {order_title && (
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{order_title}</p>
          )}
          {order_notes && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{order_notes}</p>
          )}
        </div>
      )}

      {/* Product sections */}
      {has_lb && <LbSection rows={lb_rows} />}

      {has_nc && <NcSection rows={nc_rows} />}

      {has_co && (
        <CoSection
          rows={co_rows}
          label="Content Optimization"
          url_label="Content Page URL"
          badge_color="violet"
          badge_icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      )}

      {has_cb && (
        <CoSection
          rows={cb_rows}
          label="Content Briefs"
          url_label="Current Live URL"
          badge_color="emerald"
          badge_icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
        />
      )}

      {/* Pricing summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
        <p className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Price Summary</p>
        <div className="space-y-2.5">
          {has_discount && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="text-sm font-medium text-gray-700 tabular-nums dark:text-white/70">
                ${formatCurrency(subtotal)}
              </span>
            </div>
          )}

          {applied_bulk_details.map((detail) => (
            <div key={detail.config.id} className="flex items-center justify-between">
              <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                Bulk Discount ({Math.round(detail.config.discount_rate)}% off{" "}
                {detail.config.applies_to === "all"
                  ? "all products"
                  : detail.config.applies_to === "link_building"
                  ? "links"
                  : detail.config.applies_to === "new_content"
                  ? "content"
                  : detail.config.applies_to === "content_optimization"
                  ? "optimization"
                  : "briefs"})
              </span>
              <span className="text-sm font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                &minus;${formatCurrency(detail.discount_amount)}
              </span>
            </div>
          ))}

          {applied_coupons.length > 0 && applied_coupons.map((c) => (
            <div key={c.code} className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {c.coupon_name}{" "}
                <span className="font-mono text-[10px] text-emerald-500/70">({c.code})</span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                &minus;${formatCurrency(c.discount_amount)}
              </span>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
              <span className="text-2xl font-bold text-gray-900 tabular-nums dark:text-white">
                ${formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6 dark:border-gray-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {back_label}
        </button>

        <button
          type="button"
          onClick={onNext}
          className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-coral-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-coral-500/20 transition-all hover:bg-coral-600 hover:shadow-coral-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 60%)",
            }}
          />
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
