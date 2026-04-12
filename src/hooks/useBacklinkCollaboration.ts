"use client";

/**
 * useBacklinkCollaboration
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages a WebSocket connection to the collaboration server for the
 * Backlink Orders table.  Handles:
 *
 *  • Presence — who is currently viewing/editing the table
 *  • Cell focus/blur tracking — which row+column each user is editing
 *  • Real-time data sync — row updates/creates/deletes pushed by the server
 *
 * ── Environment variable ──────────────────────────────────────────────────────
 * NEXT_PUBLIC_WS_URL  WebSocket endpoint, e.g. ws://localhost:6001/ws/backlink-orders
 * When this variable is not set the hook gracefully degrades: no WebSocket
 * connection is attempted, all returned state is empty/inert.
 *
 * ── Laravel backend requirements ──────────────────────────────────────────────
 * The server must implement a WebSocket endpoint at NEXT_PUBLIC_WS_URL that:
 *
 * 1. Accepts a `?token=<bearer>` query parameter for authentication.
 * 2. Assigns each connection a unique `session_id` (UUID or similar).
 * 3. Assigns each user a color from a fixed palette based on user_id.
 * 4. Handles the following inbound messages (JSON):
 *      { type: "join", user_id, name, avatar_url }
 *      { type: "row_focus", row_id, col_key }
 *      { type: "row_blur", row_id }
 *      { type: "ping" }
 *
 * 5. Broadcasts to ALL connections on the channel:
 *      { type: "presence_state", users: CollaboratorPresence[] }   → only to the joining client
 *      { type: "user_joined", user: CollaboratorPresence }         → to all others
 *      { type: "user_left", session_id }                           → to all others on disconnect
 *      { type: "row_focused", session_id, row_id, col_key }        → to all others
 *      { type: "row_blurred", session_id, row_id }                 → to all others
 *      { type: "pong" }                                            → back to pinging client
 *
 * 6. After each BacklinkOrder REST mutation (update / create / delete), the
 *    Laravel controller should broadcast to the channel:
 *      { type: "row_updated", row: BacklinkOrderRow, updated_by_session_id }
 *      { type: "row_created", row: BacklinkOrderRow, created_by_session_id }
 *      { type: "row_deleted", row_id: string,        deleted_by_session_id }
 *
 *    The `session_id` can be passed as a custom request header from the
 *    frontend (`X-WS-Session-Id`) or stored in the authenticated user's
 *    session after the `join` message.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getToken } from "@/lib/api-client";
import type {
  CollaboratorPresence,
  WsClientMessage,
  WsServerMessage,
  WsReadyState,
} from "@/types/admin/presence";
import type { BacklinkOrderRow } from "@/types/admin/backlink-order";

// ── Constants ──────────────────────────────────────────────────────────────────

const RECONNECT_BASE_MS = 1_500;
const RECONNECT_MAX_MS = 30_000;
const PING_INTERVAL_MS = 25_000;

/**
 * Fallback color palette used when the server does not assign a color.
 * The server should assign colors deterministically so that the same user
 * always gets the same color across sessions and all clients agree.
 */
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

