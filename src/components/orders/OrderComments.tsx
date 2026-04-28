"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { orderCommentsService } from "@/services/client/order-comments.service";
import type { OrderComment } from "@/types/client/order-comments";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CHARS = 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff_ms = Date.now() - new Date(iso).getTime();
  const diff_s = Math.floor(diff_ms / 1000);
  const diff_m = Math.floor(diff_s / 60);
  const diff_h = Math.floor(diff_m / 60);
  const diff_d = Math.floor(diff_h / 24);

  if (diff_s < 60) return "just now";
  if (diff_m < 60) return `${diff_m}m ago`;
  if (diff_h < 24) return `${diff_h}h ago`;
  if (diff_d < 7) return `${diff_d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function countComments(comments: OrderComment[]): number {
  return comments.reduce(
    (acc, c) => acc + 1 + countComments(c.replies ?? []),
    0
  );
}

function updateCommentInTree(
  comments: OrderComment[],
  id: number,
  updated: OrderComment
): OrderComment[] {
  return comments.map((c) => {
    if (c.id === id) return updated;
    if (c.replies?.length) {
      return { ...c, replies: updateCommentInTree(c.replies, id, updated) };
    }
    return c;
  });
}

function deleteCommentFromTree(
  comments: OrderComment[],
  id: number
): OrderComment[] {
  return comments
    .filter((c) => c.id !== id)
    .map((c) => ({
      ...c,
      replies: c.replies ? deleteCommentFromTree(c.replies, id) : [],
    }));
}

function appendReplyInTree(
  comments: OrderComment[],
  parent_id: number,
  reply: OrderComment
): OrderComment[] {
  return comments.map((c) => {
    if (c.id === parent_id) {
      return { ...c, replies: [...(c.replies ?? []), reply] };
    }
    if (c.replies?.length) {
      return { ...c, replies: appendReplyInTree(c.replies, parent_id, reply) };
    }
    return c;
  });
}

// ─── Avatar colors ────────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300",
  "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300",
  "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
  "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300",
  "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300",
];

function getAvatarPalette(user_id: number): string {
  return AVATAR_PALETTES[user_id % AVATAR_PALETTES.length];
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChatBubbleIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
    />
  </svg>
);

const SendIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
    />
  </svg>
);

const ReplyIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
    />
  </svg>
);

const EditIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const XMarkIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = ({ className }: { className?: string }) => (
  <span
    className={
      className ??
      "h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
    }
  />
);

// ─── Avatar ───────────────────────────────────────────────────────────────────

function CommentAvatar({
  name,
  avatar_url,
  user_id,
  size = "md",
}: {
  name: string;
  avatar_url: string | null;
  user_id: number;
  size?: "sm" | "md";
}) {
  const initials = getInitials(name);
  const palette = getAvatarPalette(user_id);
  const size_class = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";

  if (avatar_url) {
    return (
      <img
        src={avatar_url}
        alt={name}
        className={`${size_class} rounded-full object-cover shrink-0 ring-1 ring-gray-200 dark:ring-gray-700`}
      />
    );
  }

  return (
    <div
      className={`${size_class} ${palette} rounded-full flex items-center justify-center font-semibold shrink-0 ring-2 ring-white dark:ring-gray-900`}
    >
      {initials}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CommentSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="h-8 w-8 rounded-full animate-pulse bg-gray-100 dark:bg-gray-800 shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-10 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-2.5 w-14 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4 text-gray-400 dark:text-gray-500">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        No messages yet
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
        Start the discussion — ask a question or leave a note about this order.
      </p>
    </div>
  );
}

// ─── Inline edit form ─────────────────────────────────────────────────────────

function InlineEditForm({
  initial_value,
  on_save,
  on_cancel,
  is_saving,
}: {
  initial_value: string;
  on_save: (content: string) => void;
  on_cancel: () => void;
  is_saving: boolean;
}) {
  const [value, setValue] = useState(initial_value);
  const textarea_ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textarea_ref.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const chars_remaining = MAX_CHARS - value.length;
  const can_save =
    value.trim().length > 0 &&
    value.trim() !== initial_value.trim() &&
    chars_remaining >= 0;

  return (
    <div className="mt-2 space-y-2">
      <textarea
        ref={textarea_ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={MAX_CHARS}
        className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition-colors"
      />
      <div className="flex items-center justify-between">
        <span
          className={`text-[11px] ${chars_remaining < 50 ? "text-warning-500" : "text-gray-400 dark:text-gray-500"}`}
        >
          {chars_remaining} remaining
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={on_cancel}
            disabled={is_saving}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XMarkIcon />
            Cancel
          </button>
          <button
            onClick={() => on_save(value.trim())}
            disabled={!can_save || is_saving}
            className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {is_saving ? <Spinner className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <CheckIcon />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline reply form ────────────────────────────────────────────────────────

function InlineReplyForm({
  on_submit,
  on_cancel,
  is_submitting,
  current_user_name,
  current_user_avatar,
  current_user_id,
}: {
  on_submit: (content: string) => void;
  on_cancel: () => void;
  is_submitting: boolean;
  current_user_name: string;
  current_user_avatar: string | null;
  current_user_id: number;
}) {
  const [value, setValue] = useState("");
  const textarea_ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textarea_ref.current?.focus();
  }, []);

  const chars_remaining = MAX_CHARS - value.length;
  const can_submit = value.trim().length > 0 && chars_remaining >= 0;

  return (
    <div className="mt-3 ml-11 flex gap-2.5">
      <CommentAvatar
        name={current_user_name}
        avatar_url={current_user_avatar}
        user_id={current_user_id}
        size="sm"
      />
      <div className="flex-1 space-y-2">
        <textarea
          ref={textarea_ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          maxLength={MAX_CHARS}
          placeholder="Write a reply..."
          className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition-colors"
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] ${chars_remaining < 50 ? "text-warning-500" : "text-gray-400 dark:text-gray-500"}`}
          >
            {chars_remaining} remaining
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={on_cancel}
              disabled={is_submitting}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => on_submit(value.trim())}
              disabled={!can_submit || is_submitting}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {is_submitting ? (
                <Spinner className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <ReplyIcon />
              )}
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Comment item ─────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: OrderComment;
  current_user_id: number | null;
  is_admin_user: boolean;
  current_user_name: string;
  current_user_avatar: string | null;
  on_reply: (parent_id: number, content: string) => Promise<void>;
  on_edit: (comment_id: number, content: string) => Promise<void>;
  on_delete: (comment_id: number) => Promise<void>;
  is_reply?: boolean;
}

