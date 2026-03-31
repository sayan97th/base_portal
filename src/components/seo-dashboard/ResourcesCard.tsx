"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { resourcesService } from "@/services/client/resources.service";
import type { Resource, ResourceCategory } from "@/types/client/resources";
import { ResourceCategoryIcon } from "@/components/resources/ResourcesPage";

// ── Skeleton ─────────────────────────────────────────────────────────────────

function ResourceItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg p-2">
      <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ── Category Label ────────────────────────────────────────────────────────────

function getCategoryLabel(category: ResourceCategory): string {
  const labels: Record<ResourceCategory, string> = {
    pdf: "PDF",
    spreadsheet: "Spreadsheet",
    document: "Document",
    presentation: "Presentation",
    image: "Image",
    blog_post: "Blog Post",
    other: "File",
  };
  return labels[category] ?? "File";
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResourcesCard() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [is_loading, setIsLoading] = useState(true);

  useEffect(() => {
    resourcesService
      .fetchLatestResources(5)
      .then(setResources)
      .catch(() => setResources([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Resources</h3>
        <Link
          href="/resources"
          className="text-xs font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
        >
          View all
        </Link>
      </div>

      {/* List */}
      <div className="flex-1 space-y-1">
        {is_loading ? (
          <>
            <ResourceItemSkeleton />
            <ResourceItemSkeleton />
            <ResourceItemSkeleton />
          </>
        ) : resources.length > 0 ? (
          resources.map((resource) => (
            <Link
              key={resource.id}
              href={`/resources/${resource.id}`}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <ResourceCategoryIcon category={resource.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                  {resource.title}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {getCategoryLabel(resource.category)}
                  {resource.files?.length > 0 && ` · ${resource.files.length} ${resource.files.length === 1 ? "file" : "files"}`}
                </p>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="shrink-0 text-gray-300 dark:text-gray-600"
              >
                <path d="M5 3.5L8.5 7 5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="3" y="2" width="12" height="14" rx="2" stroke="#9CA3AF" strokeWidth="1.3" fill="none" />
                <path d="M6 6h6M6 9h4" stroke="#9CA3AF" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">No resources available yet.</p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      {!is_loading && resources.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Link
            href="/resources"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/5"
          >
            Browse all resources
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M6.5 3.5L9 6l-2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
