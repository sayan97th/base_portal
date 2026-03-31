"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { NewsPost, PostType } from "@/types/admin/news";
import {
  newsPublicService,
  type PublicNewsPaginatedResponse,
} from "@/services/client/news.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const POSTS_PER_PAGE = 12;

// ── Type config ───────────────────────────────────────────────────────────────

interface TypeConfig {
  label: string;
  bg: string;
  badge_bg: string;
  badge_text: string;
  gradient: string;
  icon: React.ReactNode;
}

const TYPE_CONFIG: Record<PostType, TypeConfig> = {
  promo: {
    label: "Promo",
    bg: "bg-emerald-500",
    badge_bg: "bg-emerald-100 dark:bg-emerald-500/20",
    badge_text: "text-emerald-700 dark:text-emerald-300",
    gradient: "from-teal-400 via-emerald-500 to-green-500",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L10.2 5.4L15 6.1L11.5 9.5L12.3 14.3L8 12L3.7 14.3L4.5 9.5L1 6.1L5.8 5.4L8 1Z" fill="currentColor" />
      </svg>
    ),
  },
  news: {
    label: "News",
    bg: "bg-brand-500",
    badge_bg: "bg-blue-100 dark:bg-blue-500/20",
    badge_text: "text-blue-700 dark:text-blue-300",
    gradient: "from-blue-500 via-brand-500 to-indigo-500",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M2 3H14V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M2 3H14V5H2V3Z" fill="currentColor" />
        <path d="M4 7H8M4 9.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  blog_post: {
    label: "Blog Post",
    bg: "bg-sky-500",
    badge_bg: "bg-sky-100 dark:bg-sky-500/20",
    badge_text: "text-sky-700 dark:text-sky-300",
    gradient: "from-sky-400 via-blue-500 to-cyan-500",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  tip: {
    label: "Tip",
    bg: "bg-amber-500",
    badge_bg: "bg-amber-100 dark:bg-amber-500/20",
    badge_text: "text-amber-700 dark:text-amber-300",
    gradient: "from-amber-400 via-orange-400 to-yellow-500",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 1C5.24 1 3 3.24 3 6c0 1.74.9 3.27 2.25 4.14V12h5.5v-1.86A5 5 0 0013 6c0-2.76-2.24-5-5-5zM5.75 13.5h4.5v.75a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75V13.5z" fill="currentColor" opacity=".9" />
      </svg>
    ),
  },
};

const TYPE_FILTER_OPTIONS: { label: string; value: PostType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Blog Posts", value: "blog_post" },
  { label: "News", value: "news" },
  { label: "Promos", value: "promo" },
  { label: "Tips", value: "tip" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date_string: string): string {
  return new Date(date_string).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSnippet(post: NewsPost, max_length = 100): string {
  const text = post.subtitle || post.description || "";
  if (text.length <= max_length) return text;
  return text.slice(0, max_length).trimEnd() + "…";
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="h-44 animate-pulse bg-gray-100 dark:bg-gray-800" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: NewsPost;
}

function PostCard({ post }: PostCardProps) {
  const cfg = TYPE_CONFIG[post.type];
  const snippet = getSnippet(post);

  return (
    <Link
      href={`/news/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-white/3 dark:hover:bg-white/5"
    >
      {/* Card header — image or gradient */}
      <div className="relative h-44 overflow-hidden">
        {post.image_url ? (
          <>
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </>
        ) : post.type === "promo" && post.discount_value ? (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${cfg.gradient} relative overflow-hidden`}
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="text-center text-white">
              <p className="text-4xl font-extrabold leading-none drop-shadow-lg">
                {post.discount_value}%
              </p>
              <p className="mt-0.5 text-sm font-semibold opacity-90">Off</p>
              {post.discount_label && (
                <p className="mt-1 text-xs opacity-75">{post.discount_label}</p>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`flex h-full w-full items-end bg-gradient-to-br ${cfg.gradient} relative overflow-hidden p-4`}
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/10" />
          </div>
        )}

        {/* Type badge overlay */}
        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} text-white shadow-sm`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
        </div>

        {/* Featured dot */}
        {post.is_featured && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-700 shadow-sm dark:bg-black/60 dark:text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Featured
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
          {formatDate(post.updated_at)}
        </p>

        <h3 className="mt-1.5 text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 line-clamp-2">
          {post.title}
        </h3>

        {snippet && (
          <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-3">
            {snippet}
          </p>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Read more link */}
        <div className="mt-auto pt-4">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition-all group-hover:gap-2 dark:text-brand-400">
            Read more
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ active_filter }: { active_filter: PostType | "all" }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="rounded-2xl bg-gray-100 p-5 dark:bg-gray-800">
        <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-white/80">
          {active_filter === "all" ? "No posts yet" : `No ${TYPE_CONFIG[active_filter].label.toLowerCase()} posts yet`}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Check back soon for updates.
        </p>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  current_page: number;
  last_page: number;
  onPageChange: (page: number) => void;
}

function Pagination({ current_page, last_page, onPageChange }: PaginationProps) {
  if (last_page <= 1) return null;

  const pages: (number | "…")[] = [];
  if (last_page <= 7) {
    for (let i = 1; i <= last_page; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current_page > 3) pages.push("…");
    for (let i = Math.max(2, current_page - 1); i <= Math.min(last_page - 1, current_page + 1); i++) {
      pages.push(i);
    }
    if (current_page < last_page - 2) pages.push("…");
    pages.push(last_page);
  }

  return (
    <div className="mt-10 flex items-center justify-center gap-1.5">
      <button
        onClick={() => onPageChange(current_page - 1)}
        disabled={current_page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/5"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-xs text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-semibold transition ${
              p === current_page
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-white/5"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(current_page + 1)}
        disabled={current_page === last_page}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/5"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NewsListPage() {
  const [result, setResult] = useState<PublicNewsPaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [active_filter, setActiveFilter] = useState<PostType | "all">("all");
  const [current_page, setCurrentPage] = useState(1);

  const fetchPosts = useCallback(
    async (page: number, type: PostType | "all") => {
      setLoading(true);
      try {
        const data = await newsPublicService.fetchActivePostsPaginated({
          page,
          per_page: POSTS_PER_PAGE,
          type,
        });
        setResult(data);
      } catch {
        setResult({ posts: [], current_page: 1, last_page: 1, total: 0 });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPosts(current_page, active_filter);
  }, [current_page, active_filter, fetchPosts]);

  const handleFilterChange = useCallback((filter: PostType | "all") => {
    setActiveFilter(filter);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const posts = result?.posts ?? [];

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-3">
          <Link
            href="/"
            className="transition hover:text-gray-600 dark:hover:text-gray-300"
          >
            Dashboard
          </Link>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-gray-600 dark:text-gray-300">News</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              News &amp; Updates
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Stay up to date with the latest posts, promos, and tips.
            </p>
          </div>
          {result && result.total > 0 && (
            <p className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
              {result.total} {result.total === 1 ? "post" : "posts"}
            </p>
          )}
        </div>

        {/* Type filter chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                active_filter === opt.value
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              }`}
            >
              {opt.value !== "all" && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    active_filter === opt.value ? "bg-white/70" : TYPE_CONFIG[opt.value as PostType].bg
                  }`}
                />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <EmptyState active_filter={active_filter} />
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      {/* Pagination */}
      {!loading && result && result.last_page > 1 && (
        <Pagination
          current_page={result.current_page}
          last_page={result.last_page}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