function CommentItem({
  comment,
  current_user_id,
  is_admin_user,
  current_user_name,
  current_user_avatar,
  on_reply,
  on_edit,
  on_delete,
  is_reply = false,
}: CommentItemProps) {
  const [mode, setMode] = useState<"view" | "edit" | "reply">("view");
  const [is_busy, setIsBusy] = useState(false);

  const is_own = comment.user_id === current_user_id;
  const can_edit = is_own;
  const can_delete = is_own || is_admin_user;

  const handleEdit = async (content: string) => {
    setIsBusy(true);
    try {
      await on_edit(comment.id, content);
      setMode("view");
    } finally {
      setIsBusy(false);
    }
  };

  const handleReply = async (content: string) => {
    setIsBusy(true);
    try {
      await on_reply(comment.id, content);
      setMode("view");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    setIsBusy(true);
    try {
      await on_delete(comment.id);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div>
      <div className="flex gap-3">
        <CommentAvatar
          name={comment.author_name}
          avatar_url={comment.author_avatar_url}
          user_id={comment.user_id}
          size={is_reply ? "sm" : "md"}
        />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-gray-800 dark:text-white/90 leading-none">
              {comment.author_name}
            </span>

            {comment.is_admin_comment ? (
              <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 dark:text-violet-300 uppercase">
                Staff
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Client
              </span>
            )}

            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {formatRelativeTime(comment.created_at)}
            </span>

            {comment.updated_at !== comment.created_at && (
              <span className="text-[10px] italic text-gray-300 dark:text-gray-600">
                (edited)
              </span>
            )}
          </div>

          {/* Content or edit form */}
          {mode === "edit" ? (
            <InlineEditForm
              initial_value={comment.content}
              on_save={handleEdit}
              on_cancel={() => setMode("view")}
              is_saving={is_busy}
            />
          ) : (
            <p
              className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words ${is_busy ? "opacity-40" : ""}`}
            >
              {comment.content}
            </p>
          )}

          {/* Action bar */}
          {mode === "view" && !is_busy && (
            <div className="mt-2 flex items-center gap-3">
              {!is_reply && (
                <button
                  onClick={() => setMode("reply")}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                >
                  <ReplyIcon />
                  Reply
                </button>
              )}
              {can_edit && (
                <button
                  onClick={() => setMode("edit")}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <EditIcon />
                  Edit
                </button>
              )}
              {can_delete && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-error-500 dark:hover:text-error-400 transition-colors"
                >
                  <TrashIcon />
                  Delete
                </button>
              )}
            </div>
          )}

          {mode === "view" && is_busy && (
            <div className="mt-2 flex items-center gap-1.5">
              <Spinner className="h-3 w-3 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-gray-500 dark:border-t-gray-400 animate-spin" />
              <span className="text-[11px] text-gray-400">Processing…</span>
            </div>
          )}
        </div>
      </div>

      {/* Inline reply form */}
      {mode === "reply" && (
        <InlineReplyForm
          on_submit={handleReply}
          on_cancel={() => setMode("view")}
          is_submitting={is_busy}
          current_user_name={current_user_name}
          current_user_avatar={current_user_avatar}
          current_user_id={current_user_id ?? 0}
        />
      )}

      {/* Nested replies */}
      {(comment.replies ?? []).length > 0 && (
        <div className="mt-4 ml-11 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-4">
          {(comment.replies ?? []).map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              current_user_id={current_user_id}
              is_admin_user={is_admin_user}
              current_user_name={current_user_name}
              current_user_avatar={current_user_avatar}
              on_reply={on_reply}
              on_edit={on_edit}
              on_delete={on_delete}
              is_reply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface OrderCommentsProps {
  session_id: string;
}

const OrderComments: React.FC<OrderCommentsProps> = ({ session_id }) => {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<OrderComment[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [new_content, setNewContent] = useState("");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);
  const textarea_ref = useRef<HTMLTextAreaElement>(null);

  const current_user_name = user
    ? `${user.first_name} ${user.last_name}`.trim()
    : "You";
  const current_user_avatar = user?.profile_photo_url ?? null;
  const current_user_id = user?.id ?? null;

  const chars_remaining = MAX_CHARS - new_content.length;
  const total_count = countComments(comments);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await orderCommentsService.fetchComments(session_id);
        setComments(data);
      } catch {
        setLoadError("Could not load comments. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [session_id]);

  const handleSubmit = async () => {
    if (!new_content.trim() || is_submitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const comment = await orderCommentsService.createComment(session_id, {
        content: new_content.trim(),
      });
      setComments((prev) => [...prev, comment]);
      setNewContent("");
    } catch {
      setSubmitError("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleReply = useCallback(
    async (parent_id: number, content: string) => {
      const reply = await orderCommentsService.createComment(session_id, {
        content,
        parent_id,
      });
      setComments((prev) => appendReplyInTree(prev, parent_id, reply));
    },
    [session_id]
  );

  const handleEdit = useCallback(
    async (comment_id: number, content: string) => {
      const updated = await orderCommentsService.updateComment(comment_id, {
        content,
      });
      setComments((prev) => updateCommentInTree(prev, comment_id, updated));
    },
    []
  );

  const handleDelete = useCallback(async (comment_id: number) => {
    await orderCommentsService.deleteComment(comment_id);
    setComments((prev) => deleteCommentFromTree(prev, comment_id));
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-400">
            <ChatBubbleIcon />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Order Discussion
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {is_loading
                ? "Loading…"
                : total_count === 0
                  ? "No messages yet"
                  : `${total_count} message${total_count !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {!is_loading && !load_error && total_count > 0 && (
          <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] rounded-full bg-brand-50 dark:bg-brand-500/10 px-2 text-xs font-bold text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
            {total_count}
          </span>
        )}
      </div>

      {/* ── Comment thread ── */}
      <div className="px-5 sm:px-6 py-5">
        {is_loading ? (
          <CommentSkeleton />
        ) : load_error ? (
          <div className="rounded-xl border border-error-100 dark:border-error-500/20 bg-error-50 dark:bg-error-500/10 px-4 py-3.5">
            <p className="text-sm text-error-700 dark:text-error-400">
              {load_error}
            </p>
          </div>
        ) : comments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6 divide-y divide-gray-100 dark:divide-gray-800">
            {comments.map((comment, index) => (
              <div key={comment.id} className={index > 0 ? "pt-6" : ""}>
                <CommentItem
                  comment={comment}
                  current_user_id={current_user_id}
                  is_admin_user={isAdmin}
                  current_user_name={current_user_name}
                  current_user_avatar={current_user_avatar}
                  on_reply={handleReply}
                  on_edit={handleEdit}
                  on_delete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── New message form ── */}
      <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-white/2">
        <div className="flex gap-3">
          <CommentAvatar
            name={current_user_name}
            avatar_url={current_user_avatar}
            user_id={current_user_id ?? 0}
          />

          <div className="flex-1 space-y-2.5">
            <div className="relative">
              <textarea
                ref={textarea_ref}
                value={new_content}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                maxLength={MAX_CHARS}
                placeholder="Add to the discussion… (Ctrl+Enter to send)"
                className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-3 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors shadow-xs"
              />
            </div>

            {submit_error && (
              <p className="text-[11px] text-error-600 dark:text-error-400">
                {submit_error}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] ${chars_remaining < 100 ? "text-warning-500" : "text-gray-400 dark:text-gray-500"}`}
              >
                {chars_remaining} characters remaining
              </span>

              <button
                onClick={() => void handleSubmit()}
                disabled={
                  !new_content.trim() ||
                  is_submitting ||
                  new_content.length > MAX_CHARS
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {is_submitting ? (
                  <Spinner />
                ) : (
                  <SendIcon />
                )}
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderComments;
