"use client";

import { useEffect, useRef } from "react";
import { getEcho } from "@/lib/echo";
import type {
  BacklinkRowCreatedPayload,
  BacklinkRowUpdatedPayload,
  BacklinkRowDeletedPayload,
} from "@/types/websocket";

interface UseEchoBacklinkOrdersCallbacks {
  onRowCreated: (payload: BacklinkRowCreatedPayload) => void;
  onRowUpdated: (payload: BacklinkRowUpdatedPayload) => void;
  onRowDeleted: (payload: BacklinkRowDeletedPayload) => void;
}

/**
 * Subscribes to the public `backlink-orders` channel and dispatches the
 * appropriate callback for each event type.
 *
 * The `session_id` parameter (obtained from `getSessionId()`) is passed in so
 * callers can compare it against the `*_by_session_id` fields in each payload
 * and ignore events that the current tab already applied optimistically.
 *
 * The subscription is skipped when `token` is null.
 */
export function useEchoBacklinkOrders(
  token: string | null,
  session_id: string,
  callbacks: UseEchoBacklinkOrdersCallbacks
): void {
  // Stable refs — prevent the effect from re-running when caller re-renders
  const on_row_created_ref = useRef(callbacks.onRowCreated);
  const on_row_updated_ref = useRef(callbacks.onRowUpdated);
  const on_row_deleted_ref = useRef(callbacks.onRowDeleted);

  on_row_created_ref.current = callbacks.onRowCreated;
  on_row_updated_ref.current = callbacks.onRowUpdated;
  on_row_deleted_ref.current = callbacks.onRowDeleted;

  // session_id is stable (module-level singleton), but we keep it in a ref
  // as well for consistency.
  const session_id_ref = useRef(session_id);
  session_id_ref.current = session_id;

  useEffect(() => {
    if (!token) return;

    const echo = getEcho(token);
    const channel_name = "backlink-orders";

    // Public channel — no auth required
    const channel = echo
      .channel(channel_name)
      .listen(".row_created", (payload: BacklinkRowCreatedPayload) => {
        on_row_created_ref.current(payload);
      })
      .listen(".row_updated", (payload: BacklinkRowUpdatedPayload) => {
        on_row_updated_ref.current(payload);
      })
      .listen(".row_deleted", (payload: BacklinkRowDeletedPayload) => {
        on_row_deleted_ref.current(payload);
      });

    return () => {
      channel
        .stopListening(".row_created")
        .stopListening(".row_updated")
        .stopListening(".row_deleted");
      echo.leave(channel_name);
    };
  }, [token]);
}
