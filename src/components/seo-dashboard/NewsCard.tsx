"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NewsPost, PostType } from "@/types/admin/news";
import { newsPublicService } from "@/services/client/news.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const SLIDE_INTERVAL = 4500;
const MAX_LIST_ITEMS = 5;

// ── Type config ───────────────────────────────────────────────────────────────

interface TypeConfig {
  bg: string;
  gradient: string;
  icon: React.ReactNode;
}

const TYPE_CONFIG: Record<PostType, TypeConfig> = {
  promo: {
    bg: "bg-emerald-500",
    gradient: "from-teal-400 via-emerald-500 to-green-500",
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
    gradient: "from-blue-500 via-brand-500 to-indigo-500",
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
    gradient: "from-sky-400 via-blue-500 to-cyan-500",
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
    gradient: "from-amber-400 via-orange-400 to-yellow-500",
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
      <div className="h-52 flex-1 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800 sm:h-auto" />
      <div className="flex-1 space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
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

// ── Featured panel ─────────────────────────────────────────────────────────────

interface FeaturedPanelProps {
  post: NewsPost;
  is_fading: boolean;
  active_index: number;
  total: number;
  progress_width: number;
}

function FeaturedPanel({
  post,
  is_fading,
  active_index,
  total,
  progress_width,
}: FeaturedPanelProps) {
  const cfg = TYPE_CONFIG[post.type];

  const renderContent = () => {
    if (post.image_url) {
      return (
        <>
          <img
            src={post.image_url}
            alt={post.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute bottom-14 left-0 right-0 p-4">
            <span className="mb-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              {post.type.replace("_", " ")}
            </span>
            <p className="text-base font-bold leading-snug text-white drop-shadow">
              {post.title}
            </p>
            {post.subtitle && (
              <p className="mt-1 text-xs text-white/80 line-clamp-2">{post.subtitle}</p>
            )}
            {post.description && !post.subtitle && (
              <p className="mt-1 text-xs text-white/80 line-clamp-3">{post.description}</p>
            )}
          </div>
        </>
      );
    }

    if (post.type === "promo" && post.discount_value) {
      return (
        <>
          {/* Decorative blobs */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute right-4 bottom-16 h-16 w-16 rounded-full bg-white/5" />

          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <span className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/70">
              Special Offer
            </span>
            <p className="text-5xl font-extrabold leading-none text-white drop-shadow-lg">
              {post.discount_value}%
            </p>
            <p className="mt-0.5 text-lg font-bold text-white/90">Off</p>
            <div className="my-3 h-px w-12 bg-white/30" />
            <p className="text-sm font-medium text-white/90">
              {post.discount_label ?? "All Services"}
            </p>
            {post.subtitle && (
              <p className="mt-1 text-xs text-white/70 line-clamp-2">{post.subtitle}</p>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        {/* Decorative blobs */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10" />

        <div className="absolute inset-0 flex flex-col justify-center p-5 pb-14">
          <span className="mb-2 inline-block w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
            {post.type.replace("_", " ")}
          </span>
          <p className="text-base font-bold leading-snug text-white">
            {post.title}
          </p>
          {post.subtitle && (
            <p className="mt-2 text-xs text-white/80 line-clamp-3">{post.subtitle}</p>
          )}
          {post.description && !post.subtitle && (
            <p className="mt-2 text-xs text-white/80 line-clamp-4">{post.description}</p>
          )}
        </div>
      </>
    );
  };

  const background_class =
    post.image_url ? "bg-gray-900" : `bg-gradient-to-br ${cfg.gradient}`;

  return (
    <div
      className={`relative h-full min-h-[220px] w-full overflow-hidden rounded-2xl ${background_class} transition-opacity duration-300 ${
        is_fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {renderContent()}

      {/* CTA button */}
      {post.cta_url && (
        <a
          href={post.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-9 right-3 z-10 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
        >
          {post.cta_text ?? "Learn more"} →
        </a>
      )}

      {/* Bottom bar: dots + progress */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
        {/* Dots */}
        <div className="mb-1.5 flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active_index
                  ? "w-4 bg-white"
                  : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
        {/* Progress bar */}
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white/70"
            style={{
              width: `${progress_width}%`,
              transition: progress_width === 0 ? "none" : `width ${SLIDE_INTERVAL}ms linear`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── List item ──────────────────────────────────────────────────────────────────

interface NewsListItemProps {
  post: NewsPost;
  is_active: boolean;
  onClick: () => void;
}

function NewsListItem({ post, is_active, onClick }: NewsListItemProps) {
  const cfg = TYPE_CONFIG[post.type];
  const display_text = post.subtitle || post.description || "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-xl p-2 text-left transition-all duration-200 ${
        is_active
          ? "bg-gray-50 dark:bg-white/5 ring-1 ring-gray-200 dark:ring-white/10"
          : "hover:bg-gray-50 dark:hover:bg-white/5"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Type badge */}
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg} text-white shadow-sm`}
        >
          {cfg.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-semibold transition-colors ${
              is_active
                ? "text-gray-900 dark:text-white"
                : "text-gray-700 dark:text-white/80 group-hover:text-gray-900 dark:group-hover:text-white"
            }`}
          >
            {post.title}
          </p>
          {display_text && (
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-400 dark:text-gray-500">
              {display_text}
            </p>
          )}
        </div>

        {/* Active indicator arrow */}
        {is_active && (
          <div className="mt-2 shrink-0">
            <svg
              className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function NewsCard() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [display_index, setDisplayIndex] = useState(0);
  const [is_fading, setIsFading] = useState(false);
  const [progress_width, setProgressWidth] = useState(0);

  // Refs to avoid stale closures in interval callbacks
  const active_index_ref = useRef(0);
  const posts_ref = useRef<NewsPost[]>([]);
  const interval_ref = useRef<NodeJS.Timeout | null>(null);
  const fade_timeout_ref = useRef<NodeJS.Timeout | null>(null);
  const progress_reset_ref = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    newsPublicService
      .fetchActivePosts({ limit: 10 })
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return a.sort_order - b.sort_order;
        });
        posts_ref.current = sorted;
        setPosts(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startProgressBar = useCallback(() => {
    // Reset to 0 instantly, then animate to 100
    if (progress_reset_ref.current) clearTimeout(progress_reset_ref.current);
    setProgressWidth(0);
    progress_reset_ref.current = setTimeout(() => {
      setProgressWidth(100);
    }, 50);
  }, []);

  const goToIndex = useCallback(
    (index: number) => {
      // Cancel any pending fade
      if (fade_timeout_ref.current) clearTimeout(fade_timeout_ref.current);

      setIsFading(true);
      fade_timeout_ref.current = setTimeout(() => {
        active_index_ref.current = index;
        setDisplayIndex(index);
        setIsFading(false);
        startProgressBar();
      }, 280);
    },
    [startProgressBar]
  );

  const startAutoPlay = useCallback(() => {
    if (interval_ref.current) clearInterval(interval_ref.current);
    interval_ref.current = setInterval(() => {
      const total = posts_ref.current.length;
      if (total === 0) return;
      const next = (active_index_ref.current + 1) % total;
      goToIndex(next);
    }, SLIDE_INTERVAL);
  }, [goToIndex]);

  // Start auto-play once posts are loaded
  useEffect(() => {
    if (posts.length === 0) return;
    // Defer setState call to avoid synchronous state update inside effect body
    const init_timeout = setTimeout(() => startProgressBar(), 0);
    startAutoPlay();
    return () => {
      clearTimeout(init_timeout);
      if (interval_ref.current) clearInterval(interval_ref.current);
      if (fade_timeout_ref.current) clearTimeout(fade_timeout_ref.current);
      if (progress_reset_ref.current) clearTimeout(progress_reset_ref.current);
    };
  }, [posts.length, startAutoPlay, startProgressBar]);

  const handleItemClick = useCallback(
    (index: number) => {
      if (index === active_index_ref.current) return;
      goToIndex(index);
      startAutoPlay(); // reset the interval
    },
    [goToIndex, startAutoPlay]
  );

  const visible_posts = posts.slice(0, MAX_LIST_ITEMS);
  const active_post = posts[display_index] ?? null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          News
        </h3>
        {posts.length > 0 && (
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

      {loading ? (
        <NewsCardSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {/* Featured preview — left */}
          {active_post && (
            <div className="flex-1 self-stretch">
              <FeaturedPanel
                post={active_post}
                is_fading={is_fading}
                active_index={display_index}
                total={visible_posts.length}
                progress_width={progress_width}
              />
            </div>
          )}

          {/* List — right */}
          {visible_posts.length > 0 && (
            <div className="flex flex-1 flex-col justify-center gap-0.5">
              {visible_posts.map((post, index) => (
                <NewsListItem
                  key={post.id}
                  post={post}
                  is_active={index === display_index}
                  onClick={() => handleItemClick(index)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
