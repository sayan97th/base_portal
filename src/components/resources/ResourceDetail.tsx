"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { resourcesService } from "@/services/client/resources.service";
import type { Resource, ResourceFile, ResourceCategory } from "@/types/client/resources";
import { ResourceCategoryIcon } from "./ResourcesPage";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date_string: string): string {
  return new Date(date_string).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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

function getFileTypeLabel(file_type: string): string {
  const labels: Record<string, string> = {
    pdf: "PDF",
    xlsx: "Excel",
    xls: "Excel",
    csv: "CSV",
    docx: "Word",
    doc: "Word",
    pptx: "PowerPoint",
    ppt: "PowerPoint",
    png: "PNG Image",
    jpg: "JPG Image",
    jpeg: "JPEG Image",
    gif: "GIF Image",
    other: "File",
  };
  return labels[file_type] ?? file_type.toUpperCase();
}

// ── File Type Icon ────────────────────────────────────────────────────────────

function FileTypeIcon({ file_type }: { file_type: string }) {
  const get_color_class = () => {
    if (["pdf"].includes(file_type)) return { stroke: "#F04438", bg: "bg-error-100 dark:bg-error-500/20" };
    if (["xlsx", "xls", "csv"].includes(file_type)) return { stroke: "#12B76A", bg: "bg-success-100 dark:bg-success-500/20" };
    if (["docx", "doc"].includes(file_type)) return { stroke: "#0BA5EC", bg: "bg-blue-light-100 dark:bg-blue-light-500/20" };
    if (["pptx", "ppt"].includes(file_type)) return { stroke: "#F79009", bg: "bg-warning-100 dark:bg-warning-500/20" };
    if (["png", "jpg", "jpeg", "gif"].includes(file_type)) return { stroke: "#9333EA", bg: "bg-purple-100 dark:bg-purple-500/20" };
    return { stroke: "#6B7280", bg: "bg-gray-100 dark:bg-gray-800" };
  };

  const { stroke, bg } = get_color_class();

  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="2" width="12" height="16" rx="2" stroke={stroke} strokeWidth="1.5" fill="none" />
        <path d="M7 7h6M7 10h6M7 13h4" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Back button skeleton */}
      <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" />

      {/* Header card skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="flex-1">
            <div className="mb-2 h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="mb-3 h-6 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-3 w-4/6 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>

      {/* Files skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 h-5 w-24 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
              <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="flex-1">
                <div className="mb-1 h-3.5 w-40 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="h-8 w-24 rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── File Row ─────────────────────────────────────────────────────────────────

function FileRow({ file }: { file: ResourceFile }) {
  const [is_downloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(file.download_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(file.download_url, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700 dark:hover:bg-white/[0.04]">
      <FileTypeIcon file_type={file.file_type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{file.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {getFileTypeLabel(file.file_type)}
          {file.size_bytes ? ` · ${formatFileSize(file.size_bytes)}` : ""}
        </p>
      </div>
      <button
        onClick={handleDownload}
        disabled={is_downloading}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-white/10"
      >
        {is_downloading ? (
          <>
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
              <path d="M6 1.5A4.5 4.5 0 0110.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Downloading…
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v6M3.5 6L6 8.5 8.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 10h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Download
          </>
        )}
      </button>
    </div>
  );
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResourceDetail({ resource_id }: { resource_id: number }) {
  const [resource, setResource] = useState<Resource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded_id, setLoadedId] = useState<number | null>(null);

  const is_loading = loaded_id !== resource_id;

  useEffect(() => {
    resourcesService
      .fetchResource(resource_id)
      .then((data) => {
        setResource(data);
        setError(null);
        setLoadedId(resource_id);
      })
      .catch(() => {
        setResource(null);
        setError("Unable to load this resource. It may have been removed or you may not have access.");
        setLoadedId(resource_id);
      });
  }, [resource_id]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back Navigation */}
      <Link
        href="/resources"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3.5L6 8l4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Resources
      </Link>

      {/* Loading */}
      {is_loading && <DetailSkeleton />}

      {/* Error */}
      {!is_loading && error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-6 py-8 text-center dark:border-error-500/30 dark:bg-error-500/10">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-error-100 dark:bg-error-500/20">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="#F04438" strokeWidth="1.5" />
              <path d="M10 6v4.5M10 13v.5" stroke="#F04438" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-error-700 dark:text-error-400">{error}</p>
          <Link
            href="/resources"
            className="mt-3 inline-block text-sm font-medium text-error-600 underline hover:no-underline dark:text-error-400"
          >
            Return to Resources
          </Link>
        </div>
      )}

      {/* Resource Content */}
      {!is_loading && resource && (
        <>
          {/* Header Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <ResourceCategoryIcon category={resource.category} size={22} />
              <div className="flex-1">
                <span
                  className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${category_badge_styles[resource.category]}`}
                >
                  {getCategoryLabel(resource.category)}
                </span>
                <h1 className="text-xl font-bold leading-snug text-gray-900 dark:text-white">
                  {resource.title}
                </h1>
                <p className="mt-1.5 text-sm text-gray-400 dark:text-gray-500">
                  Added {formatDate(resource.created_at)}
                  {resource.updated_at !== resource.created_at && (
                    <> · Updated {formatDate(resource.updated_at)}</>
                  )}
                </p>
              </div>
              {resource.files.length > 0 && (
                <div className="self-start rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-white/5 dark:text-gray-400">
                  {resource.files.length} {resource.files.length === 1 ? "file" : "files"}
                </div>
              )}
            </div>

            {resource.description && (
              <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {resource.description}
                </p>
              </div>
            )}
          </div>

          {/* Files Section */}
          {resource.files.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Attachments
                </h2>
                {resource.files.length > 1 && (
                  <button
                    onClick={() => resource.files.forEach((f) => window.open(f.download_url, "_blank"))}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 2v6M3.5 6L6 8.5 8.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 10h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    Download all
                  </button>
                )}
              </div>
              <div className="space-y-2.5">
                {resource.files.map((file) => (
                  <FileRow key={file.id} file={file} />
                ))}
              </div>
            </div>
          )}

          {resource.files.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="5" y="3" width="10" height="14" rx="2" stroke="#9CA3AF" strokeWidth="1.5" fill="none" />
                  <path d="M8 8h4M8 11h3" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500">No files attached to this resource.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
