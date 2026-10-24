"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAdminOriginalOrder } from "@/services/admin/order.service";
import type {
  CurrentPlacementValues,
  OriginalOrderDetails,
  OriginalOrderPlacement,
  OriginalOrderSnapshot,
} from "@/types/admin/original-order";

interface AdminOriginalOrderContentProps {
  order_id: string;
}

/** Placement values compared against what the table holds now, in display order. */
const COMPARED_FIELDS: { key: keyof CurrentPlacementValues; label: string }[] = [
  { key: "order_id", label: "Order ID" },
  { key: "client", label: "Company" },
  { key: "link_type", label: "Link Type" },
  { key: "keyword", label: "Keyword" },
  { key: "landing_page", label: "Landing Page" },
  { key: "exact_match", label: "Exact Match" },
];

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(amount ?? 0));
}

function displayValue(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value ? String(value) : "";
}

function sameValue(a: string | boolean | null | undefined, b: string | boolean | null | undefined): boolean {
  return displayValue(a).trim() === displayValue(b).trim();
}

function snapshotLabel(snapshot: OriginalOrderSnapshot): string {
  return snapshot.type === "placed" ? "At checkout" : `Details submitted ${formatDateTime(snapshot.captured_at)}`;
}

/** Fields of a placement that no longer hold the value of the copy. */
function changedFields(placement: OriginalOrderPlacement, current: CurrentPlacementValues | undefined): Set<keyof CurrentPlacementValues> {
  const changed = new Set<keyof CurrentPlacementValues>();
  if (!current) return changed;
  for (const field of COMPARED_FIELDS) {
    if (!sameValue(placement[field.key], current[field.key])) changed.add(field.key);
  }
  return changed;
}

/** Tab separated rows, ready to paste into Google Sheets or Excel. */
function placementsAsTsv(placements: OriginalOrderPlacement[]): string {
  const clean = (value: string) => value.replace(/[\t\r\n]+/g, " ");
  const header = COMPARED_FIELDS.map((field) => field.label).join("\t");
  const lines = placements.map((placement) =>
    COMPARED_FIELDS.map((field) => clean(displayValue(placement[field.key]))).join("\t")
  );
  return [header, ...lines].join("\n");
}

const LockIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2.5 last:border-b-0 dark:border-gray-800">
    <dt className="shrink-0 text-sm text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-right text-sm font-medium text-gray-800 dark:text-white/90">{value || "-"}</dd>
  </div>
);

/**
 * Read only "Original Order" view: a Link Building order exactly as the client
 * submitted it, kept by the API at checkout whatever the payment method. Edits made
 * later on the Link Building Orders table overwrite the live order everywhere, so
 * this is the reference for what the client really asked for. Each placement shows
 * what changed since, and the original rows can be copied to paste into a sheet.
 */
