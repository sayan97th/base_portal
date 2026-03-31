"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { NewsPost, PostType } from "@/types/admin/news";
import { newsPublicService } from "@/services/client/news.service";

// ── Type config ───────────────────────────────────────────────────────────────

interface TypeConfig {
  label: string;
  bg: string;
  text: string;
  light_bg: string;
  gradient: string;
  icon: React.ReactNode;
}

const TYPE_CONFIG: Record<PostType, TypeConfig> = {
  promo: {
    label: "Promo",
    bg: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    light_bg: "bg-emerald-50 dark:bg-emerald-500/10",
    gradient: "from-teal-400 via-emerald-500 to-green-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L10.2 5.4L15 6.1L11.5 9.5L12.3 14.3L8 12L3.7 14.3L4.5 9.5L1 6.1L5.8 5.4L8 1Z" fill="currentColor" />
      </svg>
    ),
  },
  news: {
    label: "News",
    bg: "bg-brand-500",
    text: "text-brand-600 dark:text-brand-400",
    light_bg: "bg-blue-50 dark:bg-blue-500/10",
    gradient: "from-blue-500 via-brand-500 to-indigo-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 3H14V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M2 3H14V5H2V3Z" fill="currentColor" />
        <path d="M4 7H8M4 9.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  blog_post: {
    label: "Blog Post",
    bg: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
    light_bg: "bg-sky-50 dark:bg-sky-500/10",
    gradient: "from-sky-400 via-blue-500 to-cyan-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  tip: {
    label: "Tip",
    bg: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    light_bg: "bg-amber-50 dark:bg-amber-500/10",
    gradient: "from-amber-400 via-orange-400 to-yellow-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1C5.24 1 3 3.24 3 6c0 1.74.9 3.27 2.25 4.14V12h5.5v-1.86A5 5 0 0013 6c0-2.76-2.24-5-5-5zM5.75 13.5h4.5v.75a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75V13.5z" fill="currentColor" />
      </svg>
    ),
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date_string: string): string {
  return new Date(date_string).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(date_string: string): string {
  return new Date(date_string).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Hero */}
      <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 sm:h-80 lg:h-96" />
      {/* Content */}
      <div className="mx-auto mt-8 max-w-3xl space-y-4 px-4">
        <div className="h-3 w-24 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-7 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-5 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 rounded bg-gray-100 dark:bg-gray-800" style={{ width: `${85 + Math.random() * 15}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Not found ─────────────────────────────────────────────────────────────────

function PostNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-2xl bg-gray-100 p-6 dark:bg-gray-800">
        <svg className="h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <p className="text-base font-semibold text-gray-800 dark:text-white">Post not found</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          This post may have been removed or is no longer available.
        </p>
      </div>
      <Link
        href="/news"
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to News
      </Link>
    </div>
  );
}

// ── Hero section ──────────────────────────────────────────────────────────────

interface HeroProps {
  post: NewsPost;
}

function Hero({ post }: HeroProps) {
  const cfg = TYPE_CONFIG[post.type];

  if (post.image_url) {
    return (
      <div className="relative h-64 overflow-hidden rounded-2xl sm:h-80 lg:h-[420px]">
        <img
          src={post.image_url}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Deep gradient overlay so text is always readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
          <span
            className={`mb-3 inline-flex w-fit items-center gap-1.5 rounded-full ${cfg.bg} px-3 py-1 text-xs font-semibold text-white shadow-sm`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
          <h1 className="text-xl font-extrabold leading-tight text-white drop-shadow-lg sm:text-3xl lg:text-4xl">
            {post.title}
          </h1>
          {post.subtitle && (
            <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">
              {post.subtitle}
            </p>
          )}
          <p className="mt-3 text-xs text-white/60">{formatDate(post.updated_at)}</p>
        </div>
      </div>
    );
  }

  // Gradient hero (no image)
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.gradient} p-8 sm:p-12`}
    >
      {/* Decorative blobs */}
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute right-20 bottom-10 h-20 w-20 rounded-full bg-white/5" />

      <div className="relative">
        {post.type === "promo" && post.discount_value ? (
          /* Promo hero — big discount display */
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {cfg.icon}
                {cfg.label}
              </span>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl">
                {post.title}
              </h1>
              {post.subtitle && (
                <p className="mt-2 text-sm text-white/80">{post.subtitle}</p>
              )}
              <p className="mt-3 text-xs text-white/60">{formatDate(post.updated_at)}</p>
            </div>
            {/* Big discount badge */}
            <div className="flex shrink-0 flex-col items-center rounded-2xl bg-white/20 p-5 text-center backdrop-blur-sm">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
                Save
              </span>
              <span className="text-5xl font-extrabold leading-none text-white">
                {post.discount_value}%
              </span>
              <span className="mt-0.5 text-sm font-semibold text-white/80">
                {post.discount_label ?? "All Services"}
              </span>
            </div>
          </div>
        ) : (
          /* Standard gradient hero */
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {cfg.icon}
              {cfg.label}
            </span>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl">
              {post.title}
            </h1>
            {post.subtitle && (
              <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">{post.subtitle}</p>
            )}
            <p className="mt-3 text-xs text-white/60">{formatDate(post.updated_at)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Promo info box ────────────────────────────────────────────────────────────

interface PromoBoxProps {
  post: NewsPost;
}

function PromoBox({ post }: PromoBoxProps) {
  const [copied, setCopied] = useState(false);

  const copyCoupon = () => {
    if (!post.coupon_code) return;
    navigator.clipboard.writeText(post.coupon_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10">
      <div className="flex items-center gap-3 border-b border-emerald-200 px-5 py-3 dark:border-emerald-500/20">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L10.2 5.4L15 6.1L11.5 9.5L12.3 14.3L8 12L3.7 14.3L4.5 9.5L1 6.1L5.8 5.4L8 1Z" fill="currentColor" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          Exclusive Offer
        </span>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-6">
          {post.discount_value && (
            <div>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Discount</p>
              <p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {post.discount_value}%{" "}
                <span className="text-base font-semibold">off</span>
              </p>
              {post.discount_label && (
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                  {post.discount_label}
                </p>
              )}
            </div>
          )}

          {post.coupon_code && (
            <div>
              <p className="mb-1 text-xs text-emerald-600/70 dark:text-emerald-400/70">
                Coupon code
              </p>
              <button
                onClick={copyCoupon}
                className="group inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-emerald-400 bg-white px-4 py-2 font-mono text-sm font-bold tracking-widest text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:border-emerald-400"
              >
                {post.coupon_code}
                {copied ? (
                  <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-emerald-400 transition group-hover:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                )}
              </button>
              <p className="mt-1 text-[11px] text-emerald-600/60 dark:text-emerald-400/60">
                {copied ? "Copied!" : "Tap to copy"}
              </p>
            </div>
          )}

          {post.ends_at && (
            <div>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Expires</p>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {formatShortDate(post.ends_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface NewsDetailPageProps {
  post_id: string;
}

export default function NewsDetailPage({ post_id }: NewsDetailPageProps) {
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [not_found, setNotFound] = useState(false);

  useEffect(() => {
    newsPublicService
      .fetchActivePost(post_id)
      .then((data) => setPost(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [post_id]);

  if (loading) {
    return (
      <div>
        {/* Back link skeleton */}
        <div className="mb-6 h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <DetailSkeleton />
      </div>
    );
  }

  if (not_found || !post) {
    return <PostNotFound />;
  }

  const cfg = TYPE_CONFIG[post.type];
  const has_description = post.description && post.description.trim().length > 0;

  return (
    <article>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <Link href="/" className="transition hover:text-gray-600 dark:hover:text-gray-300">
          Dashboard
        </Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <Link href="/news" className="transition hover:text-gray-600 dark:hover:text-gray-300">
          News
        </Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="max-w-[200px] truncate text-gray-600 dark:text-gray-300">
          {post.title}
        </span>
      </nav>

      {/* Hero */}
      <Hero post={post} />

      {/* Body */}
      <div className="mx-auto mt-8 max-w-3xl">

        {/* Meta bar (shown when hero has no image, or as additional meta) */}
        {!post.image_url && (
          <div className="mb-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className={`inline-flex items-center gap-1 font-medium ${cfg.text}`}>
              {cfg.icon}
              {cfg.label}
            </span>
            <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
            <time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time>
            {post.starts_at && post.ends_at && (
              <>
                <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
                <span>
                  {formatShortDate(post.starts_at)} – {formatShortDate(post.ends_at)}
                </span>
              </>
            )}
          </div>
        )}

        {/* When image hero is present, show smaller meta below */}
        {post.image_url && (
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className={`inline-flex items-center gap-1 font-medium ${cfg.text}`}>
              {cfg.icon}
              {cfg.label}
            </span>
            <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
            <time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time>
            {post.is_featured && (
              <>
                <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
                <span className="inline-flex items-center gap-1 font-medium text-amber-500">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1L10.2 5.4L15 6.1L11.5 9.5L12.3 14.3L8 12L3.7 14.3L4.5 9.5L1 6.1L5.8 5.4L8 1Z" />
                  </svg>
                  Featured
                </span>
              </>
            )}
          </div>
        )}

        {/* Promo box — shown for promos with discount or coupon */}
        {post.type === "promo" && (post.discount_value || post.coupon_code) && (
          <PromoBox post={post} />
        )}

        {/* Description — main body */}
        {has_description && (
          <div
            className={`prose prose-sm max-w-none dark:prose-invert leading-relaxed text-gray-700 dark:text-gray-300 ${
              post.type === "promo" ? "mt-0" : "mt-6"
            }`}
          >
            {post.description!.split("\n").map((paragraph, i) =>
              paragraph.trim() ? (
                <p key={i} className="mb-4 last:mb-0">
                  {paragraph}
                </p>
              ) : (
                <div key={i} className="mb-2" />
              )
            )}
          </div>
        )}

        {/* Tip accent box */}
        {post.type === "tip" && has_description && (
          <div className="mt-6 flex gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M8 1C5.24 1 3 3.24 3 6c0 1.74.9 3.27 2.25 4.14V12h5.5v-1.86A5 5 0 0013 6c0-2.76-2.24-5-5-5z" fill="currentColor" />
              </svg>
            </div>
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Pro tip:</span> Bookmark this page so you can easily come back to this advice.
            </p>
          </div>
        )}

        {/* CTA button */}
        {post.cta_url && (
          <div className="mt-8">
            <a
              href={post.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-xl ${cfg.bg} px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-95`}
            >
              {post.cta_text ?? "Learn more"}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer navigation */}
        <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6 dark:border-gray-800">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            All News
          </Link>

          <Link
            href="/"
            className="text-xs text-gray-400 transition hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            Back to Dashboard →
          </Link>
        </div>
      </div>
    </article>
  );
}
