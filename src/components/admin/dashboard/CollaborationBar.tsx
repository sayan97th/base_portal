"use client";

import React from "react";
import type { CollaboratorPresence, WsReadyState } from "@/types/admin/presence";

// ── Single collaborator avatar ─────────────────────────────────────────────────

interface CollaboratorAvatarProps {
  collaborator: CollaboratorPresence;
  size?: "sm" | "md";
}

export function CollaboratorAvatar({
  collaborator,
  size = "sm",
}: CollaboratorAvatarProps) {
  const size_classes =
    size === "sm"
      ? "h-5 w-5 text-[9px] border-[1.5px]"
      : "h-6 w-6 text-[10px] border-2";

  const is_editing = !!collaborator.focused_row_id;

  return (
    <div
      className={`relative shrink-0 rounded-full border-white dark:border-gray-900 ${size_classes} select-none`}
      style={{ backgroundColor: collaborator.color }}
      title={`${collaborator.name}${is_editing ? " — editing a row" : " — viewing"}`}
    >
      {collaborator.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={collaborator.avatar_url}
          alt={collaborator.name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-bold leading-none text-white">
          {collaborator.initials}
        </span>
      )}

      {/* Editing-activity pulse dot */}
      {is_editing && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white dark:border-gray-900"
          style={{ backgroundColor: collaborator.color }}
        >
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-75"
            style={{ backgroundColor: collaborator.color }}
          />
        </span>
      )}
    </div>
  );
}

// ── Connection status dot ──────────────────────────────────────────────────────

interface ConnectionDotProps {
  ready_state: WsReadyState;
}

function ConnectionDot({ ready_state }: ConnectionDotProps) {
  const label_map: Record<WsReadyState, string> = {
    connecting: "Connecting to live collaboration...",
    connected: "Live — changes sync in real time",
    reconnecting: "Connection lost, reconnecting...",
    disconnected: "Offline — live collaboration unavailable",
  };

  const color_map: Record<WsReadyState, string> = {
    connecting: "bg-yellow-400",
    connected: "bg-green-500",
    reconnecting: "bg-yellow-400",
    disconnected: "bg-gray-400",
  };

  return (
    <span
      className="relative flex h-2 w-2 shrink-0"
      title={label_map[ready_state]}
    >
      {ready_state === "connected" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      )}
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${color_map[ready_state]}`}
      />
    </span>
  );
}

// ── Main CollaborationBar ──────────────────────────────────────────────────────

interface CollaborationBarProps {
  collaborators: CollaboratorPresence[];
  ready_state: WsReadyState;
}

/**
 * Compact toolbar strip showing the WebSocket connection status and all
 * collaborators currently viewing or editing the table — similar to the
 * presence indicator in Google Sheets / Notion.
 */
export default function CollaborationBar({
  collaborators,
  ready_state,
}: CollaborationBarProps) {
  const is_connected = ready_state === "connected";
  const is_reconnecting = ready_state === "reconnecting";
  const is_connecting = ready_state === "connecting";

  // Only render when WS is configured (env var is set) and we are not
  // in a clean "disconnected" state where collaboration is unavailable.
  if (ready_state === "disconnected") return null;

  const visible_avatars = collaborators.slice(0, 6);
  const overflow_count = collaborators.length - visible_avatars.length;

  // Build the tooltip for the overflow badge
  const overflow_names = collaborators
    .slice(6)
    .map((c) => c.name)
    .join(", ");

  return (
    <div className="flex items-center gap-2">
      <ConnectionDot ready_state={ready_state} />

      {(is_connecting || is_reconnecting) && !is_connected && (
        <span className="text-xs text-yellow-600 dark:text-yellow-400">
          {is_connecting ? "Connecting…" : "Reconnecting…"}
        </span>
      )}

      {is_connected && collaborators.length === 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Live
        </span>
      )}

      {collaborators.length > 0 && (
        <>
          {/* Stacked avatars */}
          <div className="flex -space-x-1.5">
            {visible_avatars.map((c) => (
              <CollaboratorAvatar key={c.session_id} collaborator={c} />
            ))}
          </div>

          {/* Overflow count */}
          {overflow_count > 0 && (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              title={overflow_names}
            >
              +{overflow_count}
            </span>
          )}

          {/* User count label */}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {collaborators.length === 1
              ? "1 other user online"
              : `${collaborators.length} other users online`}
          </span>
        </>
      )}
    </div>
  );
}
