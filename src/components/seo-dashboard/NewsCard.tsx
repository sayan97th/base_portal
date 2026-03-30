"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { NewsPost, PostType } from "@/types/admin/news";
import { newsPublicService } from "@/services/client/news.service";

// ── Type config ───────────────────────────────────────────────────────────────

interface TypeConfig {
  bg: string;
  gradient: string;
  icon: React.ReactNode;
}

const TYPE_CONFIG: Record<PostType, TypeConfig> = {
  promo: {
    bg: "bg-success-500",
    gradient: "from-teal-400 to-emerald-500",
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
    gradient: "from-brand-400 to-blue-500",
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
    bg: "bg-blue-light-500",
    gradient: "from-blue-400 to-blue-light-500",
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
  tip: {
    bg: "bg-warning-500",
    gradient: "from-amber-400 to-orange-400",
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
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="h-40 flex-1 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 sm:h-auto" />
      <div className="flex-1 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Featured left panel ───────────────────────────────────────────────────────

function FeaturedPanel({ post }: { post: NewsPost }) {
  const cfg = TYPE_CONFIG[post.type];

  if (post.image_url) {
    return (
      <div className="relative h-40 flex-1 overflow-hidden rounded-xl sm:h-auto">
        <img
          src={post.image_url}
          alt={post.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="line-clamp-2 text-xs font-bold leading-tight text-white">
            {post.title}
          </p>
          {post.subtitle && (
            <p className="mt-0.5 line-clamp-1 text-xs text-white/80">{post.subtitle}</p>
          )}
        </div>
      </div>
    );
  }

  if (post.type === "promo" && post.discount_value) {
    return (
      <div
        className="relative flex h-40 flex-1 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-teal-400 to-emerald-500 sm:h-auto"
      >
        {/* Decorative circles */}
        <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-4 h-20 w-20 rounded-full bg-white/10" />
        <div className="relative text-center text-white">
          <p className="text-2xl font-bold leading-tight">
            {post.discount_value}% Off
          </p>
          <p className="text-sm opacity-90">
            {post.discount_label ?? "All Services"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-40 flex-1 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br ${cfg.gradient} sm:h-auto`}
    >
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="relative text-center text-white">
        <p className="line-clamp-3 px-3 text-sm font-bold leading-snug">
          {post.title}
        </p>
        {post.subtitle && (
          <p className="mt-1 line-clamp-2 px-3 text-xs opacity-90">
            {post.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ── List item ─────────────────────────────────────────────────────────────────

function NewsListItem({ post }: { post: NewsPost }) {
  const cfg = TYPE_CONFIG[post.type];
  const display_text = post.subtitle || post.description || "";

  const content = (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg} text-white`}
      >
        {cfg.icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
          {post.title}
        </p>
        {display_text && (
          <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
            {display_text}
          </p>
        )}
      </div>
    </div>
  );

  if (post.cta_url) {
    return (
      <a
        href={post.cta_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-opacity hover:opacity-80"
      >
        {content}
      </a>
    );
  }

  return <div>{content}</div>;
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
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

// ── Main component ────────────────────────────────────────────────────────────

export default function NewsCard() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    newsPublicService
      .fetchActivePosts({ limit: 8 })
      .then((data) => {
        // Featured posts first, then by sort_order
        const sorted = [...data].sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return a.sort_order - b.sort_order;
        });
        setPosts(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const featured = posts[0] ?? null;
  const list_items = posts.slice(1, 4); // up to 3 items on the right

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          News
        </h3>
        {posts.length > 0 && (
          <Link
            href="/news"
            className="flex items-center gap-1 text-xs font-medium text-gray-400 transition hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            View all
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
      </div>

      {loading ? (
        <NewsCardSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Featured item — left */}
          {featured && (
            <div className="flex-1">
              <FeaturedPanel post={featured} />
            </div>
          )}

          {/* List items — right */}
          {list_items.length > 0 && (
            <div className="flex-1 space-y-3">
              {list_items.map((post) => (
                <NewsListItem key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
