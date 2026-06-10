"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import { linkBuildingService } from "@/services/client/link-building.service";
import type { AdminAssignedPlacementDetail } from "@/types/client/link-building";
import type { PlacementStatus } from "@/types/client/link-building";

// ─── Status config ──────────────────────────────────────────────────────────────

function getStatusConfig(status: PlacementStatus): {
  color: "warning" | "info" | "success" | "error" | "primary";
  dot: string;
} {
  switch (status) {
    case "Live":
      return { color: "success", dot: "bg-success-500" };
    case "Cancelled":
    case "Not Approved":
    case "Rejected":
      return { color: "error", dot: "bg-error-500" };
    case "New Request":
    case "Reviewing":
    case "Ordered":
    case "Pending":
      return { color: "info", dot: "bg-blue-light-500" };
    case "Quality Control":
    case "Partnership Check":
    case "Approved":
    case "Ready":
      return { color: "warning", dot: "bg-amber-500" };
    case "Scheduled":
      return { color: "primary", dot: "bg-brand-500" };
    default:
      return { color: "info", dot: "bg-gray-400" };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(value: string | null): string {
  if (!value) return "—";
  // Handles both ISO strings and MM/DD/YYYY admin format
  const parsed = /^\d{2}\/\d{2}\/\d{4}$/.test(value)
    ? new Date(`${value.slice(6, 10)}-${value.slice(0, 2)}-${value.slice(3, 5)}`)
    : new Date(value);
  if (isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-5 w-32" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-4 lg:col-span-8">
          <SkeletonBlock className="h-6 w-56" />
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-24" />
        </div>
        <div className="col-span-12 space-y-4 lg:col-span-4">
          <SkeletonBlock className="h-56" />
        </div>
      </div>
    </div>
  );
}

// ─── Detail row ─────────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-gray-800 dark:text-white/90">
        {value ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
      </dd>
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const CrossIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ─── Main component ─────────────────────────────────────────────────────────────

interface PlacementDetailPageProps {
  placement_id: string;
}

export default function PlacementDetailPage({ placement_id }: PlacementDetailPageProps) {
  const router = useRouter();
  const [data, setData] = useState<AdminAssignedPlacementDetail | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await linkBuildingService.fetchAssignedPlacementDetail(placement_id);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("We couldn't load this placement. Please try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [placement_id]);

  const status_cfg = data ? getStatusConfig(data.status as PlacementStatus) : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <BackIcon />
        Back to Dashboard
      </button>

      {/* Loading */}
      {is_loading && <LoadingSkeleton />}

      {/* Error */}
      {!is_loading && error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
          <p className="text-sm font-medium text-error-600 dark:text-error-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm font-medium text-error-600 underline hover:text-error-700 dark:text-error-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Main content */}
      {!is_loading && data && status_cfg && (
        <>
          {/* Page header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                  Link Building
                </span>
                <Badge
                  variant="light"
                  size="sm"
                  color={status_cfg.color}
                  startIcon={
                    <span className={`inline-block h-2 w-2 rounded-full ${status_cfg.dot}`} />
                  }
                >
                  {data.status}
                </Badge>
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {data.keyword ?? "Link Building Placement"}
              </h1>
              {data.order_id && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Reference ID:{" "}
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {data.order_id}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left — placement details */}
            <div className="col-span-12 space-y-4 lg:col-span-8">

              {/* Placement card */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {data.link_type || "Link Building"}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {/* Keyword */}
                  <div className="px-5 py-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Keyword
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {data.keyword ?? (
                        <span className="italic text-gray-400 dark:text-gray-600">Not specified</span>
                      )}
                    </p>
                  </div>

                  {/* Landing page */}
                  <div className="px-5 py-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Landing Page
                    </p>
                    {data.landing_page ? (
                      <a
                        href={data.landing_page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 truncate text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        <ExternalLinkIcon />
                        <span className="truncate">{data.landing_page}</span>
                      </a>
                    ) : (
                      <span className="italic text-sm text-gray-400 dark:text-gray-600">Not specified</span>
                    )}
                  </div>

                  {/* Exact match */}
                  <div className="px-5 py-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Exact Match
                    </p>
                    <span
                      className={`inline-flex items-center justify-center rounded-full p-1 ${
                        data.exact_match
                          ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                          : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                      }`}
                    >
                      {data.exact_match ? <CheckIcon /> : <CrossIcon />}
                    </span>
                  </div>

                  {/* Live link (shown when available) */}
                  {data.live_link && (
                    <div className="px-5 py-4">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Live Link
                      </p>
                      <a
                        href={data.live_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 truncate text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        <ExternalLinkIcon />
                        <span className="truncate">{data.live_link}</span>
                      </a>
                    </div>
                  )}

                  {/* Notes */}
                  {data.notes && (
                    <div className="px-5 py-4">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Notes
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{data.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin-assigned placement notice */}
              <div className="flex items-start gap-3 rounded-xl border border-blue-light-200 bg-blue-light-50 px-4 py-3 text-sm text-blue-light-700 dark:border-blue-light-500/20 dark:bg-blue-light-500/10 dark:text-blue-light-400">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <p>
                  This placement was created directly by our team as part of your link building
                  campaign. Our team will keep you updated as it progresses.
                </p>
              </div>
            </div>

            {/* Right — metadata */}
            <div className="col-span-12 lg:col-span-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Placement Details
                </h3>
                <dl className="space-y-3">
                  <DetailRow label="Status" value={data.status} />
                  {data.link_type && (
                    <DetailRow label="Link Type" value={data.link_type} />
                  )}
                  {data.dr_lbs && (
                    <DetailRow label="DR" value={data.dr_lbs} />
                  )}
                  {data.request_date && (
                    <DetailRow label="Requested" value={formatDate(data.request_date)} />
                  )}
                  {data.estimated_delivery_date && (
                    <DetailRow
                      label="Est. Delivery"
                      value={formatDate(data.estimated_delivery_date)}
                    />
                  )}
                  {data.live_link_date && (
                    <DetailRow label="Live Date" value={formatDate(data.live_link_date)} />
                  )}
                  <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                    <DetailRow label="Created" value={formatDate(data.created_at)} />
                    <div className="mt-3">
                      <DetailRow label="Last updated" value={formatDate(data.updated_at)} />
                    </div>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
