"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AdminResource, ResourceCategory, ResourceStatus } from "@/types/admin/resources";
import {
  listAdminResources,
  toggleAdminResourceStatus,
  deleteAdminResource,
} from "@/services/admin/resources.service";
import { useDebounce } from "@/hooks/useDebounce";

// ── Constants ─────────────────────────────────────────────────────────────────

const RESOURCES_PER_PAGE = 15;

const category_options: { label: string; value: ResourceCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "PDF", value: "pdf" },
  { label: "Spreadsheet", value: "spreadsheet" },
  { label: "Document", value: "document" },
  { label: "Presentation", value: "presentation" },
  { label: "Image", value: "image" },
  { label: "Blog Post", value: "blog_post" },
  { label: "Other", value: "other" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date_string: string): string {
  return new Date(date_string).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

// ── Badges ────────────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: ResourceCategory }) {
  const styles: Record<ResourceCategory, string> = {
    pdf: "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30",
    spreadsheet: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
    document: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30",
    presentation: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
    image: "bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/30",
    blog_post: "bg-pink-50 text-pink-700 ring-1 ring-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:ring-pink-500/30",
    other: "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[category]}`}>
      {getCategoryLabel(category)}
    </span>
  );
}

function StatusBadge({ status }: { status: ResourceStatus }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Published
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Draft
    </span>
  );
}

// ── Category Icon ─────────────────────────────────────────────────────────────

