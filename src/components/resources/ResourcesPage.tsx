"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { resourcesService } from "@/services/client/resources.service";
import type { Resource, ResourceCategory } from "@/types/client/resources";
import { useDebounce } from "@/hooks/useDebounce";

// ── Constants ────────────────────────────────────────────────────────────────

const RESOURCES_PER_PAGE = 12;

const category_filters: { label: string; value: ResourceCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "PDF", value: "pdf" },
  { label: "Spreadsheet", value: "spreadsheet" },
  { label: "Document", value: "document" },
  { label: "Presentation", value: "presentation" },
  { label: "Image", value: "image" },
  { label: "Blog Post", value: "blog_post" },
  { label: "Other", value: "other" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date_string: string): string {
  return new Date(date_string).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Resource Icon ────────────────────────────────────────────────────────────

export function ResourceCategoryIcon({
  category,
  size = 20,
}: {
  category: ResourceCategory;
  size?: number;
}) {
  const s = size;

  switch (category) {
    case "spreadsheet":
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100 dark:bg-success-500/20">
          <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="14" height="14" rx="2" stroke="#12B76A" strokeWidth="1.5" fill="none" />
            <path d="M3 7H17M7 7V17M13 7V17" stroke="#12B76A" strokeWidth="1.2" />
          </svg>
        </span>
      );
    case "document":
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-light-100 dark:bg-blue-light-500/20">
          <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
            <rect x="4" y="2" width="12" height="16" rx="2" stroke="#0BA5EC" strokeWidth="1.5" fill="none" />
            <path d="M7 6H13M7 9H13M7 12H10" stroke="#0BA5EC" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      );
    case "pdf":
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-100 dark:bg-error-500/20">
          <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
            <rect x="4" y="2" width="12" height="16" rx="2" stroke="#F04438" strokeWidth="1.5" fill="none" />
            <text x="6.5" y="13" fontSize="6" fontWeight="bold" fill="#F04438">PDF</text>
          </svg>
        </span>
      );
    case "presentation":
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-100 dark:bg-warning-500/20">
          <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
            <rect x="2" y="4" width="16" height="11" rx="2" stroke="#F79009" strokeWidth="1.5" fill="none" />
            <path d="M10 15v3M7 18h6" stroke="#F79009" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M6 9l3 2.5L12 7.5" stroke="#F79009" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case "image":
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-500/20">
          <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
            <rect x="2" y="4" width="16" height="12" rx="2" stroke="#9333EA" strokeWidth="1.5" fill="none" />
            <circle cx="7" cy="8.5" r="1.5" stroke="#9333EA" strokeWidth="1.2" />
            <path d="M2 13l4-4 3 3 2-2 5 5" stroke="#9333EA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case "blog_post":
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/20">
          <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
            <path d="M4 4h12v2H4zM4 8h12v1.5H4zM4 11.5h8v1.5H4z" fill="#EC3C89" />
            <rect x="3" y="2" width="14" height="16" rx="2" stroke="#EC3C89" strokeWidth="1.3" fill="none" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
            <rect x="4" y="2" width="12" height="16" rx="2" stroke="#6B7280" strokeWidth="1.5" fill="none" />
            <path d="M7 8h6M7 11h4" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      );
  }
}

// ── Category Badge ────────────────────────────────────────────────────────────

