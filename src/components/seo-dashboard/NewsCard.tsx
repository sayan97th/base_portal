"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { NewsPost, PostType } from "@/types/admin/news";
import { newsPublicService } from "@/services/client/news.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_LIST_ITEMS = 3;

// ── Type config ───────────────────────────────────────────────────────────────

interface TypeConfig {
  bg: string;
  label: string;
  pill: string;
  icon: React.ReactNode;
}

const TYPE_CONFIG: Record<PostType, TypeConfig> = {
  promo: {
    bg: "bg-emerald-500",
    label: "Promo",
    pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1L10.2 5.4L15 6.1L11.5 9.5L12.3 14.3L8 12L3.7 14.3L4.5 9.5L1 6.1L5.8 5.4L8 1Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  news: {
    bg: "bg-brand-500",
    label: "News",
    pill: "bg-blue-50 text-blue-700 dark:bg-brand-500/10 dark:text-brand-400",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M2 3H14V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <path d="M2 3H14V5H2V3Z" fill="currentColor" />
        <path
          d="M4 7H8M4 9.5H10"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  blog_post: {
    bg: "bg-sky-500",
    label: "Blog",
    pill: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <path
          d="M5 8h6M5 11h4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  tip: {
    bg: "bg-amber-500",
    label: "Tip",
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2V14M8 2L4.5 5.5M8 2L11.5 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function NewsCardSkeleton() {
  return (
    <div className="flex-1 space-y-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl p-3">
          <div className="mt-0.5 h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 w-36 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-12 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="rounded-xl bg-gray-100 p-4 dark:bg-gray-800">
        <svg
          className="h-6 w-6 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535"
          />
        </svg>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        No news or promos right now.
      </p>
    </div>
  );
}

// ── List item ──────────────────────────────────────────────────────────────────

interface NewsListItemProps {
  post: NewsPost;
}

function NewsListItem({ post }: NewsListItemProps) {
  const cfg = TYPE_CONFIG[post.type];
  const display_text = post.subtitle || post.description || "";

  const inner = (
    <div className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg} text-white shadow-sm`}
      >
        {cfg.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-semibold leading-snug text-gray-800 dark:text-white/90">
            {post.title}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.pill}`}
          >
            {cfg.label}
          </span>
        </div>
        {display_text && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-400 dark:text-gray-500">
            {display_text}
          </p>
        )}
      </div>
    </div>
  );

  if (post.cta_url) {
    return (
      <a href={post.cta_url} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <div>{inner}</div>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NewsCard() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    newsPublicService
      .fetchActivePosts({ limit: MAX_LIST_ITEMS })
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return a.sort_order - b.sort_order;
        });
        setPosts(sorted.slice(0, MAX_LIST_ITEMS));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible_posts = posts.slice(0, MAX_LIST_ITEMS);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">News</h3>
        {!loading && visible_posts.length > 0 && (
          <Link
            href="/news"
            className="flex items-center gap-1 text-xs font-medium text-gray-400 transition hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            View all
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <NewsCardSkeleton />
      ) : visible_posts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex-1 space-y-1">
            {visible_posts.map((post) => (
              <NewsListItem key={post.id} post={post} />
            ))}
          </div>

          {/* Footer CTA */}
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Link
              href="/news"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/5"
            >
              Browse all news
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6h8M6.5 3.5L9 6l-2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
