"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { NewsPost, PostType } from "@/types/admin/news";
import { newsPublicService } from "@/services/client/news.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const SLIDE_DURATION_MS = 5000;
const PROGRESS_TICK_MS = 40;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateShort(date_str: string): string {
  return new Date(date_str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  PostType,
  { label: string; gradient: string; dot: string; icon: React.ReactNode }
> = {
  promo: {
    label: "Promo",
    gradient: "from-amber-500 to-orange-500",
    dot: "bg-amber-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  news: {
    label: "News",
    gradient: "from-blue-500 to-brand-500",
    dot: "bg-blue-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
  },
  blog_post: {
    label: "Blog Post",
    gradient: "from-purple-500 to-violet-500",
    dot: "bg-purple-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      </svg>
    ),
  },
  tip: {
    label: "Tip",
    gradient: "from-emerald-500 to-teal-500",
    dot: "bg-emerald-500",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
};

// ── Slide card ────────────────────────────────────────────────────────────────

function SlideCard({ post }: { post: NewsPost }) {
  const cfg = TYPE_CONFIG[post.type];
  const tags = post.tags ?? [];

  return (
    <div className="news-feed-slide flex flex-col gap-3">
      {/* Hero area */}
      {post.image_url ? (
        <div className="relative h-32 overflow-hidden rounded-xl">
          <img
            src={post.image_url}
            alt={post.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {/* overlay title */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="line-clamp-2 text-sm font-bold leading-tight text-white">
              {post.title}
            </p>
          </div>
          {post.is_featured && (
            <span className="absolute right-2 top-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
              Featured
            </span>
          )}
        </div>
      ) : post.type === "promo" && post.discount_value ? (
        <div
          className={`relative flex h-32 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${cfg.gradient}`}
        >
          {/* Decorative circles */}
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative text-center text-white">
            <p className="text-5xl font-black leading-none tracking-tight">
              {post.discount_value}%
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest opacity-90">
              {post.discount_label ?? "Off"}
            </p>
          </div>
          {post.is_featured && (
            <span className="absolute right-2 top-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
              Featured
            </span>
          )}
        </div>
      ) : (
        <div
          className={`flex h-32 items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-br ${cfg.gradient}/10 px-4`}
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${cfg.gradient} text-white shadow-md`}
          >
            {cfg.icon}
          </div>
          <p className="line-clamp-3 text-sm font-bold leading-snug text-gray-800 dark:text-white">
            {post.title}
          </p>
        </div>
      )}

      {/* Content (only when there's an image — title shown in overlay otherwise) */}
      {post.image_url ? null : (
        post.type !== "promo" || !post.discount_value ? null : (
          <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
            {post.title}
          </p>
        )
      )}

      {/* Subtitle / description */}
      {post.subtitle && (
        <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
          {post.subtitle}
        </p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {/* Date range for promos */}
        {post.type === "promo" && (post.starts_at || post.ends_at) && (
          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
            </svg>
            {post.starts_at ? formatDateShort(post.starts_at) : "Now"} →{" "}
            {post.ends_at ? formatDateShort(post.ends_at) : "No end"}
          </span>
        )}

        {/* Coupon badge */}
        {post.coupon_code && (
          <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6" />
            </svg>
            {post.coupon_code}
          </span>
        )}

        {/* Tags */}
        {tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      {post.cta_text && post.cta_url && (
        <a
          href={post.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${cfg.gradient} px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90`}
        >
          {post.cta_text}
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function WidgetSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-700" />
      <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
      <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-md bg-gray-100 dark:bg-gray-700" />
        <div className="h-5 w-12 rounded-md bg-gray-100 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function NewsFeedWidget() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const ticker_ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const start_ref = useRef<number>(Date.now());

  useEffect(() => {
    newsPublicService
      .fetchActivePosts({ limit: 10 })
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-advance timer — resets whenever current slide or paused state changes
  useEffect(() => {
    if (posts.length <= 1 || paused) {
      setProgress(0);
      return;
    }

    start_ref.current = Date.now();
    setProgress(0);

    ticker_ref.current = setInterval(() => {
      const elapsed = Date.now() - start_ref.current;
      const pct = Math.min((elapsed / SLIDE_DURATION_MS) * 100, 100);
      setProgress(pct);

      if (elapsed >= SLIDE_DURATION_MS) {
        setCurrent((prev) => (prev + 1) % posts.length);
      }
    }, PROGRESS_TICK_MS);

    return () => {
      if (ticker_ref.current) clearInterval(ticker_ref.current);
    };
  }, [current, posts.length, paused]);

  const goTo = useCallback(
    (index: number) => {
      setCurrent(index);
      setProgress(0);
    },
    []
  );

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + posts.length) % posts.length);
    setProgress(0);
  }, [posts.length]);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % posts.length);
    setProgress(0);
  }, [posts.length]);

  const has_posts = posts.length > 0;
  const post = posts[current];

  return (
    <>
      {/* Inject slide-in animation */}
      <style>{`
        @keyframes newsFeedSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .news-feed-slide {
          animation: newsFeedSlideIn 0.35s ease both;
        }
      `}</style>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {/* Progress bar */}
        <div className="h-0.5 w-full bg-gray-100 dark:bg-gray-800">
          {has_posts && posts.length > 1 && (
            <div
              className={`h-full bg-gradient-to-r ${post ? (TYPE_CONFIG[post.type]?.gradient ?? "from-brand-500 to-blue-500") : "from-brand-500 to-blue-500"} transition-none`}
              style={{ width: `${progress}%` }}
            />
          )}
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-blue-500 text-white shadow-sm">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                News &amp; Promos
              </h2>
            </div>
            <Link
              href="/admin/news"
              className="flex items-center gap-1 text-xs font-medium text-brand-500 transition hover:text-brand-600 dark:text-brand-400"
            >
              Manage
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* Slide content */}
          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {loading ? (
              <WidgetSkeleton />
            ) : !has_posts ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <div className="rounded-xl bg-gray-100 p-4 dark:bg-gray-800">
                  <svg className="h-6 w-6 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">No active posts yet.</p>
                <Link
                  href="/admin/news/new"
                  className="mt-1 text-xs font-semibold text-brand-500 hover:underline"
                >
                  Create your first post →
                </Link>
              </div>
            ) : (
              post && <SlideCard key={`slide-${current}`} post={post} />
            )}
          </div>

          {/* Navigation */}
          {has_posts && posts.length > 1 && (
            <div className="mt-4 flex items-center justify-between">
              {/* Prev / Next */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={goPrev}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition hover:border-gray-300 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={goNext}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition hover:border-gray-300 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>

              {/* Dots */}
              <div className="flex items-center gap-1">
                {posts.map((p, i) => {
                  const dot_color = TYPE_CONFIG[p.type]?.dot ?? "bg-gray-400";
                  return (
                    <button
                      key={p.id}
                      onClick={() => goTo(i)}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        i === current
                          ? `w-5 ${dot_color}`
                          : "w-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Counter */}
              <span className="text-xs text-gray-400 dark:text-gray-600">
                {current + 1} / {posts.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