const category_badge_styles: Record<ResourceCategory, string> = {
  pdf: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
  spreadsheet: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  document: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  presentation: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
  image: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  blog_post: "bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function getCategoryLabel(category: ResourceCategory): string {
  const labels: Record<ResourceCategory, string> = {
    pdf: "PDF",
    spreadsheet: "Spreadsheet",
    document: "Document",
    presentation: "Presentation",
    image: "Image",
    blog_post: "Blog Post",
    other: "Other",
  };
  return labels[category] ?? category;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function ResourceCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="flex-1">
          <div className="mb-2 h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
      <div className="mb-3 space-y-2">
        <div className="h-3 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-4/5 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-8 w-24 rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ── Resource Card ─────────────────────────────────────────────────────────────

function ResourceCard({ resource }: { resource: Resource }) {
  const file_count = resource.files?.length ?? 0;

  return (
    <div className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-gray-700">
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <ResourceCategoryIcon category={resource.category} />
        <div className="min-w-0 flex-1">
          <span
            className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${category_badge_styles[resource.category]}`}
          >
            {getCategoryLabel(resource.category)}
          </span>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-800 dark:text-white/90">
            {resource.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      {resource.description && (
        <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {resource.description}
        </p>
      )}
      {!resource.description && <div className="flex-1" />}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {file_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 1.5h8v9H2V1.5z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <path d="M4 4h4M4 6h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              {file_count} {file_count === 1 ? "file" : "files"}
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(resource.created_at)}
          </span>
        </div>
        <Link
          href={`/resources/${resource.id}`}
          className="flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
        >
          View details
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M6.5 3.5L9 6l-2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ search_term }: { search_term: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M5 5h18v18H5V5z"
            stroke="#9CA3AF"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M9 9h10M9 13h7M9 17h5"
            stroke="#9CA3AF"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h3 className="mb-1 text-base font-semibold text-gray-700 dark:text-gray-300">
        {search_term ? "No results found" : "No resources yet"}
      </h3>
      <p className="text-sm text-gray-400 dark:text-gray-500">
        {search_term
          ? `We couldn't find anything matching "${search_term}".`
          : "Resources shared with you will appear here."}
      </p>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  current_page,
  last_page,
  total,
  per_page,
  onPageChange,
}: {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  onPageChange: (page: number) => void;
}) {
  if (last_page <= 1) return null;

  const from = (current_page - 1) * per_page + 1;
  const to = Math.min(current_page * per_page, total);

  const buildPages = (): (number | "…")[] => {
    if (last_page <= 7) return Array.from({ length: last_page }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (current_page > 3) pages.push("…");
    for (let i = Math.max(2, current_page - 1); i <= Math.min(last_page - 1, current_page + 1); i++) {
      pages.push(i);
    }
    if (current_page < last_page - 2) pages.push("…");
    pages.push(last_page);
    return pages;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Showing <span className="font-medium text-gray-600 dark:text-gray-300">{from}–{to}</span> of{" "}
        <span className="font-medium text-gray-600 dark:text-gray-300">{total}</span> resources
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={current_page === 1}
          onClick={() => onPageChange(current_page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {buildPages().map((page, idx) =>
          page === "…" ? (
            <span key={`ellipsis-${idx}`} className="flex h-8 w-8 items-center justify-center text-sm text-gray-400">
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                page === current_page
                  ? "bg-brand-500 text-white"
                  : "border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/5"
              }`}
            >
              {page}
            </button>
          )
        )}
        <button
          disabled={current_page === last_page}
          onClick={() => onPageChange(current_page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [active_category, setActiveCategory] = useState<ResourceCategory | "all">("all");
  const [current_page, setCurrentPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const debounced_search = useDebounce(search, 400);

  const loadResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await resourcesService.fetchResources({
        page: current_page,
        per_page: RESOURCES_PER_PAGE,
        search: debounced_search || undefined,
        category: active_category,
      });
      setResources(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch {
      setError("Unable to load resources. Please try again.");
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [current_page, debounced_search, active_category]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: ResourceCategory | "all") => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resources</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Documents, reports, and files shared with your account.
          </p>
        </div>
        {total > 0 && (
          <span className="self-start rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-gray-400 sm:self-auto">
            {total} {total === 1 ? "resource" : "resources"}
          </span>
        )}
      </div>

      {/* Search & Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Search Input */}
        <div className="relative mb-4">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search resources..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:placeholder-gray-600 dark:focus:border-brand-500/50 dark:focus:bg-white/[0.03] dark:focus:ring-brand-500/10"
          />
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {category_filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleCategoryChange(filter.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active_category === filter.value
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
          <button
            onClick={loadResources}
            className="ml-auto font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Resources Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {is_loading
          ? Array.from({ length: 6 }).map((_, i) => <ResourceCardSkeleton key={i} />)
          : resources.length > 0
          ? resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))
          : !error && <EmptyState search_term={search} />}
      </div>

      {/* Pagination */}
      {!is_loading && resources.length > 0 && (
        <Pagination
          current_page={current_page}
          last_page={last_page}
          total={total}
          per_page={RESOURCES_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
