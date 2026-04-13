"use client";

/**
 * useBacklinkCollaboration
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages real-time collaboration for the Backlink Orders table via
 * Laravel Echo + Reverb (presence channel).  Handles:
 *
 *  • Presence   — who is currently viewing/editing the table
 *  • Cell focus/blur tracking — which row+column each user is editing (whispers)
 *  • Real-time data sync — row updates/creates/deletes broadcast by the server
 *
 * ── Laravel backend requirements ──────────────────────────────────────────────
 * 1. The presence channel `presence-backlink-orders` must be authorised in
 *    `routes/channels.php` and return at least:
 *      ['session_id', 'user_id', 'name', 'initials', 'color', 'avatar_url']
 *
 * 2. After each BacklinkOrder REST mutation the Laravel controller should
 *    broadcast to the channel:
 *      BacklinkOrderUpdated  → { row: BacklinkOrderRow, updated_by_session_id }
 *      BacklinkOrderCreated  → { row: BacklinkOrderRow, created_by_session_id }
 *      BacklinkOrderDeleted  → { row_id: string,        deleted_by_session_id }
 *
 * 3. Client-event (whisper) payloads sent by other tabs/users:
 *      row-focus  → { session_id, row_id, col_key }
 *      row-blur   → { session_id, row_id }
 */

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { getToken } from "@/lib/api-client";
import { getEcho } from "@/lib/echo";
import type { CollaboratorPresence, WsReadyState } from "@/types/admin/presence";
import type { BacklinkOrderRow } from "@/types/admin/backlink-order";

// ── Pusher → WsReadyState mapping ─────────────────────────────────────────────

type PusherConnectionState =
  | "initialized"
  | "connecting"
  | "connected"
  | "unavailable"
  | "failed"
  | "disconnected";

function mapConnectionState(pusher_state: string): WsReadyState {
  switch (pusher_state as PusherConnectionState) {
    case "connected":
      return "connected";
    case "connecting":
    case "initialized":
      return "connecting";
    case "unavailable":
      return "reconnecting";
    case "failed":
    case "disconnected":
    default:
      return "disconnected";
  }
}

// ── Collaborator helpers ───────────────────────────────────────────────────────

const PRESENCE_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
];

function getFallbackColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function enrichCollaborator(c: CollaboratorPresence): CollaboratorPresence {
  return {
    ...c,
    color: c.color || getFallbackColor(c.session_id),
    initials: c.initials || getInitials(c.name),
  };
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CHANNEL_NAME = "backlink-orders";

/**
 * Unique identifier for this browser tab, stable for the lifetime of the page.
 * Used as the `session_id` in whisper payloads so other collaborators can
 * distinguish two tabs opened by the same user.
 */
const local_session_id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ── Public types ───────────────────────────────────────────────────────────────

export interface UseBacklinkCollaborationOptions {
  current_user_id: number;
  current_user_name: string;
  current_user_avatar: string | null;
  /** Called when another user saves an update to an existing row */
  onRowUpdated: (row: BacklinkOrderRow, by_session_id: string) => void;
  /** Called when another user creates a new row */
  onRowCreated: (row: BacklinkOrderRow, by_session_id: string) => void;
  /** Called when another user deletes a row */
  onRowDeleted: (row_id: string, by_session_id: string) => void;
}

export interface UseBacklinkCollaborationReturn {
  /** All currently connected collaborators (current user excluded) */
  collaborators: CollaboratorPresence[];
  /**
   * Map of row_id → collaborators who have that row active (selected or editing a cell).
   * Includes all entries where focused_row_id is non-null, regardless of focused_col_key.
   * Use collaborator.focused_col_key to distinguish "editing a cell" from "just selected".
   */
  row_editors: Map<string, CollaboratorPresence[]>;
  ready_state: WsReadyState;
  /**
   * Stable identifier for this browser tab, assigned once per page load.
   * Use this to skip re-applying your own server-broadcast updates.
   */
  local_session_id: string;
  /** Notify other users that this tab started editing a cell */
  sendRowFocus: (row_id: string, col_key: string) => void;
  /** Notify other users that this tab stopped editing a row */
  sendRowBlur: (row_id: string) => void;
  /**
   * Notify other users that this tab selected a row without editing a specific cell.
   * Sets focused_row_id on the collaborator without a focused_col_key so others see
   * "User X is viewing this row" rather than "User X is editing column Y".
   */
  sendRowSelect: (row_id: string) => void;
}

// ── Internal channel shape (subset used by this hook) ─────────────────────────

interface EchoPresenceChannel {
  here(callback: (users: CollaboratorPresence[]) => void): EchoPresenceChannel;
  joining(callback: (user: CollaboratorPresence) => void): EchoPresenceChannel;
  leaving(callback: (user: CollaboratorPresence) => void): EchoPresenceChannel;
  listen(event: string, callback: (data: unknown) => void): EchoPresenceChannel;
  listenForWhisper(
    event: string,
    callback: (data: unknown) => void
  ): EchoPresenceChannel;
  whisper(event: string, data: object): EchoPresenceChannel;
}

// ── Hook implementation ────────────────────────────────────────────────────────

export function useBacklinkCollaboration(
  options: UseBacklinkCollaborationOptions
): UseBacklinkCollaborationReturn {
  const {
    current_user_id,
    current_user_name,
    current_user_avatar,
    onRowUpdated,
    onRowCreated,
    onRowDeleted,
  } = options;

  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [ready_state, setReadyState] = useState<WsReadyState>("connecting");

  // Keep latest callbacks in refs to avoid stale closures inside channel listeners
  const on_row_updated_ref = useRef(onRowUpdated);
  const on_row_created_ref = useRef(onRowCreated);
  const on_row_deleted_ref = useRef(onRowDeleted);
  on_row_updated_ref.current = onRowUpdated;
  on_row_created_ref.current = onRowCreated;
  on_row_deleted_ref.current = onRowDeleted;

  const channel_ref = useRef<EchoPresenceChannel | null>(null);

  useEffect(() => {
    const token = getToken();

    if (!token || !current_user_id) {
      setReadyState("disconnected");
      return;
    }

    const echo = getEcho(token);

    // ── Track Pusher connection state ────────────────────────────────────────

    const pusher_connection = (
      echo.connector as unknown as {
        pusher: {
          connection: {
            state: string;
            bind: (
              event: string,
              handler: (data: { current: string }) => void
            ) => void;
            unbind: (
              event: string,
              handler: (data: { current: string }) => void
            ) => void;
          };
        };
      }
    ).pusher.connection;

    setReadyState(mapConnectionState(pusher_connection.state));

    const handleStateChange = ({ current }: { current: string }) => {
      setReadyState(mapConnectionState(current));
    };

    pusher_connection.bind("state_change", handleStateChange);

    // ── Join presence channel ────────────────────────────────────────────────

    const channel = echo.join(CHANNEL_NAME) as unknown as EchoPresenceChannel;
    channel_ref.current = channel;

    // Initial snapshot — all users currently in the channel
    channel.here((users: CollaboratorPresence[]) => {
      setCollaborators(
        users
          .filter((u) => u.user_id !== current_user_id)
          .map(enrichCollaborator)
      );
    });

    // A new user joined the channel
    channel.joining((user: CollaboratorPresence) => {
      if (user.user_id === current_user_id) return;
      const new_collaborator = enrichCollaborator(user);
      setCollaborators((prev) => {
        const exists = prev.some(
          (c) => c.session_id === new_collaborator.session_id
        );
        return exists ? prev : [...prev, new_collaborator];
      });
    });

    // A user left the channel
    channel.leaving((user: CollaboratorPresence) => {
      setCollaborators((prev) =>
        prev.filter((c) => c.session_id !== user.session_id)
      );
    });

    // ── Whispers: real-time focus/blur from other tabs ───────────────────────

    channel.listenForWhisper(
      "row-focus",
      (data: unknown) => {
        const { session_id, row_id, col_key } = data as {
          session_id: string;
          row_id: string;
          col_key: string;
        };
        setCollaborators((prev) =>
          prev.map((c) =>
            c.session_id === session_id
              ? { ...c, focused_row_id: row_id, focused_col_key: col_key }
              : c
          )
        );
      }
    );

    channel.listenForWhisper(
      "row-blur",
      (data: unknown) => {
        const { session_id } = data as { session_id: string };
        setCollaborators((prev) =>
          prev.map((c) =>
            c.session_id === session_id
              ? { ...c, focused_row_id: null, focused_col_key: null }
              : c
          )
        );
      }
    );

    // row-select: another tab clicked a row without starting cell editing.
    // We set focused_row_id but leave focused_col_key null so the UI can
    // distinguish "selected" from "actively editing a cell".
    channel.listenForWhisper(
      "row-select",
      (data: unknown) => {
        const { session_id, row_id } = data as {
          session_id: string;
          row_id: string;
        };
        setCollaborators((prev) =>
          prev.map((c) =>
            c.session_id === session_id
              ? { ...c, focused_row_id: row_id, focused_col_key: null }
              : c
          )
        );
      }
    );

    // ── Server events: row CRUD broadcasts ──────────────────────────────────

    channel.listen(
      ".BacklinkOrderUpdated",
      (data: unknown) => {
        const { row, updated_by_session_id } = data as {
          row: BacklinkOrderRow;
          updated_by_session_id: string;
        };
        on_row_updated_ref.current(row, updated_by_session_id);
      }
    );

    channel.listen(
      ".BacklinkOrderCreated",
      (data: unknown) => {
        const { row, created_by_session_id } = data as {
          row: BacklinkOrderRow;
          created_by_session_id: string;
        };
        on_row_created_ref.current(row, created_by_session_id);
      }
    );

    channel.listen(
      ".BacklinkOrderDeleted",
      (data: unknown) => {
        const { row_id, deleted_by_session_id } = data as {
          row_id: string;
          deleted_by_session_id: string;
        };
        on_row_deleted_ref.current(row_id, deleted_by_session_id);
      }
    );

    // ── Cleanup ──────────────────────────────────────────────────────────────

    return () => {
      pusher_connection.unbind("state_change", handleStateChange);
      echo.leave(CHANNEL_NAME);
      channel_ref.current = null;
      setReadyState("disconnected");
      setCollaborators([]);
    };

    // Intentionally only re-run when user identity changes.
    // Callback deps (onRowUpdated etc.) are accessed via stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current_user_id, current_user_name, current_user_avatar]);

  // ── Focus / blur helpers ───────────────────────────────────────────────────

  const sendRowFocus = useCallback((row_id: string, col_key: string) => {
    channel_ref.current?.whisper("row-focus", {
      session_id: local_session_id,
      row_id,
      col_key,
    });
  }, []);

  const sendRowBlur = useCallback((row_id: string) => {
    channel_ref.current?.whisper("row-blur", {
      session_id: local_session_id,
      row_id,
    });
  }, []);

  const sendRowSelect = useCallback((row_id: string) => {
    channel_ref.current?.whisper("row-select", {
      session_id: local_session_id,
      row_id,
    });
  }, []);

  // ── Derived: row_id → collaborators editing that row ──────────────────────

  const row_editors = useMemo(
    () =>
      collaborators.reduce<Map<string, CollaboratorPresence[]>>((map, c) => {
        if (c.focused_row_id) {
          const existing = map.get(c.focused_row_id) ?? [];
          map.set(c.focused_row_id, [...existing, c]);
        }
        return map;
      }, new Map()),
    [collaborators]
  );

  return {
    collaborators,
    row_editors,
    ready_state,
    local_session_id,
    sendRowFocus,
    sendRowBlur,
    sendRowSelect,
  };
}
