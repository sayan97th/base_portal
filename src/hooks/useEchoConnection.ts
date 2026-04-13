"use client";

import { useEffect, useState } from "react";
import { getEcho } from "@/lib/echo";

// Pusher connection states as defined by the Pusher JS client
type PusherConnectionState =
  | "initialized"
  | "connecting"
  | "connected"
  | "unavailable"
  | "failed"
  | "disconnected";

interface UseEchoConnectionReturn {
  connection_state: PusherConnectionState;
}

/**
 * Exposes the raw Pusher connection state so the UI can render a connection
 * indicator (connected / connecting / disconnected).
 *
 * Returns `{ connection_state: 'unavailable' }` when `token` is null.
 */
export function useEchoConnection(
  token: string | null
): UseEchoConnectionReturn {
  const [connection_state, setConnectionState] =
    useState<PusherConnectionState>(token ? "connecting" : "unavailable");

  useEffect(() => {
    if (!token) {
      setConnectionState("unavailable");
      return;
    }

    const echo = getEcho(token);

    // Access the underlying Pusher connection object
    const pusher_connection = (
      echo.connector as unknown as {
        pusher: { connection: { state: string; bind: (event: string, handler: (data: { current: string }) => void) => void; unbind: (event: string, handler: (data: { current: string }) => void) => void };
        };
      }
    ).pusher.connection;

    // Sync with the current state immediately
    setConnectionState(pusher_connection.state as PusherConnectionState);

    const handleStateChange = ({ current }: { current: string }) => {
      setConnectionState(current as PusherConnectionState);
    };

    pusher_connection.bind("state_change", handleStateChange);

    return () => {
      pusher_connection.unbind("state_change", handleStateChange);
    };
  }, [token]);

  return { connection_state };
}
