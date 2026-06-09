"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { getToken } from "@/lib/api-client";
import { getEcho, setEchoSessionId } from "@/lib/echo";
import type { CollaboratorPresence, WsReadyState } from "@/types/admin/presence";
import type { LinkBuildingOrderRow } from "@/types/admin/link-building-order";

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

const CHANNEL_NAME = "link-building-orders";

/**
 * Unique identifier for this browser tab, stable across hot-reloads.
 * Uses sessionStorage so it survives module re-evaluation within the same tab.
 */
const local_session_id = (() => {
  if (typeof window === "undefined") return crypto.randomUUID();
  // Use the same key as api-client.ts ("bo_session_id") so that the X-Session-Id
  // header sent with HTTP requests matches the session ID used here for filtering
  // WebSocket broadcasts. Without this alignment the self-filter check
  // (by_session_id === local_session_id) never matches and the current user's own
  // row-creation broadcasts slip through, producing duplicate React keys.
  const key = "bo_session_id";
  const stored = sessionStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
})();

// ── Public types ───────────────────────────────────────────────────────────────

export interface UseLinkBuildingCollaborationOptions {
  current_user_id: number;
  current_user_name: string;
  current_user_avatar: string | null;
  onRowUpdated: (row: LinkBuildingOrderRow, by_session_id: string) => void;
  onRowCreated: (row: LinkBuildingOrderRow, by_session_id: string) => void;
  onRowDeleted: (row_id: string, by_session_id: string) => void;
}

export interface UseLinkBuildingCollaborationReturn {
  collaborators: CollaboratorPresence[];
  row_editors: Map<string, CollaboratorPresence[]>;
  ready_state: WsReadyState;
  local_session_id: string;
  sendRowFocus: (row_id: string, col_key: string) => void;
  sendRowBlur: (row_id: string) => void;
  sendRowSelect: (row_id: string) => void;
}

// ── Internal channel shape ─────────────────────────────────────────────────────

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

export function useLinkBuildingCollaboration(
  options: UseLinkBuildingCollaborationOptions
): UseLinkBuildingCollaborationReturn {
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

    setEchoSessionId(local_session_id);

    const echo = getEcho(token);

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

    const channel = echo.join(CHANNEL_NAME) as unknown as EchoPresenceChannel;
    channel_ref.current = channel;

    channel.here((users: CollaboratorPresence[]) => {
      setCollaborators(
        users
          .filter((u) => u.session_id !== local_session_id)
          .map(enrichCollaborator)
      );
    });

    channel.joining((user: CollaboratorPresence) => {
      if (user.session_id === local_session_id) return;
      const new_collaborator = enrichCollaborator(user);
      setCollaborators((prev) => {
        const exists = prev.some(
          (c) => c.session_id === new_collaborator.session_id
        );
        return exists ? prev : [...prev, new_collaborator];
      });
    });

    channel.leaving((user: CollaboratorPresence) => {
      setCollaborators((prev) =>
        prev.filter((c) => c.session_id !== user.session_id)
      );
    });

    // ── Whispers ─────────────────────────────────────────────────────────────

    channel.listenForWhisper("row-focus", (data: unknown) => {
      const { session_id, row_id, col_key } = data as {
        session_id: string;
        row_id: string;
        col_key: string;
      };
      if (session_id === local_session_id) return;
      setCollaborators((prev) =>
        prev.map((c) =>
          c.session_id === session_id
            ? { ...c, focused_row_id: row_id, focused_col_key: col_key }
            : c
        )
      );
    });

    channel.listenForWhisper("row-blur", (data: unknown) => {
      const { session_id } = data as { session_id: string };
      if (session_id === local_session_id) return;
      setCollaborators((prev) =>
        prev.map((c) =>
          c.session_id === session_id
            ? { ...c, focused_row_id: null, focused_col_key: null }
            : c
        )
      );
    });

    channel.listenForWhisper("row-select", (data: unknown) => {
      const { session_id, row_id } = data as {
        session_id: string;
        row_id: string;
      };
      if (session_id === local_session_id) return;
      setCollaborators((prev) =>
        prev.map((c) =>
          c.session_id === session_id
            ? { ...c, focused_row_id: row_id, focused_col_key: null }
            : c
        )
      );
    });

    // ── Server broadcasts ─────────────────────────────────────────────────────

    channel.listen(".LinkBuildingOrderUpdated", (data: unknown) => {
      const { row, updated_by_session_id } = data as {
        row: LinkBuildingOrderRow;
        updated_by_session_id: string;
      };
      on_row_updated_ref.current(row, updated_by_session_id);
    });

    channel.listen(".LinkBuildingOrderCreated", (data: unknown) => {
      const { row, created_by_session_id } = data as {
        row: LinkBuildingOrderRow;
        created_by_session_id: string;
      };
      on_row_created_ref.current(row, created_by_session_id);
    });

    channel.listen(".LinkBuildingOrderDeleted", (data: unknown) => {
      const { row_id, deleted_by_session_id } = data as {
        row_id: string;
        deleted_by_session_id: string;
      };
      on_row_deleted_ref.current(row_id, deleted_by_session_id);
    });

    return () => {
      pusher_connection.unbind("state_change", handleStateChange);
      echo.leave(CHANNEL_NAME);
      channel_ref.current = null;
      setReadyState("disconnected");
      setCollaborators([]);
    };

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