function getFallbackColor(session_id: string): string {
  let hash = 0;
  for (let i = 0; i < session_id.length; i++) {
    hash = session_id.charCodeAt(i) + ((hash << 5) - hash);
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

// ── Hook public API ────────────────────────────────────────────────────────────

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
  /** All currently connected collaborators (the current user is excluded) */
  collaborators: CollaboratorPresence[];
  /**
   * Map of row_id → collaborators currently editing that row.
   * Only entries where focused_row_id is non-null are included.
   */
  row_editors: Map<string, CollaboratorPresence[]>;
  ready_state: WsReadyState;
  /** Notify the server that this user started editing a cell */
  sendRowFocus: (row_id: string, col_key: string) => void;
  /** Notify the server that this user stopped editing a row */
  sendRowBlur: (row_id: string) => void;
}

// ── Hook implementation ────────────────────────────────────────────────────────

const WS_ENDPOINT = process.env.NEXT_PUBLIC_WS_URL ?? null;

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
  const [ready_state, setReadyState] = useState<WsReadyState>(
    WS_ENDPOINT ? "connecting" : "disconnected"
  );

  // Mutable refs — do not cause re-renders
  const ws_ref = useRef<WebSocket | null>(null);
  const reconnect_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ping_timer_ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const is_unmounted_ref = useRef(false);

  // Keep latest callbacks in refs to avoid stale closures inside WS handlers
  const on_row_updated_ref = useRef(onRowUpdated);
  const on_row_created_ref = useRef(onRowCreated);
  const on_row_deleted_ref = useRef(onRowDeleted);
  on_row_updated_ref.current = onRowUpdated;
  on_row_created_ref.current = onRowCreated;
  on_row_deleted_ref.current = onRowDeleted;

  // ── Stable send helper ─────────────────────────────────────────────────────

  const sendMessage = useCallback((msg: WsClientMessage) => {
    if (ws_ref.current?.readyState === WebSocket.OPEN) {
      ws_ref.current.send(JSON.stringify(msg));
    }
  }, []);

  // ── Connection management ──────────────────────────────────────────────────

  useEffect(() => {
    if (!WS_ENDPOINT) return;

    is_unmounted_ref.current = false;
    let attempt = 0;

    function connect() {
      if (is_unmounted_ref.current) return;

      const token = getToken();
      const url = token
        ? `${WS_ENDPOINT}?token=${encodeURIComponent(token)}`
        : WS_ENDPOINT!;

      setReadyState(attempt > 0 ? "reconnecting" : "connecting");

      const ws = new WebSocket(url);
      ws_ref.current = ws;

      ws.onopen = () => {
        if (is_unmounted_ref.current) {
          ws.close();
          return;
        }

        attempt = 0;
        setReadyState("connected");

        // Announce identity to the server
        ws.send(
          JSON.stringify({
            type: "join",
            user_id: current_user_id,
            name: current_user_name,
            avatar_url: current_user_avatar,
          } as WsClientMessage)
        );

        // Heartbeat to keep the connection alive through proxies / load balancers
        if (ping_timer_ref.current) clearInterval(ping_timer_ref.current);
        ping_timer_ref.current = setInterval(() => {
          if (ws_ref.current?.readyState === WebSocket.OPEN) {
            ws_ref.current.send(JSON.stringify({ type: "ping" } as WsClientMessage));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        let msg: WsServerMessage;
        try {
          msg = JSON.parse(event.data as string) as WsServerMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case "presence_state": {
            // Full snapshot on join — exclude ourselves
            setCollaborators(
              msg.users
                .filter((u) => u.user_id !== current_user_id)
                .map(enrichCollaborator)
            );
            break;
          }

          case "user_joined": {
            if (msg.user.user_id === current_user_id) break;
            const new_collaborator = enrichCollaborator(msg.user);
            setCollaborators((prev) => {
              // Guard against duplicate join events
              const exists = prev.some((c) => c.session_id === new_collaborator.session_id);
              return exists ? prev : [...prev, new_collaborator];
            });
            break;
          }

          case "user_left": {
            setCollaborators((prev) =>
              prev.filter((c) => c.session_id !== msg.session_id)
            );
            break;
          }

          case "row_focused": {
            setCollaborators((prev) =>
              prev.map((c) =>
                c.session_id === msg.session_id
                  ? { ...c, focused_row_id: msg.row_id, focused_col_key: msg.col_key }
                  : c
              )
            );
            break;
          }

          case "row_blurred": {
            setCollaborators((prev) =>
              prev.map((c) =>
                c.session_id === msg.session_id
                  ? { ...c, focused_row_id: null, focused_col_key: null }
                  : c
              )
            );
            break;
          }

          case "row_updated": {
            on_row_updated_ref.current(msg.row, msg.updated_by_session_id);
            break;
          }

          case "row_created": {
            on_row_created_ref.current(msg.row, msg.created_by_session_id);
            break;
          }

          case "row_deleted": {
            on_row_deleted_ref.current(msg.row_id, msg.deleted_by_session_id);
            break;
          }

          case "pong":
            // Heartbeat reply — nothing to do
            break;
        }
      };

      ws.onerror = () => {
        // onclose fires immediately after onerror; reconnection is handled there
      };

      ws.onclose = () => {
        if (ping_timer_ref.current) clearInterval(ping_timer_ref.current);
        if (is_unmounted_ref.current) return;

        setReadyState("reconnecting");
        setCollaborators([]);

        // Exponential backoff with a maximum cap
        const delay = Math.min(
          RECONNECT_BASE_MS * Math.pow(2, attempt),
          RECONNECT_MAX_MS
        );
        attempt += 1;
        reconnect_timer_ref.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      is_unmounted_ref.current = true;
      if (reconnect_timer_ref.current) clearTimeout(reconnect_timer_ref.current);
      if (ping_timer_ref.current) clearInterval(ping_timer_ref.current);
      ws_ref.current?.close();
      ws_ref.current = null;
      setReadyState("disconnected");
      setCollaborators([]);
    };
  // Intentionally only re-connect when user identity changes.
  // Callback deps (onRowUpdated etc.) are accessed via stable refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current_user_id, current_user_name, current_user_avatar]);

  // ── Focus / blur helpers ───────────────────────────────────────────────────

  const sendRowFocus = useCallback(
    (row_id: string, col_key: string) => {
      sendMessage({ type: "row_focus", row_id, col_key });
    },
    [sendMessage]
  );

  const sendRowBlur = useCallback(
    (row_id: string) => {
      sendMessage({ type: "row_blur", row_id });
    },
    [sendMessage]
  );

  // ── Derived map: row_id → collaborators editing that row ──────────────────

  const row_editors = collaborators.reduce<Map<string, CollaboratorPresence[]>>(
    (map, c) => {
      if (c.focused_row_id) {
        const existing = map.get(c.focused_row_id) ?? [];
        map.set(c.focused_row_id, [...existing, c]);
      }
      return map;
    },
    new Map()
  );

  return { collaborators, row_editors, ready_state, sendRowFocus, sendRowBlur };
}