function ResourceIcon({ category }: { category: ResourceCategory }) {
  const icon_config: Record<ResourceCategory, { bg: string; content: React.ReactNode }> = {
    spreadsheet: {
      bg: "bg-emerald-500/10",
      content: (
        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 20 20">
          <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M3 7H17M7 7V17M13 7V17" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ),
    },
    document: {
      bg: "bg-blue-500/10",
      content: (
        <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 20 20">
          <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M7 6H13M7 9H13M7 12H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
    },
    pdf: {
      bg: "bg-red-500/10",
      content: (
        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 20 20">
          <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <text x="6.5" y="13" fontSize="6" fontWeight="bold" fill="currentColor">PDF</text>
        </svg>
      ),
    },
    presentation: {
      bg: "bg-amber-500/10",
      content: (
        <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 20 20">
          <rect x="2" y="4" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M10 15v3M7 18h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    image: {
      bg: "bg-purple-500/10",
      content: (
        <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 20 20">
          <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="7" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 13l4-4 3 3 2-2 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    blog_post: {
      bg: "bg-pink-500/10",
      content: (
        <svg className="h-5 w-5 text-pink-500" fill="none" viewBox="0 0 20 20">
          <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <path d="M6 6h8M6 9h8M6 12h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
    },
    other: {
      bg: "bg-gray-500/10",
      content: (
        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 20 20">
          <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
    },
  };

  const { bg, content } = icon_config[category] ?? icon_config.other;

  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
      {content}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 px-6 py-4">
      <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-48 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="hidden h-6 w-20 rounded-full bg-gray-100 sm:block dark:bg-gray-800" />
      <div className="hidden h-6 w-20 rounded-full bg-gray-100 md:block dark:bg-gray-800" />
      <div className="hidden h-3 w-24 rounded bg-gray-100 lg:block dark:bg-gray-800" />
      <div className="flex gap-2">
        <div className="h-7 w-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-7 w-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────

interface DeleteModalProps {
  resource: AdminResource;
  is_deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ resource, is_deleting, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
          Delete resource?
        </h3>
        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
          You are about to delete{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            &ldquo;{resource.title}&rdquo;
          </span>
          .
        </p>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          This will also permanently delete all{" "}
          <span className="font-medium text-red-600 dark:text-red-400">
            {resource.files.length} attached {resource.files.length === 1 ? "file" : "files"}
          </span>
          . This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={is_deleting}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={is_deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {is_deleting && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {is_deleting ? "Deleting…" : "Delete resource"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({
  search_term,
  onClearFilters,
  onNew,
}: {
  search_term: string;
  onClearFilters: () => void;
  onNew: () => void;
}) {
  const has_filter = Boolean(search_term);
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <h3 className="mb-1 text-base font-semibold text-gray-700 dark:text-gray-300">
        {has_filter ? "No results found" : "No resources yet"}
      </h3>
      <p className="mb-5 text-sm text-gray-400 dark:text-gray-500">
        {has_filter
          ? `Nothing matched "${search_term}". Try adjusting your filters.`
          : "Create your first resource to share documents with clients."}
      </p>
      {has_filter ? (
        <button
          onClick={onClearFilters}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Clear filters
        </button>
      ) : (
        <button
          onClick={onNew}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New resource
        </button>
      )}
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

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-gray-800">
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Showing <span className="font-medium text-gray-600 dark:text-gray-300">{from}–{to}</span> of{" "}
        <span className="font-medium text-gray-600 dark:text-gray-300">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={current_page === 1}
          onClick={() => onPageChange(current_page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-white/5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        {Array.from({ length: last_page }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
              page === current_page
                ? "bg-brand-500 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          disabled={current_page === last_page}
          onClick={() => onPageChange(current_page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-white/5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminResourcesContent() {
  const router = useRouter();

  const [resources, setResources] = useState<AdminResource[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category_filter, setCategoryFilter] = useState<ResourceCategory | "all">("all");
  const [status_filter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [current_page, setCurrentPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Delete state
  const [confirm_delete, setConfirmDelete] = useState<AdminResource | null>(null);
  const [is_deleting, setIsDeleting] = useState(false);

  // Toggle status loading set
  const [toggling_ids, setTogglingIds] = useState<Set<number>>(new Set());

  const debounced_search = useDebounce(search, 400);

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listAdminResources({
        page: current_page,
        per_page: RESOURCES_PER_PAGE,
        search: debounced_search || undefined,
        category: category_filter,
        status: status_filter,
      });
      setResources(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch {
      setError("Failed to load resources. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [current_page, debounced_search, category_filter, status_filter]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: ResourceCategory | "all") => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: "all" | "published" | "draft") => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const handleEdit = (id: number) => {
    router.push(`/admin/resources/${id}/edit`);
  };

  const handleToggleStatus = async (resource: AdminResource) => {
    const new_status = resource.status === "published" ? "draft" : "published";
    setTogglingIds((prev) => new Set(prev).add(resource.id));
    try {
      const updated = await toggleAdminResourceStatus(resource.id, new_status);
      setResources((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch {
      // Leave state unchanged on error
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(resource.id);
        return next;
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirm_delete) return;
    setIsDeleting(true);
    try {
      await deleteAdminResource(confirm_delete.id);
      setResources((prev) => prev.filter((r) => r.id !== confirm_delete.id));
      setTotal((t) => t - 1);
      setConfirmDelete(null);
    } catch {
      // Keep modal open on error
    } finally {
      setIsDeleting(false);
    }
  };

  const is_filtered = search !== "" || category_filter !== "all" || status_filter !== "all";

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resources</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Manage documents and files shared with client organizations.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/resources/new")}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Resource
        </button>
      </div>

      {/* ── Filters Card ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by title…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:placeholder-gray-500"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={status_filter}
            onChange={(e) => handleStatusChange(e.target.value as "all" | "published" | "draft")}
            className="rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          {/* Clear filters */}
          {is_filtered && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="mt-3 flex flex-wrap gap-2">
          {category_options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleCategoryChange(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category_filter === opt.value
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
          <button onClick={fetchResources} className="ml-auto font-semibold underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Resources Table ───────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {/* Table header */}
        <div className="hidden border-b border-gray-100 bg-gray-50/80 px-6 py-3 dark:border-gray-700 dark:bg-gray-800/50 sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] sm:items-center sm:gap-4">
          <div className="w-9" />
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Resource</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Category</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</p>
          <p className="hidden text-xs font-semibold uppercase tracking-wider text-gray-400 lg:block dark:text-gray-500">Files</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Actions</p>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {is_loading ? (
            Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
          ) : resources.length === 0 ? (
            <EmptyState
              search_term={search}
              onClearFilters={clearFilters}
              onNew={() => router.push("/admin/resources/new")}
            />
          ) : (
            resources.map((resource) => {
              const is_toggling = toggling_ids.has(resource.id);
              return (
                <div
                  key={resource.id}
                  className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-gray-50/50 sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] sm:items-center sm:gap-4 dark:hover:bg-white/[0.02]"
                >
                  {/* Icon */}
                  <ResourceIcon category={resource.category} />

                  {/* Title + org */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                      {resource.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                      {resource.organization
                        ? resource.organization.name
                        : "All organizations"}
                      {resource.description && (
                        <>
                          {" · "}
                          <span className="italic">
                            {resource.description.slice(0, 60)}
                            {resource.description.length > 60 ? "…" : ""}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Category */}
                  <CategoryBadge category={resource.category} />

                  {/* Status */}
                  <StatusBadge status={resource.status} />

                  {/* File count */}
                  <div className="hidden items-center gap-1.5 lg:flex">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {resource.files.length} {resource.files.length === 1 ? "file" : "files"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Toggle status */}
                    <button
                      onClick={() => handleToggleStatus(resource)}
                      disabled={is_toggling}
                      title={resource.status === "published" ? "Set to Draft" : "Publish"}
                      className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        resource.status === "published"
                          ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                      }`}
                    >
                      {is_toggling ? (
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : resource.status === "published" ? (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                          Unpublish
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Publish
                        </>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(resource.id)}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                      Edit
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setConfirmDelete(resource)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-gray-600 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
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

      {/* ── Stats Summary ─────────────────────────────────────────────────────── */}
      {!is_loading && !error && total > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          {total} total {total === 1 ? "resource" : "resources"}
          {is_filtered && " matching current filters"}
        </p>
      )}

      {/* ── Delete Modal ──────────────────────────────────────────────────────── */}
      {confirm_delete && (
        <DeleteModal
          resource={confirm_delete}
          is_deleting={is_deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
