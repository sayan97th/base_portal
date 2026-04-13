"use client";

import { useEffect, useRef } from "react";
import { getEcho } from "@/lib/echo";
import type { NewNotificationPayload } from "@/types/websocket";

/**
 * Subscribes to the private `notifications.{userId}` channel and invokes
 * `onNewNotification` whenever the `.new_notification` event is received.
 *
 * The subscription is skipped when either `userId` or `token` is null
 * (i.e. the user is not authenticated yet).
 *
 * The channel is left (unsubscribed) when the component unmounts or when
 * `userId` / `token` change.
 */
export function useEchoNotifications(
  user_id: string | null,
  token: string | null,
  onNewNotification: (payload: NewNotificationPayload) => void
): void {
  // Keep the callback in a ref so the effect does not re-run when the
  // caller passes a new function reference on every render.
  const callback_ref = useRef(onNewNotification);
  callback_ref.current = onNewNotification;

  useEffect(() => {
    if (!user_id || !token) return;

    const echo = getEcho(token);
    const channel_name = `notifications.${user_id}`;

    const channel = echo
      .private(channel_name)
      .listen(".new_notification", (payload: NewNotificationPayload) => {
        callback_ref.current(payload);
      });

    return () => {
      channel.stopListening(".new_notification");
      echo.leave(channel_name);
    };
  }, [user_id, token]);
}