export default function AdminOriginalOrderContent({ order_id }: AdminOriginalOrderContentProps) {
  const [details, setDetails] = useState<OriginalOrderDetails | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected_snapshot_id, setSelectedSnapshotId] = useState<string | null>(null);
  const [highlight_changes, setHighlightChanges] = useState(true);
  const [copy_state, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  // The page mounts once per order id, so the initial state already shows loading.
  useEffect(() => {
    let is_cancelled = false;
    getAdminOriginalOrder(order_id)
      .then((data) => {
        if (is_cancelled) return;
        setDetails(data);
        setSelectedSnapshotId(data.snapshots[0]?.id ?? null);
      })
      .catch((err: { status_code?: number }) => {
        if (is_cancelled) return;
        setError(
          err?.status_code === 404
            ? "Original order details are kept for Link Building orders only."
            : "We couldn't load the original order. Please try again."
        );
      })
      .finally(() => {
        if (!is_cancelled) setIsLoading(false);
      });
    return () => {
      is_cancelled = true;
    };
  }, [order_id]);

  const snapshot = useMemo(
    () => details?.snapshots.find((s) => s.id === selected_snapshot_id) ?? null,
    [details, selected_snapshot_id]
  );

  const placements = useMemo(
    () => snapshot?.payload.items.flatMap((item) => item.placements.map((placement) => ({ item, placement }))) ?? [],
    [snapshot]
  );

  const edited_count = useMemo(() => {
    if (!details) return 0;
    return placements.filter(({ placement }) => {
      const current = details.current_placements[placement.id];
      return !current || changedFields(placement, current).size > 0;
    }).length;
  }, [details, placements]);

  const copyPlacements = async () => {
    try {
      await navigator.clipboard.writeText(placementsAsTsv(placements.map(({ placement }) => placement)));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2500);
  };

  if (is_loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/orders/${order_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Order
      </Link>

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
        </div>
      )}

      {details && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300">
                <LockIcon />
                Read only
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Original Order</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {details.order.order_title || "Link Building order"} · Order ID{" "}
                <span className="font-mono text-gray-700 dark:text-gray-300">{details.order.id}</span>
              </p>
            </div>
            {details.snapshots.length > 1 && (
              <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700" role="tablist" aria-label="Order versions">
                {details.snapshots.map((s) => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={s.id === selected_snapshot_id}
                    onClick={() => setSelectedSnapshotId(s.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      s.id === selected_snapshot_id
                        ? "bg-brand-500 text-white"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    {snapshotLabel(s)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!snapshot ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300">
              No original copy is available for this order. It was placed before original copies were kept and has not
              been backfilled yet.
            </div>
          ) : (
            <>
              <div
                className={`rounded-xl border p-4 text-sm ${
                  snapshot.is_backfilled
                    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300"
                    : "border-blue-light-200 bg-blue-light-50 text-blue-light-800 dark:border-blue-light-500/25 dark:bg-blue-light-500/10 dark:text-blue-light-300"
                }`}
              >
                {snapshot.is_backfilled ? (
                  <>
                    This copy was created on {formatDateTime(snapshot.captured_at)} from the data the order had at that
                    time, because the order was placed before original copies were kept. It may already include edits
                    made before that date.
                  </>
                ) : snapshot.type === "placed" ? (
                  <>
                    This is the order exactly as the client submitted it at checkout on {formatDateTime(snapshot.captured_at)}.
                    It cannot be edited, and changes made later on the Link Building Orders table do not affect it.
                  </>
                ) : (
                  <>
                    These are the details submitted on {formatDateTime(snapshot.captured_at)}
                    {snapshot.captured_by ? ` by ${snapshot.captured_by.name}` : ""}, after checkout. This copy cannot be edited.
                  </>
                )}
              </div>

              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 space-y-5 lg:col-span-8">
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Placements as submitted</h3>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {edited_count === 0
                            ? "No placement was changed since this copy."
                            : `${edited_count} of ${placements.length} placement${placements.length === 1 ? "" : "s"} changed since this copy.`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={highlight_changes}
                            onChange={(e) => setHighlightChanges(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-brand-500"
                          />
                          Show current values
                        </label>
                        <button
                          onClick={copyPlacements}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/3 dark:text-gray-300 dark:hover:bg-white/5"
                          title="Copy the original placements to paste into Google Sheets or Excel"
                        >
                          {copy_state === "copied" ? "Copied" : copy_state === "failed" ? "Copy failed" : "Copy rows"}
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                            {COMPARED_FIELDS.map((field) => (
                              <th key={field.key} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                {field.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {placements.map(({ placement }) => {
                            const current = details.current_placements[placement.id];
                            const changed = changedFields(placement, current);
                            return (
                              <tr key={placement.id} className="align-top">
                                {COMPARED_FIELDS.map((field, index) => {
                                  const is_changed = highlight_changes && changed.has(field.key);
                                  return (
                                    <td
                                      key={field.key}
                                      className={`px-4 py-3 ${field.key === "landing_page" ? "max-w-xs break-all" : ""} ${
                                        is_changed ? "bg-amber-50/70 dark:bg-amber-500/5" : ""
                                      }`}
                                    >
                                      <span className={field.key === "order_id" ? "font-mono text-xs font-semibold text-gray-800 dark:text-white/90" : "text-gray-800 dark:text-white/90"}>
                                        {displayValue(placement[field.key]) || <span className="text-gray-400">(empty)</span>}
                                      </span>
                                      {is_changed && current && (
                                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                                          Now: {displayValue(current[field.key]) || "(empty)"}
                                        </p>
                                      )}
                                      {index === 0 && highlight_changes && !current && (
                                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">Removed from the table</p>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                    <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-800">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Items purchased</h3>
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {snapshot.payload.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-5 py-3 text-gray-800 dark:text-white/90">{item.dr_tier_label ?? item.dr_tier_id}</td>
                            <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-400">
                              {item.quantity} x {formatCurrency(item.unit_price)}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {snapshot.payload.order.order_notes && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                      <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">Order Notes</h3>
                      <p className="whitespace-pre-line text-sm text-gray-600 dark:text-gray-400">{snapshot.payload.order.order_notes}</p>
                    </div>
                  )}
                </div>

                <div className="col-span-12 space-y-5 lg:col-span-4">
                  <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-white/3">
                    <h3 className="py-1 text-sm font-semibold text-gray-800 dark:text-white/90">Order Summary</h3>
                    <dl>
                      <InfoRow label="Placed on" value={formatDateTime(snapshot.payload.order.created_at)} />
                      <InfoRow label="Payment method" value={snapshot.payment_method} />
                      <InfoRow label="Subtotal" value={formatCurrency(snapshot.payload.order.subtotal_before_discount ?? snapshot.payload.order.total_amount)} />
                      {snapshot.payload.coupons.map((coupon) => (
                        <InfoRow key={coupon.code} label={`Coupon ${coupon.code}`} value={`-${formatCurrency(coupon.discount_amount)}`} />
                      ))}
                      <InfoRow label="Total" value={formatCurrency(snapshot.payload.order.total_amount)} />
                      {details.invoice && (
                        <InfoRow
                          label="Invoice now"
                          value={`${details.invoice.invoice_number ?? ""} ${details.invoice.status}`.trim()}
                        />
                      )}
                    </dl>
                  </div>

                  {snapshot.payload.customer && (
                    <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-white/3">
                      <h3 className="py-1 text-sm font-semibold text-gray-800 dark:text-white/90">Customer</h3>
                      <dl>
                        <InfoRow label="Name" value={`${snapshot.payload.customer.first_name} ${snapshot.payload.customer.last_name}`} />
                        <InfoRow label="Email" value={snapshot.payload.customer.email} />
                        <InfoRow label="Company" value={snapshot.payload.customer.company} />
                      </dl>
                    </div>
                  )}

                  {snapshot.payload.billing && (
                    <div className="rounded-xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-white/3">
                      <h3 className="py-1 text-sm font-semibold text-gray-800 dark:text-white/90">Billing Address</h3>
                      <p className="pb-2 text-sm text-gray-600 dark:text-gray-400">
                        {[
                          snapshot.payload.billing.company,
                          snapshot.payload.billing.address,
                          [snapshot.payload.billing.city, snapshot.payload.billing.state, snapshot.payload.billing.postal_code].filter(Boolean).join(", "),
                          snapshot.payload.billing.country,
                        ].filter(Boolean).map((line) => (
                          <span key={line} className="block">{line}</span>
                        ))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
