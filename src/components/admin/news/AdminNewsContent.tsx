"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NewsPost, PostType, PostStatus } from "@/types/admin/news";
import {
  listAdminNewsPosts,
  toggleAdminNewsPostStatus,
  deleteAdminNewsPost,
} from "@/services/admin/news.service";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(date_str: string): string {
  return new Date(date_str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isExpired(date_str: string | null): boolean {
  if (!date_str) return false;
  return new Date(date_str) < new Date();
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface TypeBadgeProps {
  type: PostType;
}

function TypeBadge({ type }: TypeBadgeProps) {
  const config: Record<PostType, { label: string; className: string }> = {
    promo: {
      label: "Promo",
      className:
        "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
    },
    news: {
      label: "News",
      className:
        "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30",
    },
    blog_post: {
      label: "Blog Post",
      className:
        "bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/30",
    },
    tip: {
      label: "Tip",
      className:
        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
    },
  };

  const { label, className } = config[type];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  status: PostStatus;
  ends_at?: string | null;
}

function StatusBadge({ status, ends_at }: StatusBadgeProps) {
  const expired = status === "active" && isExpired(ends_at ?? null);

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Expired
      </span>
    );
  }

  const config: Record<PostStatus, { label: string; dot: string; className: string }> = {
    active: {
      label: "Active",
      dot: "bg-emerald-500",
      className:
        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
    },
    draft: {
      label: "Draft",
      dot: "bg-gray-400",
      className:
        "bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700",
    },
    archived: {
      label: "Archived",
      dot: "bg-gray-400",
      className:
        "bg-gray-100 text-gray-400 ring-1 ring-gray-200 dark:bg-gray-800/60 dark:text-gray-500 dark:ring-gray-700",
    },
  };

  const { label, dot, className } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

interface PostCardProps {
  post: NewsPost;
  onEdit: (id: string) => void;
  onToggleStatus: (post: NewsPost) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}

function PostCard({ post, onEdit, onToggleStatus, onDelete, deleting }: PostCardProps) {
  const type_accent: Record<PostType, string> = {
    promo: "from-amber-500 to-orange-500",
    news: "from-brand-500 to-blue-500",
    blog_post: "from-purple-500 to-violet-500",
    tip: "from-emerald-500 to-teal-500",
  };

  const type_icon: Record<PostType, React.ReactNode> = {
    promo: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    news: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
    blog_post: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    tip: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  };

  return (
    <div className="group flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
      {/* Card top accent */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${type_accent[post.type]}`} />

      {/* Image / Promo hero */}
      {post.image_url ? (
        <div className="relative h-36 overflow-hidden">
          <img
            src={post.image_url}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      ) : post.type === "promo" && post.discount_value ? (
        <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${type_accent[post.type]} px-4`}>
          <div className="text-center text-white">
            <p className="text-5xl font-black leading-none tracking-tight">
              {post.discount_value}%
            </p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-widest opacity-90">
              {post.discount_label ?? "Off"}
            </p>
          </div>
          {post.is_featured && (
            <div className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
              Featured
            </div>
          )}
        </div>
      ) : (
        <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${type_accent[post.type]}/10 px-4`}>
          <div className={`rounded-2xl bg-gradient-to-br ${type_accent[post.type]} p-5 text-white shadow-lg`}>
            {type_icon[post.type]}
          </div>
        </div>
      )}

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <TypeBadge type={post.type} />
            <StatusBadge status={post.status} ends_at={post.ends_at} />
            {post.is_featured && !post.image_url && post.type !== "promo" && (
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/30">
                Featured
              </span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 dark:text-white">
            {post.title}
          </h3>
          {post.subtitle && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 dark:text-gray-400">
              {post.subtitle}
            </p>
          )}
        </div>

        {/* Date range (promos) */}
        {post.type === "promo" && (post.starts_at || post.ends_at) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
            </svg>
            <span>
              {post.starts_at ? formatDate(post.starts_at) : "Now"} →{" "}
              {post.ends_at ? formatDate(post.ends_at) : "No end"}
            </span>
          </div>
        )}

        {/* Coupon badge */}
        {post.coupon_code && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
              {post.coupon_code}
            </span>
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-500">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card footer actions */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatDate(post.updated_at)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleStatus(post)}
            title={post.status === "active" ? "Set to Draft" : "Set to Active"}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            {post.status === "active" ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => onEdit(post.id)}
            title="Edit"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(post.id)}
            disabled={deleting}
            title="Delete"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden animate-pulse">
      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700" />
      <div className="h-36 bg-gray-100 dark:bg-gray-700/50" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700/60" />
      </div>
      <div className="flex justify-between border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-700/60" />
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-700/60" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const TYPE_TABS: { label: string; value: "all" | PostType }[] = [
  { label: "All", value: "all" },
  { label: "Promos", value: "promo" },
  { label: "News", value: "news" },
  { label: "Blog Posts", value: "blog_post" },
  { label: "Tips", value: "tip" },
];

const STATUS_OPTIONS: { label: string; value: "all" | PostStatus }[] = [
  { label: "All Statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

export default function AdminNewsContent() {
  const router = useRouter();

  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type_filter, setTypeFilter] = useState<"all" | PostType>("all");
  const [status_filter, setStatusFilter] = useState<"all" | PostStatus>("all");
  const [search, setSearch] = useState("");
  const [deleting_id, setDeletingId] = useState<string | null>(null);
  const [confirm_delete_id, setConfirmDeleteId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminNewsPosts({
        type: type_filter,
        status: status_filter,
        search: search || undefined,
      });
      setPosts(data);
    } catch {
      setError("Failed to load posts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [type_filter, status_filter, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleEdit = useCallback(
    (id: string) => router.push(`/admin/news/${id}/edit`),
    [router]
  );

  const handleToggleStatus = useCallback(async (post: NewsPost) => {
    const next_status: PostStatus = post.status === "active" ? "draft" : "active";
    try {
      const updated = await toggleAdminNewsPostStatus(post.id, next_status);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch {
      // silently ignore — the UI stays as-is
    }
  }, []);

  const handleDeleteConfirm = useCallback(async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteAdminNewsPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Filtered posts (client-side for search responsiveness)
  const visible_posts = posts.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !p.title.toLowerCase().includes(q) &&
        !p.subtitle?.toLowerCase().includes(q) &&
        !p.description?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              News &amp; Promos
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Manage promotional banners, news updates, blog posts, and tips shown on the website.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/news/new")}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Post
          </button>
        </div>

        {/* Filters row */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-brand-500"
            />
          </div>

          {/* Status filter */}
          <select
            value={status_filter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | PostStatus)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:focus:border-brand-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Type tabs */}
        <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                type_filter === tab.value
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
            <button
              onClick={fetchPosts}
              className="ml-auto shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : visible_posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 rounded-2xl bg-gray-100 p-5 dark:bg-gray-700">
              <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No posts found</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {search || type_filter !== "all" || status_filter !== "all"
                ? "Try adjusting your filters."
                : "Create your first news or promo post to get started."}
            </p>
            {!search && type_filter === "all" && status_filter === "all" && (
              <button
                onClick={() => router.push("/admin/news/new")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Post
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {visible_posts.length} post{visible_posts.length !== 1 ? "s" : ""}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible_posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onEdit={handleEdit}
                  onToggleStatus={handleToggleStatus}
                  onDelete={(id) => setConfirmDeleteId(id)}
                  deleting={deleting_id === post.id}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirm_delete_id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/10">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Post?</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone. The post will be permanently removed.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(confirm_delete_id)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
